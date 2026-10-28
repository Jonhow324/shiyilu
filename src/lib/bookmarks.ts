import { getDb } from "./db";

/** 一条书签，tags 已从数据库的 JSON 字符串解析成数组 */
export interface Bookmark {
  id: number;
  title: string;
  url: string;
  description: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

/** 数据库里的原始行：tags 是 JSON 字符串 */
interface BookmarkRow {
  id: number;
  title: string;
  url: string;
  description: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

/** 带 HTTP 状态码的业务错误，API 层直接把它映射成响应 */
export class NavError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "NavError";
    this.status = status;
  }
}

export interface CreateInput {
  title: string;
  url: string;
  description?: string;
  tags?: string[];
}

export interface UpdateInput {
  title?: string;
  url?: string;
  description?: string;
  tags?: string[];
}

/** 列表排序：newest 收录日新的在前，oldest 收录日早的在前 */
export type ListOrder = "newest" | "oldest";

export interface ListOptions {
  /** 对 title + description + url 做大小写不敏感的模糊匹配 */
  query?: string;
  /** 标签过滤，语义见 listBookmarks 注释 */
  tags?: string[];
  /** 按收录日排序，默认 newest */
  order?: ListOrder;
}

function toBookmark(row: BookmarkRow): Bookmark {
  let tags: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.tags);
    if (Array.isArray(parsed)) {
      tags = parsed.filter((t): t is string => typeof t === "string");
    }
  } catch {
    // tags 字段损坏时退化为空数组，不让整条书签读不出来
    tags = [];
  }
  return { ...row, tags };
}

/** 转义 LIKE 通配符，避免用户输入的 % / _ 变成通配符 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * 把外部传入的标签整理成规范化数组：
 * 支持 "a, b" 这种逗号字符串，也支持数组；去空白、去空项、去重（保留首次出现的写法）。
 */
export function normalizeTags(input: unknown): string[] {
  const raw: string[] = Array.isArray(input)
    ? input.map((t) => (typeof t === "string" ? t : String(t ?? "")))
    : typeof input === "string"
      ? input.split(",")
      : [];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    const tag = item.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

/** 校验并整理创建参数，失败抛 NavError(400) */
export function parseCreateInput(raw: unknown): CreateInput {
  if (typeof raw !== "object" || raw === null) {
    throw new NavError("请求体必须是一个 JSON 对象", 400);
  }
  const input = raw as Record<string, unknown>;

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) throw new NavError("title 不能为空", 400);

  const url = typeof input.url === "string" ? input.url.trim() : "";
  if (!url) throw new NavError("url 不能为空", 400);
  if (!isValidUrl(url)) throw new NavError(`url 不是合法地址：${url}`, 400);

  const description =
    typeof input.description === "string" ? input.description.trim() : "";

  return { title, url, description, tags: normalizeTags(input.tags) };
}

/** 校验并整理更新参数，失败抛 NavError(400)；至少需要一个字段 */
export function parseUpdateInput(raw: unknown): UpdateInput {
  if (typeof raw !== "object" || raw === null) {
    throw new NavError("请求体必须是一个 JSON 对象", 400);
  }
  const input = raw as Record<string, unknown>;

  const patch: UpdateInput = {};

  if ("title" in input) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) throw new NavError("title 不能为空", 400);
    patch.title = title;
  }
  if ("url" in input) {
    const url = typeof input.url === "string" ? input.url.trim() : "";
    if (!url) throw new NavError("url 不能为空", 400);
    if (!isValidUrl(url)) throw new NavError(`url 不是合法地址：${url}`, 400);
    patch.url = url;
  }
  if ("description" in input) {
    if (typeof input.description !== "string") {
      throw new NavError("description 必须是字符串", 400);
    }
    patch.description = input.description.trim();
  }
  if ("tags" in input) {
    patch.tags = normalizeTags(input.tags);
  }

  if (Object.keys(patch).length === 0) {
    throw new NavError("没有需要更新的字段", 400);
  }
  return patch;
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** 把路径参数 / MCP 参数转成整数 id，非法抛 NavError(400) */
export function parseId(raw: unknown): number {
  const id = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new NavError(`id 不是合法的正整数：${String(raw)}`, 400);
  }
  return id;
}

/**
 * 查询书签列表。
 *
 * - query：对 title、description 和 url 做 LIKE 模糊匹配，大小写不敏感（SQLite LOWER()）。
 * - tags：**AND 语义**——返回同时带有全部指定标签的书签（选得越多结果越少）。
 *   这样左栏多选标签时行为是「逐步收窄」，符合直觉；需要「任一匹配」时调用方自己拆成多次查询并集。
 *   标签比较大小写不敏感。
 * - 排序：按收录日 created_at 排序（默认 newest：倒序，同值按 id 倒序；oldest：正序，同值按 id 正序），
 *   不再看 updated_at。
 */
