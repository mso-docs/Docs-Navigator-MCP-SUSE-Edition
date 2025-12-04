#!/usr/bin/env node

/**
 * Index multiple documentation sources
 * Usage: node src/index-multi.js [sources...]
 * Example: node src/index-multi.js k3s rancher suse
 * Example: node src/index-multi.js all
 */

import { DocumentationService } from './services/documentation-service.js';
import dotenv from 'dotenv';

dotenv.config();

const args = process.argv.slice(2);
let sources = args.length > 0 ? args : ['k3s'];

// If 'all' is specified, index all available sources
if (sources.includes('all')) {
  sources = ['k3s', 'rancher', 'suse'];
}

console.log(`\n🚀 Starting multi-source documentation indexing`);
console.log(`📚 Sources: ${sources.join(', ')}`);
console.log('=' .repeat(70));

const docService = new DocumentationService();
const results = [];
const startTime = Date.now();

for (const source of sources) {
  console.log(`\n📖 Indexing: ${source.toUpperCase()}`);
  console.log('-'.repeat(70));
  
  const sourceStartTime = Date.now();
  
  try {
    const result = await docService.indexDocumentation(source, false);
    const duration = ((Date.now() - sourceStartTime) / 1000).toFixed(2);
    
    results.push({
      source,
      success: result.success,
      duration,
      indexed: result.documentsIndexed,
      skipped: result.documentsSkipped || 0,
      cacheStats: result.cacheStats,
    });
    
    if (result.success) {
      console.log(`✅ ${source.toUpperCase()}: ${result.documentsIndexed} documents in ${duration}s`);
    } else {
      console.log(`❌ ${source.toUpperCase()}: Failed - ${result.error}`);
    }
  } catch (error) {
    const duration = ((Date.now() - sourceStartTime) / 1000).toFixed(2);
    console.log(`❌ ${source.toUpperCase()}: Error after ${duration}s - ${error.message}`);
    
    results.push({
      source,
      success: false,
      duration,
      indexed: 0,
      skipped: 0,
      error: error.message,
    });
  }
}

// Summary
const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
const successCount = results.filter(r => r.success).length;
const totalIndexed = results.reduce((sum, r) => sum + r.indexed, 0);
const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

console.log('\n' + '='.repeat(70));
console.log('📊 INDEXING SUMMARY');
console.log('='.repeat(70));

for (const result of results) {
  const status = result.success ? '✅' : '❌';
  console.log(`${status} ${result.source.padEnd(10)} - ${result.indexed} indexed, ${result.skipped} skipped (${result.duration}s)`);
  
  if (result.cacheStats) {
    const pageHitRate = result.cacheStats.page.hitRate || 'N/A';
    const embeddingHitRate = result.cacheStats.embedding.hitRate || 'N/A';
    console.log(`   📄 Page Cache: ${pageHitRate}, 🧠 Embedding: ${embeddingHitRate}`);
  }
}

console.log('-'.repeat(70));
console.log(`📈 Total: ${totalIndexed} documents indexed, ${totalSkipped} skipped`);
console.log(`✅ Success: ${successCount}/${results.length} sources`);
console.log(`⏱️  Total Duration: ${totalDuration}s`);
console.log('=' .repeat(70));
console.log('\n✅ Multi-source indexing complete!\n');
