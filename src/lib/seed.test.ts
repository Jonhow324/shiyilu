import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, beforeEach, describe, it } from "node:test";
import { getDb } from "./db";
import { listBookmarks } from "./bookmarks";
import { summarizeCatalog } from "./catalog";
import { seedBookmarks } from "./seed";

// getDb() 把连接缓存在 globalThis.__navDb 上，每个用例前必须关掉并清掉缓存，否则会串库
const globalForDb = globalThis as unknown as {
  __navDb?: { close: () => void };
};

const tempDirs: string[] = [];

function useFreshDatabase(): void {
  globalForDb.__navDb?.close();
  delete globalForDb.__navDb;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nav-test-"));
  tempDirs.push(dir);
  process.env.NAV_DB_PATH = path.join(dir, "nav.db");
  process.env.NAV_ARCHIVE_DIR = dir;
  process.env.NAV_DISABLE_CAPTURE = "1";
}

beforeEach(() => {
  useFreshDatabase();
});

after(() => {
  globalForDb.__navDb?.close();
  delete globalForDb.__navDb;
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

interface Row {
  id: number;
  title: string;
  url: string;
  created_at: string;
  updated_at: string;
}

function allRows(): Row[] {
  return getDb()
    .prepare("SELECT id, title, url, created_at, updated_at FROM bookmarks ORDER BY id")
    .all() as Row[];
}

interface InsertRow {
  title: string;
  url: string;
  created_at: string;
  updated_at: string;
  description?: string;
  tags?: string[];
}

function insertRow(input: InsertRow): number {
  const result = getDb()
    .prepare(
      `INSERT INTO bookmarks (title, url, description, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.title,
      input.url,
      input.description ?? "",
      JSON.stringify(input.tags ?? []),
      input.created_at,
      input.updated_at,
    );
  return Number(result.lastInsertRowid);
}

describe("seedBookmarks", () => {
  it("空库跑一次得到 22 条，Figma 是 1 号、tldraw 是 22 号", () => {
    const result = seedBookmarks();

    assert.deepEqual(result, { inserted: 22, total: 22 });

    const rows = allRows();
    assert.equal(rows.length, 22);

    const figma = rows[0];
    assert.equal(figma.id, 1);
    assert.equal(figma.title, "Figma");
    assert.equal(figma.url, "https://figma.com");
    assert.equal(figma.created_at, "2024-01-08 00:00:00");
    assert.equal(figma.updated_at, "2024-01-08 00:00:00");

    const tldraw = rows[21];
    assert.equal(tldraw.id, 22);
    assert.equal(tldraw.title, "tldraw");
    assert.equal(tldraw.url, "https://tldraw.com");
    assert.equal(tldraw.created_at, "2025-04-08 00:00:00");
    assert.equal(tldraw.updated_at, "2025-04-08 00:00:00");

    // 插入顺序是收录日从早到晚
    const ids = rows.map((row) => row.id);
    assert.deepEqual(ids, Array.from({ length: 22 }, (_, index) => index + 1));
    const dates = rows.map((row) => row.created_at);
    assert.deepEqual([...dates].sort(), dates);

    assert.equal(
      rows.find((row) => row.url === "https://developer.mozilla.org")?.created_at,
      "2024-01-15 00:00:00",
    );
  });

  it("再跑一次不产生重复行", () => {
    seedBookmarks();
    const again = seedBookmarks();

    assert.deepEqual(again, { inserted: 0, total: 22 });
    assert.equal(allRows().length, 22);
  });

  it("库里有别的 Bookmark 时不归零，新行接在后面", () => {
    const mineId = insertRow({
      title: "我自己的书签",
      url: "https://example.com/mine",
      created_at: "2023-05-01 00:00:00",
      updated_at: "2023-05-01 00:00:00",
    });
    const legacyId = insertRow({
      title: "GitHub",
      url: "https://github.com",
      created_at: "2023-05-02 00:00:00",
      updated_at: "2023-05-02 00:00:00",
    });
    assert.equal(mineId, 1);
    assert.equal(legacyId, 2);

    const result = seedBookmarks();

    assert.deepEqual(result, { inserted: 22, total: 23 });

    const rows = allRows();
    assert.equal(rows.length, 23);

    const mine = rows.find((row) => row.url === "https://example.com/mine");
    assert.equal(mine?.id, mineId);
    assert.ok(!rows.some((row) => row.url === "https://github.com"));

    const seededIds = rows
      .filter((row) => row.id !== mineId)
      .map((row) => row.id);
    assert.equal(seededIds.length, 22);
    assert.ok(seededIds.every((id) => id > mineId));
    assert.ok(seededIds.includes(3));
  });

  it("只按 URL 删掉那 8 条旧示例", () => {
    const legacyUrls = [
      "https://github.com",
      "https://developer.mozilla.org",
      "https://vite.dev",
      "https://docs.anthropic.com",
      "https://modelcontextprotocol.io",
      "https://nextjs.org",
      "https://www.sqlite.org",
      "https://tailwindcss.com",
    ];
    for (const url of legacyUrls) {
      insertRow({
        title: url,
        url,
        created_at: "2023-01-01 00:00:00",
        updated_at: "2023-01-01 00:00:00",
      });
    }

    seedBookmarks();

    const rows = allRows();
    assert.equal(rows.length, 22);
    assert.ok(!rows.some((row) => row.url === "https://github.com"));
    assert.ok(!rows.some((row) => row.url === "https://vite.dev"));
    // MDN 在稿子里，删掉旧行后应当重新写入
    assert.equal(
      rows.filter((row) => row.url === "https://developer.mozilla.org").length,
      1,
    );
  });
});

describe("listBookmarks 检索", () => {
  it("匹配 url，大小写不敏感", () => {
    seedBookmarks();

    const byHost = listBookmarks({ query: "TLDRAW.COM" });
    assert.deepEqual(
      byHost.map((bookmark) => bookmark.title),
      ["tldraw"],
    );

    const byTitle = listBookmarks({ query: "figma" });
    assert.deepEqual(
      byTitle.map((bookmark) => bookmark.title),
      ["Figma"],
    );

    const byDescription = listBookmarks({ query: "着色器" });
    assert.deepEqual(
      byDescription.map((bookmark) => bookmark.title),
      ["Shadertoy"],
    );
  });

  it("不匹配无关词", () => {
    seedBookmarks();
    assert.deepEqual(listBookmarks({ query: "zzzznotfound" }), []);
  });

  it("LIKE 通配符仍然被转义", () => {
    seedBookmarks();
    assert.deepEqual(listBookmarks({ query: "%" }), []);
    assert.deepEqual(listBookmarks({ query: "_" }), []);
  });
});

describe("listBookmarks 标签过滤", () => {
  it("多个标签是 AND 语义", () => {
    seedBookmarks();

    const both = listBookmarks({ tags: ["灵感", "设计"] });
    assert.deepEqual(
      both.map((bookmark) => bookmark.title).sort(),
      ["Godly", "Mobbin"],
    );

    const single = listBookmarks({ tags: ["设计"] });
    assert.ok(single.length > both.length);

    const none = listBookmarks({ tags: ["灵感", "设计", "字体"] });
    assert.deepEqual(none, []);
  });
});

describe("listBookmarks 排序", () => {
  it("默认按收录日倒序，不看 updated_at", () => {
    seedBookmarks();

    // 收录日最晚的是 tldraw；另外造一条收录早但改得晚的
    const earlyId = insertRow({
      title: "早收录晚修改",
      url: "https://example.com/early",
      created_at: "2023-06-01 00:00:00",
      updated_at: "2026-01-01 00:00:00",
    });

    const newest = listBookmarks();
    assert.equal(newest[0].title, "tldraw");
    assert.notEqual(newest[0].id, earlyId);
    assert.equal(newest[newest.length - 1].id, earlyId);

    const oldest = listBookmarks({ order: "oldest" });
    assert.equal(oldest[0].id, earlyId);
    assert.equal(oldest[oldest.length - 1].title, "tldraw");

    // 同一天收录时按 id 倒序
    const sameA = insertRow({
      title: "同日 A",
      url: "https://example.com/same-a",
      created_at: "2025-04-08 00:00:00",
      updated_at: "2025-04-08 00:00:00",
    });
    const sameB = insertRow({
      title: "同日 B",
      url: "https://example.com/same-b",
      created_at: "2025-04-08 00:00:00",
      updated_at: "2025-04-08 00:00:00",
    });
    const byNewest = listBookmarks();
    assert.deepEqual([byNewest[0].id, byNewest[1].id], [sameB, sameA]);

    const byOldest = listBookmarks({ order: "oldest" });
    assert.deepEqual(
      [byOldest[byOldest.length - 2].id, byOldest[byOldest.length - 1].id],
      [sameA, sameB],
    );
  });
});

describe("页眉事实（22 条种子）", () => {
  it("最近收录日 2025-04-08，addedYear 2025 的计数是 4", () => {
    seedBookmarks();

    const summary = summarizeCatalog(listBookmarks(), 2026);

    assert.equal(summary.count, 22);
    assert.equal(summary.tagCount, 10);
    assert.equal(summary.updatedOn, "2025.04.08");
    assert.equal(summary.addedYear, 2025);
    assert.equal(summary.addedInYear, 4);
  });
});
