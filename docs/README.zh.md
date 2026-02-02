# Zotero MCP Server（中文）

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Node >= 20.16](https://img.shields.io/badge/node-%3E%3D%2020.16-brightgreen.svg)

一个基于 Model Context Protocol (MCP) 的服务器，让 AI 客户端可以结构化访问你的 Zotero 资料库，实现检索、引用与管理。

## ✨ 核心亮点

- Zotero 条目、收藏夹与标签的读写管理
- 支持常见引用格式（APA/MLA/Chicago/IEEE 等）
- 支持收藏夹内检索与标签管理
- 内存缓存 + 自动限流回退
- 面向 MCP 客户端（stdio 传输）

## ✅ 环境要求

- Node.js >= 20.16
- Zotero API Key
- Zotero 用户 ID 或群组 ID

获取 API Key： https://www.zotero.org/settings/keys

## 🚀 快速开始

### npm

```bash
npm install -g zotero-mcp-server
```

启动：

```bash
ZOTERO_API_KEY=your_api_key_here ZOTERO_USER_ID=your_user_id_here zotero-mcp
```

或使用 npx：

```bash
ZOTERO_API_KEY=your_api_key_here ZOTERO_USER_ID=your_user_id_here npx zotero-mcp-server
```

### source

```bash
npm install
npm run build
```

创建 `.env`（参考 `.env.example`）：

```env
ZOTERO_API_KEY=your_api_key_here
ZOTERO_USER_ID=your_user_id_here
# ZOTERO_GROUP_ID=your_group_id_here
```

启动服务：

```bash
node dist/index.js
```

## 🔌 MCP 客户端配置示例

以下是使用 stdio 传输的 MCP 客户端配置示例：

### npm（npx）

```json
{
  "mcpServers": {
    "zotero": {
      "command": "npx",
        "args": ["zotero-mcp-server"],
      "env": {
        "ZOTERO_API_KEY": "your_api_key_here",
        "ZOTERO_USER_ID": "your_user_id_here"
      }
    }
  }
}
```

### source（node）

```json
{
  "mcpServers": {
    "zotero": {
      "command": "node",
      "args": ["/absolute/path/to/zotero-mcp-server/dist/index.js"],
      "env": {
        "ZOTERO_API_KEY": "your_api_key_here",
        "ZOTERO_USER_ID": "your_user_id_here"
      }
    }
  }
}
```

二进制名称：`zotero-mcp`。

## 🛠️ Tools（工具）

- `search_items` - 检索条目（关键词/标签/收藏夹/类型）
- `get_item` - 通过 key 或 DOI 获取条目
- `generate_citation` - 生成引用格式
- `create_item` - 新建条目
- `update_item` - 更新条目（需 version）
- `delete_items` - 批量删除（最多 50）
- `manage_collections` - 收藏夹管理
- `manage_tags` - 标签管理
- `extract_pdf_text` - 提取 PDF 附件全文

## 🧭 Resources（资源）

- `zotero://collections` - 收藏夹结构与元数据
- `zotero://tags` - 标签及使用次数
- `zotero://citation-styles` - 常见引用样式 ID（非完整列表）

## 📌 使用示例

搜索：

```json
{
  "query": "machine learning",
  "limit": 10,
  "sort": "dateAdded",
  "direction": "desc"
}
```

在收藏夹内搜索：

```json
{
  "collection": "COLLECTION_KEY",
  "limit": 25
}
```

通过 DOI 获取条目：

```json
{
  "doi": "10.1038/s41467-024-47316-2"
}
```

生成引用：

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

## ⚙️ 配置项

环境变量：

- `ZOTERO_API_KEY`（必填）
- `ZOTERO_USER_ID` 或 `ZOTERO_GROUP_ID`（必填）
- `ZOTERO_BASE_URL`（默认 https://api.zotero.org）
- `ZOTERO_TIMEOUT`（默认 30000 ms）
- `ZOTERO_MAX_RETRIES`（默认 3）
- `CACHE_ENABLED`（默认 true）
- `CACHE_TTL_SECONDS`（默认 300）
- `LOG_LEVEL`（默认 info）

## 🧠 缓存与限流

- 搜索结果默认缓存 300 秒
- 收藏夹/标签缓存 15 分钟；模板缓存 1 小时
- 支持 `Backoff` / `Retry-After` 自动退避与重试

## 🧪 开发

```bash
npm run dev
```

构建：

```bash
npm run build
```

测试（需要可用的 .env）：

```bash
npm test
```

## 📄 许可证

MIT License，详见 `LICENSE`。

---

Zotero 是 Corporation for Digital Scholarship 的商标。本项目与 Zotero 官方无隶属关系。
