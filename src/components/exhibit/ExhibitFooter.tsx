"use client";

/** 页脚：一个「完」字，加两行小字。这一张不放编辑入口。 */
export default function ExhibitFooter({ total }: { total: number }) {
  return (
    <footer className="mt-20 flex flex-col items-start gap-6 border-t border-ink-line pt-8 md:mt-28 md:flex-row md:items-end md:justify-between md:gap-8">
      <span className="font-serif-sc text-6xl leading-none font-black">完</span>
      <div className="font-mono text-[10px] leading-5 tracking-[0.16em] text-ink-soft uppercase md:text-right">
        <p>拾遗录 · 收录 {total} 处网页</p>
        <p>截图由 mShots 自动生成 · 按 / 快速检索</p>
      </div>
    </footer>
  );
}
