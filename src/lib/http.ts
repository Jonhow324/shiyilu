import { NavError } from "./bookmarks";

/** 把已知错误映射成 JSON 响应，未知错误一律 500 且不外泄细节 */
export function errorResponse(error: unknown): Response {
  if (error instanceof NavError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("[nav] 未处理错误", error);
  return Response.json({ error: "internal error" }, { status: 500 });
}

/** 解析 ?tags=a,b 这类逗号分隔的查询参数 */
export function parseTagsParam(raw: string | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
