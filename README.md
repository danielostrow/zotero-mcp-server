# Zotero MCP Server

A Model Context Protocol server that provides programmatic access to Zotero reference libraries. This server enables AI assistants to search, cite, and manage research references directly from your Zotero library.

## Features

### Tools

- **search_items** - Search and filter items in your library
- **get_item** - Retrieve a single item by key or DOI
- **generate_citation** - Generate formatted citations in multiple styles
- **extract_pdf_text** - Extract full-text content from PDF attachments
- **create_item** - Add new items to your library
- **update_item** - Modify existing item metadata
- **delete_items** - Remove items from your library
- **manage_collections** - Create and organize collections
- **manage_tags** - Add and remove tags from items

### Resources

- **zotero://collections** - Access collection hierarchy and metadata
- **zotero://tags** - Browse all tags in your library
- **zotero://citation-styles** - List available citation styles

## Prerequisites

- Node.js 20.16.0 or higher
- A Zotero account with API access
- Zotero API key from https://www.zotero.org/settings/keys

## Installation

### Option 1: NPM (Coming Soon)

```bash
npm install -g zotero-mcp-server
```

### Option 2: From Source

```bash
git clone <repository-url>
cd ZoteroMCP
npm install
npm run build
```

## Configuration

### Getting Your Credentials

1. Visit https://www.zotero.org/settings/keys
2. Create a new API key with appropriate permissions
3. Note your User ID (displayed at the top of the page)
4. Copy the generated API key

### Environment Variables

Create a `.env` file in the project root:

```env
ZOTERO_API_KEY=your_api_key_here
ZOTERO_USER_ID=your_user_id_here
```

For group libraries, use `ZOTERO_GROUP_ID` instead of `ZOTERO_USER_ID`.

### Optional Configuration

```env
ZOTERO_BASE_URL=https://api.zotero.org
ZOTERO_TIMEOUT=30000
ZOTERO_MAX_RETRIES=3
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300
```

## Usage with Claude Desktop

Add this configuration to your Claude Desktop config file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "zotero": {
      "command": "node",
      "args": ["/absolute/path/to/ZoteroMCP/dist/index.js"],
      "env": {
        "ZOTERO_API_KEY": "your_api_key_here",
        "ZOTERO_USER_ID": "your_user_id_here"
      }
    }
  }
}
```

Restart Claude Desktop after making this change.

## Tool Usage Examples

### Searching Items

Search your library with various filters:

```typescript
// Search by text query
{
  "query": "machine learning",
  "limit": 10
}

// Filter by item type and tags
{
  "itemType": "journalArticle",
  "tag": ["ai", "research"],
  "sort": "dateAdded",
  "direction": "desc"
}

// Search within a collection
{
  "collection": "COLLECTION_KEY",
  "limit": 25
}
```

### Generating Citations

Create formatted citations in various styles:

```typescript
{
  "itemKeys": ["ITEM_KEY_1", "ITEM_KEY_2"],
  "style": "apa"
}

// Supported styles include:
// apa, chicago-note-bibliography, mla, ieee, nature,
// science, harvard-cite-them-right, vancouver, and 10,000+ more
```

### Extracting PDF Text

Extract text content from PDF attachments:

```typescript
{
  "itemKey": "PDF_ATTACHMENT_KEY",
  "pages": {
    "start": 1,
    "end": 5
  }
}
```

Note: PDFs must be indexed by Zotero Desktop for full-text extraction to work.

### Creating Items

Add new items to your library:

```typescript
{
  "itemType": "journalArticle",
  "title": "Understanding Neural Networks",
  "creators": [
    {
      "creatorType": "author",
      "firstName": "Jane",
      "lastName": "Smith"
    }
  ],
  "date": "2024",
  "DOI": "10.1234/example",
  "tags": ["neural-networks", "deep-learning"],
  "collections": ["COLLECTION_KEY"]
}
```

### Managing Collections

Create and organize collections:

```typescript
// List all collections
{
  "action": "list"
}

