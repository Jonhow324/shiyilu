"use client";

import { useEffect, useRef, useState } from "react";
import { hostOf } from "@/components/Favicon";

interface Props {
  url: string;
  title: string;
}

/**
 * 封面：请求自己的 /api/cover，浏览器不直接联系截图服务。
 *
 * 占位层永远垫在下面。可见性用 React 状态控制，并在 src 变化后检查
 * img.complete——缓存图有时不触发 onLoad，刷新后不能靠改 DOM style。
 */
const RETRY_LIMIT = 6;
const RETRY_MS = 5000;

export default function Cover({ url, title }: Props) {
  const host = hostOf(url);
  const initial = (host || title).trim().slice(0, 1).toUpperCase() || "·";
  const [attempt, setAttempt] = useState({ url, n: 0 });
  const [visible, setVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const shown = attempt.url === url ? attempt.n : 0;
  const src = `/api/cover?url=${encodeURIComponent(url)}&t=${shown}`;

  useEffect(() => {
    setVisible(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setVisible(true);
    }
  }, [src]);

  return (
    <div className="exhibit-cover relative w-full overflow-hidden bg-[#e8e3d6]">
      <div className="absolute inset-0 flex flex-col justify-between p-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
          {host}
        </span>
        <div>
          <span className="block font-serif-en text-[5.5rem] leading-[0.85] text-ink/20">
            {initial}
          </span>
          <span className="mt-3 block font-mono text-[10px] uppercase tracking-[0.24em] text-ink-soft">
            显影中
          </span>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- 截图由 /api/cover 代理，不走 next/image */}
      <img
        ref={imgRef}
        key={src}
        src={src}
        alt=""
        loading="lazy"
        onLoad={() => setVisible(true)}
        onError={() => {
          setVisible(false);
          // 后台还在抓。隔几秒再问一次，问够了就停在「显影中」。
          if (shown >= RETRY_LIMIT) return;
          window.setTimeout(() => setAttempt({ url, n: shown + 1 }), RETRY_MS);
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
