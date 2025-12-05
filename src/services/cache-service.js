import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';

/**
 * SQLite-based cache service for page metadata
 * Provides better performance and query capabilities than JSON
 */
export class CacheService {
  constructor(dbPath = './data/page-cache.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Ensure data directory exists
    const dir = path.dirname(this.dbPath);
    await fs.mkdir(dir, { recursive: true });

    // Open database connection
    this.db = new Database(this.dbPath);
    
    // Enable WAL mode for better concurrent access
    this.db.pragma('journal_mode = WAL');
    
    // Create schema if not exists
    this.createSchema();
    
    this.initialized = true;
    console.log(`📦 SQLite cache initialized: ${this.dbPath}`);
  }

  createSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pages (
        url TEXT PRIMARY KEY,
        etag TEXT,
        last_modified TEXT,
        content_hash TEXT,
        html_path TEXT,
        last_checked INTEGER,
        indexed INTEGER DEFAULT 0,
        source TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_source ON pages(source);
      CREATE INDEX IF NOT EXISTS idx_indexed ON pages(indexed);
      CREATE INDEX IF NOT EXISTS idx_last_checked ON pages(last_checked);
      CREATE INDEX IF NOT EXISTS idx_content_hash ON pages(content_hash);

      -- View for quick statistics
      CREATE VIEW IF NOT EXISTS cache_stats AS
      SELECT 
        source,
        COUNT(*) as total_pages,
        SUM(indexed) as indexed_pages,
        MAX(last_checked) as last_updated
      FROM pages
      WHERE source IS NOT NULL
      GROUP BY source;
    `);
  }

  /**
   * Get a page from cache
   */
  get(url) {
    if (!this.initialized) throw new Error('Cache not initialized');

    const stmt = this.db.prepare('SELECT * FROM pages WHERE url = ?');
    const row = stmt.get(url);
    
    if (!row) return null;

    // Convert SQLite integers back to booleans
    return {
      url: row.url,
      etag: row.etag,
      lastModified: row.last_modified,
      contentHash: row.content_hash,
      htmlPath: row.html_path,
      lastChecked: row.last_checked,
      indexed: Boolean(row.indexed),
      source: row.source,
    };
  }

  /**
   * Set/update a page in cache
   */
  set(url, data) {
    if (!this.initialized) throw new Error('Cache not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO pages (
        url, etag, last_modified, content_hash, html_path, 
        last_checked, indexed, source, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(url) DO UPDATE SET
        etag = excluded.etag,
        last_modified = excluded.last_modified,
        content_hash = excluded.content_hash,
        html_path = excluded.html_path,
        last_checked = excluded.last_checked,
        indexed = excluded.indexed,
        source = excluded.source,
        updated_at = strftime('%s', 'now')
    `);

