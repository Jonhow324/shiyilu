"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { Bookmark, ListOrder } from "@/lib/bookmarks";
import type { CatalogSummary, CatalogView, TagStat } from "@/lib/catalog";
import { verifyToken } from "@/lib/token-check";
import {
  clearToken,
  getServerTokenSnapshot,
  getTokenSnapshot,
  saveToken,
  subscribeToken,
} from "@/lib/token-store";
import BookmarkFormLayer, { type BookmarkPayload } from "./BookmarkFormLayer";
import ExhibitCard from "./ExhibitCard";
import ExhibitFooter from "./ExhibitFooter";
import ExhibitHeader from "./ExhibitHeader";
import ExhibitIndex from "./ExhibitIndex";
import ExhibitToolbar from "./ExhibitToolbar";
import UnlockLayer from "./UnlockLayer";

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

type Layer = { kind: "unlock" } | { kind: "form"; bookmark: Bookmark | null } | null;

type WriteResult =
  | { ok: true }
  | { ok: false; error: string; unauthorized?: boolean };

/**
 * 拾遗录的宽屏页。
 *
 * 地址栏是唯一状态：检索词、标签、排序、看法都写进 ?q= / ?tags= / ?order= / ?view=，
 * 服务端按 searchParams 先筛再渲染，所以刷新、分享链接都能还原同一屏。
 *
 * 写入：访客只读。页脚「编辑」输一把 Read Token 解锁后，工具条出现「新收录」，
 * 陈列与索引出现「改」「删」。写完统一 router.refresh()，让服务端重新读库。
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

  // token 是 React 之外的存储（localStorage），用订阅而不是在 effect 里读一次
  const token = useSyncExternalStore(
    subscribeToken,
    getTokenSnapshot,
    getServerTokenSnapshot,
  );
  const canWrite = token !== null;

  const [layer, setLayer] = useState<Layer>(null);
  const [layerError, setLayerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  /** 写接口统一入口：带 Bearer，401 就清钥匙并弹出解锁层 */
  async function write(path: string, init: RequestInit): Promise<WriteResult> {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let response: Response;
    try {
      response = await fetch(path, { ...init, headers });
    } catch {
      return { ok: false, error: "网络请求失败，请稍后再试。" };
    }

    if (response.status === 401) {
      const message = "Read Token 不对，请重新输入。";
      clearToken();
      setLayerError(message);
      setLayer({ kind: "unlock" });
      return { ok: false, error: message, unauthorized: true };
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      return { ok: false, error: data?.error ?? "写入失败，请稍后再试。" };
    }

    return { ok: true };
  }

  /** 解锁层：先拿钥匙去探一个不存在的编号，404 才算对；不对就什么都不存 */
  async function handleUnlock(candidate: string): Promise<string | null> {
    const result = await verifyToken(candidate);

    if (result === "ok") {
      saveToken(candidate);
      setLayer(null);
      setLayerError(null);
      return null;
    }
    if (result === "invalid") return "Read Token 不对，请再试一次。";
    return "暂时验证不了这把钥匙，稍后再试。";
  }

  function handleToggleUnlock() {
    if (canWrite) {
      clearToken();
      setNotice(null);
      return;
    }
    setLayerError(null);
    setLayer({ kind: "unlock" });
  }

  function handleEdit(bookmark: Bookmark) {
    setNotice(null);
    setLayer({ kind: "form", bookmark });
  }

  function handleCreate() {
    setNotice(null);
    setLayer({ kind: "form", bookmark: null });
  }

  async function handleSave(
    payload: BookmarkPayload,
    target: Bookmark | null,
  ): Promise<string | null> {
    const result = target
      ? await write(`/api/bookmarks/${target.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await write("/api/bookmarks", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    if (!result.ok) return result.error;

    setLayer(null);
    setNotice(null);
    router.refresh();
    return null;
  }

  async function handleDelete(bookmark: Bookmark) {
    const result = await write(`/api/bookmarks/${bookmark.id}`, {
      method: "DELETE",
    });

    if (result.ok) {
      setNotice(null);
      router.refresh();
      return;
    }
    if (!result.unauthorized) setNotice(result.error);
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
    <>
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
        canWrite={canWrite}
        inputRef={inputRef}
        onQueryChange={handleQueryChange}
        onQuerySubmit={handleQuerySubmit}
        onToggleTag={handleToggleTag}
        onToggleOrder={handleToggleOrder}
        onChangeView={handleChangeView}
        onCreate={handleCreate}
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

      {notice ? (
        <p
          role="alert"
          className="mt-6 border border-seal/30 bg-seal/[0.04] px-4 py-3 text-sm text-seal"
        >
          {notice}
        </p>
      ) : null}

      {view === "index" ? (
        <ExhibitIndex
          bookmarks={bookmarks}
          onToggleTag={handleToggleTag}
          canWrite={canWrite}
          onEdit={handleEdit}
          onDelete={(bookmark) => void handleDelete(bookmark)}
        />
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
                canWrite={canWrite}
                onEdit={handleEdit}
                onDelete={(target) => void handleDelete(target)}
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

      <ExhibitFooter
        total={totalCount}
        unlocked={canWrite}
        onToggleUnlock={handleToggleUnlock}
      />
    </main>

      {layer?.kind === "unlock" ? (
        <UnlockLayer
          initialError={layerError}
          onUnlock={handleUnlock}
          onClose={() => {
            setLayer(null);
            setLayerError(null);
          }}
        />
      ) : null}

      {layer?.kind === "form" ? (
        <BookmarkFormLayer
          key={layer.bookmark?.id ?? "new"}
          bookmark={layer.bookmark}
          onSubmit={(payload) => handleSave(payload, layer.bookmark)}
          onClose={() => setLayer(null)}
        />
      ) : null}
    </>
  );
}
