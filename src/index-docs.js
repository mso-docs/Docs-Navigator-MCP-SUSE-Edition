#!/usr/bin/env node

/**
 * Simple script to index documentation
 * Usage: node src/index-docs.js [source]
 * Example: node src/index-docs.js k3s
 */

import { DocumentationService } from './services/documentation-service.js';
import dotenv from 'dotenv';

dotenv.config();

const source = process.argv[2] || 'k3s';

console.log(`\n🚀 Starting documentation indexing for: ${source}`);
console.log('This may take several minutes...\n');

const docService = new DocumentationService();

try {
  const result = await docService.indexDocumentation(source, false);
  
  if (result.success) {
    console.log(`✅ Successfully indexed ${result.documentsIndexed} documents!`);
  } else {
    console.log(`❌ Indexing failed: ${result.error}`);
  }
} catch (error) {
  console.error(`❌ Error during indexing:`, error);
  process.exit(1);
}

console.log('\n✅ Done! You can now search the documentation.\n');
