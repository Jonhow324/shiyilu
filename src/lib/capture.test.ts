import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, beforeEach, describe, it } from "node:test";
import { coverPath, snapshotPath } from "./archive";
import { createBookmark, deleteBookmark } from "./bookmarks";
import { isRealCover } from "./cover";
import { captureCover, captureSnapshot } from "./capture";
import { getDb } from "./db";

const globalForDb = globalThis as unknown as { __navDb?: { close: () => void } };
const tempDirs: string[] = [];
const originalFetch = globalThis.fetch;

function useFreshDatabase(): void {
  globalForDb.__navDb?.close();
  delete globalForDb.__navDb;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nav-capture-"));
  tempDirs.push(dir);
  process.env.NAV_DB_PATH = path.join(dir, "nav.db");
  process.env.NAV_ARCHIVE_DIR = dir;
  process.env.NAV_DISABLE_CAPTURE = "1";
  process.env.NAV_COVER_RETRY_MS = "0";
}

beforeEach(() => {
  useFreshDatabase();
});

after(() => {
  globalThis.fetch = originalFetch;
  globalForDb.__navDb?.close();
  delete globalForDb.__navDb;
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function imageResponse(bytes: number, contentType = "image/jpeg", status = 200): Response {
  return new Response(Buffer.alloc(bytes, 1), {
    status,
    headers: { "content-type": contentType },
  });
}

describe("isRealCover", () => {
  it("小图、GIF 占位、非图片、非 2xx 都不算", () => {
    assert.equal(isRealCover(200, "image/jpeg", 20_000), true);
    assert.equal(isRealCover(200, "image/jpeg", 19_999), false);
    assert.equal(isRealCover(200, "image/gif", 50_000), false);
    assert.equal(isRealCover(200, "image/gif", 8737), false);
    assert.equal(isRealCover(200, "text/html", 50_000), false);
    assert.equal(isRealCover(500, "image/jpeg", 50_000), false);
  });
});

describe("captureCover", () => {
  it("占位图不落盘，合格图片会重试后落盘", async () => {
    const bookmark = createBookmark({ title: "示例", url: "https://example.com/a" });
    const calls: string[] = [];

    globalThis.fetch = async (input) => {
      calls.push(String(input));
      if (calls.length === 1) return imageResponse(8737, "image/gif");
      return imageResponse(25_000);
    };

    await captureCover(bookmark.id);

    assert.equal(calls.length, 2);
    assert.ok(calls[0].includes("mshots"));
    assert.ok(fs.existsSync(coverPath(bookmark.id)));
    assert.ok(fs.readFileSync(coverPath(bookmark.id)).byteLength >= 20_000);
  });
});

describe("captureSnapshot", () => {
  it("正文不足 400 字不写快照", async () => {
    const bookmark = createBookmark({ title: "短", url: "https://example.com/short" });
    globalThis.fetch = async () =>
      new Response("<html><body><p>太短了。</p></body></html>", { status: 200 });

    await captureSnapshot(bookmark.id);

    assert.equal(fs.existsSync(snapshotPath(bookmark.id)), false);
  });

  it("够长的正文写成没有脚本的 HTML", async () => {
    const bookmark = createBookmark({ title: "长文", url: "https://example.com/long" });
    const paragraph = "这是一段会被留下来的正文。".repeat(40);
    globalThis.fetch = async () =>
      new Response(
        `<html><body><script>alert(1)</script><article><p>${paragraph}</p></article></body></html>`,
        { status: 200 },
      );

    await captureSnapshot(bookmark.id);

    const html = fs.readFileSync(snapshotPath(bookmark.id), "utf8");
    assert.ok(!html.includes("<script"));
    assert.ok(html.includes("长文"));
    assert.ok(html.includes("这是一段会被留下来的正文。"));
  });
});

describe("删除 Bookmark", () => {
  it("封面和快照一起删掉", async () => {
    const bookmark = createBookmark({ title: "要删", url: "https://example.com/gone" });
    const paragraph = "留下来的正文。".repeat(80);
    globalThis.fetch = async (input) => {
      const target = String(input);
      if (target.includes("mshots")) return imageResponse(25_000);
      return new Response(`<article><p>${paragraph}</p></article>`, { status: 200 });
    };

    await captureCover(bookmark.id);
    await captureSnapshot(bookmark.id);
    assert.equal(fs.existsSync(coverPath(bookmark.id)), true);
    assert.equal(fs.existsSync(snapshotPath(bookmark.id)), true);

    deleteBookmark(bookmark.id);

    assert.equal(fs.existsSync(coverPath(bookmark.id)), false);
    assert.equal(fs.existsSync(snapshotPath(bookmark.id)), false);
    const { n } = getDb().prepare("SELECT COUNT(*) AS n FROM bookmarks").get() as { n: number };
    assert.equal(n, 0);
  });
});
