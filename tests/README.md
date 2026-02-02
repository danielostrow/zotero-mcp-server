# Zotero MCP Server Tests

This directory contains comprehensive tests for the Zotero MCP server.

## Running Tests

### Prerequisites

Create a `.env` file in the project root with your Zotero credentials:

```bash
cp .env.example .env
# Edit .env and add your ZOTERO_API_KEY and ZOTERO_USER_ID
```

### Run Integration Tests

```bash
npm test
```

Or run directly:

```bash
npx tsx tests/integration.test.ts
```

## Test Coverage

### Library Access Tests
- ✅ Search items with filters
- ✅ Get collections
- ✅ Get tags
- ✅ Get single item by key

### Citation Generation Tests
- ✅ APA style citations
- ✅ Chicago style citations
- ✅ MLA style citations
- ✅ IEEE style citations

### MCP Tools Tests
- ✅ search_items tool
- ✅ generate_citation tool
- ✅ manage_collections tool
- ✅ manage_tags tool
- ✅ get_item tool

### Cache Tests
- ✅ Cache functionality
- ✅ Cache hit rates
- ✅ Cache invalidation

## Test Environment

Tests use environment variables from `.env`:
- `ZOTERO_API_KEY` - Your Zotero API key
- `ZOTERO_USER_ID` - Your Zotero user ID
- `ZOTERO_GROUP_ID` - (Optional) Group library ID

This ensures tests can be run without hardcoding credentials and can be safely committed to public repositories.

## Expected Output

Successful test run:
```
🧪 Zotero MCP Server Integration Tests

Configuration:
  User ID: 123456
  API Key: ✓ Set
  Cache Enabled: true

📚 Library Access Tests

✅ Search items
   Found 5 items
✅ Get collections
   Found 6 collections
✅ Get tags
   Found 14 tags
✅ Get single item
   Retrieved item ABC123

📝 Citation Generation Tests

✅ Generate APA citation
   Citation generated
✅ Generate Chicago citation
   Citation generated
✅ Generate MLA citation
   Citation generated

🔧 MCP Tools Tests

✅ search_items tool
   MCP tool returned results
✅ generate_citation tool
   MCP tool returned citation
✅ manage_collections tool
   MCP tool listed collections
✅ manage_tags tool
   MCP tool listed tags

💾 Cache Tests

✅ Cache is working
   7 entries cached
✅ Cache hit rate
   Cache is reusing entries

📊 Test Summary

Total Tests: 13
Passed: 13 ✅
Failed: 0 ❌
Success Rate: 100%

🎉 All tests passed!
```

## Troubleshooting

### No .env file

```
Error: Configuration validation failed:
  apiKey: ZOTERO_API_KEY is required
```

**Solution**: Create `.env` file with your credentials

### Authentication errors

```
❌ Search items
   Error: 401 Unauthorized
```

**Solution**: Verify your ZOTERO_API_KEY is correct

### Empty library

```
⚠️  Search items
   Library is empty
```

**Solution**: Add some items to your Zotero library
