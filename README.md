![Zotero Manager](./docs/assets/image.svg)

# Zotero Manager MCP

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Node >= 20.16](https://img.shields.io/badge/node-%3E%3D%2020.16-brightgreen.svg)

A Model Context Protocol (MCP) server that acts as a Zotero library administrator for AI clients. Organize, clean, and manage references with structured tools, while still supporting search and citation workflows.

English | [中文](docs/README.zh.md)

---

## ✨ Highlights

- Admin-grade read/write access to Zotero items, collections, and tags
- Metadata maintenance via structured updates (titles, creators, dates, etc.)
- Collection/tag organization and batch delete operations
- Citation generation in common styles (APA, MLA, Chicago, IEEE, etc.)
- In-memory caching and automatic rate-limit backoff
- Designed for MCP-compatible clients (stdio transport)

## ✅ Requirements

- Node.js >= 20.16
- Zotero API key
- Zotero user ID or group ID

Get your API key: https://www.zotero.org/settings/keys

## 🚀 Quick start

### npm

```bash
npm install -g zotero-manager
```

Run:

```bash
ZOTERO_API_KEY=your_api_key_here ZOTERO_USER_ID=your_user_id_here zotero-manager
```

Or with npx:

```bash
ZOTERO_API_KEY=your_api_key_here ZOTERO_USER_ID=your_user_id_here npx zotero-manager
```

### source

```bash
npm install
npm run build
```

Create a `.env` file (see `.env.example`):

```env
ZOTERO_API_KEY=your_api_key_here
ZOTERO_USER_ID=your_user_id_here
# ZOTERO_GROUP_ID=your_group_id_here
```

Run the server:

```bash
node dist/index.js
```

## 🔌 MCP client config example

Example for a desktop MCP client that supports stdio transport:

### npm (npx)

```json
{
  "mcpServers": {
    "zotero": {
      "command": "npx",
      "args": ["zotero-manager"],
      "env": {
        "ZOTERO_API_KEY": "your_api_key_here",
        "ZOTERO_USER_ID": "your_user_id_here"
      }
    }
  }
}
```

### source (node)

```json
{
  "mcpServers": {
    "zotero": {
      "command": "node",
      "args": ["/absolute/path/to/zotero-manager/dist/index.js"],
      "env": {
        "ZOTERO_API_KEY": "your_api_key_here",
        "ZOTERO_USER_ID": "your_user_id_here"
      }
    }
  }
}
```

Binary name: `zotero-manager`.

## 🛠️ Tools

- `search_items` - Search library items (query, tags, collection, item type)
- `get_item` - Fetch a single item by key or DOI
- `generate_citation` - Format citations in a chosen style
- `create_item` - Create a new Zotero item
- `update_item` - Update item fields (requires version)
- `delete_items` - Delete items (batch up to 50)
- `manage_collections` - List/get/create/update/delete collections
- `manage_tags` - List/add/remove/delete tags

## 🧭 Resources

- `zotero://collections` - Collection hierarchy and metadata
- `zotero://tags` - All tags with usage counts
- `zotero://citation-styles` - Common citation style IDs (not exhaustive)

## 📌 Usage examples

Search items:

```json
{
  "query": "machine learning",
  "limit": 10,
  "sort": "dateAdded",
  "direction": "desc"
}
```

Update item metadata:

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

Manage tags for an item:

```json
{
  "action": "add_to_item",
  "itemKey": "ITEM_KEY",
  "tags": ["to-read", "priority"]
}
```

Delete items in batch:

```json
{
  "itemKeys": ["ITEM_KEY_1", "ITEM_KEY_2"]
}
```

Generate a citation:

```json
{
  "itemKeys": ["ITEM_KEY_1", "ITEM_KEY_2"],
  "style": "apa",
  "format": "text"
}
```

Create an item:

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

## ⚙️ Configuration

Environment variables:

- `ZOTERO_API_KEY` (required)
- `ZOTERO_USER_ID` or `ZOTERO_GROUP_ID` (required)
- `ZOTERO_BASE_URL` (default: https://api.zotero.org)
- `ZOTERO_TIMEOUT` (default: 30000 ms)
- `ZOTERO_MAX_RETRIES` (default: 3)
- `CACHE_ENABLED` (default: true)
- `CACHE_TTL_SECONDS` (default: 300)
- `LOG_LEVEL` (default: info)

## 🧠 Caching and rate limits

- Search results use a configurable TTL (default 300s)
- Collections/tags cached for 15 minutes; item templates cached for 1 hour
- Honors `Backoff` / `Retry-After` and retries transient failures

## 🧪 Development

```bash
npm run dev
```

Build:

```bash
npm run build
```

Tests (requires valid .env):

```bash
npm test
```

## 🤝 Acknowledgements

Built on the Zotero Web API and the Model Context Protocol SDK.

## 📄 License

MIT License.
