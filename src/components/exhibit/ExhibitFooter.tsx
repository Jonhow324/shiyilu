"use client";

/** 页脚：一个「完」字，加两行小字。这一张不放编辑入口。 */
export default function ExhibitFooter({ total }: { total: number }) {
  return (
    <footer className="mt-28 flex items-end justify-between gap-8 border-t border-ink-line pt-8">
      <span className="font-serif-sc text-6xl leading-none font-black">完</span>
      <div className="text-right font-mono text-[10px] leading-5 tracking-[0.16em] text-ink-soft uppercase">
        <p>拾遗录 · 收录 {total} 处网页</p>
        <p>截图由 mShots 自动生成 · 按 / 快速检索</p>
      </div>
    </footer>
  );
}
