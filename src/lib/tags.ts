/**
 * 编辑层里的标签输入：一个输入框，逗号或空白都算分隔符。
 *
 * 与服务端的 normalizeTags 分开：那边接受数组、只按逗号切，是给 REST / MCP 用的；
 * 这里是给人填的字符串，空格也该断开。解析后仍然交给接口再规范化一次。
 */
export function parseTagInput(value: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value.split(/[,，\s]+/)) {
    const tag = item.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }

  return result;
}
