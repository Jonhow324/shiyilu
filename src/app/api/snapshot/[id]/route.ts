import { readSnapshot } from "@/lib/archive";
import { parseId } from "@/lib/bookmarks";

export const dynamic = "force-dynamic";

/** GET /api/snapshot/[id] — 公开。有文件就返回那一页正文，没有就 404。 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let id: number;
  try {
    id = parseId((await context.params).id);
  } catch {
    return Response.json({ error: "没有快照" }, { status: 404 });
  }

  const html = readSnapshot(id);
  if (!html) return Response.json({ error: "没有快照" }, { status: 404 });

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
