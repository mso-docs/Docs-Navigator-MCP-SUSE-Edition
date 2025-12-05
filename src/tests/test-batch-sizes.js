#!/usr/bin/env node

/**
 * Test different batch sizes to find optimal Ollama performance
 * Usage: node src/test-batch-sizes.js [source]
 */

import { DocumentationService } from '../services/documentation-service.js';
import dotenv from 'dotenv';

dotenv.config();

const source = process.argv[2] || 'k3s';

// Test configurations
const configs = [
  { fetchBatch: 2, embeddingConcurrency: 1, name: 'Very Conservative' },
  { fetchBatch: 2, embeddingConcurrency: 2, name: 'Conservative' },
  { fetchBatch: 3, embeddingConcurrency: 2, name: 'Balanced (Current)' },
  { fetchBatch: 3, embeddingConcurrency: 3, name: 'Moderate' },
  { fetchBatch: 5, embeddingConcurrency: 3, name: 'Aggressive' },
];

console.log(`\n🧪 Testing Batch Size Performance for: ${source}`);
console.log('=' .repeat(70));

for (const config of configs) {
  console.log(`\n📊 Testing: ${config.name}`);
  console.log(`   FETCH_BATCH_SIZE=${config.fetchBatch}, EMBEDDING_CONCURRENCY=${config.embeddingConcurrency}`);
  
  // Set environment variables
  process.env.FETCH_BATCH_SIZE = config.fetchBatch.toString();
  process.env.EMBEDDING_CONCURRENCY = config.embeddingConcurrency.toString();
  
  const docService = new DocumentationService();
  const startTime = Date.now();
  
  try {
    const result = await docService.indexDocumentation(source, false);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`   ⏱️  Duration: ${duration}s`);
    console.log(`   ✅ Success: ${result.documentsIndexed} documents indexed`);
    console.log(`   📄 Page Cache: ${result.cacheStats.page.hits304} x 304, ${result.cacheStats.page.hitsCached} x hash match`);
    console.log(`   🧠 Embedding: ${result.cacheStats.embedding.hitRate} hit rate`);
    
    if (!result.success && result.error) {
      console.log(`   ⚠️  Errors: ${result.error}`);
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   ❌ Failed after ${duration}s: ${error.message}`);
  }
  
  // Wait between tests to let Ollama recover
  console.log(`   💤 Cooling down for 5 seconds...`);
  await new Promise(resolve => setTimeout(resolve, 5000));
}

console.log('\n' + '='.repeat(70));
console.log('✅ Batch size testing complete!\n');
