"use client";

interface Props {
  total: number;
  /** 这台浏览器是否持有 Read Token */
  unlocked: boolean;
  onToggleUnlock: () => void;
}

/** 页脚：一个「完」字、两行小字，加一个「编辑」文字入口。这一张不放别的写入口。 */
export default function ExhibitFooter({ total, unlocked, onToggleUnlock }: Props) {
  return (
    <footer className="mt-20 flex flex-col items-start gap-6 border-t border-ink-line pt-8 md:mt-28 md:flex-row md:items-end md:justify-between md:gap-8">
      <span className="font-serif-sc text-6xl leading-none font-black">完</span>
      <div className="font-mono text-[10px] leading-5 tracking-[0.16em] text-ink-soft uppercase md:text-right">
        <p>拾遗录 · 收录 {total} 处网页</p>
        <p>截图由 mShots 自动生成 · 按 / 快速检索</p>
        <button
          type="button"
          onClick={onToggleUnlock}
          aria-label={unlocked ? "退出编辑" : "编辑"}
          title={unlocked ? "退出编辑" : "编辑"}
          className="mt-3 border-b border-ink/25 pb-0.5 text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          编辑
        </button>
      </div>
    </footer>
  );
}
