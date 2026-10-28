"use client";

import { useState, type MouseEvent } from "react";

interface Props {
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

/**
 * 「改」「删」两个文字按钮。
 *
 * 永远不放进 <a> 里：陈列卡与宽屏索引里它们在行内空处之上，窄屏索引里它们压在整行链接之上。
 * 仍然做一次 preventDefault + stopPropagation，点它们不会打开外链、也不会触发行的其它行为。
 * 「删」就地变成一个确认行，不用 window.confirm。
 */
export default function EditActions({ onEdit, onDelete, className = "" }: Props) {
  const [confirming, setConfirming] = useState(false);

  function guard(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <span
      className={`relative z-10 inline-flex items-center gap-3 font-mono text-[10px] tracking-[0.14em] uppercase ${className}`}
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
            className="text-seal transition-colors hover:underline"
          >
            确认删除
          </button>
          <button
            type="button"
            onClick={(event) => {
              guard(event);
              setConfirming(false);
            }}
            className="text-ink-soft transition-colors hover:text-ink"
          >
            取消
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={(event) => {
              guard(event);
              onEdit();
            }}
            className="text-ink-soft transition-colors hover:text-ink"
          >
            改
          </button>
          <button
            type="button"
            onClick={(event) => {
              guard(event);
              setConfirming(true);
            }}
            className="text-ink-soft transition-colors hover:text-seal"
          >
            删
          </button>
        </>
      )}
    </span>
  );
}
