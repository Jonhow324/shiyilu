import type { NextRequest } from "next/server";
import { handleCoverRequest } from "@/lib/cover";

// 封面按需现取，不进缓存层，也不在构建期执行
export const dynamic = "force-dynamic";

/** GET /api/cover?url= — 代浏览器向截图服务取图，取不到返回 404「显影中」 */
export async function GET(request: NextRequest) {
  return handleCoverRequest(request.nextUrl.searchParams.get("url"));
}
