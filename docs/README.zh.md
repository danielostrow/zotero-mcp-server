![Zotero Manager](./docs/assets/image.svg)

# Zotero Manager MCP

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Node >= 20.16](https://img.shields.io/badge/node-%3E%3D%2020.16-brightgreen.svg)

一个模型上下文协议 (Model Context Protocol, MCP) 服务器，充当 AI 客户端的 Zotero 库管理员。使用结构化工具组织、清理和管理参考文献，同时仍支持搜索和引用工作流。

English | [中文](docs/README.zh.md)

---

## ✨ 亮点

- 对 Zotero 条目 (Items)、分类 (Collections) 和标签 (Tags) 拥有管理员级的读/写访问权限
- 通过结构化更新维护元数据（标题、创作者、日期等）
- 分类/标签组织和批量删除操作
- 生成常用格式（APA, MLA, Chicago, IEEE 等）的引文
- 内存缓存和自动速率限制退避 (backoff)
- 专为兼容 MCP 的客户端（stdio 传输）设计

## ✅ 需求

- Node.js >= 20.16
- Zotero API 密钥 (Key)
- Zotero 用户 ID (User ID) 或群组 ID (Group ID)

获取您的 API 密钥：https://www.zotero.org/settings/keys

## 🚀 快速开始

### npm

```bash
npm install -g zotero-manager
```

运行：

```bash
ZOTERO_API_KEY=your_api_key_here ZOTERO_USER_ID=your_user_id_here zotero-manager
```

或者使用 npx：

```bash
ZOTERO_API_KEY=your_api_key_here ZOTERO_USER_ID=your_user_id_here npx -y zotero-manager
```

### 源码 (Source)

```bash
npm install
npm run build
```

创建一个 `.env` 文件（参考 `.env.example`）：

```env
ZOTERO_API_KEY=your_api_key_here
ZOTERO_USER_ID=your_user_id_here
# ZOTERO_GROUP_ID=your_group_id_here
```

运行服务器：

```bash
node dist/index.js
```

## 🔌 MCP 客户端配置示例

适用于支持 stdio 传输的桌面 MCP 客户端的示例：

### npm (npx)

```json
{
  "mcpServers": {
    "zotero-manager": {
      "command": "npx",
      "args": ["-y", "zotero-manager"],
      "env": {
        "ZOTERO_API_KEY": "your_api_key_here",
        "ZOTERO_USER_ID": "your_user_id_here"
      }
    }
  }
}
```

### 源码 (node)

```json
{
  "mcpServers": {
    "zotero-manager": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"],
      "env": {
        "ZOTERO_API_KEY": "your_api_key_here",
        "ZOTERO_USER_ID": "your_user_id_here"
      }
    }
  }
}
```

二进制文件名称：`zotero-manager`。

## 🛠️ 工具

- `search_items` - 搜索库条目（查询、标签、分类、条目类型）
- `get_item` - 通过 key 或 DOI 获取单个条目
- `generate_citation` - 以所选格式生成引文
- `create_item` - 创建新的 Zotero 条目
- `update_item` - 更新条目字段（需要版本号）
- `delete_items` - 删除条目（批量最多 50 个）
- `manage_collections` - 列出/获取/创建/更新/删除分类
- `manage_tags` - 列出/添加/移除/删除标签

## 🧭 资源

- `zotero://collections` - 分类层级结构和元数据
- `zotero://tags` - 所有标签及其使用计数
- `zotero://citation-styles` - 常用引文格式 ID（非详尽列表）

## 📌 使用示例

搜索条目：

```json
{
  "query": "machine learning",
  "limit": 10,
  "sort": "dateAdded",
  "direction": "desc"
}
```

更新条目元数据：

```json
{
  "itemKey": "ITEM_KEY",
  "version": 12,
  "data": {
    "title": "Corrected Title",
    "tags": ["reviewed", "cleaned"]
  }
}
```

管理条目标签：

```json
{
  "action": "add_to_item",
  "itemKey": "ITEM_KEY",
  "tags": ["to-read", "priority"]
}
```

批量删除条目：

```json
{
  "itemKeys": ["ITEM_KEY_1", "ITEM_KEY_2"]
}
```

生成引文：

```json
{
  "itemKeys": ["ITEM_KEY_1", "ITEM_KEY_2"],
  "style": "apa",
  "format": "text"
}
```

创建条目：

```json
{
  "itemType": "journalArticle",
  "title": "Understanding Neural Networks",
  "creators": [
    { "creatorType": "author", "firstName": "Jane", "lastName": "Smith" }
  ],
  "date": "2024",
  "DOI": "10.1234/example",
  "tags": ["neural-networks"],
  "collections": ["COLLECTION_KEY"]
}
```

## ⚙️ 配置

环境变量：

- `ZOTERO_API_KEY` (必填)
- `ZOTERO_USER_ID` 或 `ZOTERO_GROUP_ID` (必填)
- `ZOTERO_BASE_URL` (默认: https://api.zotero.org)
- `ZOTERO_TIMEOUT` (默认: 30000 ms)
- `ZOTERO_MAX_RETRIES` (默认: 3)
- `CACHE_ENABLED` (默认: true)
- `CACHE_TTL_SECONDS` (默认: 300)
- `LOG_LEVEL` (默认: info)

## 🧠 缓存和速率限制

- 搜索结果使用可配置的 TTL（默认 300秒）
- 分类/标签缓存 15 分钟；条目模板缓存 1 小时
- 遵循 `Backoff` / `Retry-After` 头，并重试瞬时故障

## 🧪 开发

```bash
npm run dev
```

构建：

```bash
npm run build
```

测试（需要有效的 .env）：

```bash
npm test
```

## 🤝 致谢

基于 Zotero Web API 和 Model Context Protocol SDK 构建。

## 📄 许可证

MIT License.