# Nav — 拾遗录

一个只服务一个人的网址收藏。公开页叫「拾遗录」：纸色底、衬线标题、错位陈列和一张索引。

- **公开只读**。任何人都能看。
- **写入要一把钥匙**。网页端和 MCP 共用 `NAV_TOKEN`。
- **标签是唯一的组织方式**。一条 Bookmark 可以挂多个，没有分类树。
- **封面在收录后存下来**。问 mShots，确认不是占位图才落盘。
- **正文快照按需抓**。解锁后点「取快照」才抓，抽不出正文就没有入口。

技术栈：Next.js 16（App Router）+ TypeScript + React 19 + Tailwind CSS 4 + SQLite（better-sqlite3）。

术语见 [`GLOSSARY.md`](GLOSSARY.md)。

---

## 页面

公开页有两种看法，记在地址栏里。

- **陈列**是默认。宽屏按稿子的节奏错位拼贴，768px 以下改成单列。
- **索引**是同一批 Bookmark 的表。宽屏五列：编号、名称、简介、标签、访问。窄屏是编号、名称、换行的简介和域名。

检索匹配标题、简介和网址，按 `/` 聚焦。标签可多选，语义是同时具备。排序只有最近收录和最早收录。筛选、检索、看法和排序都写在 URL 里。

编号是 Bookmark 的 id，补零到三位。收录日是 `created_at`。页眉的「更新于」和「某年新增」都取最近一条收录日。

封面还没抓到时，卡片显示「显影中」，过几秒再问一次。快照文件存在时，标题旁出现「快照」。

访客看不到写入。页脚「编辑」输入 Read Token，只存在这台浏览器。解锁后才有「新收录」「改」「删」「取快照」。

页面不跟随系统暗色。纸色 `#f4f1ea`，墨色 `#191712`，印章红 `#d23f1c`。中文标题用 Noto Serif SC，英文和数字用 Instrument Serif，小字用 JetBrains Mono。

---

## 快速开始

```bash
npm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"  # 填进 NAV_TOKEN
npm run seed     # 灌入拾遗录的 22 条，可重复执行
npm run dev      # http://localhost:3000
```

`npm run seed` 会删掉最早那 8 条示例（GitHub、Vite 等），不删你后来自己加的。空库时编号从 1 开始，Figma 是 `No.001`，tldraw 是 `No.022`。

### npm scripts

| 脚本 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建，产出 standalone 并补齐静态资源 |
| `npm start` | 用 standalone 产物启动，需先 build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | node:test。临时库，不碰 `data/nav.db` |
| `npm run seed` | 写入 22 条种子 |

测试用 `node:test` + `tsx`，不引入 jest 或 vitest。每个用例都换一个临时数据库，并清掉 `globalThis.__navDb` 的连接缓存。脚本写成 `src/lib/*.test.ts`，因为 npm 用 `sh` 执行，`**` 不会展开。

---

## 环境变量

| 变量 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `NAV_TOKEN` | 否 | 无 | 网页写入和 MCP 写入共用。未设置时读取照常，所有写入返回 401 |
| `NAV_DB_PATH` | 否 | `<项目根>/data/nav.db` | SQLite 文件。standalone 启动会换工作目录，代码会把数据放回项目根 |
| `NAV_ARCHIVE_DIR` | 否 | 数据库所在目录 | 封面在 `covers/`，快照在 `snapshots/` |

读取公开是刻意的，见 ADR-0003。封面和快照不进数据库，也不进 git，`data/` 已被忽略。

---

## REST API

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/api/bookmarks` | 公开 | `?q=` 匹配标题、简介、网址；`?tags=a,b` 是同时具备；`?order=newest\|oldest` |
| `POST` | `/api/bookmarks` | Bearer | `{ title, url, description?, tags? }`，成功 201。随后后台取封面 |
| `GET` | `/api/bookmarks/[id]` | 公开 | 单条 |
| `PATCH` | `/api/bookmarks/[id]` | Bearer | 局部更新。网址变了才重新取封面，并丢掉旧快照 |
| `DELETE` | `/api/bookmarks/[id]` | Bearer | 删除，连同封面和快照 |
| `POST` | `/api/bookmarks/[id]/snapshot` | Bearer | 开工抓正文，立刻 202，不等抓完 |
| `GET` | `/api/snapshot/[id]` | 公开 | 有快照就返回那一页 HTML，没有就 404 |
| `GET` | `/api/tags` | 公开 | `[{ tag, count }]` |
| `GET` | `/api/cover?url=` | 公开 | 有封面文件就返回图片。没有就后台去取，这次返回 `404 {"error":"显影中"}` |
| `POST` | `/api/mcp` | 见下 | MCP Streamable HTTP |

鉴权是 `Authorization: Bearer <NAV_TOKEN>`。不匹配返回 `401 {"error":"unauthorized"}`。

封面响应里不会出现 mShots 的地址。小于 8KB 或不是图片的响应当成占位图，隔几秒再问，最多四次。

---

## MCP

端点：`http://<主机>:21785/api/mcp`。Streamable HTTP，无状态，每个请求独立处理。本地开发时把端口换成 3000。

