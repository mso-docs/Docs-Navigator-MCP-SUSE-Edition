import axios from 'axios';
import crypto from 'crypto';
import { CacheService } from './cache-service.js';

/**
 * Change Detection Service
 * Monitors documentation sources for updates and triggers re-indexing
 */
export class ChangeDetectionService {
  constructor(cacheService = null) {
    this.cacheService = cacheService || new CacheService();
    this.checkInterval = null;
    this.isRunning = false;
  }

  async initialize() {
    if (!this.cacheService.initialized) {
      await this.cacheService.initialize();
    }
  }

  /**
   * Check if a single URL has changed
   * @param {string} url - URL to check
   * @returns {Promise<Object>} Change detection result
   */
  async checkUrlForChanges(url) {
    await this.initialize();

    const cachedPage = this.cacheService.get(url);
    if (!cachedPage) {
      return {
        url,
        status: 'new',
        changed: true,
        reason: 'Not in cache',
      };
    }

    try {
      // Make HEAD request first (faster)
      const headResponse = await axios.head(url, {
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });

      // Check ETag
      if (cachedPage.etag && headResponse.headers.etag) {
        if (cachedPage.etag === headResponse.headers.etag) {
          return {
            url,
            status: 'unchanged',
            changed: false,
            method: 'etag',
          };
        }
      }

      // Check Last-Modified
      if (cachedPage.lastModified && headResponse.headers['last-modified']) {
        const cachedTime = new Date(cachedPage.lastModified).getTime();
        const currentTime = new Date(headResponse.headers['last-modified']).getTime();
        
        if (currentTime <= cachedTime) {
          return {
            url,
            status: 'unchanged',
            changed: false,
            method: 'last-modified',
          };
        }
      }

      // If HEAD doesn't provide enough info, do a full GET with content hash
      const getResponse = await axios.get(url, {
        timeout: 15000,
        validateStatus: (status) => status < 500,
      });

      const contentHash = this.calculateHash(getResponse.data);
      
      if (cachedPage.contentHash === contentHash) {
        return {
          url,
          status: 'unchanged',
          changed: false,
          method: 'content-hash',
        };
      }

      return {
        url,
        status: 'changed',
        changed: true,
        reason: 'Content modified',
        oldHash: cachedPage.contentHash,
        newHash: contentHash,
        etag: getResponse.headers.etag,
        lastModified: getResponse.headers['last-modified'],
      };

    } catch (error) {
      return {
        url,
        status: 'error',
        changed: null,
        error: error.message,
      };
    }
  }

  /**
   * Check all cached pages for a specific source
   * @param {string} source - Source ID (e.g., 'k3s', 'rancher')
   * @param {Object} options - Options for the check
   * @returns {Promise<Object>} Summary of changes
   */
  async checkSourceForChanges(source, options = {}) {
    await this.initialize();

    const {
      limit = null,
      olderThanDays = null,
      parallel = 5,
      onProgress = null,
    } = options;

    // Get all pages for this source
    let pages = this.cacheService.getBySource(source);

    // Filter by age if specified
    if (olderThanDays) {
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      pages = pages.filter(p => (p.lastChecked || 0) < cutoffTime);
    }

    // Limit if specified
    if (limit) {
      pages = pages.slice(0, limit);
    }

    console.log(`🔍 Checking ${pages.length} pages from ${source} for changes...`);

    const results = {
      source,
      totalChecked: pages.length,
      changed: [],
      unchanged: [],
      errors: [],
      new: [],
    };

    // Process in batches for parallel checking
    const batches = [];
    for (let i = 0; i < pages.length; i += parallel) {
      batches.push(pages.slice(i, i + parallel));
    }

    let processed = 0;
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(page => this.checkUrlForChanges(page.url))
      );

      for (const result of batchResults) {
        processed++;
        
        if (result.status === 'changed') {
          results.changed.push(result);
        } else if (result.status === 'unchanged') {
          results.unchanged.push(result);
        } else if (result.status === 'error') {
          results.errors.push(result);
        } else if (result.status === 'new') {
          results.new.push(result);
        }

        if (onProgress) {
          onProgress(processed, pages.length, result);
        }
      }

      // Small delay between batches to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update last_checked timestamp for all pages
    const now = Date.now();
    pages.forEach(page => {
      this.cacheService.set(page.url, { ...page, lastChecked: now });
    });

