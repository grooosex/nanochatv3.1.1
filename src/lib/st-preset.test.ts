import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseChatCompletionPreset, substituteMacros, uniquePresetName, imagePresetStyle } from "./st-preset.ts";
import { systemFor, RP_SYSTEM, POLISH_SYSTEM, FIELD_SYSTEM } from "./prompts.ts";

const sample = {
  temperature: 1,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0.85,
  openai_max_tokens: 32000,
  openai_max_context: 2000000,
  prompts: [
    {
      identifier: "main",
      name: "Main Prompt",
      role: "system",
      content: "Write {{char}}'s next reply to {{user}} in {{scenario}}.",
      marker: false,
    },
    {
      identifier: "nsfw",
      name: "NSFW Prompt",
      role: "system",
      content: "NSFW allowed.",
      marker: false,
    },
    {
      identifier: "charDescription",
      name: "Char Description",
      marker: true,
      content: "SHOULD SKIP",
    },
    {
      identifier: "jailbreak",
      name: "Post-History Instructions",
      role: "system",
      injection_position: 1,
      content: "Stay in character as {{char}}.",
      marker: false,
    },
  ],
  prompt_order: [
    {
      character_id: 100000,
      order: [
        { identifier: "main", enabled: true },
        { identifier: "nsfw", enabled: true },
        { identifier: "charDescription", enabled: true },
        { identifier: "jailbreak", enabled: true },
      ],
    },
  ],
};

describe("st chat completion preset", () => {
  it("parses prompts, skips placeholders, splits jailbreak, ignores 2M context", () => {
    const p = parseChatCompletionPreset(sample, "夏瑾 Beta.json");
    assert.equal(p.name, "夏瑾 Beta");
    assert.match(p.systemPrompt, /Write \{\{char\}\}/);
    assert.match(p.systemPrompt, /NSFW allowed/);
    assert.equal(p.systemPrompt.includes("SHOULD SKIP"), false);
    assert.equal(p.postHistory, "Stay in character as {{char}}.");
    assert.equal(p.params.temperature, 1);
    assert.equal(p.params.presencePenalty, 0.85);
    assert.equal(p.params.maxTokens, 32000);
    assert.equal((p.params as { contextTurns?: number }).contextTurns, undefined);
  });

  it("rejects text completion and character cards", () => {
    assert.throws(() => parseChatCompletionPreset({ input_sequence: "<|user|>" }, "a.json"), /对话补全/);
    assert.throws(() => parseChatCompletionPreset({ spec: "chara_card_v2", data: {} }, "b.json"), /角色卡/);
  });

  it("numbers duplicate names", () => {
    assert.equal(uniquePresetName("夏瑾", ["夏瑾"]), "夏瑾2");
    assert.equal(uniquePresetName("夏瑾", ["夏瑾", "夏瑾2"]), "夏瑾3");
  });

  it("macros: user is 你, multi char joins, unknown stripped", () => {
    const solo = substituteMacros("{{char}} / {{user}} / leftover {{foo}}", {
      char: "小春",
      isMulti: false,
      scenario: "客厅",
      personality: "傲娇",
    });
    assert.equal(solo, "小春 / 你 / leftover ");
    const group = substituteMacros("{{char}}|{{charIfNotGroup}}", {
      char: "小春、小玉",
      isMulti: true,
      scenario: "",
      personality: "",
    });
    assert.equal(group, "小春、小玉|");
  });
});

describe("systemFor cancel is identical", () => {
  it("chat without styleExtra is the original RP_SYSTEM path", () => {
    assert.equal(systemFor("chat"), RP_SYSTEM);
    assert.equal(systemFor("chat", "人设"), `${RP_SYSTEM}\n\n人设`);
    assert.equal(systemFor("chat", "人设", ""), `${RP_SYSTEM}\n\n人设`);
    assert.equal(systemFor("chat", "人设", "   "), `${RP_SYSTEM}\n\n人设`);
  });

  it("polish / field / personalize / image / memory ignore empty style", () => {
    assert.equal(systemFor("polish"), POLISH_SYSTEM);
    assert.equal(systemFor("field", "hint"), `${FIELD_SYSTEM}\n\nhint`);
    assert.match(systemFor("personalize", "改成病娇"), /【个性化要求·最高优先】/);
    assert.equal(systemFor("personalize", "改成病娇", ""), systemFor("personalize", "改成病娇"));
    assert.equal(systemFor("memory", "x", "style"), systemFor("memory"));
    assert.equal(systemFor("image", "x", "  "), systemFor("image", "x"));
    assert.equal(systemFor("image", "x", "风格"), `${systemFor("image", "x")}\n\n风格`);
  });
});

describe("imagePresetStyle", () => {
  const preset = {
    id: "p1",
    name: "小猫",
    systemPrompt: "演 {{char}}",
    postHistory: "记住 {{user}}",
    params: {},
  };

  it("is empty when no image preset is selected", () => {
    assert.deepEqual(imagePresetStyle({ stImageActiveId: null, stPresets: [preset] }), {});
    assert.deepEqual(imagePresetStyle({ stImageActiveId: "missing", stPresets: [preset] }), {});
  });

  it("uses the image preset, not the chat one, and keeps a tag closer", () => {
    const style = imagePresetStyle(
      { stImageActiveId: "p1", stPresets: [preset] },
      { characters: [{ name: "七实", persona: "" }], isMulti: false, opening: "" } as never,
    );
    assert.equal(style.styleExtra, "演 七实");
    assert.match(style.postHistory || "", /^记住 你\n\n/);
    assert.match(style.postHistory || "", /不要写进标签/);
  });
});
