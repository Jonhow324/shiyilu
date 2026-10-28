import { getDb } from "./db";

/** 早期示例书签的 URL。种子会把它们删掉，只按 URL 删，不动使用者自己加的 Bookmark */
const LEGACY_URLS = [
  "https://github.com",
  "https://developer.mozilla.org",
  "https://vite.dev",
  "https://docs.anthropic.com",
  "https://modelcontextprotocol.io",
  "https://nextjs.org",
  "https://www.sqlite.org",
  "https://tailwindcss.com",
];

interface SeedBookmark {
  /** 收录日，写入 created_at 与 updated_at */
  collectedOn: string;
  title: string;
  url: string;
  description: string;
  tags: string[];
}

/**
 * 种子书签，按收录日从早到晚排列。
 * 插入时再按 collectedOn 排一次序，保证空库时 Figma 是 1 号、tldraw 是 22 号。
 */
const SAMPLE_BOOKMARKS: SeedBookmark[] = [
  {
    collectedOn: "2024-01-08",
    title: "Figma",
    url: "https://figma.com",
    description:
      "在浏览器里协作的界面设计工具，从线框到原型再到设计系统，一张画布装下整个团队。",
    tags: ["设计", "工具"],
  },
  {
    collectedOn: "2024-01-15",
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    description:
      "Web 标准最可靠的参考手册。HTML、CSS、JavaScript 的每一个细节，都能在这里找到出处。",
    tags: ["开发", "阅读"],
  },
  {
    collectedOn: "2024-02-02",
    title: "Are.na",
    url: "https://are.na",
    description:
      "一个安静的、没有算法推荐的收藏空间。用「频道」把图片、链接与想法慢慢连成网。",
    tags: ["灵感", "阅读"],
  },
  {
    collectedOn: "2024-02-19",
    title: "Fonts In Use",
    url: "https://fontsinuse.com",
    description:
      "字体在真实世界中的应用档案——海报、书籍、品牌、包装，按字体与年代逐条索引。",
    tags: ["字体", "灵感"],
  },
  {
    collectedOn: "2024-03-04",
    title: "Coolors",
    url: "https://coolors.co",
    description:
      "按空格键即可生成配色方案的调色板工具，锁定喜欢的颜色，继续探索其余组合。",
    tags: ["色彩", "工具"],
  },
  {
    collectedOn: "2024-03-21",
    title: "Hacker News",
    url: "https://news.ycombinator.com",
    description:
      "极简到近乎简陋的技术新闻社区，真正的价值藏在评论区里那些长篇讨论中。",
    tags: ["阅读", "开发"],
  },
  {
    collectedOn: "2024-04-10",
    title: "Lucide",
    url: "https://lucide.dev",
    description: "开源、一致、可定制的线性图标库，一千多枚图标覆盖绝大多数界面场景。",
    tags: ["素材", "设计"],
  },
  {
    collectedOn: "2024-05-06",
    title: "Godly",
    url: "https://godly.website",
    description:
      "精选网页设计的动态画廊，每一个案例都以录屏呈现，看见滚动与交互的完整节奏。",
    tags: ["灵感", "设计"],
  },
  {
    collectedOn: "2024-05-27",
    title: "Vercel",
    url: "https://vercel.com",
    description:
      "前端部署平台。推送代码即上线，预览环境、边缘函数与分析数据一应俱全。",
    tags: ["开发", "工具"],
  },
  {
    collectedOn: "2024-06-14",
    title: "Typewolf",
    url: "https://typewolf.com",
    description:
      "关于网页字体的独立站点：每日站点赏析、字体搭配推荐，以及值得一读的排版指南。",
    tags: ["字体", "阅读"],
  },
  {
    collectedOn: "2024-07-02",
    title: "Unsplash",
    url: "https://unsplash.com",
    description:
      "免费可商用的高质量摄影图库，由全球摄影师贡献，适合做封面、背景与情绪板。",
    tags: ["素材", "灵感"],
  },
  {
    collectedOn: "2024-07-23",
    title: "Excalidraw",
    url: "https://excalidraw.com",
    description:
      "手绘风格的在线白板。画架构图、流程图或随手草稿，自带一种不拘小节的松弛感。",
    tags: ["工具", "设计"],
  },
  {
    collectedOn: "2024-08-11",
    title: "Linear",
    url: "https://linear.app",
    description:
      "为软件团队打造的任务管理工具，键盘优先、快得出奇，把「项目管理」做出了手感。",
    tags: ["效率", "工具"],
  },
  {
    collectedOn: "2024-09-03",
    title: "Shadertoy",
    url: "https://shadertoy.com",
    description:
      "用 GLSL 写片段着色器的社区，几十行代码就能生成整片宇宙，是图形编程的游乐场。",
    tags: ["开发", "灵感"],
  },
  {
    collectedOn: "2024-09-29",
    title: "Mobbin",
    url: "https://mobbin.com",
    description:
      "海量真实 App 截图与用户流程库，按页面类型、交互模式检索，做竞品研究的利器。",
    tags: ["设计", "灵感"],
  },
  {
    collectedOn: "2024-10-18",
    title: "Raycast",
    url: "https://raycast.com",
    description:
      "macOS 上的启动器，用插件把剪贴板、窗口管理、脚本与 AI 都收进一个快捷键。",
    tags: ["效率", "工具"],
  },
  {
    collectedOn: "2024-11-07",
    title: "Google Fonts",
    url: "https://fonts.google.com",
    description:
      "开源字体的最大集合，附带中日韩字体与可变字体，一行代码即可引入网页。",
    tags: ["字体", "素材"],
  },
  {
    collectedOn: "2024-12-01",
    title: "Claude",
    url: "https://claude.ai",
    description:
      "擅长长文写作、代码与推理的 AI 助手，适合把模糊的想法聊成清晰的方案。",
    tags: ["AI", "效率"],
  },
  {
    collectedOn: "2025-01-12",
    title: "Cosmos",
    url: "https://cosmos.so",
    description:
      "为创意人设计的视觉收藏夹，没有点赞与广告，只有一面安静生长的灵感墙。",
    tags: ["灵感", "素材"],
  },
  {
    collectedOn: "2025-02-20",
    title: "Perplexity",
    url: "https://perplexity.ai",
    description:
      "以对话形式回答问题的搜索引擎，每条结论都附带来源，适合快速调研一个陌生领域。",
    tags: ["AI", "阅读"],
  },
  {
    collectedOn: "2025-03-15",
    title: "Realtime Colors",
    url: "https://realtimecolors.com",
    description:
      "把配色与字体直接套到一个真实的落地页上预览，比盯着色块想象要直观得多。",
    tags: ["色彩", "设计"],
  },
  {
    collectedOn: "2025-04-08",
    title: "tldraw",
    url: "https://tldraw.com",
    description:
      "无限画布白板与开源 SDK，可以在上面画图、协作，甚至让 AI 把草图变成可运行的界面。",
    tags: ["工具", "AI"],
  },
];

