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

#### Use Sitemap Optimization 🔧 IN PROGRESS
- [x] Fixed sitemap parsing (removed overly restrictive filters).
- [ ] Parse sitemap `<lastmod>` timestamps.
- [ ] Compare with cached `last_checked` to pre-filter URLs.
- [ ] Only fetch URLs that are potentially changed.

### Phase 2: Performance Tuning 🔧 IN PROGRESS

#### Concurrency Control ✅
- [x] Install and use `p-limit` for controlled concurrency.
- [x] Add env var `EMBEDDING_CONCURRENCY` (default: 2) to limit parallel embeddings.
- [x] Add env var `FETCH_BATCH_SIZE` (default: 3) to control document batching.
- [x] Add env var `EMBEDDING_DELAY` (default: 100ms) for request spacing.
- [x] Reduced defaults to prevent overwhelming Ollama (from 5 → 3 → 2).
- [x] Add retry logic with exponential backoff (3 attempts: 500ms, 1s, 2s).
- [ ] Test with different batch sizes and document findings.

**Results:** 
- Concurrency: 5 → 2 with p-limit queueing
- Retry logic: 3 attempts with exponential backoff
- Cache working perfectly: 97% page cache hit rate, 20% embedding reuse

#### Cache Management Commands
- [ ] Add `--stats` flag to show cache statistics.
- [ ] Add `--clear-cache` flag to force full refresh.
- [ ] Add `--validate-cache` to check for corruption.

### Phase 3: SQLite Migration (When Needed)

#### Migrate Page Cache to SQLite
- [ ] Install `better-sqlite3` package.
- [ ] Create `data/page-cache.db` with schema:
  ```sql
  CREATE TABLE pages (
    url TEXT PRIMARY KEY,
    etag TEXT,
    last_modified TEXT,
    content_hash TEXT,
    html_path TEXT,
    last_checked INTEGER,
    chunk_count INTEGER
  );
  CREATE INDEX idx_last_checked ON pages(last_checked);
  ```
- [ ] Implement `CacheService` with SQLite backend.
- [ ] Add migration script to convert JSON → SQLite.
- [ ] Keep `embedding-cache.json` as-is (works great for embeddings).
- [ ] Add transaction support for atomic updates.

#### Advanced Query Features (SQLite only)
- [ ] Query pages by source, date range, or modification status.
- [ ] Generate cache analytics reports.
- [ ] Support concurrent indexing jobs safely.

