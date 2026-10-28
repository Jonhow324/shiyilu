# SQLite 作为唯一存储

Nav 的书签数据存在本地 SQLite 单文件里（`data/nav.db`），不引入独立数据库服务。

## Considered Options

- **纯文件（JSON/YAML/Markdown）**：天然带版本控制、易备份。但 MCP 与网页端会并发写入，编辑频繁时文件写竞争和"写一半被读"的问题真实存在，需要额外的锁与重试逻辑。
- **远程数据库（Postgres/MySQL）**：多设备、多用户场景更强。但 Nav 是单用户自用，多引入一个必须常驻运维的服务不划算。
- **SQLite（选定）**：单文件、零运维、事务安全，写入并发由数据库自身处理。Node 侧用 `better-sqlite3`（同步 API，事务简单）。

## Consequences

- 备份 = 复制一个文件。
- 若将来要多用户或多实例访问，需要重新评估存储层——但领域模型（Bookmark / Tag）不变，迁移面局限在数据访问层。
