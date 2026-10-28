import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTagInput } from "./tags";

describe("parseTagInput", () => {
  it("逗号、中文逗号、空格都算分隔符", () => {
    assert.deepEqual(parseTagInput("设计, 工具  灵感"), ["设计", "工具", "灵感"]);
    assert.deepEqual(parseTagInput("设计，工具"), ["设计", "工具"]);
    assert.deepEqual(parseTagInput("  设计   工具  "), ["设计", "工具"]);
  });

  it("空串和只有分隔符时返回空数组", () => {
    assert.deepEqual(parseTagInput(""), []);
    assert.deepEqual(parseTagInput(" , ，  "), []);
  });

  it("大小写不敏感去重，保留首次出现的写法", () => {
    assert.deepEqual(parseTagInput("AI, ai, Ai, 效率"), ["AI", "效率"]);
  });
});
