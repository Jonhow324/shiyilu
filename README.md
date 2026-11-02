# Nav — 个人导航站

一个只服务一个人的网址收藏站：存放在网上看到的好用工具、开源项目、有趣页面。

- **公开只读**：任何人访问都能看书签列表
- **写入需鉴权**：网页端编辑与 MCP 调用共用一把 token（`NAV_TOKEN`）
- **MCP 接入**：AI 助手通过 MCP 协议代你添加书签
- **扁平多标签**：唯一的组织维度是 Tag，没有分类树（见 `docs/adr/`）

技术栈：Next.js 16（App Router） + TypeScript + React 19 + Tailwind CSS 4 + shadcn/ui（Radix UI 版） + lucide-react + tweakcn 主题 + SQLite（better-sqlite3）。

### UI 架构

- **Tailwind v4**：没有 `tailwind.config.js`，主题变量写在 `src/app/globals.css`
- **shadcn/ui**：`style: radix-nova`（Radix UI primitives）、base color `neutral`、CSS variables；
  组件源码在 `src/components/ui/`，由 `npx shadcn@latest add ...` 生成，可安全重跑覆盖
- **tweakcn 主题**：`globals.css` 里的 `:root` / `.dark` 用的是 tweakcn「Violet Dark」（石墨底 + 紫色点缀）
- **lucide-react**：图标
- **sonner**：toast 提示（401、保存成功、加载失败等）

公开页「拾遗录」走自己的一套：纸色底 `#f4f1ea`、墨色字 `#191712`、印章红 `#d23f1c`，
字体是 Noto Serif SC（中文标题）、Instrument Serif（英文斜体与大数字）、JetBrains Mono（小标签），
**不跟随系统暗色**。上面的 shadcn 主题变量只留给后续的编辑界面用。

已安装的 shadcn 组件：`sidebar` `sheet` `card` `badge` `input` `textarea` `button` `dialog` `sonner`
（连带生成 `separator` `tooltip` `skeleton` 与 `src/hooks/use-mobile.ts`）。

```bash
# 需要新增组件时
npx shadcn@latest add <component>
```

---

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 生成一个 token 填进 NAV_TOKEN
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"

# 3. 灌入示例数据（可重复执行）
npm run seed

# 4. 开发
npm run dev          # http://localhost:3000
```

### Docker

数据、封面和快照都在卷 `nav-data` 里，重建容器不会丢。`.env` 里要有 `NAV_TOKEN`。

```bash
docker compose up -d --build
docker compose exec nav node --import tsx scripts/seed.ts   # 第一次灌入 22 条
```

宿主机端口是 21785。MCP 地址是 `http://<主机>:21785/api/mcp`，请求头带 `Authorization: Bearer <NAV_TOKEN>`。

### npm scripts

| 脚本 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建，产出 standalone 产物并自动补齐静态资源 |
| `npm start` | 以 standalone 产物启动（需先 build） |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `tsx --test src/lib/*.test.ts`（node:test，临时数据库，不动 `data/nav.db`） |
| `npm run seed` | 写入种子书签，可重复执行 |

### 测试

用 `node:test` + `tsx`，不引入 jest / vitest：

```bash
npm test        # 等价于 tsx --test src/lib/*.test.ts
```

脚本写成 `src/lib/*.test.ts` 而不是 `src/**/*.test.ts`：npm 用 `sh` 执行脚本，`**` 不会展开。
测试在 `beforeEach` 里新建临时数据库并把 `NAV_DB_PATH` 指过去，同时清掉 `globalThis.__navDb`
的连接缓存，所以不会读写仓库里的 `data/nav.db`。

---

## 环境变量

| 变量 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `NAV_TOKEN` | 否 | 无 | read token。网页端编辑与 MCP 写工具共用。**未设置时读取照常，所有写操作返回 401** |
| `NAV_DB_PATH` | 否 | `<项目根>/data/nav.db` | SQLite 文件路径。以 standalone 方式启动时 server.js 会 chdir 到 `.next/standalone`，代码会自动回退到项目根 |

> 读取完全公开是刻意接受的（ADR-0003）：导航站内容无敏感信息。

---

## REST API

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/api/bookmarks` | 公开 | 查询参数 `?q=关键字&tags=a,b`（tags 为 AND 语义） |
| `POST` | `/api/bookmarks` | Bearer | body `{ title, url, description?, tags? }`，成功 201 |
| `GET` | `/api/bookmarks/[id]` | 公开 | 单条 |
| `PATCH` | `/api/bookmarks/[id]` | Bearer | 局部更新，只传要改的字段 |
| `DELETE` | `/api/bookmarks/[id]` | Bearer | 删除 |
| `GET` | `/api/tags` | 公开 | `[{ tag, count }]` |
| `GET` | `/api/cover?url=` | 公开 | 代取封面截图（只接受 http/https）。取不到返回 `404 {"error":"显影中"}`，图片缓存一天 |
| `POST` | `/api/mcp` | 见下 | MCP Streamable HTTP 端点 |

鉴权方式：`Authorization: Bearer <NAV_TOKEN>`。不匹配返回 `401` + `{"error":"unauthorized"}`。

```bash
curl http://localhost:3000/api/bookmarks?q=前端
curl -X POST http://localhost:3000/api/bookmarks \
  -H "Authorization: Bearer $NAV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"MDN","url":"https://developer.mozilla.org","tags":["文档","前端"]}'
```

---

## MCP 接入

端点：`http://<host>:3000/api/mcp`（Streamable HTTP，无状态模式：每个请求独立建 transport，不保存 session）。

### 工具

