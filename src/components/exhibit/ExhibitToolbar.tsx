"use client";

import type { RefObject } from "react";
import type { ListOrder } from "@/lib/bookmarks";
import type { CatalogView, TagStat } from "@/lib/catalog";
import { tagColor } from "@/lib/tag-color";

interface Props {
  query: string;
  tags: TagStat[];
  selectedTags: string[];
  order: ListOrder;
  view: CatalogView;
  /** 解锁后才出现「新收录」 */
  canWrite: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (value: string) => void;
  onQuerySubmit: () => void;
  onToggleTag: (tag: string) => void;
  onToggleOrder: () => void;
  onChangeView: (view: CatalogView) => void;
  onCreate: () => void;
}

/** 工具条：检索、标签多选、看法切换、排序 */
export default function ExhibitToolbar({
  query,
  tags,
  selectedTags,
  order,
  view,
  canWrite,
  inputRef,
  onQueryChange,
  onQuerySubmit,
  onToggleTag,
  onToggleOrder,
  onChangeView,
  onCreate,
}: Props) {
  const selected = new Set(selectedTags.map((tag) => tag.toLowerCase()));

  return (
    <div className="mt-8 border-y border-ink-line py-4 md:mt-12">
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
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase">
            {(
              [
                ["exhibit", "陈列"],
                ["index", "索引"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onChangeView(value)}
                aria-pressed={view === value}
                className={`px-2.5 py-1 transition-colors ${
                  view === value
                    ? "bg-ink text-paper"
                    : "border border-ink-line text-ink-soft hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleOrder}
            aria-label={order === "newest" ? "切换为最早收录" : "切换为最近收录"}
            className="font-mono text-[10px] tracking-[0.16em] text-ink uppercase transition-colors hover:text-seal"
          >
            {order === "newest" ? "↓ 最近收录" : "↑ 最早收录"}
          </button>

          {canWrite ? (
            <button
              type="button"
              onClick={onCreate}
              className="font-mono text-[10px] tracking-[0.16em] text-ink uppercase underline decoration-ink/30 underline-offset-4 transition-colors hover:text-seal hover:decoration-seal"
            >
              新收录
            </button>
          ) : null}
        </div>
      </div>

      {tags.length > 0 ? (
        // 窄屏一行横着滑出去，不换行；宽屏照旧换行铺开
        <div className="-mx-5 mt-4 overflow-x-auto px-5 [scrollbar-width:thin] md:mx-0 md:overflow-visible md:px-0">
          <div className="flex w-max items-center gap-x-5 md:w-auto md:flex-wrap md:gap-y-2">
            {tags.map((item) => {
              const isSelected = selected.has(item.tag.toLowerCase());
              return (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => onToggleTag(item.tag)}
                  aria-pressed={isSelected}
                  className={`inline-flex shrink-0 items-center gap-2 border px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors ${
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
        </div>
      ) : null}
    </div>
  );
}