// Create a new collection
{
  "action": "create",
  "name": "Machine Learning Papers"
}

// Create a nested collection
{
  "action": "create",
  "name": "Deep Learning",
  "parentCollection": "PARENT_COLLECTION_KEY"
}
```

### Managing Tags

Add or remove tags from items:

```typescript
// Add tags to an item
{
  "action": "add_to_item",
  "itemKey": "ITEM_KEY",
  "tags": ["ai", "research"]
}

// Remove tags from an item
{
  "action": "remove_from_item",
  "itemKey": "ITEM_KEY",
  "tag": "outdated"
}

// List all tags
{
  "action": "list"
}
```

## Resource Usage Examples

### Collections Resource

```
zotero://collections
```

Returns all collections with hierarchy information, item counts, and metadata.

```
zotero://collections/COLLECTION_KEY
```

Returns details for a specific collection.

### Tags Resource

```
zotero://tags
```

Returns all tags in your library with usage counts.

### Citation Styles Resource

```
zotero://citation-styles
```

Returns a list of commonly used citation styles with their identifiers.

## API Details

### Rate Limiting

The server implements automatic rate limiting with exponential backoff:

- Initial retry delay: 5 seconds
- Maximum retries: 3 (configurable)
- Respects Zotero API `Backoff` and `Retry-After` headers
- Requests are queued during rate limit periods

### Caching

Intelligent caching reduces API calls and improves performance:

- Item templates: 1 hour
- Collections and tags: 15 minutes
- Search results: 5 minutes
- PDF full-text: 30 days
- Citations: 1 hour

### Error Handling

All errors are transformed into descriptive messages:

- **400** - Invalid request parameters
- **401/403** - Authentication failure (check API key)
- **404** - Item or resource not found
- **409** - Version conflict (item modified elsewhere)
- **412** - Precondition failed (library version changed)
- **429** - Rate limited (automatic retry)
- **5xx** - Server error (automatic retry)

## Development

### Building from Source

```bash
npm install
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

### Project Structure

```
src/
├── index.ts              # Server entry point
├── config/
│   └── default.ts        # Configuration management
├── services/
│   ├── zotero-client.ts  # Zotero API client
│   ├── cache-manager.ts  # Caching layer
│   └── pdf-extractor.ts  # PDF text extraction
├── tools/
│   └── index.ts          # MCP tool implementations
├── resources/
│   └── index.ts          # MCP resource implementations
├── utils/
│   ├── validators.ts     # Input validation
│   └── error-handler.ts  # Error transformation
└── types/
    └── zotero.ts         # Type definitions
```

## Troubleshooting

### Server won't start

Ensure you have created a `.env` file with valid credentials:

```bash
cp .env.example .env
# Edit .env and add your ZOTERO_API_KEY and ZOTERO_USER_ID
```

### Authentication errors

- Verify your API key at https://www.zotero.org/settings/keys
- Ensure the API key has appropriate read/write permissions
- Check that ZOTERO_USER_ID matches the ID shown on the API keys page

### PDF extraction fails

- PDFs must be indexed by Zotero Desktop application
- Open Zotero Desktop and allow it to index PDF attachments
- Verify the item has an actual PDF attachment (not just a link)

### Claude Desktop doesn't show Zotero tools

- Verify the absolute path in `claude_desktop_config.json` is correct
- Check that environment variables in the config are set
- Restart Claude Desktop completely (quit and reopen)
- Check Claude Desktop logs: Help → View Logs

## License

MIT

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.

## Attribution

This MCP server uses the Zotero Web API to provide programmatic access to Zotero libraries. Zotero is a free, open-source reference management software developed by the Corporation for Digital Scholarship.

This project is not affiliated with, endorsed by, or sponsored by Zotero or the Corporation for Digital Scholarship.

## Links

- [Zotero](https://www.zotero.org/)
- [Zotero API Documentation](https://www.zotero.org/support/dev/web_api/v3/start)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Zotero API Keys](https://www.zotero.org/settings/keys)
