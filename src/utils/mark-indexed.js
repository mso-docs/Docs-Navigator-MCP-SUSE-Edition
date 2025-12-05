#!/usr/bin/env node

/**
 * Mark all documents with content hash and source as indexed
 * This fixes entries that were cached but not marked as indexed
 */

import { DocumentationService } from '../services/documentation-service.js';
import dotenv from 'dotenv';

dotenv.config();

const docService = new DocumentationService();

console.log('\n🔧 Marking cached documents as indexed...\n');

try {
  // Load existing page cache
  await docService.loadPageCache();
  
  let marked = 0;
  let alreadyIndexed = 0;
  let noContentHash = 0;
  
  for (const [url, entry] of docService.pageCache.entries()) {
    if (entry.contentHash && entry.source) {
      // Has content and source, should be marked as indexed
      if (!entry.indexed) {
        entry.indexed = true;
        docService.pageCache.set(url, entry);
        marked++;
      } else {
        alreadyIndexed++;
      }
    } else if (!entry.contentHash) {
      noContentHash++;
    }
  }
  
  // Save updated cache
  if (marked > 0) {
    await docService.savePageCache();
    console.log(`✅ Marked ${marked} documents as indexed`);
  }
  
  console.log(`✓ ${alreadyIndexed} documents already marked as indexed`);
  console.log(`⚠️  ${noContentHash} documents missing contentHash (not indexed yet)`);
  console.log(`✓ Total entries: ${docService.pageCache.size}\n`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