export function listBookmarks(options: ListOptions = {}): Bookmark[] {
  const db = getDb();

  const where: string[] = [];
  const params: unknown[] = [];

  const query = options.query?.trim();
  if (query) {
    const like = `%${escapeLike(query.toLowerCase())}%`;
    where.push(
      "(LOWER(title) LIKE ? ESCAPE '\\' OR LOWER(description) LIKE ? ESCAPE '\\' OR LOWER(url) LIKE ? ESCAPE '\\')",
    );
    params.push(like, like, like);
  }

  const tags = (options.tags ?? []).map((t) => t.trim()).filter(Boolean);
  for (const tag of tags) {
    where.push(
      "EXISTS (SELECT 1 FROM json_each(bookmarks.tags) WHERE LOWER(json_each.value) = LOWER(?))",
    );
    params.push(tag);
  }

  const orderBy =
    options.order === "oldest"
      ? "datetime(created_at) ASC, id ASC"
      : "datetime(created_at) DESC, id DESC";

  const sql = `
    SELECT * FROM bookmarks
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY ${orderBy}
  `;

  return (db.prepare(sql).all(...params) as BookmarkRow[]).map(toBookmark);
}

/** 按 id 读取单条书签，不存在返回 null */
export function getBookmark(id: number): Bookmark | null {
  const row = getDb().prepare("SELECT * FROM bookmarks WHERE id = ?").get(id) as
    | BookmarkRow
    | undefined;
  return row ? toBookmark(row) : null;
}

/** 新建书签。url 重复时抛 NavError(409) */
export function createBookmark(input: CreateInput): Bookmark {
  const db = getDb();
  const tags = JSON.stringify(normalizeTags(input.tags ?? []));
  const description = input.description ?? "";

  try {
    const result = db
      .prepare(
        `INSERT INTO bookmarks (title, url, description, tags)
         VALUES (?, ?, ?, ?)`,
      )
      .run(input.title, input.url, description, tags);

    const created = getBookmark(Number(result.lastInsertRowid));
    if (!created) throw new NavError("写入后未找到新书签", 500);
    return created;
  } catch (error) {
    if (error instanceof NavError) throw error;
    if (isUniqueViolation(error)) {
      throw new NavError(`该网址已存在：${input.url}`, 409);
    }
    throw error;
  }
}

/** 更新书签的部分字段。不存在抛 NavError(404)，url 冲突抛 NavError(409) */
export function updateBookmark(id: number, patch: UpdateInput): Bookmark {
  const db = getDb();

  if (!getBookmark(id)) {
    throw new NavError(`书签不存在：${id}`, 404);
  }

  const sets: string[] = [];
  const params: unknown[] = [];

  if (patch.title !== undefined) {
    sets.push("title = ?");
    params.push(patch.title);
  }
  if (patch.url !== undefined) {
    sets.push("url = ?");
    params.push(patch.url);
  }
  if (patch.description !== undefined) {
    sets.push("description = ?");
    params.push(patch.description);
  }
  if (patch.tags !== undefined) {
    sets.push("tags = ?");
    params.push(JSON.stringify(patch.tags));
  }
  sets.push("updated_at = datetime('now')");
  params.push(id);

  try {
    db.prepare(`UPDATE bookmarks SET ${sets.join(", ")} WHERE id = ?`).run(
      ...params,
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new NavError(`该网址已存在：${patch.url}`, 409);
    }
    throw error;
  }

  const updated = getBookmark(id);
  if (!updated) throw new NavError(`书签不存在：${id}`, 404);
  return updated;
}

/** 删除书签。不存在抛 NavError(404) */
export function deleteBookmark(id: number): void {
  const result = getDb().prepare("DELETE FROM bookmarks WHERE id = ?").run(id);
  if (result.changes === 0) {
    throw new NavError(`书签不存在：${id}`, 404);
  }
}

export interface TagCount {
  tag: string;
  count: number;
}

/**
 * 列出全部标签及其使用次数，按次数倒序、标签名升序。
 * 大小写不同的同一标签会合并计数（展示用首次出现的写法）。
 */
export function listTags(): TagCount[] {
  const rows = getDb()
    .prepare(
      `SELECT json_each.value AS tag, COUNT(*) AS count
       FROM bookmarks, json_each(bookmarks.tags)
       WHERE json_each.type = 'text'
       GROUP BY json_each.value
       ORDER BY count DESC, tag ASC`,
    )
    .all() as { tag: string; count: number }[];

  const merged = new Map<string, TagCount>();
  for (const row of rows) {
    const key = row.tag.toLowerCase();
    const existing = merged.get(key);
    if (existing) {
      existing.count += row.count;
    } else {
      merged.set(key, { tag: row.tag, count: row.count });
    }
  }

  return [...merged.values()].sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String((error as { code: unknown }).code).startsWith("SQLITE_CONSTRAINT")
  );
}
