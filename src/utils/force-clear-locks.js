#!/usr/bin/env node

import { CacheService } from '../services/cache-service.js';
import dotenv from 'dotenv';

dotenv.config();

const cacheService = new CacheService(process.env.PAGE_CACHE_PATH || './data/page-cache.db');

await cacheService.initialize();

console.log('🗑️  Deleting ALL locks (including active ones)...\n');

const result = cacheService.db.prepare('DELETE FROM locks').run();
console.log(`✓ Deleted ${result.changes} lock(s)`);

cacheService.close();
