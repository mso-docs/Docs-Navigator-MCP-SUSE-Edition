#!/usr/bin/env node

/**
 * Query cache with advanced filters
 * 
 * Usage:
 *   node src/query-cache.js --source suse
 *   node src/query-cache.js --status indexed
 *   node src/query-cache.js --status stale
 *   node src/query-cache.js --modified-since 2025-01-01
 *   node src/query-cache.js --source rancher --status indexed
 */

import { CacheService } from '../services/cache-service.js';
import dotenv from 'dotenv';

dotenv.config();

const args = process.argv.slice(2);

// Parse arguments
const options = {
  source: null,
  status: null,
  modifiedSince: null,
  startDate: null,
  endDate: null,
  indexed: null,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--source':
      options.source = args[++i];
      break;
    case '--status':
      options.status = args[++i]; // indexed, not-indexed, stale, recent
      break;
    case '--modified-since':
      options.modifiedSince = new Date(args[++i]);
      break;
    case '--start-date':
      options.startDate = new Date(args[++i]);
      break;
    case '--end-date':
      options.endDate = new Date(args[++i]);
      break;
    case '--indexed':
      options.indexed = args[++i] === 'true';
      break;
    case '--help':
      showHelp();
      process.exit(0);
  }
}

function showHelp() {
  console.log(`
Query Cache - Advanced cache filtering and queries

Usage:
  node src/query-cache.js [options]

Options:
  --source <name>          Filter by source (suse, rancher, k3s)
  --status <status>        Filter by status (indexed, not-indexed, stale, recent)
  --modified-since <date>  Show pages modified since date (YYYY-MM-DD)
  --start-date <date>      Filter from start date
  --end-date <date>        Filter to end date
  --indexed <true|false>   Filter by indexed status
  --help                   Show this help

Examples:
  # All SUSE documentation
  node src/query-cache.js --source suse

  # All indexed pages
  node src/query-cache.js --status indexed

  # Stale pages (not checked in 7 days)
  node src/query-cache.js --status stale

  # Recent activity (last 24 hours)
  node src/query-cache.js --status recent

  # Pages modified since January 1st
  node src/query-cache.js --modified-since 2025-01-01

  # Indexed Rancher docs
  node src/query-cache.js --source rancher --indexed true
  `);
}

const cacheService = new CacheService(process.env.PAGE_CACHE_PATH || './data/page-cache.db');

try {
  await cacheService.initialize();
  
  let results;
  
  if (options.modifiedSince) {
    console.log(`\n📊 Pages Modified Since ${options.modifiedSince.toLocaleDateString()}:\n`);
    results = cacheService.getModifiedSince(options.modifiedSince);
  } else if (options.status) {
    console.log(`\n📊 Pages with Status: ${options.status}\n`);
    results = cacheService.getPagesByStatus(options.status);
  } else {
    console.log(`\n📊 Query Results:\n`);
    results = cacheService.queryPages({
      source: options.source,
      startDate: options.startDate,
      endDate: options.endDate,
      indexed: options.indexed,
    });
  }
  
  if (results.length === 0) {
    console.log('   No pages match your query.\n');
  } else {
    console.log(`   Found ${results.length} pages:\n`);
    
    // Group by source for better display
    const bySource = {};
    for (const page of results) {
      const source = page.source || 'unknown';
      if (!bySource[source]) {
        bySource[source] = [];
      }
      bySource[source].push(page);
    }
    
    for (const [source, pages] of Object.entries(bySource)) {
      console.log(`   📚 ${source.toUpperCase()} (${pages.length} pages):`);
      
      for (const page of pages.slice(0, 10)) {
        const indexed = page.indexed ? '✓' : '✗';
        const date = page.lastChecked ? new Date(page.lastChecked).toLocaleDateString() : 'Never';
        console.log(`      ${indexed} ${page.url.substring(0, 80)} (${date})`);
      }
      
      if (pages.length > 10) {
        console.log(`      ... and ${pages.length - 10} more`);
      }
      console.log('');
    }
    
    console.log(`   Total: ${results.length} pages\n`);
  }
  
  cacheService.close();
  
} catch (error) {
  console.error('\n❌ Query failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