    return results;
  }

  /**
   * Check all sources for changes
   * @param {Array<string>} sources - Array of source IDs to check
   * @param {Object} options - Options for the check
   * @returns {Promise<Object>} Summary of all changes
   */
  async checkAllSources(sources, options = {}) {
    const allResults = {
      timestamp: new Date().toISOString(),
      sources: {},
      summary: {
        totalChanged: 0,
        totalUnchanged: 0,
        totalErrors: 0,
        totalNew: 0,
      },
    };

    for (const source of sources) {
      console.log(`\n📋 Checking source: ${source}`);
      const result = await this.checkSourceForChanges(source, options);
      
      allResults.sources[source] = result;
      allResults.summary.totalChanged += result.changed.length;
      allResults.summary.totalUnchanged += result.unchanged.length;
      allResults.summary.totalErrors += result.errors.length;
      allResults.summary.totalNew += result.new.length;
    }

    return allResults;
  }

  /**
   * Start automatic change detection on an interval
   * @param {Object} options - Configuration options
   */
  async startAutoDetection(options = {}) {
    const {
      intervalHours = 24,
      sources = ['k3s', 'rancher', 'rke2', 'suse', 'longhorn', 'harvester', 'neuvector', 'kubewarden'],
      onChangesDetected = null,
      checkOptions = {},
    } = options;

    if (this.isRunning) {
      console.log('⚠️  Auto-detection already running');
      return;
    }

    this.isRunning = true;
    console.log(`🔄 Starting auto-detection (checking every ${intervalHours} hours)`);

    // Run initial check
    await this.runAutoCheck(sources, checkOptions, onChangesDetected);

    // Set up interval
    this.checkInterval = setInterval(async () => {
      await this.runAutoCheck(sources, checkOptions, onChangesDetected);
    }, intervalHours * 60 * 60 * 1000);
  }

  /**
   * Stop automatic change detection
   */
  stopAutoDetection() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.isRunning = false;
      console.log('🛑 Stopped auto-detection');
    }
  }

  /**
   * Internal method to run a check cycle
   */
  async runAutoCheck(sources, checkOptions, onChangesDetected) {
    try {
      console.log(`\n🔍 Running scheduled change detection at ${new Date().toISOString()}`);
      const results = await this.checkAllSources(sources, checkOptions);

      console.log('\n📊 Change Detection Summary:');
      console.log(`   ✓ Unchanged: ${results.summary.totalUnchanged}`);
      console.log(`   🔄 Changed: ${results.summary.totalChanged}`);
      console.log(`   ❌ Errors: ${results.summary.totalErrors}`);
      console.log(`   ➕ New: ${results.summary.totalNew}`);

      // Save results to file for history
      await this.saveCheckResults(results);

      // Trigger callback if changes detected
      if (results.summary.totalChanged > 0 && onChangesDetected) {
        await onChangesDetected(results);
      }

      return results;
    } catch (error) {
      console.error('❌ Error during auto-check:', error.message);
    }
  }

  /**
   * Save check results to a history file
   */
  async saveCheckResults(results) {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const historyDir = './data/change-detection';
    await fs.mkdir(historyDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = path.join(historyDir, `check-${timestamp}.json`);

    await fs.writeFile(filename, JSON.stringify(results, null, 2));
    console.log(`💾 Saved results to ${filename}`);
  }

  /**
   * Get URLs that have changed and need re-indexing
   * @param {Object} checkResults - Results from checkAllSources or checkSourceForChanges
   * @returns {Array<string>} URLs that need re-indexing
   */
  getChangedUrls(checkResults) {
    const urls = [];

    if (checkResults.sources) {
      // Results from checkAllSources
      for (const source of Object.values(checkResults.sources)) {
        urls.push(...source.changed.map(r => r.url));
      }
    } else if (checkResults.changed) {
      // Results from checkSourceForChanges
      urls.push(...checkResults.changed.map(r => r.url));
    }

    return urls;
  }

  /**
   * Calculate content hash
   */
  calculateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get change detection statistics
   */
  async getStatistics() {
    await this.initialize();

    const stats = {
      totalPages: 0,
      bySource: {},
      recentlyChecked: 0,
      neverChecked: 0,
      staleness: {},
    };

    const allPages = this.cacheService.getAll();
    stats.totalPages = allPages.length;

    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    for (const page of allPages) {
      const source = page.source || 'unknown';
      
      if (!stats.bySource[source]) {
        stats.bySource[source] = {
          total: 0,
          recentlyChecked: 0,
          neverChecked: 0,
        };
      }

      stats.bySource[source].total++;

      if (!page.lastChecked) {
        stats.neverChecked++;
        stats.bySource[source].neverChecked++;
      } else if (page.lastChecked > oneDayAgo) {
        stats.recentlyChecked++;
        stats.bySource[source].recentlyChecked++;
      }

      // Staleness buckets
      const age = page.lastChecked ? Math.floor((now - page.lastChecked) / (24 * 60 * 60 * 1000)) : 999;
      const bucket = age === 999 ? 'never' : 
                     age < 1 ? '<1 day' :
                     age < 7 ? '1-7 days' :
                     age < 30 ? '1-4 weeks' :
                     age < 90 ? '1-3 months' : '>3 months';
      
      stats.staleness[bucket] = (stats.staleness[bucket] || 0) + 1;
    }

    return stats;
  }
}
