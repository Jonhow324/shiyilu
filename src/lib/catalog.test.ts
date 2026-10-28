import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Bookmark } from "./bookmarks";
import { catalogCount, padNo, summarizeCatalog } from "./catalog";

/** 造一条 Bookmark，只写关心的字段 */
function bookmark(
  id: number,
  overrides: Partial<Omit<Bookmark, "id">> = {},
): Bookmark {
  return {
    id,
    title: `书签 ${id}`,
    url: `https://example.com/${id}`,
    description: "",
    tags: [],
    created_at: "2024-01-01 00:00:00",
    updated_at: "2024-01-01 00:00:00",
    ...overrides,
  };
}

describe("padNo", () => {
  it("补零到三位，超过 999 不截断", () => {
    assert.equal(padNo(1), "001");
    assert.equal(padNo(22), "022");
    assert.equal(padNo(999), "999");
    assert.equal(padNo(1000), "1000");
  });
});

describe("catalogCount", () => {
  it("数的是带这个标签的 Bookmark 数，不是挂载次数", () => {
    const bookmarks = [
      bookmark(1, { tags: ["设计", "工具"] }),
      bookmark(2, { tags: ["设计"] }),
    ];

    assert.equal(catalogCount(bookmarks, "设计"), 2);
    assert.equal(catalogCount(bookmarks, "工具"), 1);
    assert.equal(catalogCount(bookmarks, "字体"), 0);
  });

  it("标签比较大小写不敏感", () => {
    const bookmarks = [bookmark(1, { tags: ["AI"] }), bookmark(2, { tags: ["ai"] })];
    assert.equal(catalogCount(bookmarks, "Ai"), 2);
  });
});

describe("summarizeCatalog", () => {
  it("空集合：updatedOn 为 null，addedYear 用调用方传入的今年", () => {
    const summary = summarizeCatalog([], 2030);

    assert.equal(summary.count, 0);
    assert.equal(summary.tagCount, 0);
    assert.equal(summary.totalTagAssignments, 0);
    assert.equal(summary.updatedOn, null);
    assert.equal(summary.addedYear, 2030);
    assert.equal(summary.addedInYear, 0);
    assert.deepEqual(summary.distribution, []);
  });

  it("收录数、标签数、最近收录日", () => {
    const summary = summarizeCatalog(
      [
        bookmark(1, { tags: ["设计", "工具"], created_at: "2024-01-08 00:00:00" }),
        bookmark(2, { tags: ["设计"], created_at: "2025-04-08 00:00:00" }),
      ],
      2026,
    );

    assert.equal(summary.count, 2);
    assert.equal(summary.tagCount, 2);
    assert.equal(summary.updatedOn, "2025.04.08");
  });

  it("标签数大小写不敏感，展示用首次出现的写法", () => {
    const summary = summarizeCatalog(
      [bookmark(1, { tags: ["AI"] }), bookmark(2, { tags: ["ai"] })],
      2026,
    );

    assert.equal(summary.tagCount, 1);
    assert.equal(summary.distribution[0]?.tag, "AI");
    assert.equal(summary.distribution[0]?.count, 2);
  });

  it("addedYear 取自最近收录日，不是调用方传的今年", () => {
    // 最近收录日是 2025-01-05，虽然调用方说今年是 2026，新增的仍是 2025 那一档
    const summary = summarizeCatalog(
      [
        bookmark(1, { created_at: "2024-12-31 00:00:00" }),
        bookmark(2, { created_at: "2025-01-05 00:00:00" }),
        bookmark(3, { created_at: "2025-03-02 00:00:00" }),
      ],
      2026,
    );

    assert.equal(summary.updatedOn, "2025.03.02");
    assert.equal(summary.addedYear, 2025);
    assert.equal(summary.addedInYear, 2);
  });

  it("一条 Bookmark 挂两个标签：catalogCount 各为 1，挂载次数各为 1，分母为 2", () => {
    const bookmarks = [bookmark(1, { tags: ["设计", "工具"] })];
    const summary = summarizeCatalog(bookmarks, 2026);

    assert.equal(summary.totalTagAssignments, 2);
    assert.equal(catalogCount(bookmarks, "设计"), 1);
    assert.equal(catalogCount(bookmarks, "工具"), 1);

    const design = summary.distribution.find((item) => item.tag === "设计");
    const tool = summary.distribution.find((item) => item.tag === "工具");
    assert.equal(design?.count, 1);
    assert.equal(tool?.count, 1);
    assert.equal(design?.percent, 50);
    assert.equal(tool?.percent, 50);

    assert.equal(summary.distribution.length, 2);
    assert.equal(design?.count, catalogCount(bookmarks, "设计"));
  });

  it("分母是挂载次数，四舍五入后百分比之和可以超过 100", () => {
    // a 挂 3 次、b 挂 3 次、c 挂 2 次，共 8 次挂载：38 + 38 + 25 = 101
    const summary = summarizeCatalog(
      [
        bookmark(1, { tags: ["a", "b"] }),
        bookmark(2, { tags: ["a", "b"] }),
        bookmark(3, { tags: ["a", "c"] }),
        bookmark(4, { tags: ["b", "c"] }),
      ],
      2026,
    );

    assert.equal(summary.totalTagAssignments, 8);
    const sum = summary.distribution.reduce((total, item) => total + item.percent, 0);
    assert.equal(sum, 101);
    assert.ok(sum > 100);
  });

  it("分母是挂载次数而不是 Bookmark 数", () => {
    // 两条 Bookmark 共 4 次挂载：每个标签 2/4 = 50%
    const summary = summarizeCatalog(
      [
        bookmark(1, { tags: ["设计", "工具"] }),
        bookmark(2, { tags: ["设计", "工具"] }),
      ],
      2026,
    );

    assert.equal(summary.count, 2);
    assert.equal(summary.totalTagAssignments, 4);
    for (const tag of ["设计", "工具"]) {
      const share = summary.distribution.find((item) => item.tag === tag);
      assert.equal(share?.count, 2);
      assert.equal(share?.percent, 50);
    }
  });

  it("百分比四舍五入到整数", () => {
    const summary = summarizeCatalog(
      [
        bookmark(1, { tags: ["a", "b"] }),
        bookmark(2, { tags: ["c"] }),
      ],
      2026,
    );

    // 1/3 => 33，四舍五入后仍是 33；三者相加 99 是四舍五入的正常结果
    assert.deepEqual(
      summary.distribution.map((item) => [item.tag, item.percent]),
      [
        ["a", 33],
        ["b", 33],
        ["c", 33],
      ],
    );
  });
});
