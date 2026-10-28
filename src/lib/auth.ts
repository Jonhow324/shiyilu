import { timingSafeEqual } from "node:crypto";

/**
 * 写入鉴权：网页端与 MCP 端共用同一把 NAV_TOKEN。
 * 未设置 NAV_TOKEN 时读操作照常，写操作一律 401。
 */

/** 读取配置的 token，未配置或只有空白时返回 null */
export function getConfiguredToken(): string | null {
  const token = process.env.NAV_TOKEN?.trim();
  return token ? token : null;
}

/** 从 Authorization 头里取出 Bearer token，没有或不合格式返回 null */
export function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;

  const matched = /^Bearer\s+(.+)$/i.exec(header.trim());
  return matched ? matched[1].trim() : null;
}

/** 请求是否持有有效 token。比较用定长时间比较，避免按字节爆破 */
export function isAuthorized(req: Request): boolean {
  const expected = getConfiguredToken();
  if (!expected) return false;

  const provided = extractBearerToken(req);
  if (!provided) return false;

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** 统一的 401 响应 */
export function unauthorizedResponse(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
