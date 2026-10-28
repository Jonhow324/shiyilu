import { listTags } from "@/lib/bookmarks";

// 数据来自 SQLite，必须每次请求实时读取，不能被构建期静态化
export const dynamic = "force-dynamic";

/** GET /api/tags — 公开，返回 [{ tag, count }] */
export async function GET() {
  return Response.json(listTags());
}
