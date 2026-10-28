import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tagColor } from "./tag-color";

describe("tagColor", () => {
  it("稿子里的十个标签用固定色", () => {
    assert.deepEqual(
      {
        设计: tagColor("设计"),
        开发: tagColor("开发"),
        工具: tagColor("工具"),
        灵感: tagColor("灵感"),
        字体: tagColor("字体"),
        色彩: tagColor("色彩"),
        素材: tagColor("素材"),
        阅读: tagColor("阅读"),
        AI: tagColor("AI"),
        效率: tagColor("效率"),
      },
      {
        设计: "#d23f1c",
        开发: "#2b4c7e",
        工具: "#5b6b3a",
        灵感: "#c8902e",
        字体: "#7a3b5c",
        色彩: "#2f6f6a",
        素材: "#9c4a2b",
        阅读: "#4a4a4a",
        AI: "#6f8faf",
        效率: "#8a8456",
      },
    );
  });

  it("同一个名字永远同色，大小写不影响", () => {
    assert.equal(tagColor("灵感"), tagColor("灵感"));
    assert.equal(tagColor("AI"), tagColor(" ai "));
    assert.equal(tagColor("开源项目"), tagColor("开源项目"));
  });

  it("其余标签落在备用色板里，不同名字通常不同色", () => {
    const palette = new Set([
      "#6b705c",
      "#8a6f4b",
      "#5f7a86",
      "#7c5f7a",
      "#a4703f",
      "#4f6b5a",
      "#7a6b8a",
      "#8d5f52",
    ]);

    const names = ["开源项目", "浏览器", "数据库", "排版", "浏览器扩展", "摄影"];
    const colors = names.map((name) => tagColor(name));

    for (const color of colors) {
      assert.ok(palette.has(color), `${color} 不在备用色板里`);
      assert.match(color, /^#[0-9a-f]{6}$/);
    }
    assert.ok(new Set(colors).size >= 3);
  });
});
