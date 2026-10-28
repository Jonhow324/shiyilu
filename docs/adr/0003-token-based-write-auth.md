# 用单一 Token 做写入鉴权，不建用户体系

Nav 没有用户、账号、密码、Session。写入权限由一把共享 Token 守住：网页端填写一次存入本地，助手端通过 `Authorization: Bearer <token>` 请求头携带。读取完全公开。

## Considered Options

- **Session / Cookie 登录**：符合"网站"的直觉，但助手端（MCP client）配置 Session 极其别扭，还得维护登录流程与密码恢复。
- **Query param 传 API Key**：配置方便但 Token 会进日志、进 Referer，泄漏面更大。
- **Bearer Token（选定）**：网页端和 MCP 端用同一套鉴权逻辑，一个配置项同时覆盖两个场景。

## Consequences

- Token 由环境变量 `NAV_TOKEN` 提供，泄漏后的处置方式是改环境变量并重启。
- Nav 是"只读公开"的：任何拿到 URL 的人都能看书签列表，这被明确接受——导航站内容无敏感信息。
- 若将来要区分"多个编辑者"或"私密书签"，需要引入真实用户体系——这是一次明确的架构升级，不是小改动。