    stmt.run(
      url,
      data.etag || null,
      data.lastModified || null,
      data.contentHash || null,
      data.htmlPath || null,
      data.lastChecked || null,
      data.indexed ? 1 : 0,
      data.source || null
    );
  }

  /**
   * Delete a page from cache
   */
  delete(url) {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    const stmt = this.db.prepare('DELETE FROM pages WHERE url = ?');
    stmt.run(url);
  }

  /**
   * Check if a URL exists in cache
   */
  has(url) {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    const stmt = this.db.prepare('SELECT 1 FROM pages WHERE url = ? LIMIT 1');
    return Boolean(stmt.get(url));
  }

  /**
   * Get all cached pages
   */
  getAllPages() {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM pages');
    const rows = stmt.all();
    
    return rows.map(row => [row.url, {
      url: row.url,
      etag: row.etag,
      lastModified: row.last_modified,
      contentHash: row.content_hash,
      htmlPath: row.html_path,
      lastChecked: row.last_checked,
      indexed: Boolean(row.indexed),
      source: row.source,
    }]);
  }

  /**
   * Get pages by source
   */
  getPagesBySource(source) {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM pages WHERE source = ?');
    const rows = stmt.all(source);
    
    return rows.map(row => ({
      url: row.url,
      etag: row.etag,
      lastModified: row.last_modified,
      contentHash: row.content_hash,
      htmlPath: row.html_path,
      lastChecked: row.last_checked,
      indexed: Boolean(row.indexed),
      source: row.source,
    }));
  }

  /**
   * Get cache statistics
   */
  getStats() {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM pages');
    const total = totalStmt.get().count;
    
    const indexedStmt = this.db.prepare('SELECT COUNT(*) as count FROM pages WHERE indexed = 1');
    const indexed = indexedStmt.get().count;
    
    const bySourceStmt = this.db.prepare('SELECT * FROM cache_stats ORDER BY source');
    const bySource = bySourceStmt.all();
    
    return {
      total,
      indexed,
      bySource: bySource.map(row => ({
        source: row.source,
        total: row.total_pages,
        indexed: row.indexed_pages,
        lastUpdated: row.last_updated,
      })),
    };
  }

  /**
   * Get count of pages
   */
  get size() {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM pages');
    return stmt.get().count;
  }

  /**
   * Clear all cache entries (or by source)
   */
  clear(source = null) {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    if (source) {
      const stmt = this.db.prepare('DELETE FROM pages WHERE source = ?');
      stmt.run(source);
    } else {
      this.db.exec('DELETE FROM pages');
    }
  }

  /**
   * Get pages that might be outdated (lastmod > last_checked)
   */
  getOutdatedPages(since = null) {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    let query = 'SELECT url FROM pages WHERE 1=1';
    const params = [];
    
    if (since) {
      query += ' AND (last_checked IS NULL OR last_checked < ?)';
      params.push(since);
    }
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params).map(row => row.url);
  }

  /**
   * Bulk insert/update pages (transaction)
   */
  bulkSet(entries) {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    const insert = this.db.prepare(`
      INSERT INTO pages (
        url, etag, last_modified, content_hash, html_path, 
        last_checked, indexed, source, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(url) DO UPDATE SET
        etag = excluded.etag,
        last_modified = excluded.last_modified,
        content_hash = excluded.content_hash,
        html_path = excluded.html_path,
        last_checked = excluded.last_checked,
        indexed = excluded.indexed,
        source = excluded.source,
        updated_at = strftime('%s', 'now')
    `);

    const insertMany = this.db.transaction((entries) => {
      for (const [url, data] of entries) {
        insert.run(
          url,
          data.etag || null,
          data.lastModified || null,
          data.contentHash || null,
          data.htmlPath || null,
          data.lastChecked || null,
          data.indexed ? 1 : 0,
          data.source || null
        );
      }
    });

    insertMany(entries);
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Get entries iterator (for compatibility with Map)
   */
  * entries() {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM pages');
    const rows = stmt.all();
    
    for (const row of rows) {
      yield [row.url, {
        url: row.url,
        etag: row.etag,
        lastModified: row.last_modified,
        contentHash: row.content_hash,
        htmlPath: row.html_path,
        lastChecked: row.last_checked,
        indexed: Boolean(row.indexed),
        source: row.source,
      }];
    }
  }

  /**
   * Advanced Query: Get pages by source and date range
   */
  queryPages({ source = null, startDate = null, endDate = null, indexed = null } = {}) {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    let query = 'SELECT * FROM pages WHERE 1=1';
    const params = [];
    
    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }
    
    if (startDate) {
      query += ' AND last_checked >= ?';
      params.push(Math.floor(startDate.getTime() / 1000));
    }
    
    if (endDate) {
      query += ' AND last_checked <= ?';
      params.push(Math.floor(endDate.getTime() / 1000));
    }
    
    if (indexed !== null) {
      query += ' AND indexed = ?';
      params.push(indexed ? 1 : 0);
    }
    
    query += ' ORDER BY last_checked DESC';
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    
    return rows.map(row => ({
      url: row.url,
      etag: row.etag,
      lastModified: row.last_modified,
      contentHash: row.content_hash,
      htmlPath: row.html_path,
      lastChecked: row.last_checked,
      indexed: Boolean(row.indexed),
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Get pages modified since a specific date
   */
  getModifiedSince(date) {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    const timestamp = Math.floor(date.getTime() / 1000);
    const stmt = this.db.prepare(`
      SELECT url, source, last_checked, indexed
      FROM pages
      WHERE updated_at >= ?
      ORDER BY updated_at DESC
    `);
    
    return stmt.all(timestamp).map(row => ({
      url: row.url,
      source: row.source,
      lastChecked: row.last_checked,
      indexed: Boolean(row.indexed),
    }));
  }

  /**
   * Get pages by modification status
   */
  getPagesByStatus(status) {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    let query;
    let params = [];
    
    switch (status) {
      case 'indexed':
        query = 'SELECT * FROM pages WHERE indexed = 1 ORDER BY last_checked DESC';
        break;
      case 'not-indexed':
        query = 'SELECT * FROM pages WHERE indexed = 0 ORDER BY last_checked DESC';
        break;
      case 'stale':
        // Pages not checked in 7 days
        const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
        query = 'SELECT * FROM pages WHERE last_checked < ? ORDER BY last_checked ASC';
        params = [sevenDaysAgo];
        break;
      case 'recent':
        // Pages checked in last 24 hours
        const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
        query = 'SELECT * FROM pages WHERE last_checked >= ? ORDER BY last_checked DESC';
        params = [oneDayAgo];
        break;
      default:
        throw new Error(`Unknown status: ${status}`);
    }
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    
    return rows.map(row => ({
      url: row.url,
      etag: row.etag,
      lastModified: row.last_modified,
      contentHash: row.content_hash,
      htmlPath: row.html_path,
      lastChecked: row.last_checked,
      indexed: Boolean(row.indexed),
      source: row.source,
    }));
  }

  /**
   * Generate comprehensive analytics report
   */
  generateAnalyticsReport() {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    const report = {};
    
    // Overall statistics
    const overallStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(indexed) as indexed,
        MIN(last_checked) as oldest_check,
        MAX(last_checked) as newest_check,
        AVG(last_checked) as avg_check
      FROM pages
    `);
    report.overall = overallStmt.get();
    
    // By source
    const bySourceStmt = this.db.prepare('SELECT * FROM cache_stats ORDER BY source');
    report.bySource = bySourceStmt.all();
    
    // Recent activity (last 24 hours)
    const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
    const recentStmt = this.db.prepare(`
      SELECT source, COUNT(*) as count
      FROM pages
      WHERE last_checked >= ?
      GROUP BY source
    `);
    report.recentActivity = recentStmt.all(oneDayAgo);
    
    // Stale pages (not checked in 7 days)
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    const staleStmt = this.db.prepare(`
      SELECT source, COUNT(*) as count
      FROM pages
      WHERE last_checked < ?
      GROUP BY source
    `);
    report.stalePages = staleStmt.all(sevenDaysAgo);
    
    // Cache efficiency
    const efficiencyStmt = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT content_hash) as unique_content,
        COUNT(*) as total_pages,
        ROUND(100.0 * COUNT(DISTINCT content_hash) / COUNT(*), 2) as uniqueness_percent
      FROM pages
      WHERE content_hash IS NOT NULL
    `);
    report.efficiency = efficiencyStmt.get();
    
    // Database size
    const sizeStmt = this.db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()');
    report.databaseSize = sizeStmt.get().size;
    
    return report;
  }

  /**
   * Acquire lock for concurrent indexing
   */
  acquireLock(lockName, timeoutSeconds = 300) {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    // Create locks table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS locks (
        name TEXT PRIMARY KEY,
        acquired_at INTEGER,
        acquired_by TEXT,
        expires_at INTEGER
      );
    `);
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + timeoutSeconds;
    const acquiredBy = `${process.pid}-${Date.now()}`;
    
    // Use transaction to ensure atomicity
    const acquireLockTransaction = this.db.transaction(() => {
      // Check for existing lock
      const checkStmt = this.db.prepare('SELECT * FROM locks WHERE name = ?');
      const existingLock = checkStmt.get(lockName);
      
      if (existingLock) {
        // Check if expired
        if (existingLock.expires_at < now) {
          // Lock expired, take it over
          const updateStmt = this.db.prepare(`
            UPDATE locks 
            SET acquired_at = ?, acquired_by = ?, expires_at = ?
            WHERE name = ?
          `);
          updateStmt.run(now, acquiredBy, expiresAt, lockName);
          return { acquired: true, lockId: acquiredBy };
        } else {
          // Lock still held
          return { 
            acquired: false, 
            message: 'Lock held by another process',
            expiresIn: existingLock.expires_at - now 
          };
        }
      } else {
        // No lock exists, insert new one
        const insertStmt = this.db.prepare(`
          INSERT INTO locks (name, acquired_at, acquired_by, expires_at)
          VALUES (?, ?, ?, ?)
        `);
        insertStmt.run(lockName, now, acquiredBy, expiresAt);
        return { acquired: true, lockId: acquiredBy };
      }
    });
    
    return acquireLockTransaction();
  }

  /**
   * Release lock for concurrent indexing
   */
  releaseLock(lockName, lockId) {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    const stmt = this.db.prepare('DELETE FROM locks WHERE name = ? AND acquired_by = ?');
    const result = stmt.run(lockName, lockId);
    
    return result.changes > 0;
  }

  /**
   * Clean up expired locks
   */
  cleanupExpiredLocks() {
    if (!this.initialized) throw new Error('Cache not initialized');
    
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare('DELETE FROM locks WHERE expires_at < ?');
    const result = stmt.run(now);
    
    return result.changes;
  }
}
