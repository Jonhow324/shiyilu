import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

/**
 * 默认数据库文件路径：<项目根目录>/data/nav.db，可用 NAV_DB_PATH 覆盖。
 *
 * standalone 产物启动时会执行 process.chdir('.next/standalone')，这个目录每次构建都会被重建，
 * 数据放那儿会被下一次构建清掉。所以识别到这种工作目录时回退两级，把数据放回项目根。
 */
function defaultDbPath(): string {
  const cwd = process.cwd();
  const isStandalone =
    path.basename(cwd) === "standalone" &&
    path.basename(path.dirname(cwd)) === ".next";

  const root = isStandalone ? path.dirname(path.dirname(cwd)) : cwd;
  return path.join(root, "data", "nav.db");
}

/** 建表语句：仅在文件首次初始化时执行 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// dev 模式下模块会被反复求值，用 globalThis 缓存连接，避免重复打开同一个文件
const globalForDb = globalThis as unknown as { __navDb?: Database.Database };

function openDatabase(): Database.Database {
  const dbPath = process.env.NAV_DB_PATH?.trim() || defaultDbPath();

  // data/ 目录可能还不存在，自动创建
  // 注意：这里不要对路径做 path.resolve，否则 Turbopack 会把整个项目目录 trace 进产物
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.exec(SCHEMA);
  return db;
}

/**
 * 获取数据库单例（惰性初始化）。
 * 模块被 import 时不会立刻打开数据库，第一次真正访问时才建立连接。
 */
export function getDb(): Database.Database {
  if (!globalForDb.__navDb) {
    globalForDb.__navDb = openDatabase();
  }
  return globalForDb.__navDb;
}
