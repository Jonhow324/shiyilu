import { getDb } from "./db";
import { readCover } from "./archive";
import { scheduleCapture } from "./capture";

/**
 * 封面：浏览器只找自己的 /api/cover。
 *
 * 文件在 data/covers。有就直接给；没有就让后台去抓，这次请求立刻返回「显影中」，
 * 不等 mShots。上游地址不会出现在响应里。
 */

const COVER_WIDTH = 1200;

export type CoverTarget =
  | { ok: true; url: string }
  | { ok: false; message: string };

/** 校验 ?url=：只接受 http/https 的合法绝对地址 */
export function parseCoverTarget(raw: string | null | undefined): CoverTarget {
  const value = raw?.trim();
  if (!value) return { ok: false, message: "缺少 url 参数" };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, message: "url 不是合法地址" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, message: "只接受 http/https 地址" };
  }
  return { ok: true, url: value };
}

/** 拼上游取图地址。只在服务器抓取时用，不回给浏览器。 */
export function coverUpstreamUrl(target: string): string {
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(target)}?w=${COVER_WIDTH}`;
}

function developing(): Response {
  return Response.json({ error: "显影中" }, { status: 404 });
}

/**
 * GET /api/cover 的全部逻辑。
 * 找不到 Bookmark、或磁盘上还没有图，都是「显影中」。
 */
export function handleCoverRequest(rawUrl: string | null | undefined): Response {
  const target = parseCoverTarget(rawUrl);
  if (!target.ok) {
    return Response.json({ error: target.message }, { status: 400 });
  }

  const row = getDb()
    .prepare("SELECT id FROM bookmarks WHERE url = ?")
    .get(target.url) as { id: number } | undefined;

  if (!row) return developing();

  const stored = readCover(row.id);
  if (!stored) {
    scheduleCapture(row.id);
    return developing();
  }

  return new Response(new Uint8Array(stored.body), {
    status: 200,
    headers: {
      "Content-Type": stored.contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
