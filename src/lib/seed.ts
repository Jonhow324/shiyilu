import { getDb } from "./db";

/** 示例书签：真实有用的站点，URL 互不相同 */
const SAMPLES: {
  title: string;
  url: string;
  description: string;
  tags: string[];
}[] = [
  {
    title: "GitHub",
    url: "https://github.com",
    description: "全球最大的代码托管与协作平台，找开源项目几乎都从这里开始。",
    tags: ["开发", "代码托管"],
  },
  {
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    description: "Web 标准权威文档，查 HTML / CSS / JavaScript API 的第一选择。",
    tags: ["开发", "文档", "前端"],
  },
  {
    title: "Vite",
    url: "https://vite.dev",
    description: "极快的前端构建工具，开发服务器启动和 HMR 都明显快于老一代打包器。",
    tags: ["开发", "前端", "工具"],
  },
  {
    title: "Anthropic Docs",
    url: "https://docs.anthropic.com",
    description: "Claude 官方 API 文档，含模型能力、提示工程与工具调用说明。",
    tags: ["AI", "文档"],
  },
  {
    title: "Model Context Protocol",
    url: "https://modelcontextprotocol.io",
    description: "MCP 官方站点与规范，把工具和数据接给 AI 助手的开放协议。",
    tags: ["AI", "协议", "文档"],
  },
  {
    title: "Next.js",
    url: "https://nextjs.org",
    description: "React 全栈框架，App Router、Server Components 与路由处理都在这里。",
    tags: ["开发", "前端", "框架"],
  },
  {
    title: "SQLite",
    url: "https://www.sqlite.org",
    description: "零运维的嵌入式数据库，单文件、事务安全，小工具的默认存储。",
    tags: ["开发", "数据库"],
  },
  {
    title: "Tailwind CSS",
    url: "https://tailwindcss.com",
    description: "原子化 CSS 框架，直接在标记里写样式，省掉来回切样式表。",
    tags: ["开发", "前端", "设计"],
  },
];

/**
 * 写入示例书签。
 * 用 INSERT OR IGNORE 依赖 url 的 UNIQUE 约束，重复执行不会报错也不会重复插入。
 * @returns 本次新增的条数，以及执行后书签总数
 */
export function seedBookmarks(): { inserted: number; total: number } {
  const db = getDb();
  const statement = db.prepare(
    `INSERT OR IGNORE INTO bookmarks (title, url, description, tags)
     VALUES (?, ?, ?, ?)`,
  );

  const insertAll = db.transaction(() => {
    let inserted = 0;
    for (const item of SAMPLES) {
      const result = statement.run(
        item.title,
        item.url,
        item.description,
        JSON.stringify(item.tags),
      );
      inserted += result.changes;
    }
    return inserted;
  });

  const inserted = insertAll();
  const { total } = db
    .prepare("SELECT COUNT(*) AS total FROM bookmarks")
    .get() as { total: number };

  return { inserted, total };
}
