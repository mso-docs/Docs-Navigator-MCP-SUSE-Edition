#!/usr/bin/env node

/**
 * Migrate from JSON page cache to SQLite
 * This script reads the existing page-cache.json and imports it into SQLite
 */

import { CacheService } from '../services/cache-service.js';
import fs from 'fs/promises';
import path from 'path';

const JSON_CACHE_PATH = './data/page-cache.json';
const SQLITE_CACHE_PATH = './data/page-cache.db';

console.log('\n🔄 Migrating page cache from JSON to SQLite...\n');

try {
  // Check if JSON cache exists
  try {
    await fs.access(JSON_CACHE_PATH);
  } catch (error) {
    console.log('ℹ️  No existing JSON cache found. Starting with empty SQLite database.');
    
    // Initialize empty SQLite database
    const cacheService = new CacheService(SQLITE_CACHE_PATH);
    await cacheService.initialize();
    cacheService.close();
    
    console.log('\n✅ Empty SQLite cache created!\n');
    process.exit(0);
  }

  // Read JSON cache
  console.log('📖 Reading JSON cache...');
  const jsonData = await fs.readFile(JSON_CACHE_PATH, 'utf-8');
  const jsonCache = JSON.parse(jsonData);
  
  const entries = Object.entries(jsonCache);
  console.log(`   Found ${entries.length} entries\n`);

  // Check if SQLite database already exists
  let existingDb = false;
  try {
    await fs.access(SQLITE_CACHE_PATH);
    existingDb = true;
    console.log('⚠️  SQLite database already exists!');
    console.log('   The existing database will be backed up and replaced.\n');
    
    // Backup existing database
    const backupPath = `${SQLITE_CACHE_PATH}.backup.${Date.now()}`;
    await fs.copyFile(SQLITE_CACHE_PATH, backupPath);
    console.log(`✓ Backed up to: ${backupPath}\n`);
    
    // Delete existing database
    await fs.unlink(SQLITE_CACHE_PATH);
  } catch (error) {
    // Database doesn't exist, that's fine
  }

  // Initialize SQLite cache
  console.log('🗄️  Initializing SQLite database...');
  const cacheService = new CacheService(SQLITE_CACHE_PATH);
  await cacheService.initialize();

  // Bulk import entries
  console.log('📥 Importing entries...');
  cacheService.bulkSet(entries);

  // Verify import
  const stats = cacheService.getStats();
  console.log(`\n✅ Migration complete!`);
  console.log(`\n📊 Statistics:`);
  console.log(`   Total pages: ${stats.total}`);
  console.log(`   Indexed pages: ${stats.indexed}`);
  console.log(`\n   By Source:`);
  
  for (const source of stats.bySource) {
    console.log(`     ${source.source.padEnd(10)} ${source.indexed} indexed / ${source.total} total`);
  }

  cacheService.close();

  // Rename old JSON cache for safety
  const jsonBackupPath = `${JSON_CACHE_PATH}.migrated.${Date.now()}`;
  await fs.rename(JSON_CACHE_PATH, jsonBackupPath);
  console.log(`\n✓ Original JSON cache backed up to: ${jsonBackupPath}`);
  console.log(`\n💡 Tip: You can safely delete the backup files once you verify everything works.\n`);

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
