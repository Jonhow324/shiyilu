/**
 * 标签的颜色。
 *
 * 稿子上出现的十个标签有固定色，其余标签按名字哈希到一个哑色色板——同一个名字永远同色，
 * 刷新、重启都不变（只依赖字符串本身，不依赖插入顺序或随机数）。
 */

/** 稿子里的十个标签，键统一用小写，查找时大小写不敏感 */
const PRESET: Record<string, string> = {
  设计: "#d23f1c",
  开发: "#2b4c7e",
  工具: "#5b6b3a",
  灵感: "#c8902e",
  字体: "#7a3b5c",
  色彩: "#2f6f6a",
  素材: "#9c4a2b",
  阅读: "#4a4a4a",
  ai: "#6f8faf",
  效率: "#8a8456",
};

/** 备用色板：八色哑调，和纸墨底相处不刺眼 */
const FALLBACK = [
  "#6b705c",
  "#8a6f4b",
  "#5f7a86",
  "#7c5f7a",
  "#a4703f",
  "#4f6b5a",
  "#7a6b8a",
  "#8d5f52",
];

/** FNV-1a，稳定且足够散，用于把标签名映射到备用色板 */
function hashName(name: string): number {
  let hash = 2166136261;
  for (const char of name) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function tagColor(name: string): string {
  const key = name.trim().toLowerCase();
  const preset = PRESET[key];
  if (preset) return preset;
  return FALLBACK[hashName(key) % FALLBACK.length];
}