| 工具 | 鉴权 | 参数 | 说明 |
| --- | --- | --- | --- |
| `list_bookmarks` | 公开 | `query?`, `tags?`（AND 语义） | 查询书签，助手应先查再添加 |
| `add_bookmark` | 需 token | `title`, `url`, `description?`, `tags?` | 新增，url 唯一 |
| `update_bookmark` | 需 token | `id`, `title?`, `url?`, `description?`, `tags?` | 局部更新，`tags` 传了就整体替换 |
| `delete_bookmark` | 需 token | `id` | 删除 |

工具描述是写给 AI 看的，写明了「什么时候该用」。错误以 `isError: true` 返回，不抛异常。

### 客户端配置

**Claude Desktop**（`claude_desktop_config.json`）

```json
{
  "mcpServers": {
    "nav": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer <NAV_TOKEN>"
      }
    }
  }
}
```

**Cursor**（项目内 `.cursor/mcp.json` 或全局 `~/.cursor/mcp.json`）

```json
{
  "mcpServers": {
    "nav": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer <NAV_TOKEN>"
      }
    }
  }
}
```

**Claude Code**

```bash
claude mcp add --transport http nav http://localhost:3000/api/mcp \
  --header "Authorization: Bearer <NAV_TOKEN>"
```

> 远端部署时把 `http://localhost:3000` 换成实际地址；token 要和服务端 `NAV_TOKEN` 一致。
> 客户端通常也支持省略 `type` 只写 `url` + `headers`。

---

## 部署（standalone 单进程）

`next.config.ts` 里设了 `output: 'standalone'`，构建产物是自包含的 `server.js` + 运行期依赖（含 better-sqlite3 原生模块），不需要外部 `node_modules`。

```bash
npm run build
# 产物：.next/standalone（内含 node_modules；prepare-standalone 已把 .next/static 拷进去）

HOSTNAME=0.0.0.0 PORT=3000 NAV_TOKEN=<你的 token> node .next/standalone/server.js
# 等价于：npm start
```

要点：

- **不要用 `next start`**：与 `output: 'standalone'` 不兼容（Next 会打印警告），请直接 `node .next/standalone/server.js`。
- 监听地址取自 `process.env.HOSTNAME`，缺省 `0.0.0.0`；端口取自 `PORT`，缺省 3000。
- 数据库默认落在**项目根目录**下的 `data/nav.db`。standalone 的 `server.js` 会 `chdir` 到 `.next/standalone`，`src/lib/db.ts` 里做了回退，数据仍然写到项目根（不会随构建被清掉）。想放到别处就显式设 `NAV_DB_PATH`（例如 `/var/lib/nav/nav.db`）。
- 备份 = 复制一个文件：`data/nav.db`。

systemd 示例：

```ini
[Unit]
Description=nav
After=network.target

[Service]
WorkingDirectory=/srv/nav
Environment=NAV_TOKEN=xxxx
Environment=NAV_DB_PATH=/srv/nav/data/nav.db
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
ExecStart=/usr/bin/node /srv/nav/.next/standalone/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── bookmarks/route.ts          GET（公开）/ POST（鉴权）
│   │   ├── bookmarks/[id]/route.ts     GET（公开）/ PATCH、DELETE（鉴权）
│   │   ├── tags/route.ts               GET（公开）
│   │   └── mcp/route.ts                MCP Streamable HTTP（无状态）
│   ├── layout.tsx
│   ├── page.tsx                        Server Component 读库直出首页
│   └── globals.css
├── components/
│   ├── NavApp.tsx                      客户端主界面（状态与请求编排）
│   ├── Sidebar.tsx                     左侧栏：搜索 + 标签过滤（shadcn Sidebar）
│   ├── BookmarkCard.tsx                卡片：favicon / 标题 / 描述 / 标签（shadcn Card + Badge）
│   ├── BookmarkDrawer.tsx              右侧滑出抽屉：新增 / 编辑（shadcn Sheet）
│   ├── Favicon.tsx                     favicon 多源降级
│   ├── TokenDialog.tsx                 填写 read token（shadcn Dialog）
│   ├── theme-provider.tsx              next-themes 包装（暗色模式）
│   └── ui/                             shadcn 生成的基础组件
├── hooks/
│   └── use-mobile.ts                   移动端断点（shadcn 生成，已改为 useSyncExternalStore）
└── lib/
    ├── db.ts                           better-sqlite3 单例、建表、目录自动创建
    ├── bookmarks.ts                    数据操作 + 入参校验
    ├── auth.ts                         Bearer token 校验（REST 与 MCP 共用）
    ├── token-store.ts                  浏览器端 token 外部 store
    ├── http.ts                         错误响应映射
    └── seed.ts                         示例数据
scripts/
├── seed.ts                             npm run seed 入口
└── prepare-standalone.mjs              补全 standalone 静态资源
docs/adr/                               架构决策记录
```

---

## 数据模型

```sql
CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',   -- JSON 字符串数组
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

搜索用 `LOWER(title) LIKE ? OR LOWER(description) LIKE ?`（不用 FTS5：中文分词不可靠）；
标签过滤用 `json_each(tags)`，多个标签为 **AND** 语义（选得越多结果越少）。

favicon 由前端实时加载，依次尝试 Google s2 → icon.horse → 站点 `/favicon.ico`，全失败降级为标题首字占位方块；不入库、不做服务端抓取。

---

## 设计决策

见 [`docs/adr/`](docs/adr/)：

- [0001 SQLite 作为唯一存储](docs/adr/0001-sqlite-as-primary-store.md)
- [0002 MCP 以 Streamable HTTP 内建于 Next.js 进程](docs/adr/0002-mcp-streamable-http-in-nextjs.md)
- [0003 用单一 Token 做写入鉴权，不建用户体系](docs/adr/0003-token-based-write-auth.md)

术语见 [`GLOSSARY.md`](GLOSSARY.md)。
