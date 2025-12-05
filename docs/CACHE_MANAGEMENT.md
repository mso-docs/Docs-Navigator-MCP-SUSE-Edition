# Cache Management Commands

This document describes the cache management tools available for the SUSE Docs Navigator.

## Quick Reference

```bash
# Show detailed cache statistics
npm run stats

# Validate cache integrity
npm run validate

# Clear all caches and start fresh
npm run clear-cache

# Index specific source
node src/index-docs.js suse
node src/index-docs.js rancher
node src/index-docs.js k3s
node src/index-docs.js all

# Force refresh (ignore cache)
node src/index-docs.js all --force
```

## Available Commands

### `--stats` - Show Cache Statistics

Displays detailed information about all caches:

```bash
npm run stats
# or
node src/index-docs.js --stats
```

Output includes:
- **Page Cache**: Total cached pages, breakdown by source (SUSE, Rancher, K3s)
- **Embedding Cache**: Total embeddings, hit rate statistics
- **Vector Database**: Location, creation date, last modified

### `--validate-cache` - Validate Cache Integrity

Checks all caches for corruption or missing data:

```bash
npm run validate
# or
node src/index-docs.js --validate-cache
```

Validates:
- Page cache entries have required fields (contentHash, source)
- Embedding cache entries are valid arrays
- Vector database is accessible

### `--clear-cache [type]` - Clear Caches

Removes cached data to force fresh indexing:

```bash
# Clear all caches
npm run clear-cache
node src/index-docs.js --clear-cache all

# Clear specific cache type
node src/index-docs.js --clear-cache embedding
node src/index-docs.js --clear-cache page
node src/index-docs.js --clear-cache vectors
```

Cache types:
- `embedding` - Clears embedding-cache.json (generated embeddings)
- `page` - Clears page-cache.json and data/html/ (fetched HTML)
- `vectors` - Clears data/vectors/ (Vectra vector database)
- `all` - Clears everything

### `--rebuild-source <source>` - Rebuild Specific Source

Clears all caches and re-indexes a specific documentation source:

```bash
npm run rebuild suse
# or
node src/index-docs.js --rebuild-source suse
node src/index-docs.js --rebuild-source rancher
node src/index-docs.js --rebuild-source k3s
node src/index-docs.js --rebuild-source all
```

**Note**: Due to Vectra limitations, this clears ALL caches and re-indexes from scratch.

## Utility Scripts

### `fix-cache-sources.js` - Fix Missing Source Fields

Adds source field to cache entries based on URL patterns:

```bash
node src/fix-cache-sources.js
```

Use when cache entries are missing the `source` field (happens with legacy caches).

### `mark-indexed.js` - Mark Documents as Indexed

Marks documents with contentHash and source as indexed:

```bash
node src/mark-indexed.js
```

Use when documents are cached but not marked as indexed in the UI.

## Cache Structure

### Page Cache (`data/page-cache.json`)

```json
{
  "https://docs.k3s.io/installation": {
    "url": "https://docs.k3s.io/installation",
    "etag": "W/\"abc123\"",
    "lastModified": "Mon, 01 Dec 2025 12:00:00 GMT",
    "contentHash": "sha256...",
    "htmlPath": "data/html/abc123.html",
    "lastChecked": 1733097600000,
    "indexed": true,
    "source": "k3s"
  }
}
```

### Embedding Cache (`data/embedding-cache.json`)

```json
{
  "sha256_of_text_chunk": [0.123, -0.456, 0.789, ...],
  ...
}
```

### Vector Database (`data/vectors/`)

Binary format managed by Vectra. Contains indexed document chunks with embeddings.

## Troubleshooting

### UI Shows "Not indexed yet"

Run the fix scripts:
```bash
node src/fix-cache-sources.js
node src/mark-indexed.js
```

### Cache validation shows errors

Clear and rebuild:
```bash
npm run clear-cache
node src/index-docs.js all
```

### Embedding cache too large

Clear only embeddings:
```bash
node src/index-docs.js --clear-cache embedding
```

### Need fresh start

Clear everything and reindex:
```bash
npm run clear-cache
node src/index-docs.js all --force
```

## Performance Tips

1. **Page Cache**: HTTP 304 responses make re-indexing very fast
2. **Embedding Cache**: Reuses embeddings for identical text chunks
3. **Force Refresh**: Use `--force` only when you suspect content changed
4. **Partial Updates**: Not supported by Vectra - must reindex all sources

## Cache Statistics Example

```
📊 Cache Statistics
═══════════════════════════════════════════════════════

📄 Page Cache:
   Total cached pages: 110
   Cache file: data/page-cache.json

   By Source:
     suse       50 indexed / 50 cached
     rancher    30 indexed / 30 cached
     k3s        30 indexed / 30 cached

   Session Stats:
     Loaded: 110
     304 Not Modified: 87
     Hash matches: 23
     New/Modified: 0
     Skipped (unchanged): 110

🧠 Embedding Cache:
   Total cached embeddings: 1014
   Cache file: data/embedding-cache.json

   Session Stats:
     Loaded: 1014
     Hits: 856
     Misses: 158
     Hit rate: 84.4%

🗂️  Vector Database:
   Location: ./data/vectors
   Created: 12/4/2025
   Last modified: 12/4/2025
```
