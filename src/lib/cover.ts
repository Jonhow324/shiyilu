/**
 * 封面代理：浏览器只找自己的 /api/cover，服务端再去截图服务取图（见 ADR-0004）。
 *
 * 取不到不是错误，是「显影中」——所有失败都收敛成 404 + 一句话，调用方据此显示占位。
 * 这里不打印、不回显上游地址，响应体里也不会出现截图服务的域名。
 */

/** 上游截图服务的宽度参数 */
const COVER_WIDTH = 1200;

/** 上游超时：超过就当作取不到 */
export const COVER_TIMEOUT_MS = 8000;

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

/** 拼上游取图地址：目标网址整段编码，w 固定 1200 */
export function coverUpstreamUrl(target: string): string {
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(target)}?w=${COVER_WIDTH}`;
}

export type CoverImage =
  | { ok: true; body: ArrayBuffer; contentType: string }
  | { ok: false };

/**
 * 取一张封面。
 * 上游非 2xx、超时、抛错、返回非图片、空响应，一律 ok: false。
 */
export async function loadCover(
  target: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = COVER_TIMEOUT_MS,
): Promise<CoverImage> {
  try {
    const response = await fetchImpl(coverUpstreamUrl(target), {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });

    if (!response.ok) return { ok: false };

    // 上游的 Content-Type 可能带 charset；没有就按 jpeg 处理
    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (contentType && !contentType.startsWith("image/")) return { ok: false };

    const body = await response.arrayBuffer();
    if (body.byteLength === 0) return { ok: false };

    return { ok: true, body, contentType: contentType || "image/jpeg" };
  } catch {
    // 超时、网络错误、读到一半断开，都算取不到
    return { ok: false };
  }
}

/** GET /api/cover 的全部逻辑；路由本身只负责把参数递进来 */
export async function handleCoverRequest(
  rawUrl: string | null | undefined,
): Promise<Response> {
  const target = parseCoverTarget(rawUrl);
  if (!target.ok) {
    return Response.json({ error: target.message }, { status: 400 });
  }

  const image = await loadCover(target.url);
  if (!image.ok) {
    return Response.json({ error: "显影中" }, { status: 404 });
  }

  return new Response(image.body, {
    status: 200,
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
