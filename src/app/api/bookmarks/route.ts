import type { NextRequest } from "next/server";
import { isAuthorized, unauthorizedResponse } from "@/lib/auth";
import { createBookmark, listBookmarks, parseCreateInput } from "@/lib/bookmarks";
import { errorResponse, parseTagsParam } from "@/lib/http";

// 数据来自 SQLite，必须每次请求实时读取，不能被构建期静态化
export const dynamic = "force-dynamic";

/** GET /api/bookmarks — 公开。支持 ?q=关键字&tags=a,b */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() || undefined;
  const tags = parseTagsParam(params.get("tags"));

  return Response.json(listBookmarks({ query, tags }));
}

/** POST /api/bookmarks — 需要 Bearer token，成功返回 201 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  try {
    const body: unknown = await request.json().catch(() => null);
    const created = createBookmark(parseCreateInput(body));
    return Response.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
