"use client";

import { useState } from "react";
import { hostOf } from "@/components/Favicon";

interface Props {
  url: string;
  title: string;
}

/**
 * 封面：请求自己的 /api/cover，浏览器不直接联系截图服务。
 *
 * 不判加载状态，占位层永远垫在图片下面——图加载出来就盖住它，
 * 加载中或失败时露出来的就是「显影中」。这样不会遇到缓存图 onLoad 不触发、
 * 或者 SSR 与客户端状态不一致的问题。
 */
const RETRY_LIMIT = 6;
const RETRY_MS = 5000;

export default function Cover({ url, title }: Props) {
  const host = hostOf(url);
  const initial = (host || title).trim().slice(0, 1).toUpperCase() || "·";
  const [attempt, setAttempt] = useState({ url, n: 0 });
  const shown = attempt.url === url ? attempt.n : 0;

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
        src={`/api/cover?url=${encodeURIComponent(url)}&t=${shown}`}
        alt=""
        loading="lazy"
        onLoad={(event) => {
          // 图到了再露出来。加载中若可见，浏览器会把自己的图标画在「显影中」上。
          event.currentTarget.style.opacity = "1";
        }}
        onError={(event) => {
          event.currentTarget.style.opacity = "0";
          // 后台还在抓。隔几秒再问一次，问够了就停在「显影中」。
          if (shown >= RETRY_LIMIT) return;
          window.setTimeout(() => setAttempt({ url, n: shown + 1 }), RETRY_MS);
        }}
        className="absolute inset-0 h-full w-full object-cover opacity-0"
      />
    </div>
  );
}
