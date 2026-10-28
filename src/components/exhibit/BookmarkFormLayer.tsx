"use client";

import { useState, type FormEvent } from "react";
import type { Bookmark } from "@/lib/bookmarks";
import { parseTagInput } from "@/lib/tags";
import PaperModal from "./PaperModal";

export interface BookmarkPayload {
  title: string;
  url: string;
  description: string;
  tags: string[];
}

interface Props {
  /** null 表示新收录，否则是改这一条 */
  bookmark: Bookmark | null;
  /** 返回错误文案表示没写成，返回 null 表示成功 */
  onSubmit: (payload: BookmarkPayload) => Promise<string | null>;
  onClose: () => void;
}

const FIELD =
  "mt-2 w-full border border-ink-line bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-ink/50";

/** 「新收录」与「改」共用的一层：标题、网址、描述、标签 */
export default function BookmarkFormLayer({ bookmark, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(bookmark?.title ?? "");
  const [url, setUrl] = useState(bookmark?.url ?? "");
  const [description, setDescription] = useState(bookmark?.description ?? "");
  const [tagInput, setTagInput] = useState(bookmark?.tags.join(", ") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    const message = await onSubmit({
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      tags: parseTagInput(tagInput),
    });
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <PaperModal
      title={bookmark ? "编辑" : "新收录"}
      subtitle={
        bookmark ? "改完保存，陈列与索引会重新读库。" : "收一条新的进来。"
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="block font-mono text-[10px] tracking-[0.18em] text-ink-soft uppercase">
          标题
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如 Figma"
            className={FIELD}
          />
        </label>

        <label className="block font-mono text-[10px] tracking-[0.18em] text-ink-soft uppercase">
          网址
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className={FIELD}
          />
        </label>

        <label className="block font-mono text-[10px] tracking-[0.18em] text-ink-soft uppercase">
          描述
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="一句话说明这是什么、为什么值得收"
            className={`${FIELD} resize-none leading-6`}
          />
        </label>

        <label className="block font-mono text-[10px] tracking-[0.18em] text-ink-soft uppercase">
          标签
          <input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            placeholder="设计, 工具（逗号或空格分隔）"
            className={FIELD}
          />
        </label>

        {error ? (
          <p role="alert" className="text-sm text-seal">
            {error}
          </p>
        ) : null}

        <div className="mt-1 flex items-center gap-5">
          <button
            type="submit"
            disabled={busy}
            className="border border-ink bg-ink px-4 py-2 font-mono text-[10px] tracking-[0.16em] text-paper uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "保存中" : "保存"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] tracking-[0.16em] text-ink-soft uppercase transition-colors hover:text-ink"
          >
            取消
          </button>
        </div>
      </form>
    </PaperModal>
  );
}
