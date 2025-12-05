#!/usr/bin/env node

/**
 * Test concurrent lock mechanism
 */

import { CacheService } from '../services/cache-service.js';
import dotenv from 'dotenv';

dotenv.config();

const processId = process.argv[2] || 'test';
const duration = parseInt(process.argv[3] || '10000');

console.log(`\n🔒 Process ${processId}: Attempting to acquire lock...`);

const cacheService = new CacheService(process.env.PAGE_CACHE_PATH || './data/page-cache.db');

try {
  await cacheService.initialize();
  
  // Try to acquire lock
  const result = cacheService.acquireLock('test-lock', duration / 1000);
  
  if (!result.acquired) {
    console.log(`❌ Process ${processId}: ${result.message}`);
    console.log(`   Lock expires in ${result.expiresIn} seconds`);
    process.exit(1);
  }
  
  console.log(`✓ Process ${processId}: Acquired lock ${result.lockId}`);
  console.log(`   Holding for ${duration}ms...`);
  
  // Hold the lock
  await new Promise(resolve => setTimeout(resolve, duration));
  
  // Release the lock
  cacheService.releaseLock('test-lock', result.lockId);
  console.log(`✓ Process ${processId}: Released lock`);
  
  cacheService.close();
  
} catch (error) {
  console.error(`\n❌ Process ${processId}: Error:`, error.message);
  process.exit(1);
}
