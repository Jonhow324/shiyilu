"use client";

import type { RefObject } from "react";
import type { ListOrder } from "@/lib/bookmarks";
import type { TagStat } from "@/lib/catalog";
import { tagColor } from "@/lib/tag-color";

interface Props {
  query: string;
  tags: TagStat[];
  selectedTags: string[];
  order: ListOrder;
  inputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (value: string) => void;
  onQuerySubmit: () => void;
  onToggleTag: (tag: string) => void;
  onToggleOrder: () => void;
}

/** 工具条：检索、标签多选、看法切换（索引未开放）、排序 */
export default function ExhibitToolbar({
  query,
  tags,
  selectedTags,
  order,
  inputRef,
  onQueryChange,
  onQuerySubmit,
  onToggleTag,
  onToggleOrder,
}: Props) {
  const selected = new Set(selectedTags.map((tag) => tag.toLowerCase()));

  return (
    <div className="mt-12 border-y border-ink-line py-4">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
        <label className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
            检索
          </span>
          <span className="relative">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onQuerySubmit();
                if (event.key === "Escape") onQueryChange("");
              }}
              placeholder="名称、简介或网址"
              aria-label="检索书签"
              className="w-72 border-b border-ink-line bg-transparent pb-1.5 pr-7 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-seal"
            />
            <kbd
              aria-hidden
              className="pointer-events-none absolute right-0 bottom-1.5 font-mono text-[10px] text-ink-soft"
            >
              /
            </kbd>
          </span>
        </label>

        <div className="ml-auto flex items-center gap-8">
          <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.16em] uppercase">
            <span className="border-b border-ink pb-0.5 text-ink">陈列</span>
            <button
              type="button"
              disabled
              title="索引视图留到下一张工单"
              className="cursor-not-allowed text-ink/30"
            >
              索引
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleOrder}
            aria-label={order === "newest" ? "切换为最早收录" : "切换为最近收录"}
            className="font-mono text-[10px] tracking-[0.16em] text-ink uppercase transition-colors hover:text-seal"
          >
            {order === "newest" ? "↓ 最近收录" : "↑ 最早收录"}
          </button>
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {tags.map((item) => {
            const isSelected = selected.has(item.tag.toLowerCase());
            return (
              <button
                key={item.tag}
                type="button"
                onClick={() => onToggleTag(item.tag)}
                aria-pressed={isSelected}
                className={`inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors ${
                  isSelected
                    ? "border-ink/40 bg-ink/[0.06] text-ink"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tagColor(item.tag) }}
                />
                {item.tag}
                <span className="text-ink/35">{item.count}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
