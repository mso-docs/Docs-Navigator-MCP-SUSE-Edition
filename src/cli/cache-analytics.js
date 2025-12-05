#!/usr/bin/env node

/**
 * Generate comprehensive cache analytics report
 * Shows detailed statistics and insights about cached documentation
 */

import { CacheService } from '../services/cache-service.js';
import dotenv from 'dotenv';

dotenv.config();

const cacheService = new CacheService(process.env.PAGE_CACHE_PATH || './data/page-cache.db');

console.log('\n📊 Cache Analytics Report\n');
console.log('═══════════════════════════════════════════════════════════════\n');

try {
  await cacheService.initialize();
  
  const report = cacheService.generateAnalyticsReport();
  
  // Overall Statistics
  console.log('📈 Overall Statistics:');
  console.log(`   Total Pages: ${report.overall.total}`);
  console.log(`   Indexed Pages: ${report.overall.indexed} (${Math.round(100 * report.overall.indexed / report.overall.total)}%)`);
  console.log(`   Not Indexed: ${report.overall.total - report.overall.indexed}`);
  
  if (report.overall.oldest_check) {
    const oldestDate = new Date(report.overall.oldest_check);
    const newestDate = new Date(report.overall.newest_check);
    const avgDate = new Date(report.overall.avg_check);
    
    console.log(`   Oldest Check: ${oldestDate.toLocaleDateString()} ${oldestDate.toLocaleTimeString()}`);
    console.log(`   Newest Check: ${newestDate.toLocaleDateString()} ${newestDate.toLocaleTimeString()}`);
    console.log(`   Average Check: ${avgDate.toLocaleDateString()} ${avgDate.toLocaleTimeString()}`);
  }
  
  // By Source
  console.log('\n📚 By Source:');
  for (const source of report.bySource) {
    const percentage = Math.round(100 * source.indexed_pages / source.total_pages);
    const lastUpdate = source.last_updated ? new Date(source.last_updated).toLocaleDateString() : 'Never';
    console.log(`   ${source.source.padEnd(12)} ${source.indexed_pages}/${source.total_pages} indexed (${percentage}%) - Last: ${lastUpdate}`);
  }
  
  // Recent Activity
  console.log('\n🕐 Recent Activity (Last 24 Hours):');
  if (report.recentActivity.length === 0) {
    console.log('   No recent activity');
  } else {
    for (const activity of report.recentActivity) {
      console.log(`   ${activity.source.padEnd(12)} ${activity.count} pages updated`);
    }
  }
  
  // Stale Pages
  console.log('\n⚠️  Stale Pages (Not Checked in 7 Days):');
  if (report.stalePages.length === 0) {
    console.log('   No stale pages - excellent!');
  } else {
    let totalStale = 0;
    for (const stale of report.stalePages) {
      console.log(`   ${stale.source.padEnd(12)} ${stale.count} pages`);
      totalStale += stale.count;
    }
    console.log(`   Total: ${totalStale} pages need refresh`);
  }
  
  // Cache Efficiency
  console.log('\n💾 Cache Efficiency:');
  console.log(`   Unique Content: ${report.efficiency.unique_content}`);
  console.log(`   Total Pages: ${report.efficiency.total_pages}`);
  console.log(`   Uniqueness: ${report.efficiency.uniqueness_percent}%`);
  if (report.efficiency.uniqueness_percent < 100) {
    const duplicates = report.efficiency.total_pages - report.efficiency.unique_content;
    console.log(`   Duplicates: ${duplicates} pages share content hashes`);
  }
  
  // Database Size
  console.log('\n💿 Database Size:');
  const sizeKB = Math.round(report.databaseSize / 1024);
  const sizeMB = (report.databaseSize / (1024 * 1024)).toFixed(2);
  console.log(`   ${sizeKB} KB (${sizeMB} MB)`);
  console.log(`   Avg per page: ${Math.round(report.databaseSize / report.overall.total)} bytes`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  const recommendations = [];
  
  if (report.stalePages.length > 0) {
    const totalStale = report.stalePages.reduce((sum, s) => sum + s.count, 0);
    recommendations.push(`- Consider refreshing ${totalStale} stale pages with: npm run index all`);
  }
  
  if (report.overall.indexed < report.overall.total) {
    const notIndexed = report.overall.total - report.overall.indexed;
    recommendations.push(`- ${notIndexed} pages are not indexed yet - run indexing to complete`);
  }
  
  if (report.efficiency.uniqueness_percent < 95) {
    recommendations.push(`- Low uniqueness (${report.efficiency.uniqueness_percent}%) may indicate duplicate content`);
  }
  
  if (sizeMB > 100) {
    recommendations.push(`- Large database (${sizeMB} MB) - consider running: npm run optimize-db`);
  }
  
  if (recommendations.length === 0) {
    console.log('   ✅ Everything looks great! Your cache is healthy.');
  } else {
    recommendations.forEach(rec => console.log(`   ${rec}`));
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════\n');
  
  cacheService.close();
  
} catch (error) {
  console.error('\n❌ Error generating report:', error.message);
  console.error(error.stack);
  process.exit(1);
}
