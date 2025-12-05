#!/usr/bin/env node

/**
 * Documentation indexing and cache management tool
 * 
 * Usage:
 *   node src/index-docs.js [source] [options]
 *   node src/index-docs.js --stats
 *   node src/index-docs.js --clear-cache [embedding|page|all]
 *   node src/index-docs.js --validate-cache
 *   node src/index-docs.js --rebuild-source <source-id>
 * 
 * Examples:
 *   node src/index-docs.js k3s
 *   node src/index-docs.js all --force
 *   node src/index-docs.js --stats
 *   node src/index-docs.js --clear-cache page
 *   node src/index-docs.js --rebuild-source suse
 */

import { DocumentationService } from '../services/documentation-service.js';
import { VectorService } from '../services/vector-service.js';
import { AIService } from '../services/ai-service.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  stats: args.includes('--stats'),
  clearCache: args.find(arg => arg.startsWith('--clear-cache')),
  validateCache: args.includes('--validate-cache'),
  rebuildSource: args.includes('--rebuild-source'),
  force: args.includes('--force'),
};

const docService = new DocumentationService();
const vectorService = new VectorService();
const aiService = new AIService();

try {
  // Handle --stats flag
  if (flags.stats) {
    await showCacheStats();
    process.exit(0);
  }

  // Handle --clear-cache flag
  if (flags.clearCache) {
    const cacheTypeIndex = args.indexOf('--clear-cache') + 1;
    const cacheType = args[cacheTypeIndex] || 'all';
    await clearCache(cacheType);
    process.exit(0);
  }

  // Handle --validate-cache flag
  if (flags.validateCache) {
    await validateCache();
    process.exit(0);
  }

  // Handle --rebuild-source flag
  if (flags.rebuildSource) {
    const sourceIndex = args.indexOf('--rebuild-source') + 1;
    const source = args[sourceIndex];
    if (!source) {
      console.error('❌ Error: --rebuild-source requires a source ID (suse, rancher, k3s, or all)');
      process.exit(1);
    }
    await rebuildSource(source);
    process.exit(0);
  }

  // Default: Index documentation
  const source = args.find(arg => !arg.startsWith('--')) || 'k3s';
  await indexDocumentation(source, flags.force);

} catch (error) {
  console.error(`❌ Error:`, error);
  process.exit(1);
}

