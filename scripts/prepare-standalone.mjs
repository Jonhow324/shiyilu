import fs from "node:fs";
import path from "node:path";

/**
 * 补全 standalone 产物：Next 的 output: 'standalone' 只产出 server.js 与运行期依赖，
 * 构建期生成的静态资源（.next/static）和 public/ 需要自己拷进去，否则页面能开但 CSS/JS 全是 404。
 */
const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.error("找不到 .next/standalone，请先执行 npm run build");
  process.exit(1);
}

const copies = [
  [path.join(root, ".next", "static"), path.join(standalone, ".next", "static")],
  [path.join(root, "public"), path.join(standalone, "public")],
];

for (const [from, to] of copies) {
  if (!fs.existsSync(from)) continue;
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`已拷贝 ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}

// 构建期被 trace 进来的数据库快照会留在产物里，删掉，避免部署后用到一份旧数据
const bundledData = path.join(standalone, "data");
if (fs.existsSync(bundledData)) {
  fs.rmSync(bundledData, { recursive: true, force: true });
  console.log("已移除 .next/standalone/data（构建期快照，避免误用旧数据）");
}
