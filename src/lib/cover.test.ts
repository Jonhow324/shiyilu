import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  coverUpstreamUrl,
  handleCoverRequest,
  parseCoverTarget,
} from "./cover";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(impl: typeof fetch): void {
  globalThis.fetch = impl;
}

describe("parseCoverTarget", () => {
  it("只接受 http/https 的合法地址", () => {
    assert.deepEqual(parseCoverTarget("https://example.com/a"), {
      ok: true,
      url: "https://example.com/a",
    });
    assert.equal(parseCoverTarget("http://example.com").ok, true);

    for (const bad of ["ftp://example.com", "javascript:alert(1)", "not a url", ""]) {
      assert.equal(parseCoverTarget(bad).ok, false, bad);
    }
    assert.equal(parseCoverTarget(null).ok, false);
  });
});

describe("coverUpstreamUrl", () => {
  it("目标网址整段编码，宽度 1200", () => {
    const upstream = coverUpstreamUrl("https://example.com/a b?c=1&d=2");

    assert.ok(upstream.endsWith("?w=1200"));
    assert.ok(upstream.includes(encodeURIComponent("https://example.com/a b?c=1&d=2")));
  });
});

describe("handleCoverRequest", () => {
  it("非 http(s) 被拒，且不回显上游地址", async () => {
    mockFetch(() => {
      throw new Error("不该请求上游");
    });

    const response = await handleCoverRequest("ftp://example.com/x");
    const text = await response.text();

    assert.equal(response.status, 400);
    assert.ok(text.includes("error"));
    assert.ok(!text.includes("mshots"));
    assert.ok(!text.includes("s.wordpress.com"));
  });

  it("https 会去请求上游，并原样回图片字节", async () => {
    const calls: string[] = [];
    mockFetch(async (input) => {
      calls.push(String(input));
      return new Response("fake-image-bytes", {
        status: 200,
        headers: { "content-type": "image/jpeg; charset=binary" },
      });
    });

    const response = await handleCoverRequest("https://example.com/page");

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0],
      "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fexample.com%2Fpage?w=1200",
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.equal(
      response.headers.get("cache-control"),
      "public, max-age=86400",
    );

    const text = await response.text();
    assert.equal(text, "fake-image-bytes");
    assert.ok(!text.includes("mshots"));
  });

  it("上游 500 时 404，body 是「显影中」且不含上游字样", async () => {
    mockFetch(async () => new Response("upstream boom", { status: 500 }));

    const response = await handleCoverRequest("https://example.com/page");
    const text = await response.text();

    assert.equal(response.status, 404);
    assert.deepEqual(JSON.parse(text), { error: "显影中" });
    assert.ok(!text.includes("mshots"));
    assert.ok(!text.includes("s.wordpress.com"));
  });

  it("上游返回的不是图片时也是显影中", async () => {
    mockFetch(
      async () =>
        new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
    );

    const response = await handleCoverRequest("https://example.com/page");

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "显影中" });
  });

  it("超时或网络错误时也是显影中", async () => {
    mockFetch(async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    });

    const response = await handleCoverRequest("https://example.com/page");

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "显影中" });
  });
});
