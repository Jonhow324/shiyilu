"use client";

import { hostOf } from "@/components/Favicon";
import type { Bookmark } from "@/lib/bookmarks";
import { padNo } from "@/lib/catalog";
import { tagColor } from "@/lib/tag-color";
import EditActions from "./EditActions";
import SnapshotLink from "./SnapshotLink";

interface Props {
  bookmarks: Bookmark[];
  onToggleTag: (tag: string) => void;
  /** 解锁后才为 true；为 false 时行里不会出现改/删 */
  canWrite: boolean;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  onSnapshot: (bookmark: Bookmark) => void;
}

/**
 * 索引：同一批 Bookmark 的表，宽窄两套标记。
 *
 * 宽屏（md 及以上）五列：编号、名称、简介、标签、访问，简介不换行、没有域名。
 * 整行是一个链接（覆盖整行的隐形 <a>），行尾的 → 只是标记；标签与改/删抬到链接之上。
 *
 * 窄屏（小于 md）是另一套行：左边编号，右边名称 + 箭头、换行的简介、域名，不显示标签。
 */
export default function ExhibitIndex({
  bookmarks,
  onToggleTag,
  canWrite,
  onEdit,
  onDelete,
  onSnapshot,
}: Props) {
  return (
    <>
      {/* 窄屏索引 */}
      <div className="mt-8 md:hidden">
        {bookmarks.length === 0 ? (
          <p className="border-t border-ink-line py-8 text-sm text-ink/60">
            没有符合的收录。
          </p>
        ) : (
          <ul className="border-t border-ink-line">
            {bookmarks.map((bookmark) => (
              <li key={bookmark.id} className="relative border-b border-ink-line/70">
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 z-0"
                >
                  <span className="sr-only">打开 {bookmark.title}</span>
                </a>

                <div className="grid grid-cols-[2.5rem_1fr] gap-3 py-5">
                  <span className="pt-1 font-mono text-[11px] tracking-[0.1em] text-ink-soft">
                    {padNo(bookmark.id)}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="flex items-baseline gap-2 font-serif-sc text-[1.2rem] leading-snug font-black tracking-tight">
                        {bookmark.title}
                        {bookmark.snapshot ? <SnapshotLink id={bookmark.id} /> : null}
                      </h3>
                      <div className="flex shrink-0 items-center gap-3">
                        {canWrite ? (
                          <EditActions
                            onEdit={() => onEdit(bookmark)}
                            onDelete={() => onDelete(bookmark)}
                            onSnapshot={bookmark.snapshot ? undefined : () => onSnapshot(bookmark)}
                          />
                        ) : null}
                        <span aria-hidden className="text-ink-soft">
                          →
                        </span>
                      </div>
                    </div>

                    {bookmark.description ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/65">
                        {bookmark.description}
                      </p>
                    ) : null}

                    <span className="mt-2 block font-mono text-[10px] tracking-[0.14em] text-ink-soft uppercase">
                      {hostOf(bookmark.url)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 宽屏索引 */}
      <div className="mt-10 hidden overflow-x-auto md:block">
        <div
          role="table"
          aria-label="书签索引"
          className="min-w-[1000px] border-t border-ink-line"
        >
          <div
            role="row"
            className="grid grid-cols-[5rem_minmax(10rem,1fr)_minmax(0,2.2fr)_minmax(9rem,0.9fr)_minmax(2rem,auto)] items-center gap-6 border-b border-ink-line/70 py-3 font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase"
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
                className="group relative grid min-h-[75px] grid-cols-[5rem_minmax(10rem,1fr)_minmax(0,2.2fr)_minmax(9rem,0.9fr)_minmax(2rem,auto)] items-center gap-6 border-b border-ink-line/70 py-3 transition-colors hover:bg-ink/[0.02]"
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
                  <span className="flex items-baseline gap-2">
                    <span className="truncate font-serif-sc text-[1.3rem] leading-tight font-black tracking-tight transition-colors group-hover:text-seal">
                      {bookmark.title}
                    </span>
                    {bookmark.snapshot ? <SnapshotLink id={bookmark.id} /> : null}
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

                <div
                  role="cell"
                  className="relative z-10 flex items-center justify-end gap-5"
                >
                  {canWrite ? (
                    <EditActions
                      onEdit={() => onEdit(bookmark)}
                      onDelete={() => onDelete(bookmark)}
                      onSnapshot={bookmark.snapshot ? undefined : () => onSnapshot(bookmark)}
                    />
                  ) : null}
                  <span
                    aria-hidden
                    className="font-mono text-sm text-ink-soft transition-colors group-hover:text-seal"
                  >
                    →
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