| 工具 | 鉴权 | 说明 |
| --- | --- | --- |
| `list_bookmarks` | 公开 | 按关键字和标签查。标签是同时具备 |
| `add_bookmark` | Bearer | 新增。`title`、`url` 必填，网址唯一。会触发封面抓取 |
| `update_bookmark` | Bearer | 只传要改的字段。`tags` 传了就整体替换 |
| `delete_bookmark` | Bearer | 删除，不可撤销 |

没有「取快照」这个工具。快照只在网页上点。

钥匙放在请求头，不放在 URL 里：

```json
{
  "mcpServers": {
    "nav": {
      "type": "http",
      "url": "http://<主机>:21785/api/mcp",
      "headers": { "Authorization": "Bearer <NAV_TOKEN>" }
    }
  }
}
```

Claude Code：

```bash
claude mcp add --transport http nav http://<主机>:21785/api/mcp \
  --header "Authorization: Bearer <NAV_TOKEN>"
```

---

## 部署

镜像由 GitHub Actions 在推到 `main` 时构建，放在 `ghcr.io/<owner>/nav:latest`。部署机只拉取，不自己构建。宿主机的 21785 映射到容器里的 3000。数据库、封面、快照都在卷 `nav-data` 里，重建容器不会丢。

仓库要公开，或者在部署机上先 `docker login ghcr.io`。私有仓库的镜像默认也是私有的。

```bash
# .env 里写 NAV_TOKEN，以及 NAV_IMAGE=ghcr.io/<owner>/nav:latest
docker compose pull
docker compose up -d
docker compose exec nav node --import tsx scripts/seed.ts   # 只在第一次
```

`docker-compose.yml` 里的默认镜像名是 `ghcr.io/jonhow/nav:latest`。GitHub 仓库名或归属不同，就用 `NAV_IMAGE` 覆盖。

不用 Docker 时，直接跑 standalone：

```bash
npm run build
HOSTNAME=0.0.0.0 PORT=21785 NAV_TOKEN=<token> node .next/standalone/server.js
```

不要用 `next start`，它和 `output: 'standalone'` 不匹配。

---

## 项目结构

```
src/
├── app/
│   ├── api/bookmarks/        列表、单条、快照开工
│   ├── api/cover/            封面
│   ├── api/snapshot/[id]/    正文快照
│   ├── api/mcp/              MCP
│   └── page.tsx              按地址栏筛完再渲染
├── components/exhibit/       拾遗录的页眉、陈列、索引、解锁和编辑
└── lib/
    ├── bookmarks.ts          查询、写入；写入后调度抓取
    ├── capture.ts            封面和快照的后台抓取
    ├── archive.ts            data/covers 与 data/snapshots
    ├── catalog.ts            编号、页眉计数、标签分布
    └── cover.ts              /api/cover 的请求处理
data/                         不进 git：nav.db、covers/、snapshots/
docs/adr/                     架构决定
```

---

## 数据

```sql
CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

检索是 `LOWER(title)`、`LOWER(description)`、`LOWER(url)` 的模糊匹配。标签过滤用 `json_each`，多个标签是同时具备。列表默认按 `created_at` 倒序。

封面和快照不是表里的列。列表返回的 `snapshot` 只表示 `data/snapshots/<id>.html` 在不在。

---

## 决定

- [0001 SQLite 作为唯一存储](docs/adr/0001-sqlite-as-primary-store.md)
- [0002 MCP 以 Streamable HTTP 内建于 Next.js](docs/adr/0002-mcp-streamable-http-in-nextjs.md)
- [0003 一把 Token 做写入鉴权](docs/adr/0003-token-based-write-auth.md)
- [0004 封面和快照以文件留存](docs/adr/0004-covers-fetched-not-stored.md)
