"use client";

import { useState, type FormEvent } from "react";
import PaperModal from "./PaperModal";

interface Props {
  initialError?: string | null;
  /** 返回错误文案表示没解开，返回 null 表示成功 */
  onUnlock: (token: string) => Promise<string | null>;
  onClose: () => void;
}

/** 解锁层：填一把 Read Token，钥匙只留在这台浏览器 */
export default function UnlockLayer({ initialError, onUnlock, onClose }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const token = value.trim();
    if (!token) {
      setError("先填一把 Read Token。");
      return;
    }

    setBusy(true);
    setError(null);
    const message = await onUnlock(token);
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <PaperModal
      title="解锁"
      subtitle="钥匙只留在这台浏览器。清掉站点数据或换一台设备，就要再输一次。"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <label className="block font-mono text-[10px] tracking-[0.18em] text-ink-soft uppercase">
          Read Token
          <input
            autoFocus
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Read Token"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            className="mt-2 w-full border border-ink-line bg-transparent px-3 py-2 font-mono text-sm tracking-[0.08em] text-ink outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-ink/35 focus:border-ink/50"
          />
        </label>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-seal">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center gap-5">
          <button
            type="submit"
            disabled={busy}
            className="border border-ink bg-ink px-4 py-2 font-mono text-[10px] tracking-[0.16em] text-paper uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "验证中" : "解锁"}
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
