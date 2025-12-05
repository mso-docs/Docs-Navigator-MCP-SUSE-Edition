#!/usr/bin/env node

import { CacheService } from '../services/cache-service.js';
import dotenv from 'dotenv';

dotenv.config();

const cacheService = new CacheService(process.env.PAGE_CACHE_PATH || './data/page-cache.db');

await cacheService.initialize();

const locks = cacheService.db.prepare('SELECT * FROM locks').all();
console.log('Current locks:');
console.log(JSON.stringify(locks, null, 2));

const now = Math.floor(Date.now() / 1000);
console.log(`\nCurrent time (seconds): ${now}`);
console.log(`Current time (Date): ${new Date(now * 1000).toLocaleString()}`);

for (const lock of locks) {
  console.log(`\nLock: ${lock.name}`);
  console.log(`  Acquired at: ${lock.acquired_at} (${new Date(lock.acquired_at * 1000).toLocaleString()})`);
  console.log(`  Expires at: ${lock.expires_at} (${new Date(lock.expires_at * 1000).toLocaleString()})`);
  console.log(`  Duration: ${lock.expires_at - lock.acquired_at} seconds`);
  console.log(`  Expires in: ${lock.expires_at - now} seconds`);
}

cacheService.close();
