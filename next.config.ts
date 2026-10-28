import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 自托管单进程部署：产出 standalone 产物，npm run build && npm start 即可跑
  output: "standalone",
  // better-sqlite3 是原生模块，不能被打包进 bundle
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
