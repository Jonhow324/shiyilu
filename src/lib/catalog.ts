import type { Bookmark } from "./bookmarks";

/** 编号：id 补零到至少三位（1 => "001"），超过 999 不截断 */
export function padNo(id: number): string {
  return String(id).padStart(3, "0");
}

/** 带某个标签的 Bookmark 数，标签比较大小写不敏感 */
export function catalogCount(bookmarks: Bookmark[], tag: string): number {
  const key = tag.trim().toLowerCase();
  if (!key) return 0;
  return bookmarks.filter((bookmark) =>
    bookmark.tags.some((item) => item.trim().toLowerCase() === key),
  ).length;
}

/** 单个标签的挂载次数与占全部挂载次数的百分比 */
export interface TagShare {
  /** 展示用的写法：该标签首次出现时的写法 */
  tag: string;
  count: number;
  /** 四舍五入到整数；全部挂载次数为 0 时是 0 */
  percent: number;
}

/** 拾遗录页眉需要的事实 */
export interface CatalogSummary {
  /** 收录数：Bookmark 条数 */
  count: number;
  /** 标签数：去重后的标签数（大小写不敏感） */
  tagCount: number;
  /** 挂载次数：所有 Bookmark 的标签数量之和 */
  totalTagAssignments: number;
  /** 最近一条收录日，YYYY.MM.DD；没有 Bookmark 时为 null */
  updatedOn: string | null;
  /** 最近一条收录日的年份；没有 Bookmark 时是调用方传入的今年 */
  addedYear: number;
  /** 收录日落在 addedYear 的 Bookmark 数 */
  addedInYear: number;
  /** 标签分布，按挂载次数倒序、标签名升序 */
  distribution: TagShare[];
}

const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/** 从 SQLite 的 `YYYY-MM-DD HH:MM:SS` 里取年月日，避免时区参与 */
function parseCollectedOn(value: string): {
  year: number;
  month: string;
  day: string;
  ordinal: number;
} | null {
  const matched = DATE_PREFIX.exec(value.trim());
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = matched[2];
  const day = matched[3];
  return { year, month, day, ordinal: year * 10000 + Number(month) * 100 + Number(day) };
}

/**
 * 汇总拾遗录页眉与标签分布。
 *
 * - 纯函数：不读时钟，没有 Bookmark 时用 `thisYear` 作为 addedYear。
 * - 标签分布的分母是挂载次数而不是 Bookmark 数，一条 Bookmark 挂两个标签时两边各计一次，
 *   所以百分比之和可以超过 100。
 */
export function summarizeCatalog(
  bookmarks: Bookmark[],
  thisYear: number,
): CatalogSummary {
  let latest: ReturnType<typeof parseCollectedOn> = null;
  const merged = new Map<string, { tag: string; count: number }>();
  let totalTagAssignments = 0;

  for (const bookmark of bookmarks) {
    const collected = parseCollectedOn(bookmark.created_at);
    if (collected && (!latest || collected.ordinal > latest.ordinal)) {
      latest = collected;
    }

    for (const raw of bookmark.tags) {
      const tag = raw.trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      const existing = merged.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        merged.set(key, { tag, count: 1 });
      }
      totalTagAssignments += 1;
    }
  }

  const distribution: TagShare[] = [...merged.values()]
    .map(({ tag, count }) => ({
      tag,
      count,
      percent:
        totalTagAssignments === 0
          ? 0
          : Math.round((count / totalTagAssignments) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  const addedYear = latest ? latest.year : thisYear;
  const addedInYear = bookmarks.filter(
    (bookmark) => parseCollectedOn(bookmark.created_at)?.year === addedYear,
  ).length;

  return {
    count: bookmarks.length,
    tagCount: merged.size,
    totalTagAssignments,
    updatedOn: latest ? `${latest.year}.${latest.month}.${latest.day}` : null,
    addedYear,
    addedInYear,
    distribution,
  };
}
