"use client";

import { useEffect, type ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * 纸感浮层：半透明墨色背景 + 纸色卡片 + 细线边框。
 * 不用 shadcn Dialog / 旧的 Sheet，颜色只取 paper / ink / seal。
 */
export default function PaperModal({ title, subtitle, onClose, children }: Props) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 px-5 py-16"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg border border-ink/25 bg-paper p-7 shadow-[0_30px_80px_rgba(25,23,18,0.22)]"
      >
        <h2 className="font-serif-sc text-2xl font-black tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="mt-2 text-sm leading-6 text-ink/60">{subtitle}</p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
