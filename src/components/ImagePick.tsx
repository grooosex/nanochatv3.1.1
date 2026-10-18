import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Folder, Image as ImageIcon } from "lucide-react";
import { isImageFile } from "@/lib/ref-image";
import { useApp } from "@/lib/store";

export function ImagePick({
  onFile,
  render,
}: {
  onFile: (file: File) => void;
  render: (open: () => void) => ReactNode;
}) {
  const album = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const take = (list: FileList | null) => {
    const picked = list?.[0];
    if (!picked) return;
    if (!isImageFile(picked)) {
      useApp.getState().toast("请选择图片");
      return;
    }
    onFile(picked);
  };

  return (
    <>
      {render(() => setOpen(true))}
      <input
        ref={album}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={file}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-end justify-center">
              <button type="button" className="absolute inset-0 bg-overlay/40" aria-label="关闭" onClick={() => setOpen(false)} />
              <div className="relative mb-[max(12px,env(safe-area-inset-bottom))] w-[min(100%-24px,360px)] overflow-hidden rounded-[20px] border border-line bg-card text-ink shadow-2xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-5 py-4 text-left text-[16px]"
                  onClick={() => {
                    setOpen(false);
                    album.current?.click();
                  }}
                >
                  <ImageIcon className="size-6 shrink-0" />
                  相册
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-t border-line px-5 py-4 text-left text-[16px]"
                  onClick={() => {
                    setOpen(false);
                    file.current?.click();
                  }}
                >
                  <Folder className="size-6 shrink-0" />
                  文件
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
