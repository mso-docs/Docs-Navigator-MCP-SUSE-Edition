#!/usr/bin/env node

/**
 * Test script to verify embedding cache functionality
 */

import { AIService } from './services/ai-service.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing Embedding Cache\n');

const aiService = new AIService();

// Test data
const testTexts = [
  'This is a test document about Kubernetes.',
  'This is a test document about Kubernetes.', // Duplicate - should hit cache
  'SUSE Linux Enterprise Server documentation.',
  'Rancher multi-cluster management guide.',
  'This is a test document about Kubernetes.', // Another duplicate
];

console.log('Generating embeddings for test texts...\n');

for (let i = 0; i < testTexts.length; i++) {
  const text = testTexts[i];
  console.log(`${i + 1}. Text: "${text.substring(0, 50)}..."`);
  
  try {
    const embedding = await aiService.getOrCreateEmbedding(text);
    console.log(`   ✓ Generated embedding (${embedding.length} dimensions)`);
    
    const stats = aiService.getCacheStats();
    console.log(`   Cache: ${stats.hits} hits, ${stats.misses} misses (${stats.hitRate} hit rate)\n`);
  } catch (error) {
    console.error(`   ✗ Failed:`, error.message, '\n');
  }
}

// Save cache
console.log('Saving cache to disk...');
await aiService.saveEmbeddingCache();

// Test loading cache
console.log('\n🔄 Testing cache reload...\n');
const aiService2 = new AIService();
await aiService2.loadEmbeddingCache();

console.log('Testing with reloaded cache...');
try {
  const embedding = await aiService2.getOrCreateEmbedding('This is a test document about Kubernetes.');
  const stats = aiService2.getCacheStats();
  console.log(`✓ Cache hit on reload! Stats: ${stats.hits} hits, ${stats.misses} misses (${stats.hitRate} hit rate)`);
} catch (error) {
  console.error('✗ Failed:', error.message);
}

console.log('\n✅ Cache test complete!');
