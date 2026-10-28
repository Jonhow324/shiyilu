"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Bookmark, ListOrder } from "@/lib/bookmarks";
import type { CatalogSummary, CatalogView, TagStat } from "@/lib/catalog";
import ExhibitCard from "./ExhibitCard";
import ExhibitFooter from "./ExhibitFooter";
import ExhibitHeader from "./ExhibitHeader";
import ExhibitIndex from "./ExhibitIndex";
import ExhibitToolbar from "./ExhibitToolbar";

interface Props {
  /** 已经按检索词、标签、排序筛好的这一屏 */
  bookmarks: Bookmark[];
  /** 全库总数，页脚与 Showing 的分母 */
  totalCount: number;
  /** 全库的汇总，不随筛选变化 */
  summary: CatalogSummary;
  tags: TagStat[];
  query: string;
  selectedTags: string[];
  order: ListOrder;
  view: CatalogView;
}

/** 检索防抖：输入停下再写地址栏，避免每个键都跑一次服务端 */
const QUERY_DEBOUNCE_MS = 250;

/**
 * 拾遗录的宽屏页。
 *
 * 地址栏是唯一状态：检索词、标签、排序、看法都写进 ?q= / ?tags= / ?order= / ?view=，
 * 服务端按 searchParams 先筛再渲染，所以刷新、分享链接都能还原同一屏。
 */
export default function ExhibitPage({
  bookmarks,
  totalCount,
  summary,
  tags,
  query: initialQuery,
  selectedTags: initialTags,
  order: initialOrder,
  view: initialView,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [selectedTags, setSelectedTags] = useState(initialTags);
  const [order, setOrder] = useState<ListOrder>(initialOrder);
  const [view, setView] = useState<CatalogView>(initialView);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function navigate(next: {
    query?: string;
    tags?: string[];
    order?: ListOrder;
    view?: CatalogView;
  }) {
    const params = new URLSearchParams();
    const trimmed = (next.query ?? query).trim();
    const nextTags = next.tags ?? selectedTags;
    const nextOrder = next.order ?? order;
    const nextView = next.view ?? view;

    if (trimmed) params.set("q", trimmed);
    if (nextTags.length > 0) params.set("tags", nextTags.join(","));
    if (nextOrder === "oldest") params.set("order", "oldest");
    // 陈列是默认看法，不写进地址栏
    if (nextView === "index") params.set("view", "index");

    const search = params.toString();
    startTransition(() => {
      router.replace(search ? `/?${search}` : "/", { scroll: false });
    });
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    clearTimer();
    timer.current = setTimeout(() => {
      timer.current = null;
      navigate({ query: value });
    }, QUERY_DEBOUNCE_MS);
  }

  function handleQuerySubmit() {
    clearTimer();
    navigate({ query });
  }

  function handleToggleTag(tag: string) {
    const key = tag.toLowerCase();
    const exists = selectedTags.some((item) => item.toLowerCase() === key);
    const next = exists
      ? selectedTags.filter((item) => item.toLowerCase() !== key)
      : [...selectedTags, tag];

    // 顺序稳定：按全库标签的展示顺序排，不认识的新标签放后面
    const rank = new Map(tags.map((item, index) => [item.tag.toLowerCase(), index]));
    const ordered = [...next].sort(
      (a, b) =>
        (rank.get(a.toLowerCase()) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.toLowerCase()) ?? Number.MAX_SAFE_INTEGER),
    );

    setSelectedTags(ordered);
    clearTimer();
    navigate({ tags: ordered });
  }

  function handleToggleOrder() {
    const next: ListOrder = order === "newest" ? "oldest" : "newest";
    setOrder(next);
    clearTimer();
    navigate({ order: next });
  }

  function handleChangeView(next: CatalogView) {
    if (next === view) return;
    setView(next);
    clearTimer();
    navigate({ view: next });
  }

  // 「/」把光标放进检索框；已经落在输入类元素里时不抢
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // 卸载时把还没触发的防抖清掉
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-[2640px] px-5 pt-6 pb-16 md:px-10 md:pt-8 md:pb-24">
      <ExhibitHeader
        summary={summary}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
      />

      <ExhibitToolbar
        query={query}
        tags={tags}
        selectedTags={selectedTags}
        order={order}
        view={view}
        inputRef={inputRef}
        onQueryChange={handleQueryChange}
        onQuerySubmit={handleQuerySubmit}
        onToggleTag={handleToggleTag}
        onToggleOrder={handleToggleOrder}
        onChangeView={handleChangeView}
      />

      <div className="mt-10 flex items-baseline justify-between gap-6">
        <p className="font-serif-en text-3xl leading-none">
          Showing <span>{bookmarks.length}</span>
          <span className="mx-2 text-ink/30">/</span>
          <span className="text-ink/40">{totalCount}</span>
        </p>
        <p
          aria-live="polite"
          className="font-mono text-[10px] tracking-[0.16em] text-ink-soft uppercase"
        >
          {isPending ? "筛选中" : ""}
        </p>
      </div>

      {view === "index" ? (
        <ExhibitIndex bookmarks={bookmarks} onToggleTag={handleToggleTag} />
      ) : (
        <>
          <div
            aria-busy={isPending}
            className={`exhibit-grid mt-10 transition-opacity ${
              isPending ? "opacity-50" : "opacity-100"
            }`}
          >
            {bookmarks.map((bookmark) => (
              <ExhibitCard
                key={bookmark.id}
                bookmark={bookmark}
                onToggleTag={handleToggleTag}
              />
            ))}
          </div>

          {bookmarks.length === 0 ? (
            <p className="mt-16 border-t border-ink-line pt-8 text-sm text-ink/60">
              {totalCount === 0
                ? "还没有收录。等第一条书签进来，这里就热闹了。"
                : "没有匹配的收录。换个词，或者去掉一个标签试试。"}
            </p>
          ) : null}
        </>
      )}

      <ExhibitFooter total={totalCount} />
    </main>
  );
}
