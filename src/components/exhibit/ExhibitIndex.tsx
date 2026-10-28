"use client";

import type { Bookmark } from "@/lib/bookmarks";
import { padNo } from "@/lib/catalog";
import { tagColor } from "@/lib/tag-color";

interface Props {
  bookmarks: Bookmark[];
  onToggleTag: (tag: string) => void;
}

/**
 * 索引：同一批 Bookmark 的表。
 *
 * 宽屏的列是编号、名称、简介、标签、访问，没有域名、没有收录日。
 * 整行是一个链接（覆盖整行的隐形 <a>），行尾的 → 只是标记；标签按钮抬到链接之上，
 * 点标签只筛选、不跳转。窄屏的索引是 05 的事，这里只让表格横向滚动。
 */
export default function ExhibitIndex({ bookmarks, onToggleTag }: Props) {
  return (
    <div className="mt-10 overflow-x-auto">
      <div
        role="table"
        aria-label="书签索引"
        className="min-w-[1000px] border-t border-ink-line"
      >
        <div
          role="row"
          className="grid grid-cols-[5rem_minmax(10rem,1fr)_minmax(0,2.2fr)_minmax(9rem,0.9fr)_2rem] items-center gap-6 border-b border-ink-line/70 py-3 font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase"
        >
          <span role="columnheader">No.</span>
          <span role="columnheader">名称</span>
          <span role="columnheader">简介</span>
          <span role="columnheader">标签</span>
          <span role="columnheader" className="text-right">
            访问
          </span>
        </div>

        {bookmarks.length === 0 ? (
          <div
            role="row"
            className="border-b border-ink-line/70 py-8 text-sm text-ink/60"
          >
            <span role="cell">没有符合的收录。</span>
          </div>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              role="row"
              className="group relative grid min-h-[75px] grid-cols-[5rem_minmax(10rem,1fr)_minmax(0,2.2fr)_minmax(9rem,0.9fr)_2rem] items-center gap-6 border-b border-ink-line/70 py-3 transition-colors hover:bg-ink/[0.02]"
            >
              <span
                role="cell"
                className="font-mono text-[11px] tracking-[0.12em] text-ink-soft"
              >
                No.{padNo(bookmark.id)}
              </span>

              <div role="cell" className="min-w-0">
                {/* 铺满整行的隐形链接：点行内任何空处都打开网址 */}
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 z-0"
                >
                  <span className="sr-only">打开 {bookmark.title}</span>
                </a>
                <span className="truncate font-serif-sc text-[1.3rem] leading-tight font-black tracking-tight transition-colors group-hover:text-seal">
                  {bookmark.title}
                </span>
              </div>

              <span
                role="cell"
                className="overflow-hidden text-[15px] text-ellipsis whitespace-nowrap text-ink/65"
              >
                {bookmark.description}
              </span>

              <div role="cell" className="relative z-10 flex flex-wrap gap-x-4 gap-y-1">
                {bookmark.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleTag(tag)}
                    title={`筛选「${tag}」`}
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-ink-soft uppercase transition-colors hover:text-ink"
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: tagColor(tag) }}
                    />
                    {tag}
                  </button>
                ))}
              </div>

              <span
                role="cell"
                aria-hidden
                className="text-right font-mono text-sm text-ink-soft transition-colors group-hover:text-seal"
              >
                →
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
