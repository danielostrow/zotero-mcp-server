# Quick Start Guide

## Setup

### 1. Get Your Zotero API Credentials

Visit https://www.zotero.org/settings/keys and:
1. Create a new API key
2. Note your **User ID** (shown at the top)
3. Copy your **API Key**

### 2. Configure the Server

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
ZOTERO_API_KEY=your_api_key_here
ZOTERO_USER_ID=123456
```

### 3. Test the Server

```bash
# The server is already built! Just run:
npm start
```

You should see:
```
[Zotero MCP] Starting server...
[Zotero MCP] Services initialized
[Zotero MCP] Server running on stdio
[Zotero MCP] Connected to user 123456
```

Press Ctrl+C to stop.

## Usage with Claude Desktop

### Configure Claude Desktop

**macOS**: Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: Edit `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration (replace with your actual path and credentials):

```json
{
  "mcpServers": {
    "zotero": {
      "command": "node",
      "args": ["/Users/danielostrow/Projects/ZoteroMCP/dist/index.js"],
      "env": {
        "ZOTERO_API_KEY": "your_api_key_here",
        "ZOTERO_USER_ID": "123456"
      }
    }
  }
}
```

### Restart Claude Desktop

After saving the configuration, restart Claude Desktop completely.

## Try It Out!

Once Claude Desktop restarts, try these commands:

### Search Your Library

```
Search my Zotero library for machine learning papers
```

### Generate Citations

```
Generate APA citations for the first 3 machine learning papers
```

### Extract PDF Content

```
Extract the abstract from the first paper (you'll need to provide the item key)
```

### Manage Your Library

```
Create a new collection called "AI Research Papers"
```

```
Add a new journal article about deep learning to my library
```

## Available Tools

1. **search_items** - Search and filter your library
2. **get_item** - Get details for a specific item
3. **generate_citation** - Format citations in any style
4. **extract_pdf_text** - Get full-text from PDFs
5. **create_item** - Add new items
6. **update_item** - Modify existing items
7. **delete_items** - Remove items
8. **manage_collections** - Organize with collections
9. **manage_tags** - Tag and categorize

## Available Resources

1. **zotero://collections** - Browse your collections
2. **zotero://tags** - View all tags
3. **zotero://citation-styles** - List available citation styles

## Troubleshooting

### "Configuration validation failed"

- Check your `.env` file has both `ZOTERO_API_KEY` and `ZOTERO_USER_ID`
- Make sure there are no extra spaces or quotes

### "Authentication failed"

- Verify your API key is correct
- Check the key has read/write permissions at https://www.zotero.org/settings/keys

### Claude Desktop not showing Zotero tools

- Verify the path in `claude_desktop_config.json` is absolute and correct
- Check Claude Desktop logs (Help → View Logs)
- Restart Claude Desktop completely (Quit and reopen)

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore all available citation styles at `zotero://citation-styles`
- Try combining tools: search → get items → generate citations
- Index your PDFs in Zotero Desktop for full-text extraction

## Support

- Zotero API: https://www.zotero.org/support/dev/web_api/v3/start
- MCP Documentation: https://modelcontextprotocol.io/
- Report issues: Create an issue in this repository
