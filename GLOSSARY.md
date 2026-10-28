# Nav — 个人导航站

一个只服务一个人的网址收藏与展示系统。存放在网上的好工具、开源项目、有趣页面，可以手工编辑，也可以通过 MCP 委托助手代为添加。

## Language

**Nav**:
这个导航站项目本身的简称——包含数据、界面与 MCP 接入端点的整体。
_Avoid_: 导航站, 导航页, 站点, 网站, portal

**Bookmark（书签）**:
被收进 Nav 的一条外部资源记录，有标题、URL、描述与若干标签。
_Avoid_: 条目, 链接, 项目, 收藏, 记录

**Entry（条目）**:
系统中所有可被单独读取的顶层对象的统称，目前只有 Bookmark 一种。
_Avoid_: 记录, 数据, 资源

**Tag（标签）**:
挂在 Bookmark 上的扁平词条，一个 Bookmark 可挂多个 Tag。Tag 是 Nav 里唯一的组织维度。
_Avoid_: 分类, 目录, 分组, category, folder

**Description（描述）**:
Bookmark 的一句话说明文字，用于解释"这是个什么东西、为什么值得收藏"。
_Avoid_: 备注, 说明, remark

**Favicon（站点图标）**:
Bookmark 所属网站的小图标，前端实时向图标服务取，不入库。
_Avoid_: 图标, icon, logo

**Read Token（读取令牌）**:
MCP 调用方与网页端写入共用的密钥。持有它才能新增、修改、删除 Bookmark。
_Avoid_: API Key, 密码, session, cookie

**Write（写入）**:
任何会改变 Bookmark 集合的操作——新增、修改、删除。
_Avoid_: 增删改, 编辑, mutation

**MCP（Model Context Protocol）**:
助手接入 Nav 的协议，助手通过 MCP 工具替用户添加书签。
_Avoid_: 插件, API, 集成
