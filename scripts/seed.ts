import { seedBookmarks } from "../src/lib/seed";

// 可重复执行：已存在的 url 会被 INSERT OR IGNORE 跳过
const result = seedBookmarks();
console.log(
  `seed 完成：新增 ${result.inserted} 条，当前共 ${result.total} 条书签`,
);
