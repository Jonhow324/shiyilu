# MCP 以 Streamable HTTP 内建于 Next.js 进程

MCP Server 不作为独立进程运行，而是实现为 Next.js 的一个 Route Handler（`/api/mcp`），使用 Streamable HTTP 传输。

## Considered Options

- **stdio**：几乎所有 MCP 教程都用它，但它要求客户端能启动本地进程，只能同机使用。用户的实际用法是"在任意聊天助手里让助手帮我添加"，助手端需要的是一个能远程访问的 URL。
- **SSE**：旧版传输方式，已进入 legacy，未来生态支持会衰减。
- **Streamable HTTP（选定）**：MCP 2025-03-26 标准，单一 `/api/mcp` 端点同时承载 POST（工具调用）与 GET（SSE 流）。与网站同进程、同部署，无额外容器。

## Consequences

- 部署单元只有一个：Next.js 应用 + SQLite 文件。备份与迁移只涉及这一个进程。
- MCP 端点需要独立鉴权（见 ADR-0003），因为它暴露的是写能力而非只读内容。
- Streamable HTTP 要求的 session 语义需要在 Route Handler 里小心处理；本项目选择**无状态模式**（每个请求独立建立 transport），换取实现简单与可水平扩展。
