import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { verifyToken } from "./token-check";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

interface Captured {
  url: string;
  method: string;
  authorization: string | null;
  contentType: string | null;
  body: string;
}

function mockFetch(
  status: number,
  captured: Captured[] = [],
): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    captured.push({
      url: String(input),
      method: init?.method ?? "GET",
      authorization: headers.get("authorization"),
      contentType: headers.get("content-type"),
      body: typeof init?.body === "string" ? init.body : "",
    });
    return new Response(null, { status });
  }) as typeof fetch;
}

describe("verifyToken", () => {
  it("404 说明钥匙对，书签不存在", async () => {
    mockFetch(404);
    assert.equal(await verifyToken("secret"), "ok");
  });

  it("401 说明钥匙不对", async () => {
    mockFetch(401);
    assert.equal(await verifyToken("wrong"), "invalid");
  });

  it("其它状态与网络错误都不下结论", async () => {
    mockFetch(500);
    assert.equal(await verifyToken("secret"), "unknown");

    globalThis.fetch = (async () => {
      throw new TypeError("network down");
    }) as typeof fetch;
    assert.equal(await verifyToken("secret"), "unknown");
  });

  it("拿 token 去 PATCH 一个不存在的编号，不是新建书签", async () => {
    const captured: Captured[] = [];
    mockFetch(404, captured);

    await verifyToken("secret");

    assert.equal(captured.length, 1);
    assert.equal(captured[0].method, "PATCH");
    assert.equal(captured[0].url, "/api/bookmarks/999999999");
    assert.equal(captured[0].authorization, "Bearer secret");
    assert.equal(captured[0].contentType, "application/json");
    assert.deepEqual(JSON.parse(captured[0].body), { description: "" });
  });
});
