"use client";

import Favicon, { hostOf } from "@/components/Favicon";
import type { Bookmark } from "@/lib/bookmarks";
import { formatCollectedOn, padNo } from "@/lib/catalog";
import { tagColor } from "@/lib/tag-color";
import Cover from "./Cover";
import SnapshotLink from "./SnapshotLink";
import EditActions from "./EditActions";

interface Props {
  bookmark: Bookmark;
  onToggleTag: (tag: string) => void;
  /** 解锁后才为 true；为 false 时卡片上不会出现改/删 */
  canWrite: boolean;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  onSnapshot: (bookmark: Bookmark) => void;
}

/** 陈列里的一张卡：封面、角标编号、域名与收录日、标题、描述、标签 */
export default function ExhibitCard({
  bookmark,
  onToggleTag,
  canWrite,
  onEdit,
  onDelete,
  onSnapshot,
}: Props) {
  const host = hostOf(bookmark.url);

  return (
    <article className="group relative">
      <span className="absolute -top-3 left-5 z-10 border border-ink/25 bg-paper px-2 py-1 font-mono text-[10px] tracking-[0.18em] text-ink">
        No.{padNo(bookmark.id)}
      </span>

      <a
        href={bookmark.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`打开 ${bookmark.title}`}
        className="block"
      >
        <Cover url={bookmark.url} title={bookmark.title} />
      </a>

      <div className="mt-4 flex items-center gap-2.5 border-b border-ink-line pb-2.5">
        <Favicon url={bookmark.url} title={bookmark.title} />
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {host}
        </span>
        <span className="ml-auto shrink-0 font-mono text-[10px] tracking-[0.14em] text-ink-soft">
          {formatCollectedOn(bookmark.created_at)}
        </span>
      </div>

      <h2 className="mt-4 flex items-baseline gap-3 font-serif-sc text-[clamp(1.4rem,1.5vw,1.95rem)] leading-snug font-black tracking-tight">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-seal"
        >
          {bookmark.title}
        </a>
        {bookmark.snapshot ? <SnapshotLink id={bookmark.id} /> : null}
      </h2>

      {bookmark.description ? (
        <p className="mt-2 line-clamp-2 text-[0.9rem] leading-7 text-ink/70">
          {bookmark.description}
        </p>
      ) : null}

      {bookmark.tags.length > 0 || canWrite ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {bookmark.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              title={`筛选「${tag}」`}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink"
            >
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: tagColor(tag) }}
              />
              {tag}
            </button>
          ))}

          {/* 没有标签时这一行只放改/删，正好接在描述下面 */}
          {canWrite ? (
            <EditActions
              className="ml-auto"
              onEdit={() => onEdit(bookmark)}
              onDelete={() => onDelete(bookmark)}
              onSnapshot={bookmark.snapshot ? undefined : () => onSnapshot(bookmark)}
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
