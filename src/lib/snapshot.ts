/**
 * 从抓回来的 HTML 里抽出能读的正文，再包成我们自己的一页。
 *
 * 不保留原站的脚本、样式和图片。抽出来的是当时的文字，不是一个还能点的网站。
 */

const MIN_TEXT_CHARS = 400;

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const n = Number(code);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    });
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]*>/g, " "));
}

/** 取 article，没有就 main，再没有就 body。都没有就用整段。 */
function pickRegion(html: string): string {
  for (const tag of ["article", "main", "body"]) {
    const matched = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(html);
    if (matched) return matched[1];
  }
  return html;
}

/**
 * 抽出正文段落。
 * 先去掉 script、style、导航和表单，再按块级标签切开。
 * 返回的纯文本（去掉空白）不足 400 字时返回 null。
 */
export function extractParagraphs(html: string): string[] | null {
  const withoutNoise = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|footer|form|header|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");

  const region = pickRegion(withoutNoise);
  const blocks = region
    .split(/<\/(?:p|h1|h2|h3|li|blockquote)>/i)
    .map((block) => stripTags(block).replace(/\s+/g, " ").trim())
    .filter((block) => block.length >= 20);

  const total = blocks.join("").replace(/\s/g, "").length;
  if (total < MIN_TEXT_CHARS) return null;
  return blocks;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 包成一页纸感的 HTML。不含脚本，也不含图片。 */
export function renderSnapshot(input: {
  title: string;
  url: string;
  capturedOn: string;
  paragraphs: string[];
}): string {
  const body = input.paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title)}</title>
<style>
  body { margin: 0; background: #f4f1ea; color: #191712; font-family: "Iowan Old Style", "Palatino Linotype", Palatino, serif; }
  main { max-width: 42rem; margin: 0 auto; padding: 4rem 1.5rem 6rem; }
  h1 { font-size: 2.4rem; line-height: 1.2; margin: 0 0 1rem; }
  .meta { font-family: ui-monospace, monospace; font-size: 0.75rem; letter-spacing: 0.08em; color: rgba(25,23,18,0.6); }
  .meta a { color: inherit; }
  p { font-size: 1.05rem; line-height: 1.9; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(input.title)}</h1>
  <p class="meta">${escapeHtml(input.capturedOn)} · <a href="${escapeHtml(input.url)}">${escapeHtml(input.url)}</a></p>
  ${body}
</main>
</body>
</html>
`;
}
