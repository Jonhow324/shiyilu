import type { NextRequest } from "next/server";
import { isAuthorized, unauthorizedResponse } from "@/lib/auth";
import { getBookmark, parseId } from "@/lib/bookmarks";
import { scheduleSnapshot } from "@/lib/capture";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/bookmarks/[id]/snapshot — 需要钥匙。
 * 只负责开工，不等抓取结束。已有快照就什么都不做。
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  try {
    const id = parseId((await context.params).id);
    if (!getBookmark(id)) {
      return Response.json({ error: "书签不存在" }, { status: 404 });
    }
    scheduleSnapshot(id);
    return Response.json({ ok: true }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
