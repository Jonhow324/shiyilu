"use client";

import { useState } from "react";
import { SaveIcon, Trash2Icon } from "lucide-react";
import type { Bookmark } from "@/lib/bookmarks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export interface DrawerPayload {
  title: string;
  url: string;
  description: string;
  tags: string[];
}

interface Props {
  /** null 表示新增，否则是编辑 */
  bookmark: Bookmark | null;
  onClose: () => void;
  onSubmit: (payload: DrawerPayload) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
}

/**
 * 右侧滑出抽屉（shadcn Sheet）：新增 / 编辑书签。
 *
 * 表单初始值直接用 props 做 useState 的惰性初始值，不在 effect 里回填
 * （React 19 的 react-hooks/set-state-in-effect 禁止 effect 内同步 setState）；
 * 切换编辑目标由父组件用 key 强制重挂载。
 */
export default function BookmarkDrawer({
  bookmark,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(bookmark?.title ?? "");
  const [url, setUrl] = useState(bookmark?.url ?? "");
  const [description, setDescription] = useState(bookmark?.description ?? "");
  const [tags, setTags] = useState(bookmark?.tags.join(", ") ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    const ok = await onSubmit({
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setSaving(false);
    if (ok) onClose();
  }

  async function handleDelete() {
    if (!bookmark) return;
    setSaving(true);
    const ok = await onDelete(bookmark.id);
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="flex flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>{bookmark ? "编辑书签" : "添加书签"}</SheetTitle>
          <SheetDescription>
            标题和网址必填，标签用逗号分隔。
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="nav-title" className="text-sm font-medium">
              标题
            </label>
            <Input
              id="nav-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：MDN Web Docs"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="nav-url" className="text-sm font-medium">
              网址
            </label>
            <Input
              id="nav-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              inputMode="url"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="nav-description" className="text-sm font-medium">
              描述
            </label>
            <Textarea
              id="nav-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="这是什么、为什么值得收藏"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="nav-tags" className="text-sm font-medium">
              标签
            </label>
            <Input
              id="nav-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="开发, 前端"
            />
            <p className="text-xs text-muted-foreground">用逗号分隔</p>
          </div>
        </div>

        <SheetFooter className="flex-row justify-end border-t">
          {bookmark ? (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
              className="mr-auto"
            >
              <Trash2Icon />
              删除
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <SaveIcon />
            {saving ? "保存中…" : "保存"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
