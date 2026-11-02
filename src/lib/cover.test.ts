import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { writeCover } from "./archive";
import { getDb } from "./db";
import { coverUpstreamUrl, handleCoverRequest, parseCoverTarget } from "./cover";

const originalFetch = globalThis.fetch;
const globalForDb = globalThis as unknown as { __navDb?: { close: () => void } };
const tempDirs: string[] = [];

function useFreshDatabase(): string {
  globalForDb.__navDb?.close();
  delete globalForDb.__navDb;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nav-cover-"));
  tempDirs.push(dir);
  process.env.NAV_DB_PATH = path.join(dir, "nav.db");
  process.env.NAV_ARCHIVE_DIR = dir;
  process.env.NAV_DISABLE_CAPTURE = "1";
  return dir;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalForDb.__navDb?.close();
  delete globalForDb.__navDb;
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
  tempDirs.length = 0;
});

describe("parseCoverTarget", () => {
  it("只接受 http/https 的合法地址", () => {
    assert.equal(parseCoverTarget("https://example.com/a").ok, true);
    for (const bad of ["ftp://example.com", "javascript:alert(1)", "not a url", ""]) {
      assert.equal(parseCoverTarget(bad).ok, false, bad);
    }
  });
});

describe("coverUpstreamUrl", () => {
  it("目标网址整段编码，宽度 1200", () => {
    const upstream = coverUpstreamUrl("https://example.com/a b");
    assert.ok(upstream.endsWith("?w=1200"));
    assert.ok(upstream.includes(encodeURIComponent("https://example.com/a b")));
  });
});

describe("handleCoverRequest", () => {
  it("非 http(s) 被拒，且不回显上游地址", async () => {
    const response = await handleCoverRequest("ftp://example.com/x");
    const text = await response.text();

    assert.equal(response.status, 400);
    assert.ok(!text.includes("mshots"));
  });

  it("没有文件时 404，不等待上游，body 不含 mshots", async () => {
    useFreshDatabase();
    getDb()
      .prepare("INSERT INTO bookmarks (title, url) VALUES (?, ?)")
      .run("示例", "https://example.com/page");

    const started = Date.now();
    const response = await handleCoverRequest("https://example.com/page");
    const text = await response.text();

    assert.ok(Date.now() - started < 1000);
    assert.equal(response.status, 404);
    assert.deepEqual(JSON.parse(text), { error: "显影中" });
    assert.ok(!text.includes("mshots"));
  });

  it("有文件时直接返回，不再问上游", async () => {
    useFreshDatabase();
    const result = getDb()
      .prepare("INSERT INTO bookmarks (title, url) VALUES (?, ?)")
      .run("示例", "https://example.com/page");
    writeCover(Number(result.lastInsertRowid), Buffer.from("stored-image"), "image/png");

    globalThis.fetch = () => {
      throw new Error("不该请求上游");
    };

    const response = await handleCoverRequest("https://example.com/page");

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.equal(await response.text(), "stored-image");
  });
});
