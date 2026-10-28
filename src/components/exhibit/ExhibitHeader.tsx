"use client";

import type { CatalogSummary } from "@/lib/catalog";
import { tagColor } from "@/lib/tag-color";

interface Props {
  summary: CatalogSummary;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

/** 中文简介：页面文案，不是某条 Bookmark 的描述 */
const INTRO =
  "这里陈列着我在网上反复回访的地方——工具、灵感、字体与长文。每一枚标签都是一个抽屉，把它们叠起来，就能找到想要的那一页。";

const SEAL_CHARS = ["网", "藏", "私", "印"];

/** 页眉：卷号、标题、印章、英文句子、简介、三个计数、标签分布 */
export default function ExhibitHeader({ summary, selectedTags, onToggleTag }: Props) {
  const selected = new Set(selectedTags.map((tag) => tag.toLowerCase()));

  return (
    <header>
      <div className="flex items-baseline justify-between gap-8 border-b border-ink-line pb-4 font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
        <span>Vol.01 · 私人网页收藏目录</span>
        <span className="hidden md:inline">A Cabinet of the Web</span>
        <span>{summary.updatedOn ? `更新于 ${summary.updatedOn}` : "尚未收录"}</span>
      </div>

      <div className="mt-8 grid grid-cols-1 items-end gap-x-8 gap-y-12 md:mt-12 min-[1100px]:grid-cols-12">
        <div className="min-[1100px]:col-span-7">
          {/* 窄屏把标题和印章排成一行，印章跟在标题右边，不压字也不会溢出 */}
          <div className="relative max-md:flex max-md:items-start">
            <h1 className="font-serif-sc text-[clamp(5.5rem,9vw,10rem)] leading-[0.82] font-black tracking-[-0.045em] max-md:text-[clamp(3rem,16vw,4.25rem)]">
              拾遗录
            </h1>
            <div
              aria-hidden
              className="absolute top-1 right-0 grid rotate-[8deg] grid-cols-2 gap-px border-2 border-seal p-1 text-seal max-md:static max-md:mt-1 max-md:ml-3 max-md:shrink-0 max-md:scale-90 min-[1100px]:top-2 min-[1100px]:right-6"
            >
              {SEAL_CHARS.map((char) => (
                <span
                  key={char}
                  className="grid size-6 place-items-center border border-seal font-serif-sc text-sm leading-none font-black"
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 min-[1100px]:col-span-5">
          <p className="font-serif-en text-[2.6rem] leading-[1.05] text-seal italic">
            Things worth
            <br />
            returning to.
          </p>

          <p className="max-w-[42rem] text-sm leading-7 text-ink/75">{INTRO}</p>

          <dl className="flex items-stretch gap-6 border-t border-ink-line pt-5">
            <div className="flex flex-col gap-1.5">
              <dt className="font-mono text-[10px] tracking-[0.18em] text-ink-soft uppercase">
                收录
              </dt>
              <dd className="font-serif-en text-[2.75rem] leading-none">
                {summary.count}
              </dd>
            </div>
            <div className="flex flex-col gap-1.5 border-l border-ink-line pl-6">
              <dt className="font-mono text-[10px] tracking-[0.18em] text-ink-soft uppercase">
                标签
              </dt>
              <dd className="font-serif-en text-[2.75rem] leading-none">
                {summary.tagCount}
              </dd>
            </div>
            <div className="flex flex-col gap-1.5 border-l border-ink-line pl-6">
              <dt className="font-mono text-[10px] tracking-[0.18em] text-ink-soft uppercase">
                {summary.addedYear} 新增
              </dt>
              <dd className="font-serif-en text-[2.75rem] leading-none">
                {String(summary.addedInYear).padStart(2, "0")}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {summary.distribution.length > 0 ? (
        <div className="mt-10 md:mt-14">
          <div className="flex items-baseline justify-between font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
            <span>标签分布</span>
            <span>点击色块筛选</span>
          </div>
          <div className="mt-3 flex items-start gap-[3px]">
            {summary.distribution.map((share) => {
              const isSelected = selected.has(share.tag.toLowerCase());
              return (
                <button
                  key={share.tag}
                  type="button"
                  onClick={() => onToggleTag(share.tag)}
                  aria-pressed={isSelected}
                  aria-label={`筛选「${share.tag}」`}
                  title={`筛选「${share.tag}」`}
                  className="min-w-0 flex-1 text-left"
                  style={{ flexGrow: share.count, flexBasis: 0 }}
                >
                  <span
                    className={`block h-3.5 transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: tagColor(share.tag) }}
                  />
                  {/* 窄屏色条只留颜色，不写标签与百分比 */}
                  <span
                    className={`mt-2 block truncate text-center font-mono text-[10px] tracking-[0.08em] whitespace-nowrap max-md:hidden ${
                      isSelected ? "text-ink" : "text-ink-soft"
                    }`}
                  >
                    {share.tag} {share.percent}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
