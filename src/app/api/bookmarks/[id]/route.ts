import type { NextRequest } from "next/server";
import { isAuthorized, unauthorizedResponse } from "@/lib/auth";
import {
  deleteBookmark,
  getBookmark,
  parseId,
  parseUpdateInput,
  updateBookmark,
} from "@/lib/bookmarks";
import { errorResponse } from "@/lib/http";

// 数据来自 SQLite，必须每次请求实时读取，不能被构建期静态化
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** GET /api/bookmarks/[id] — 公开，读取单条 */
export async function GET(_request: NextRequest, context: Context) {
  try {
    const { id: rawId } = await context.params;
    const bookmark = getBookmark(parseId(rawId));
    if (!bookmark) {
      return Response.json({ error: "书签不存在" }, { status: 404 });
    }
    return Response.json(bookmark);
  } catch (error) {
    return errorResponse(error);
  }
}

/** PATCH /api/bookmarks/[id] — 需要 Bearer token，局部更新 */
export async function PATCH(request: NextRequest, context: Context) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    const body: unknown = await request.json().catch(() => null);
    return Response.json(updateBookmark(id, parseUpdateInput(body)));
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/bookmarks/[id] — 需要 Bearer token */
export async function DELETE(request: NextRequest, context: Context) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  try {
    const { id: rawId } = await context.params;
    deleteBookmark(parseId(rawId));
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
