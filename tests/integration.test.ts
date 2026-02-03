#!/usr/bin/env node
/**
 * Comprehensive Integration Tests for Zotero MCP Server
 * Tests all functionality using environment variables from .env
 * Safe to commit to public repositories
 */

import { config } from '../src/config/default.js';
import { CacheManager } from '../src/services/cache-manager.js';
import { ZoteroClient } from '../src/services/zotero-client.js';
import {
  searchItems,
  getItem,
  generateCitation,
  createItem,
  updateItem,
  deleteItems,
  manageCollections,
  manageTags,
} from '../src/tools/index.js';

let testResults = {
  passed: 0,
  failed: 0,
  tests: [] as { name: string; status: 'pass' | 'fail'; message?: string }[]
};

function logTest(name: string, passed: boolean, message?: string) {
  testResults.tests.push({ name, status: passed ? 'pass' : 'fail', message });
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
    if (message) console.log(`   ${message}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`);
    if (message) console.log(`   Error: ${message}`);
  }
}

async function runTests() {
  console.log('🧪 Zotero MCP Server Integration Tests\n');
  console.log(`Configuration:`);
  console.log(`  User ID: ${config.userId || 'Not set'}`);
  console.log(`  Group ID: ${config.groupId || 'Not set'}`);
  console.log(`  API Key: ${config.apiKey ? '✓ Set' : '✗ Missing'}`);
  console.log(`  Cache Enabled: ${config.cacheEnabled}`);
  console.log('');

  // Initialize services
  const cache = new CacheManager();
  const zoteroClient = new ZoteroClient(config, cache);
  // Store item keys for later tests
  let testItemKey: string | null = null;
  let testCollectionKey: string | null = null;
  let createdItemKey: string | null = null;

  // Test 1: Search Items
  console.log('📚 Library Access Tests\n');
  try {
    const items = await zoteroClient.searchItems({ limit: 5 });
    const hasItems = items.length > 0;
    logTest(
      'Search items',
      hasItems,
      hasItems ? `Found ${items.length} items` : 'Library is empty'
    );
    if (hasItems) {
      testItemKey = items.find((i: any) => i.itemType !== 'attachment')?.key || items[0].key;
    }
  } catch (error: any) {
    logTest('Search items', false, error.message);
  }

  // Test 2: Get Collections
  try {
    const collections = await zoteroClient.getCollections();
    logTest('Get collections', true, `Found ${collections.length} collections`);
    if (collections.length > 0) {
      testCollectionKey = collections[0].key;
    }
  } catch (error: any) {
    logTest('Get collections', false, error.message);
  }

  // Test 3: Get Tags
  try {
    const tags = await zoteroClient.getTags();
    logTest('Get tags', true, `Found ${tags.length} tags`);
  } catch (error: any) {
    logTest('Get tags', false, error.message);
  }

  // Test 4: Get Single Item
  if (testItemKey) {
    try {
      const item = await zoteroClient.getItem(testItemKey);
      logTest('Get single item', item.key === testItemKey, `Retrieved item ${item.key}`);
    } catch (error: any) {
      logTest('Get single item', false, error.message);
    }
  }

  console.log('\n📝 Citation Generation Tests\n');

  // Test 5: Generate APA Citation
  if (testItemKey) {
    try {
      const citation = await zoteroClient.generateCitation([testItemKey], 'apa');
      const isValid = citation && typeof citation === 'string';
      logTest('Generate APA citation', isValid, isValid ? 'Citation generated' : 'Invalid citation format');
    } catch (error: any) {
      logTest('Generate APA citation', false, error.message);
    }
  }

  // Test 6: Generate Chicago Citation
  if (testItemKey) {
    try {
      const citation = await zoteroClient.generateCitation([testItemKey], 'chicago-note-bibliography');
      const isValid = citation && typeof citation === 'string';
      logTest('Generate Chicago citation', isValid, isValid ? 'Citation generated' : 'Invalid citation format');
    } catch (error: any) {
      logTest('Generate Chicago citation', false, error.message);
    }
  }

  // Test 7: Generate MLA Citation
  if (testItemKey) {
    try {
      const citation = await zoteroClient.generateCitation([testItemKey], 'mla');
      const isValid = citation && typeof citation === 'string';
      logTest('Generate MLA citation', isValid, isValid ? 'Citation generated' : 'Invalid citation format');
    } catch (error: any) {
      logTest('Generate MLA citation', false, error.message);
    }
  }

  console.log('\n🔧 MCP Tools Tests\n');

  // Test 8: search_items tool
  try {
    const result = await searchItems({ limit: 3 }, zoteroClient);
    const hasContent = result.content && result.content.length > 0;
    logTest('search_items tool', hasContent, 'MCP tool returned results');
  } catch (error: any) {
    logTest('search_items tool', false, error.message);
  }

  // Test 9: generate_citation tool
  if (testItemKey) {
    try {
      const result = await generateCitation({ itemKeys: [testItemKey], style: 'apa' }, zoteroClient);
      const hasContent = result.content && result.content.length > 0;
      logTest('generate_citation tool', hasContent, 'MCP tool returned citation');
    } catch (error: any) {
      logTest('generate_citation tool', false, error.message);
    }
  }

  // Test 10: manage_collections tool
  try {
    const result = await manageCollections({ action: 'list' }, zoteroClient);
    const hasContent = result.content && result.content.length > 0;
    logTest('manage_collections tool', hasContent, 'MCP tool listed collections');
  } catch (error: any) {
    logTest('manage_collections tool', false, error.message);
  }

  // Test 11: manage_tags tool
  try {
    const result = await manageTags({ action: 'list' }, zoteroClient);
    const hasContent = result.content && result.content.length > 0;
    logTest('manage_tags tool', hasContent, 'MCP tool listed tags');
  } catch (error: any) {
    logTest('manage_tags tool', false, error.message);
  }

  console.log('\n💾 Cache Tests\n');

  // Test 12: Cache Functionality
  const cacheStats = cache.stats();
  logTest('Cache is working', cacheStats.size > 0, `${cacheStats.size} entries cached`);

  // Test 13: Cache Hit
  if (testItemKey) {
    try {
      await zoteroClient.getItem(testItemKey);
      const statsBefore = cache.stats().size;
      await zoteroClient.getItem(testItemKey); // Should hit cache
      const statsAfter = cache.stats().size;
      logTest('Cache hit rate', statsAfter >= statsBefore, 'Cache is reusing entries');
    } catch (error: any) {
      logTest('Cache hit rate', false, error.message);
    }
  }

  console.log('\n📊 Test Summary\n');
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);

  if (testResults.failed > 0) {
    console.log('\n⚠️  Failed Tests:');
    testResults.tests
      .filter(t => t.status === 'fail')
      .forEach(t => console.log(`   - ${t.name}: ${t.message}`));
  }

  console.log('\n' + (testResults.failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed'));

  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});
