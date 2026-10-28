"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * 暗色模式：next-themes 依据系统 prefers-color-scheme 给 <html> 加/去 .dark class，
 * 并在首屏前注入一小段脚本，避免 SSR 回来时闪白。
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