function toTimestamp(collectedOn: string): string {
  return `${collectedOn} 00:00:00`;
}

/** 稿子里的种子按 url 索引，用于判断某条旧示例是否已经被新种子替换过 */
const SEED_BY_URL = new Map(SAMPLE_BOOKMARKS.map((item) => [item.url, item]));

/**
 * 删除早期的 8 条示例。
 *
 * 只按 URL 删，使用者自己加的其他 URL 不受影响。MDN 这一个 URL 新旧稿子都有：
 * 重复执行时它已经是新种子写入的行，不能再删掉重插，否则编号会变、`inserted` 也不为 0。
 * 所以只在「它还不是种子那一行」时才删。
 */
function removeLegacySamples(db: ReturnType<typeof getDb>): void {
  const deleteByUrl = db.prepare("DELETE FROM bookmarks WHERE url = ?");
  const deleteLegacyOnly = db.prepare(
    `DELETE FROM bookmarks
     WHERE url = ?
       AND NOT (title = ? AND description = ? AND tags = ? AND created_at = ?)`,
  );

  for (const url of LEGACY_URLS) {
    const seeded = SEED_BY_URL.get(url);
    if (!seeded) {
      deleteByUrl.run(url);
      continue;
    }
    deleteLegacyOnly.run(
      url,
      seeded.title,
      seeded.description,
      JSON.stringify(seeded.tags),
      toTimestamp(seeded.collectedOn),
    );
  }
}

/**
 * 写入种子书签。
 *
 * 1. 只按 URL 删掉早期的 8 条示例（其中 MDN 的 URL 也在新种子里，只删旧行），
 *    使用者自己加的 Bookmark 不受影响。
 * 2. 删完之后表为空才把编号序列归零，让 Figma 是 1 号；否则新行接在现有编号后面。
 * 3. INSERT OR IGNORE 依赖 url 的 UNIQUE 约束，重复执行不会报错也不会重复插入。
 * 4. 每条都显式写入 created_at / updated_at，日期取稿上的收录日，不用默认的 now。
 *
 * @returns 本次新增的条数，以及执行后书签总数
 */
export function seedBookmarks(): { inserted: number; total: number } {
  const db = getDb();
  const countAll = db.prepare("SELECT COUNT(*) AS total FROM bookmarks");
  const insert = db.prepare(
    `INSERT OR IGNORE INTO bookmarks (title, url, description, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  const ordered = [...SAMPLE_BOOKMARKS].sort((a, b) =>
    a.collectedOn.localeCompare(b.collectedOn),
  );

  const run = db.transaction(() => {
    removeLegacySamples(db);

    const { total: remaining } = countAll.get() as { total: number };
    if (remaining === 0) {
      try {
        // 空库且这张表还没有 AUTOINCREMENT 记录时 sqlite_sequence 可能不存在，忽略即可
        db.prepare("DELETE FROM sqlite_sequence WHERE name = 'bookmarks'").run();
      } catch {
        // 没有序列可归零
      }
    }

    let inserted = 0;
    for (const item of ordered) {
      const timestamp = toTimestamp(item.collectedOn);
      inserted += insert.run(
        item.title,
        item.url,
        item.description,
        JSON.stringify(item.tags),
        timestamp,
        timestamp,
      ).changes;
    }
    return inserted;
  });

  const inserted = run();
  const { total } = countAll.get() as { total: number };

  return { inserted, total };
}
