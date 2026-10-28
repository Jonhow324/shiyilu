"use client";

import { useState } from "react";

/** 从网址里取主机名，取不到返回空串 */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * favicon 候选源，按顺序尝试：前一个加载失败自动切下一个。
 * Google 的服务在国内网络下经常取不到，所以后面补了 icon.horse 和站点自己的 /favicon.ico。
 * 图标一律前端实时加载，不入库、不做服务端抓取（见 ADR-0001）。
 */
function faviconSources(host: string): string[] {
  return [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
    `https://icon.horse/icon/${encodeURIComponent(host)}`,
    `https://${host}/favicon.ico`,
  ];
}

/**
 * 站点图标：实时向外部 favicon 服务取。
 * 全部源都失败（或无 host）时降级成标题首字的占位方块，不会出现破图。
 */
export default function Favicon({ url, title }: { url: string; title: string }) {
  const [index, setIndex] = useState(0);
  const host = hostOf(url);
  const sources = host ? faviconSources(host) : [];
  const initial = title.trim().slice(0, 1).toUpperCase() || "?";

  if (index >= sources.length) {
    return (
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground"
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 外部 favicon 服务，不走 next/image 优化
    <img
      key={sources[index]}
      src={sources[index]}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setIndex((current) => current + 1)}
      className="size-8 shrink-0 rounded-md bg-muted object-contain"
    />
  );
}
