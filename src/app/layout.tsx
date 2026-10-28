import type { Metadata } from "next";
import {
  Instrument_Serif,
  JetBrains_Mono,
  Noto_Serif_SC,
} from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// 中文标题：Noto Serif SC 900。中文有上百个 unicode-range 分片，关掉预加载，
// 让浏览器按实际用到的字去取；subsets 里没有 chinese-simplified，指定了反而只剩拉丁字形。
const notoSerifSC = Noto_Serif_SC({
  weight: "900",
  display: "swap",
  preload: false,
  variable: "--font-noto-serif-sc",
  fallback: ["Songti SC", "SimSun", "serif"],
});

// 英文斜体句子与大数字共用一套，数字用 regular、句子加 italic
const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
});

// 小标签、卷号、日期、域名
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "拾遗录",
  description: "私人网页收藏目录：工具、灵感、字体与长文。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSerifSC.variable} ${instrumentSerif.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper font-sans text-ink">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
