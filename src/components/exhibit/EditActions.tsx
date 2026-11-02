"use client";

import { useState, type MouseEvent } from "react";

interface Props {
  onEdit: () => void;
  onDelete: () => void;
  /** 已有快照时不显示。点了只是开工，抓没抓到要刷新才知道。 */
  onSnapshot?: () => void;
  className?: string;
}

/**
 * 「改」「删」两个文字按钮。
 *
 * 永远不放进 <a> 里：陈列卡与宽屏索引里它们在行内空处之上，窄屏索引里它们压在整行链接之上。
 * 仍然做一次 preventDefault + stopPropagation，点它们不会打开外链、也不会触发行的其它行为。
 * 「删」就地变成一个确认行，不用 window.confirm。
 */
export default function EditActions({ onEdit, onDelete, onSnapshot, className = "" }: Props) {
  const [confirming, setConfirming] = useState(false);

  function guard(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <span
      className={`relative z-10 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase ${className}`}
    >
      {confirming ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              guard(event);
              setConfirming(false);
              onDelete();
            }}
            className="cursor-pointer rounded-sm border border-seal/40 bg-seal/[0.06] px-1.5 py-0.5 text-seal transition-colors hover:bg-seal hover:text-paper"
          >
            确认删除
          </button>
          <button
            type="button"
            onClick={(event) => {
              guard(event);
              setConfirming(false);
            }}
            className="cursor-pointer rounded-sm border border-transparent px-1.5 py-0.5 text-ink-soft transition-colors hover:border-ink/30 hover:bg-ink/[0.06] hover:text-ink"
          >
            取消
          </button>
        </>
      ) : (
        <>
          {onSnapshot ? (
            <button
              type="button"
              onClick={(event) => {
                guard(event);
                onSnapshot();
              }}
              className="cursor-pointer rounded-sm border border-transparent px-1.5 py-0.5 text-ink-soft transition-colors hover:border-ink/30 hover:bg-ink/[0.06] hover:text-ink"
            >
              取快照
            </button>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              guard(event);
              onEdit();
            }}
            className="cursor-pointer rounded-sm border border-transparent px-1.5 py-0.5 text-ink-soft transition-colors hover:border-ink/30 hover:bg-ink/[0.06] hover:text-ink"
          >
            改
          </button>
          <button
            type="button"
            onClick={(event) => {
              guard(event);
              setConfirming(true);
            }}
            className="cursor-pointer rounded-sm border border-transparent px-1.5 py-0.5 text-ink-soft transition-colors hover:border-seal/40 hover:bg-seal/[0.08] hover:text-seal"
          >
            删
          </button>
        </>
      )}
    </span>
  );
}
