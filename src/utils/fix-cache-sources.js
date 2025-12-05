#!/usr/bin/env node

/**
 * Fix missing source fields in existing page cache entries
 * This script adds the source field to cache entries based on URL patterns
 */

import { DocumentationService } from '../services/documentation-service.js';
import dotenv from 'dotenv';

dotenv.config();

const docService = new DocumentationService();

console.log('\n🔧 Fixing missing source fields in page cache...\n');

try {
  // Load existing page cache
  await docService.loadPageCache();
  
  let fixed = 0;
  let alreadyHadSource = 0;
  
  for (const [url, entry] of docService.pageCache.entries()) {
    if (!entry.source) {
      // Infer source from URL
      const source = docService.getSourceFromUrl(url);
      if (source) {
        entry.source = source;
        docService.pageCache.set(url, entry);
        fixed++;
      } else {
        console.warn(`⚠️  Could not determine source for: ${url}`);
      }
    } else {
      alreadyHadSource++;
    }
  }
  
  // Save updated cache
  if (fixed > 0) {
    await docService.savePageCache();
    console.log(`✅ Fixed ${fixed} cache entries`);
  }
  
  console.log(`✓ ${alreadyHadSource} entries already had source field`);
  console.log(`✓ Total entries: ${docService.pageCache.size}\n`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
