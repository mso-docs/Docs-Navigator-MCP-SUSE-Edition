#!/usr/bin/env node
import { ChangeDetectionService } from '../services/change-detection-service.js';
import { CacheService } from '../services/cache-service.js';

/**
 * CLI tool for checking documentation changes
 * Usage:
 *   npm run check-changes              - Check all sources
 *   npm run check-changes k3s          - Check specific source
 *   npm run check-changes k3s rancher  - Check multiple sources
 *   npm run check-changes -- --limit 10 --days 7
 */

const SOURCES = ['suse', 'rancher', 'k3s', 'rke2', 'longhorn', 'harvester', 'neuvector', 'kubewarden'];

async function main() {
  const args = process.argv.slice(2);
  
  // Parse options
  const options = {
    limit: null,
    olderThanDays: null,
    parallel: 5,
    stats: false,
    watch: false,
    watchInterval: 24, // hours
  };

  const sourcesToCheck = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--days' && args[i + 1]) {
      options.olderThanDays = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--parallel' && args[i + 1]) {
      options.parallel = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--stats') {
      options.stats = true;
    } else if (arg === '--watch') {
      options.watch = true;
    } else if (arg === '--interval' && args[i + 1]) {
      options.watchInterval = parseInt(args[i + 1]);
      i++;
    } else if (SOURCES.includes(arg)) {
      sourcesToCheck.push(arg);
    } else if (!arg.startsWith('--')) {
      console.log(`⚠️  Unknown source: ${arg}`);
      console.log(`   Available sources: ${SOURCES.join(', ')}`);
    }
  }

  // Default to all sources if none specified
  if (sourcesToCheck.length === 0 && !options.stats) {
    sourcesToCheck.push(...SOURCES);
  }

  const cacheService = new CacheService();
  const changeDetection = new ChangeDetectionService(cacheService);

  try {
    await changeDetection.initialize();

    // Show statistics
    if (options.stats) {
      console.log('📊 Change Detection Statistics\n');
      const stats = await changeDetection.getStatistics();
      
      console.log(`Total Pages: ${stats.totalPages}`);
      console.log(`Recently Checked (last 24h): ${stats.recentlyChecked}`);
      console.log(`Never Checked: ${stats.neverChecked}\n`);
      
      console.log('📈 Staleness Distribution:');
      for (const [bucket, count] of Object.entries(stats.staleness)) {
        const pct = ((count / stats.totalPages) * 100).toFixed(1);
        console.log(`   ${bucket.padEnd(15)} ${count.toString().padStart(5)} (${pct}%)`);
      }
      
      console.log('\n📋 By Source:');
      for (const [source, data] of Object.entries(stats.bySource)) {
        console.log(`\n   ${source}:`);
        console.log(`      Total: ${data.total}`);
        console.log(`      Recently Checked: ${data.recentlyChecked}`);
        console.log(`      Never Checked: ${data.neverChecked}`);
      }
      
      return;
    }

    // Watch mode
    if (options.watch) {
      console.log(`🔄 Starting watch mode (checking every ${options.watchInterval} hours)`);
      console.log('   Press Ctrl+C to stop\n');
      
      await changeDetection.startAutoDetection({
        intervalHours: options.watchInterval,
        sources: sourcesToCheck,
        checkOptions: {
          limit: options.limit,
          olderThanDays: options.olderThanDays,
          parallel: options.parallel,
          onProgress: (current, total, result) => {
            if (result.changed) {
              console.log(`   🔄 [${current}/${total}] Changed: ${result.url}`);
            }
          },
        },
        onChangesDetected: async (results) => {
          console.log('\n⚠️  Changes detected! Consider re-indexing these sources:');
          for (const [source, data] of Object.entries(results.sources)) {
            if (data.changed.length > 0) {
              console.log(`   ${source}: ${data.changed.length} changed pages`);
            }
          }
          console.log('\nRun: npm run index <source> -- --force\n');
        },
      });

      // Keep process running
      process.on('SIGINT', () => {
        changeDetection.stopAutoDetection();
        process.exit(0);
      });

      // Prevent exit
      await new Promise(() => {});
    }

    // One-time check
    else {
      const checkOptions = {
        limit: options.limit,
        olderThanDays: options.olderThanDays,
        parallel: options.parallel,
        onProgress: (current, total, result) => {
          const status = result.changed ? '🔄' : 
                        result.status === 'error' ? '❌' : '✓';
          process.stdout.write(`\r${status} Checking: ${current}/${total} `);
          
          if (result.changed) {
            console.log(`\n   🔄 Changed: ${result.url}`);
          }
        },
      };

      let filterMsg = '';
      if (options.limit) filterMsg += ` (limit: ${options.limit})`;
      if (options.olderThanDays) filterMsg += ` (older than ${options.olderThanDays} days)`;

      console.log(`🔍 Checking for changes${filterMsg}\n`);

      const results = await changeDetection.checkAllSources(sourcesToCheck, checkOptions);

      // Print summary
      console.log('\n\n' + '='.repeat(60));
      console.log('📊 Change Detection Summary');
      console.log('='.repeat(60) + '\n');

      for (const [source, data] of Object.entries(results.sources)) {
        console.log(`📋 ${source.toUpperCase()}`);
        console.log(`   Total Checked: ${data.totalChecked}`);
        console.log(`   ✓ Unchanged: ${data.unchanged.length}`);
        console.log(`   🔄 Changed: ${data.changed.length}`);
        console.log(`   ❌ Errors: ${data.errors.length}`);
        console.log(`   ➕ New: ${data.new.length}`);
        
        if (data.changed.length > 0) {
          console.log(`\n   Changed URLs:`);
          data.changed.slice(0, 5).forEach(item => {
            console.log(`      - ${item.url}`);
          });
          if (data.changed.length > 5) {
            console.log(`      ... and ${data.changed.length - 5} more`);
          }
        }
        console.log();
      }

      console.log('='.repeat(60));
      console.log('📈 Overall Summary');
      console.log('='.repeat(60));
      console.log(`   ✓ Unchanged: ${results.summary.totalUnchanged}`);
      console.log(`   🔄 Changed: ${results.summary.totalChanged}`);
      console.log(`   ❌ Errors: ${results.summary.totalErrors}`);
      console.log(`   ➕ New: ${results.summary.totalNew}`);
      console.log('='.repeat(60) + '\n');

      if (results.summary.totalChanged > 0) {
        console.log('⚠️  Changes detected! To re-index changed sources, run:');
        for (const source of Object.keys(results.sources)) {
          if (results.sources[source].changed.length > 0) {
            console.log(`   npm run index ${source} -- --force`);
          }
        }
        console.log();
      } else {
        console.log('✅ All checked pages are up to date!\n');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (cacheService.db) {
      cacheService.close();
    }
  }
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
📋 Change Detection Tool

Check documentation sources for updates and changes.

Usage:
  npm run check-changes [sources...] [options]

Sources:
  suse, rancher, k3s, rke2, longhorn, harvester, neuvector, kubewarden
  (if no source specified, checks all sources)

Options:
  --limit <n>        Check only first N pages from each source
  --days <n>         Only check pages last checked more than N days ago
  --parallel <n>     Number of parallel checks (default: 5)
  --stats           Show change detection statistics instead of checking
  --watch           Run continuously and check on interval
  --interval <hrs>  Interval in hours for watch mode (default: 24)

Examples:
  # Check all sources
  npm run check-changes

  # Check specific source
  npm run check-changes k3s

  # Check multiple sources
  npm run check-changes k3s rancher

  # Check only first 10 pages from each source
  npm run check-changes -- --limit 10

  # Check pages not checked in last 7 days
  npm run check-changes -- --days 7

  # Show statistics
  npm run check-changes -- --stats

  # Run in watch mode (check every 24 hours)
  npm run check-changes -- --watch

  # Watch mode with custom interval (every 6 hours)
  npm run check-changes -- --watch --interval 6
`);
  process.exit(0);
}

main();
