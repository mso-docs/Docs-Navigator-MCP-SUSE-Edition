#!/usr/bin/env node

/**
 * Clear expired locks from the cache database
 * Use this if a process crashed and left a stale lock
 */

import { CacheService } from '../services/cache-service.js';
import dotenv from 'dotenv';

dotenv.config();

const cacheService = new CacheService(process.env.PAGE_CACHE_PATH || './data/page-cache.db');

console.log('\n🔓 Cleaning up expired locks...\n');

try {
  await cacheService.initialize();
  
  const cleaned = cacheService.cleanupExpiredLocks();
  
  if (cleaned > 0) {
    console.log(`✅ Cleaned up ${cleaned} expired lock(s)\n`);
  } else {
    console.log('✓ No expired locks found - all clear!\n');
  }
  
  cacheService.close();
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
