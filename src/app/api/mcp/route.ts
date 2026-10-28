import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod/v4";
import { isAuthorized } from "@/lib/auth";
import {
  createBookmark,
  deleteBookmark,
  listBookmarks,
  parseCreateInput,
  parseId,
  parseUpdateInput,
  updateBookmark,
} from "@/lib/bookmarks";

// 数据来自 SQLite，必须每次请求实时处理，不能被构建期静态化
export const dynamic = "force-dynamic";

/** 无 token 时写工具返回的提示文案（写给 AI 看，要说明怎么修） */
const WRITE_DENIED =
  "拒绝执行：缺少或无效的 read token。请在 MCP 客户端的请求头里配置 " +
  'Authorization: Bearer <NAV_TOKEN>（NAV_TOKEN 与服务端环境变量一致），然后重试。';

/** 构造工具返回的文本内容 */
function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

/** 构造工具级别的错误返回（不抛异常，按 MCP 约定返回 isError） */
function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: "text" as const, text: `操作失败：${message}` }],
  };
}

/**
 * 创建一个 MCP server 实例。
 * 无状态模式下每个请求都会新建一个 server + transport，鉴权结果在这里一次性注入。
 */
function createMcpServer(authorized: boolean): McpServer {
  const server = new McpServer({ name: "nav", version: "0.1.0" });

  // —— 读工具：公开可读，助手可以先查再添加 ——
  server.registerTool(
    "list_bookmarks",
    {
      title: "查询书签",
      description:
        "列出 Nav 里的书签。当你需要确认某个网址是否已收藏、想知道已有的标签叫什么、" +
        "或想给用户展示收藏列表时用它。可以按关键字（匹配标题与描述）和标签过滤；" +
        "tags 是 AND 语义，指定多个标签时返回同时带有全部标签的书签。不传参数则按最近更新时间倒序返回全部。",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("关键字，对标题和描述做模糊匹配，大小写不敏感"),
        tags: z
          .array(z.string())
          .optional()
          .describe("标签过滤，AND 语义：返回的书签必须同时带有这些标签"),
      },
    },
    async ({ query, tags }) => {
      try {
        const bookmarks = listBookmarks({ query, tags });
        if (bookmarks.length === 0) {
          return ok("没有匹配的书签。");
        }
        return ok(JSON.stringify(bookmarks, null, 2));
      } catch (error) {
        return fail(error);
      }
    },
  );

  // —— 写工具：需要 Bearer token ——
  server.registerTool(
    "add_bookmark",
    {
      title: "添加书签",
      description:
        "往 Nav 里新增一条书签。当用户分享了一个网址并希望「收进导航站」「记下来」「加到收藏」时用；" +
        "不确定是否已收藏时，先调用 list_bookmarks 查一下，因为 url 必须唯一，重复会失败。" +
        "title 和 url 必填，url 需带 http(s) 协议；description 写一句「这是什么、为什么值得收藏」；" +
        "tags 用已有的标签优先，避免造同义词。",
      inputSchema: {
        title: z.string().describe("书签标题"),
        url: z.string().describe("完整网址，需包含 http:// 或 https://"),
        description: z.string().optional().describe("一句话说明这是什么、为什么值得收藏"),
        tags: z.array(z.string()).optional().describe("标签列表，扁平、小写短词优先"),
      },
    },
    async (args) => {
      if (!authorized) return { isError: true, content: [{ type: "text", text: WRITE_DENIED }] };
      try {
        const created = createBookmark(parseCreateInput(args));
        return ok(`已添加书签 #${created.id}：${created.title}\n${JSON.stringify(created, null, 2)}`);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "update_bookmark",
    {
      title: "修改书签",
      description:
        "修改已有书签的标题、网址、描述或标签。当用户说「改一下那条书签」「换个标题」「补个标签」时用；" +
        "不知道 id 就先用 list_bookmarks 查。只传需要改的字段，未传的字段保持不变；" +
        "tags 传了就整体替换原有标签（传空数组表示清空标签）。",
      inputSchema: {
        id: z.number().int().positive().describe("要修改的书签 id"),
        title: z.string().optional().describe("新标题"),
        url: z.string().optional().describe("新网址，需包含 http:// 或 https://"),
        description: z.string().optional().describe("新描述"),
        tags: z.array(z.string()).optional().describe("新标签列表，整体替换"),
      },
    },
    async (args) => {
      if (!authorized) return { isError: true, content: [{ type: "text", text: WRITE_DENIED }] };
      try {
        const { id, ...patch } = args;
        const updated = updateBookmark(parseId(id), parseUpdateInput(patch));
        return ok(`已更新书签 #${updated.id}\n${JSON.stringify(updated, null, 2)}`);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "delete_bookmark",
    {
      title: "删除书签",
      description:
        "删除一条书签。仅当用户明确要求删除（「删掉这条」「这个不要了」）时使用，操作不可撤销；" +
        "不知道 id 就先用 list_bookmarks 确认。",
      inputSchema: {
        id: z.number().int().positive().describe("要删除的书签 id"),
      },
    },
    async ({ id }) => {
      if (!authorized) return { isError: true, content: [{ type: "text", text: WRITE_DENIED }] };
      try {
        deleteBookmark(parseId(id));
        return ok(`已删除书签 #${id}`);
      } catch (error) {
        return fail(error);
      }
    },
  );

  return server;
}

/** POST / GET / DELETE /api/mcp — 无状态 Streamable HTTP */
async function handleMcpRequest(request: Request): Promise<Response> {
  const authorized = isAuthorized(request);
  const server = createMcpServer(authorized);

  // 无状态模式：不生成 sessionId，每个请求独立建 transport
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // 返回纯 JSON 而不是挂起 SSE 流：Next Route Handler 下更简单、不会留下常驻连接
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    return await transport.handleRequest(request);
  } finally {
    // 请求结束即释放，不保留常驻连接
    void transport.close().catch(() => {});
    void server.close().catch(() => {});
  }
}

export const POST = handleMcpRequest;

/**
 * GET / DELETE：本端点是「无状态 + enableJsonResponse」模式，
 * 没有服务端推送的 SSE 流，也没有可终止的 session，所以这两个方法直接 405。
 *
 * - GET 在 MCP 规范里是客户端用来建立 SSE 推送流的；这里不提供，返回 JSON-RPC 错误体
 *   （与 SDK 官方无状态示例一致），客户端不会因此卡在等待流上。
 * - DELETE 在规范里是终止 session；无状态模式下每次请求都是独立 transport，没有 session 可删，
 *   同样返回 405。客户端在没拿到 sessionId 时不会发 DELETE，不影响正常握手。
 */
export function GET(): Response {
  return methodNotAllowed();
}

export function DELETE(): Response {
  return methodNotAllowed();
}

function methodNotAllowed(): Response {
  return Response.json(
    {
      jsonrpc: "2.0" as const,
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    },
    { status: 405 },
  );
}
