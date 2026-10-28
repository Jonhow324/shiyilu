"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { KeyRoundIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { Bookmark, TagCount } from "@/lib/bookmarks";
import {
  getServerTokenSnapshot,
  getTokenSnapshot,
  saveToken,
  subscribeToken,
} from "@/lib/token-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import BookmarkCard from "./BookmarkCard";
import BookmarkDrawer, { type DrawerPayload } from "./BookmarkDrawer";
import NavSidebar from "./Sidebar";
import TokenDialog from "./TokenDialog";

interface Props {
  initialBookmarks: Bookmark[];
  initialTags: TagCount[];
}

/** 主界面：shadcn Sidebar 布局 + 卡片网格 + Sheet 抽屉 + Dialog 填 token + sonner 提示 */
export default function NavApp({ initialBookmarks, initialTags }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [tags, setTags] = useState<TagCount[]>(initialTags);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  // null 表示抽屉关闭；{ target: null } 表示新增，否则是编辑
  const [drawer, setDrawer] = useState<{ target: Bookmark | null } | null>(null);

  // token 从 localStorage 这个外部数据源订阅而来，不在 effect 里 setState
  const token = useSyncExternalStore(
    subscribeToken,
    getTokenSnapshot,
    getServerTokenSnapshot,
  );

  // 弹层是否打开是派生状态：没 token 就自动提示一次（用户可关闭），也可以手动点开
  const [manualTokenOpen, setManualTokenOpen] = useState(false);
  const [tokenDismissed, setTokenDismissed] = useState(false);
  const tokenDialogOpen = manualTokenOpen || (token === null && !tokenDismissed);

  const [tokenError, setTokenError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  /*
   * 搜索 / 标签变化时重新拉列表（输入防抖 250ms）。
   * 这里的 setState 发生在异步回调里（不是 effect 的同步 body），
   * 属于「订阅外部系统并在回调里更新」，符合 react-hooks/set-state-in-effect 的要求。
   */
  useEffect(() => {
    const isInitial = reloadKey === 0 && !query.trim() && selected.length === 0;
    if (isInitial) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (selected.length > 0) params.set("tags", selected.join(","));

      try {
        const response = await fetch(`/api/bookmarks?${params.toString()}`);
        if (!response.ok || cancelled) return;
        setBookmarks((await response.json()) as Bookmark[]);
      } catch {
        if (!cancelled) toast.error("加载书签失败");
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, selected, reloadKey]);

  /** 写操作统一走这里：带上 token，401 时提示重新输入 */
  async function request(path: string, init: RequestInit): Promise<Response | null> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetch(path, { ...init, headers });
    } catch {
      toast.error("网络请求失败");
      return null;
    }

    if (response.status === 401) {
      toast.error("read token 无效或缺失，请重新输入");
      setTokenError("read token 无效或缺失，请重新输入");
      setManualTokenOpen(true);
      return null;
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ? `操作失败：${data.error}` : "操作失败");
      return null;
    }
    return response;
  }

  /** 写操作后刷新列表与标签 */
  async function refresh() {
    setReloadKey((key) => key + 1);
    try {
      const response = await fetch("/api/tags");
      if (response.ok) setTags((await response.json()) as TagCount[]);
    } catch {
      // 标签刷新失败不影响主流程
    }
  }

  async function handleSubmit(payload: DrawerPayload): Promise<boolean> {
    if (!token) {
      setTokenError("请先填写 read token");
      setManualTokenOpen(true);
      return false;
    }

    const target = drawer?.target ?? null;
    const response = target
      ? await request(`/api/bookmarks/${target.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await request("/api/bookmarks", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    if (!response) return false;
    toast.success(target ? "已保存" : "已添加");
    await refresh();
    return true;
  }

  async function handleDelete(id: number): Promise<boolean> {
    if (!token) {
      setTokenError("请先填写 read token");
      setManualTokenOpen(true);
      return false;
    }
    const response = await request(`/api/bookmarks/${id}`, { method: "DELETE" });
    if (!response) return false;
    toast.success("已删除");
    await refresh();
    return true;
  }

  function toggleTag(tag: string) {
    setSelected((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }

  return (
    <SidebarProvider>
      <NavSidebar
        tags={tags}
        selected={selected}
        query={query}
        onQueryChange={setQuery}
        onToggleTag={toggleTag}
        onClear={() => {
          setQuery("");
          setSelected([]);
        }}
      />

      <SidebarInset className="flex flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <h1 className="text-sm font-semibold">个人导航站</h1>
          <span className="text-xs text-muted-foreground">
            {bookmarks.length} 条书签
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTokenError(null);
                setManualTokenOpen(true);
              }}
            >
              <KeyRoundIcon />
              {token ? "token 已设置" : "未设置 token"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!token) {
                  setTokenError("添加书签需要 read token");
                  setManualTokenOpen(true);
                  return;
                }
                setDrawer({ target: null });
              }}
            >
              <PlusIcon />
              添加书签
            </Button>
          </div>
        </header>

        <div className="flex-1 p-4">
          {bookmarks.length === 0 ? (
            <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              没有匹配的书签。点右上角「添加书签」添加一条。
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onEdit={(target) => setDrawer({ target })}
                />
              ))}
            </div>
          )}
        </div>
      </SidebarInset>

      {/*
        抽屉按需挂载，并用 key 强制重挂载：切换编辑目标时表单 state 自然重置，
        不需要「effect 里 setState 回填表单」这种 React 19 不允许的写法。
      */}
      {drawer ? (
        <BookmarkDrawer
          key={drawer.target?.id ?? "new"}
          bookmark={drawer.target}
          onClose={() => setDrawer(null)}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      ) : null}

      {/* 同样按需挂载，每次打开都是新实例，输入框自然是空的 */}
      {tokenDialogOpen ? (
        <TokenDialog
          error={tokenError}
          onClose={() => {
            setManualTokenOpen(false);
            setTokenDismissed(true);
          }}
          onSave={(value) => {
            saveToken(value);
            setTokenError(null);
            setManualTokenOpen(false);
          }}
        />
      ) : null}
    </SidebarProvider>
  );
}
