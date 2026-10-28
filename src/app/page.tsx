import NavApp from "@/components/NavApp";
import { listBookmarks, listTags } from "@/lib/bookmarks";

// 书签数据来自 SQLite，每次访问都要实时读，不能被构建期静态化
export const dynamic = "force-dynamic";

/** 首页：Server Component 直接读库拿初始数据，交给客户端组件做交互 */
export default function Home() {
  const bookmarks = listBookmarks();
  const tags = listTags();

  return <NavApp initialBookmarks={bookmarks} initialTags={tags} />;
}
