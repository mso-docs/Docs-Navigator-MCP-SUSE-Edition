# SQLite Page Cache Migration Guide

This document explains the SQLite-based page cache system and how to migrate from the legacy JSON cache.

## Why SQLite?

The SQLite cache provides significant advantages over JSON for larger documentation sets:

### Performance Benefits
- **Instant queries**: No need to load entire cache into memory
- **Indexed lookups**: Fast searches by source, URL, or timestamp
- **Efficient updates**: Atomic transactions, no full-file rewrites
- **Concurrent access**: Multiple processes can safely read simultaneously
- **Scalability**: Handles 10,000+ documents with no slowdown

### Feature Benefits
- **Built-in statistics**: SQL views for instant cache analytics
- **Advanced queries**: Filter by date range, source, or status
- **Data integrity**: Schema enforcement prevents corrupted entries
- **Disk efficiency**: WAL mode provides crash recovery

## Quick Start

### Automatic Migration

If you have an existing JSON cache, simply run:

```bash
npm run migrate-sqlite
```

This will:
1. Read your existing `data/page-cache.json`
2. Create `data/page-cache.db` with all entries
3. Backup the JSON file as `page-cache.json.migrated.[timestamp]`
4. Display migration statistics

### Fresh Installation

If starting fresh, SQLite will be used automatically. No migration needed!

## Configuration

### Using SQLite (Default)

In `.env`:
```dotenv
PAGE_CACHE_PATH=./data/page-cache.db
```

### Reverting to JSON

If you need to revert to JSON cache:

```dotenv
PAGE_CACHE_PATH=./data/page-cache.json
USE_JSON_CACHE=true
```

## Database Schema

```sql
CREATE TABLE pages (
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

-- Indexes for fast queries
CREATE INDEX idx_source ON pages(source);
CREATE INDEX idx_indexed ON pages(indexed);
CREATE INDEX idx_last_checked ON pages(last_checked);
CREATE INDEX idx_content_hash ON pages(content_hash);

-- Statistics view
CREATE VIEW cache_stats AS
SELECT 
  source,
  COUNT(*) as total_pages,
  SUM(indexed) as indexed_pages,
  MAX(last_checked) as last_updated
FROM pages
WHERE source IS NOT NULL
GROUP BY source;
```

## Advanced Queries

### Check cache statistics
```bash
npm run stats
```

### Query SQLite directly
```bash
sqlite3 data/page-cache.db

-- Count documents by source
SELECT source, COUNT(*) FROM pages GROUP BY source;

-- Find recently updated documents
SELECT url, datetime(last_checked, 'unixepoch') as last_checked
FROM pages
ORDER BY last_checked DESC
LIMIT 10;

-- Find outdated documents (not checked in 7 days)
SELECT url, source FROM pages
WHERE last_checked < strftime('%s', 'now', '-7 days');

-- Get cache statistics
SELECT * FROM cache_stats;
```

## API Compatibility

The SQLite `CacheService` is designed as a drop-in replacement for `Map`:

```javascript
// All Map operations work identically
cache.get(url)           // Get entry
cache.set(url, data)     // Set entry
cache.delete(url)        // Delete entry
cache.has(url)           // Check exists
cache.size               // Get count
cache.entries()          // Iterate entries
cache.clear()            // Clear all
```

### Additional SQLite-only features:

```javascript
// Bulk operations (transactional)
cache.bulkSet(entries);

// Get statistics
cache.getStats();

// Get pages by source
cache.getPagesBySource('suse');

// Find outdated pages
cache.getOutdatedPages(timestamp);

// Clear by source
cache.clear('suse');
```

## Performance Comparison

### JSON Cache (Legacy)
- ✅ Simple, easy to inspect
- ❌ Loads entire cache into memory (140KB for 110 docs)
- ❌ Full file rewrite on every save
- ❌ Slows down with 1000+ documents
- ❌ No concurrent access support
- ❌ Manual queries require loading everything

### SQLite Cache (Current)
- ✅ Only loads metadata as needed
- ✅ Atomic updates (no file rewrites)
- ✅ Handles 10,000+ documents easily
- ✅ Concurrent read access (WAL mode)
- ✅ SQL queries without loading all data
- ✅ Built-in integrity checks
- ✅ Crash recovery

## Scaling Recommendations

| Document Count | Recommended Cache | Notes |
|----------------|-------------------|-------|
| < 100 docs | Either | JSON is fine |
| 100-500 docs | SQLite preferred | JSON starts slowing down |
| 500-5000 docs | **SQLite required** | JSON becomes problematic |
| 5000+ docs | **SQLite required** | JSON unusable |

## Troubleshooting

### Migration shows 0 entries
- Check that `data/page-cache.json` exists
- Verify JSON file is not corrupted

### Database locked error
- Close any open connections (Ctrl+C running processes)
- Delete `data/page-cache.db-wal` and `data/page-cache.db-shm` files
- Restart the application

### Stats show wrong counts
- Run validation: `npm run validate`
- Check for missing source fields: `npm run fix-sources`
- Re-run migration if needed

### Reverting to JSON
1. Set `USE_JSON_CACHE=true` in `.env`
2. Restore from backup: `mv data/page-cache.json.migrated.* data/page-cache.json`
3. Restart application

## Backup & Maintenance

### Backup SQLite database
```bash
# Copy database file
cp data/page-cache.db data/page-cache.db.backup

# Or use SQLite backup command
sqlite3 data/page-cache.db ".backup data/page-cache.db.backup"
```

### Optimize database (rarely needed)
```bash
sqlite3 data/page-cache.db "VACUUM;"
```

### Export to JSON (for inspection)
```bash
sqlite3 data/page-cache.db ".mode json" ".output cache.json" "SELECT * FROM pages;"
```

## Technical Details

### WAL Mode
The database uses Write-Ahead Logging (WAL) mode for better concurrency:
- Readers don't block writers
- Writers don't block readers
- Automatic checkpointing
- Crash-safe operations

### Indexes
Four indexes speed up common queries:
- `idx_source`: Fast filtering by documentation source
- `idx_indexed`: Quick indexed/not-indexed lookups
- `idx_last_checked`: Find stale cache entries
- `idx_content_hash`: Detect duplicate content

### Transactions
Bulk operations use transactions for atomicity:
- All-or-nothing updates
- No partial failures
- Automatic rollback on error

## Migration Script Reference

### `npm run migrate-sqlite`

Options:
- Automatically detects existing JSON cache
- Creates backup before migration
- Validates migration success
- Shows detailed statistics

Output example:
```
🔄 Migrating page cache from JSON to SQLite...

📖 Reading JSON cache...
   Found 110 entries

🗄️  Initializing SQLite database...
📥 Importing entries...

✅ Migration complete!

📊 Statistics:
   Total pages: 110
   Indexed pages: 110

   By Source:
     k3s        30 indexed / 30 total
     rancher    30 indexed / 30 total
     suse       50 indexed / 50 total

✓ Original JSON cache backed up to: ./data/page-cache.json.migrated.1764906658417
```

## See Also

- [Cache Management Commands](CACHE_MANAGEMENT.md)
- [Performance Tuning Guide](../README.md#performance-tuning)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