// Show detailed cache statistics
async function showCacheStats() {
  console.log('\n📊 Cache Statistics\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Load caches
  await docService.loadPageCache();
  await aiService.loadEmbeddingCache();

  // Page Cache Stats
  const pageCacheStats = docService.getPageCacheStats();
  const totalPages = docService.pageCache.size;
  
  // Count by source
  const sourceCounts = new Map();
  const indexedCounts = new Map();
  
  for (const [url, entry] of docService.pageCache.entries()) {
    const source = entry.source || docService.getSourceFromUrl(url);
    if (source) {
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
      if (entry.indexed) {
        indexedCounts.set(source, (indexedCounts.get(source) || 0) + 1);
      }
    }
  }

  console.log('📄 Page Cache:');
  console.log(`   Total cached pages: ${totalPages}`);
  console.log(`   Cache file: data/page-cache.json`);
  console.log('');
  console.log('   By Source:');
  for (const [source, count] of sourceCounts.entries()) {
    const indexed = indexedCounts.get(source) || 0;
    console.log(`     ${source.padEnd(10)} ${indexed} indexed / ${count} cached`);
  }
  console.log('');
  console.log('   Session Stats:');
  console.log(`     Loaded: ${pageCacheStats.loaded}`);
  console.log(`     304 Not Modified: ${pageCacheStats.hits304}`);
  console.log(`     Hash matches: ${pageCacheStats.hitsCached}`);
  console.log(`     New/Modified: ${pageCacheStats.misses}`);
  console.log(`     Skipped (unchanged): ${pageCacheStats.skipped}`);

  // Embedding Cache Stats
  const embeddingStats = aiService.getCacheStats();
  
  console.log('\n🧠 Embedding Cache:');
  console.log(`   Total cached embeddings: ${embeddingStats.currentSize}`);
  console.log(`   Cache file: data/embedding-cache.json`);
  console.log('');
  console.log('   Session Stats:');
  console.log(`     Loaded: ${embeddingStats.loaded}`);
  console.log(`     Hits: ${embeddingStats.hits}`);
  console.log(`     Misses: ${embeddingStats.misses}`);
  console.log(`     Hit rate: ${embeddingStats.hitRate}`);

  // Vector Database Stats
  await vectorService.ensureInitialized();
  console.log('\n🗂️  Vector Database:');
  console.log(`   Location: ${vectorService.indexPath}`);
  
  try {
    const indexStats = await fs.stat(vectorService.indexPath);
    console.log(`   Created: ${indexStats.birthtime.toLocaleDateString()}`);
    console.log(`   Last modified: ${indexStats.mtime.toLocaleDateString()}`);
  } catch (error) {
    console.log('   Status: Not initialized');
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

// Clear cache(s)
async function clearCache(cacheType) {
  console.log(`\n🗑️  Clearing ${cacheType} cache...\n`);

  if (cacheType === 'embedding' || cacheType === 'all') {
    try {
      await fs.unlink('data/embedding-cache.json');
      console.log('✓ Cleared embedding cache (data/embedding-cache.json)');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('✗ Failed to clear embedding cache:', error.message);
      }
    }
  }

  if (cacheType === 'page' || cacheType === 'all') {
    try {
      await fs.unlink('data/page-cache.json');
      console.log('✓ Cleared page cache (data/page-cache.json)');
      
      // Also clear HTML cache directory
      try {
        const htmlDir = 'data/html';
        const files = await fs.readdir(htmlDir);
        for (const file of files) {
          await fs.unlink(path.join(htmlDir, file));
        }
        console.log(`✓ Cleared ${files.length} cached HTML files`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('✗ Failed to clear HTML cache:', error.message);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('✗ Failed to clear page cache:', error.message);
      }
    }
  }

  if (cacheType === 'vectors' || cacheType === 'all') {
    try {
      const vectorPath = process.env.VECTOR_DB_PATH || './data/vectors';
      await fs.rm(vectorPath, { recursive: true, force: true });
      console.log(`✓ Cleared vector database (${vectorPath})`);
    } catch (error) {
      console.error('✗ Failed to clear vector database:', error.message);
    }
  }

  if (!['embedding', 'page', 'vectors', 'all'].includes(cacheType)) {
    console.error(`❌ Invalid cache type: ${cacheType}`);
    console.error('Valid options: embedding, page, vectors, all');
    process.exit(1);
  }

  console.log('\n✅ Cache clearing complete!\n');
}

// Validate cache integrity
async function validateCache() {
  console.log('\n🔍 Validating caches...\n');

  let errors = 0;

  // Validate page cache
  try {
    await docService.loadPageCache();
    console.log(`✓ Page cache loaded successfully (${docService.pageCache.size} entries)`);
    
    // Check for corrupted entries
    for (const [url, entry] of docService.pageCache.entries()) {
      if (!entry.contentHash) {
        console.warn(`  ⚠️  Missing contentHash: ${url}`);
        errors++;
      }
      if (entry.indexed && !entry.source) {
        console.warn(`  ⚠️  Indexed entry missing source: ${url}`);
        errors++;
      }
    }
  } catch (error) {
    console.error('✗ Page cache validation failed:', error.message);
    errors++;
  }

  // Validate embedding cache
  try {
    await aiService.loadEmbeddingCache();
    const stats = aiService.getCacheStats();
    console.log(`✓ Embedding cache loaded successfully (${stats.currentSize} entries)`);
    
    // Check for corrupted entries
    let checkedCount = 0;
    for (const [hash, embedding] of aiService.embeddingCache.entries()) {
      if (!Array.isArray(embedding) || embedding.length === 0) {
        console.warn(`  ⚠️  Invalid embedding for hash: ${hash.substring(0, 16)}...`);
        errors++;
      }
      if (++checkedCount > 100) break; // Sample check, don't validate all
    }
  } catch (error) {
    console.error('✗ Embedding cache validation failed:', error.message);
    errors++;
  }

  // Validate vector database
  try {
    await vectorService.ensureInitialized();
    console.log(`✓ Vector database accessible (${vectorService.indexPath})`);
  } catch (error) {
    console.error('✗ Vector database validation failed:', error.message);
    errors++;
  }

  console.log('');
  if (errors === 0) {
    console.log('✅ All caches valid!\n');
  } else {
    console.log(`⚠️  Found ${errors} issue(s). Consider clearing and rebuilding caches.\n`);
  }
}

// Rebuild specific source
async function rebuildSource(sourceId) {
  console.log(`\n🔄 Rebuilding source: ${sourceId}\n`);
  console.log('⚠️  Note: This will clear ALL caches and rebuild from scratch.');
  console.log('   Vectra does not support partial updates, so all sources must be reindexed.\n');

  // Clear all caches for a fresh start
  console.log('Clearing caches...');
  await clearCache('all');

  // Re-index with force refresh
  console.log(`\n🚀 Starting re-indexing...\n`);
  await indexDocumentation(sourceId, true);
}

// Index documentation with optional locking
async function indexDocumentation(source, forceRefresh) {
  console.log(`\n🚀 Starting documentation indexing for: ${source}`);
  if (forceRefresh) {
    console.log('   Force refresh: Ignoring cache, fetching all documents');
  }
  console.log('This may take several minutes...\n');

  // Try to acquire lock for concurrent indexing safety (SQLite only)
  let lock = null;
  if (!docService.useJsonCache) {
    await docService.loadPageCache();
    lock = docService.pageCache.acquireLock(`index-${source}`, 1800); // 30 min timeout
    
    if (!lock.acquired) {
      console.log(`⚠️  Another indexing process is already running for ${source}`);
      console.log(`   Lock expires in ${Math.round(lock.expiresIn / 60)} minutes`);
      console.log(`   If this is incorrect, run: npm run clear-locks\n`);
      return;
    }
    
    console.log(`🔒 Acquired indexing lock: ${lock.lockId}\n`);
  }

  try {
    const result = await docService.indexDocumentation(source, forceRefresh);
    
    if (result.success) {
      console.log(`✅ Successfully indexed ${result.documentsIndexed} documents!`);
    } else {
      console.log(`❌ Indexing failed: ${result.error}`);
    }
  } finally {
    // Release lock
    if (lock && lock.acquired) {
      docService.pageCache.releaseLock(`index-${source}`, lock.lockId);
      console.log(`🔓 Released indexing lock\n`);
    }
  }

  console.log('\n✅ Done! You can now search the documentation.\n');
}
