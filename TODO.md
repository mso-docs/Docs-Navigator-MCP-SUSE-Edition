## MCP Indexing Speed-Up To-Dos

### Phase 1: JSON-Based Caching (Quick Wins) ✅ COMPLETED

#### Persistent Embedding Cache (JSON) ✅
- [x] Create `data/embedding-cache.json` for embedding vectors.
- [x] Key embeddings by SHA-256 hash of chunk text.
- [x] Implement `getOrCreateEmbedding(text)` helper in `ai-service.js`.
- [x] Load embedding cache on service initialization.
- [x] Save embedding cache after indexing finishes.
- [x] Avoid re-embedding identical chunks across runs.
- [x] Add cache hit/miss statistics to indexing output.

**Results:** Cache successfully loads/saves, tracks hits/misses, hit rate displayed.

#### Persistent Page Caching (JSON initially) ✅
- [x] Create `data/page-cache.json` to store URL metadata.
- [x] Store ETag, Last-Modified, content hash, and HTML file path per page.
- [x] Implement `fetchPageWithCache()` wrapper around axios in `documentation-service.js`.
- [x] Add `If-None-Match` and `If-Modified-Since` headers to conditional GETs.
- [x] Return cached HTML when receiving `304 Not Modified`.
- [x] Save fetched HTML pages to `data/html/`.
- [x] Add cache statistics (pages cached, 304 responses, cache hits).

**Results:** 29/30 pages returned 304 on second run, HTML cached to disk.

#### Skip Re-processing When Content Is Unchanged ✅
- [x] Compare new `contentHash` with previous stored `contentHash`.
- [x] If identical, skip parsing + chunking + embedding.
- [x] Log skipped documents for visibility.

**Results:** Successfully skipped 1 unchanged document on second run.

#### Use Sitemap Optimization ✅ COMPLETED
- [x] Fixed sitemap parsing (removed overly restrictive filters).
- [x] Parse sitemap `<lastmod>` timestamps.
- [x] Compare with cached `last_checked` to pre-filter URLs.
- [x] Only fetch URLs that are potentially changed.

**Results:**
- `preFilterUrls()` method compares sitemap lastmod with cache timestamps
- Skips URLs where lastmod ≤ last_checked (guaranteed unchanged)
- Prevents unnecessary HTTP requests before conditional GET
- Logs pre-filtered count for visibility

### Phase 2: Performance Tuning 🔧 IN PROGRESS

#### Concurrency Control ✅
- [x] Install and use `p-limit` for controlled concurrency.
- [x] Add env var `EMBEDDING_CONCURRENCY` (default: 2) to limit parallel embeddings.
- [x] Add env var `FETCH_BATCH_SIZE` (default: 3) to control document batching.
- [x] Add env var `EMBEDDING_DELAY` (default: 100ms) for request spacing.
- [x] Reduced defaults to prevent overwhelming Ollama (from 5 → 3 → 2).
- [x] Add retry logic with exponential backoff (3 attempts: 500ms, 1s, 2s).
- [x] Test with different batch sizes and document findings.

**Batch Size Testing Results:**
- FETCH_BATCH_SIZE=1 (sequential): ✅ 100% reliable, no Vectra conflicts
- FETCH_BATCH_SIZE=3+ (parallel): ❌ Vectra "Item already exists" errors
- Recommendation: Keep FETCH_BATCH_SIZE=1 for stability
- Note: Switched to OpenAI embeddings (reliable) + Ollama Q&A (free) hybrid approach

**Results:** 
- Concurrency: 5 → 2 with p-limit queueing
- Retry logic: 3 attempts with exponential backoff
- Cache working perfectly: 97% page cache hit rate, 20% embedding reuse

#### Cache Management Commands ✅ COMPLETED
- [x] Add `--stats` flag to show cache statistics.
- [x] Add `--clear-cache` flag to force full refresh.
- [x] Add `--validate-cache` to check for corruption.
- [x] Add `--rebuild-source` to clear and reindex specific source.
- [x] Add npm scripts: `npm run stats`, `npm run validate`, `npm run clear-cache`.
- [x] Create utility scripts: `fix-cache-sources.js`, `mark-indexed.js`.

**Results:**
- Stats command shows detailed cache info by source (110 total: SUSE 50, Rancher 30, K3s 30)
- Validate command checks cache integrity and detects issues
- Clear cache supports: `embedding`, `page`, `vectors`, or `all`
- Utility scripts fixed legacy cache entries missing source/indexed flags

### Phase 3: SQLite Migration ✅ COMPLETED

#### Migrate Page Cache to SQLite ✅
- [x] Install `better-sqlite3` package.
- [x] Create `data/page-cache.db` with schema including indexed, source, and timestamp fields.
- [x] Implement `CacheService` with SQLite backend supporting all Map operations.
- [x] Add migration script to convert JSON → SQLite (`npm run migrate-sqlite`).
- [x] Keep `embedding-cache.json` as-is (works great for embeddings).
- [x] Add transaction support for atomic bulk updates.
- [x] Add indexes for fast queries by source, indexed status, and last_checked.
- [x] Create cache_stats view for quick analytics.

**Results:**
- SQLite cache is now default (set USE_JSON_CACHE=true to revert)
- Migration script successfully converted 110 entries
- All operations work identically to Map-based cache
- Ready for scaling to 1000s of documents with no performance degradation

#### Advanced Query Features (SQLite only) ✅ COMPLETED

- [x] Query pages by source, date range, or modification status.
- [x] Generate cache analytics reports.
- [x] Support concurrent indexing jobs safely.

**Results:**

- **Advanced Queries:** `npm run query-cache` with filters:
  - `--source suse|rancher|k3s` - Filter by documentation source
  - `--status indexed|not-indexed|stale|recent` - Filter by indexing status
  - `--modified-since YYYY-MM-DD` - Show pages modified after date
  - `--start-date` / `--end-date` - Date range filtering
  - Grouped display by source with indexed status indicators (✓/✗)

- **Analytics Reports:** `npm run analytics` shows:
  - Overall statistics: Total pages, indexed %, oldest/newest/average check times
  - By-source breakdown: Counts and percentages per documentation source
  - Recent activity: Pages updated in last 24 hours by source
  - Stale pages: Pages not checked in 7+ days
  - Cache efficiency: Uniqueness %, duplicate detection (currently 100% unique)
  - Database size: KB/MB with average per page
  - Automated recommendations: Refresh stale pages, complete indexing, optimize if needed

- **Concurrent Indexing Locks:** Table-based locking prevents race conditions:
  - Each indexing process acquires exclusive lock: `npm run index <source>`
  - 30-minute timeout with automatic expiration
  - Second process detects conflict and shows helpful message with remaining time
  - `npm run clear-locks` removes expired locks
  - Atomic lock acquisition using SQLite transactions (no race conditions)
  - Tested with two simultaneous processes - second correctly blocked until first completes

✅ **FIXED**: UI now correctly displays cached document counts per source (SUSE: 50, Rancher: 30, K3s: 30)

- Enhanced `listSources()` to count indexed documents from page cache
- Added `source` field to page cache entries during indexing
- Fixed duplicate counter issue in batch processing
- UI accurately reflects indexing status for all documentation sources
