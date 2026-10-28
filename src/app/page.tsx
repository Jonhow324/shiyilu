import type { ListOrder } from "@/lib/bookmarks";
import { listBookmarks } from "@/lib/bookmarks";
import type { CatalogView } from "@/lib/catalog";
import { catalogCount, summarizeCatalog } from "@/lib/catalog";
import { parseTagsParam } from "@/lib/http";
import ExhibitPage from "@/components/exhibit/ExhibitPage";

// 书签数据来自 SQLite，每次访问都要实时读，不能被构建期静态化
export const dynamic = "force-dynamic";

/** searchParams 的值可能是数组，取第一个就够了 */
function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** 首页：拾遗录。筛选参数与看法从地址栏来，服务端先筛再渲染 */
export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;

  const query = first(params.q).trim();
  const tags = parseTagsParam(first(params.tags));
  const order: ListOrder = first(params.order) === "oldest" ? "oldest" : "newest";
  // 缺省或 view=exhibit 都是陈列，只有 view=index 才是索引
  const view: CatalogView = first(params.view) === "index" ? "index" : "exhibit";

  const all = listBookmarks();
  const bookmarks = listBookmarks({ query, tags, order });
  const summary = summarizeCatalog(all, new Date().getFullYear());

  // 工具条上的计数是全库里带这个标签的 Bookmark 数，不随筛选变化
  const tagStats = summary.distribution.map((share) => ({
    tag: share.tag,
    count: catalogCount(all, share.tag),
  }));

  return (
    <ExhibitPage
      bookmarks={bookmarks}
      totalCount={all.length}
      summary={summary}
      tags={tagStats}
      query={query}
      selectedTags={tags}
      order={order}
      view={view}
    />
  );
}
