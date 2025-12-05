# Indexing Guide

## Understanding Caching vs Indexing

### Caching (Fast - Already Done ✅)
- **What it does**: Downloads HTML pages and stores them locally
- **Purpose**: Avoids re-downloading pages, speeds up indexing
- **Storage**: SQLite database (`data/page-cache.db`)
- **Current status**: 231 pages cached from all 8 sources

### Indexing (Slower - Needs to be Done)
- **What it does**: Converts pages to embeddings and stores in vector database
- **Purpose**: Enables semantic search and Q&A
- **Storage**: Vector database (`data/vectors/`)
- **Current status**: Only 3 sources indexed (SUSE, Rancher, K3s)

## Why New Sources Aren't Searchable Yet

When you run commands like `npm run stats`, you see pages are "cached" but that doesn't mean they're searchable. The cache statistics show:

```
rke2       0 indexed / 30 cached    ← Cached but NOT indexed
harvester  0 indexed / 30 cached    ← Cached but NOT indexed
neuvector  0 indexed / 30 cached    ← Cached but NOT indexed
kubewarden 0 indexed / 31 cached    ← Cached but NOT indexed
```

This means:
- ✅ Pages have been downloaded and stored
- ❌ Pages have NOT been converted to embeddings
- ❌ Pages are NOT searchable yet
- ❌ Pages won't appear in Q&A results

## How to Index New Sources

### Option 1: Index Individual Sources (Recommended)

**Start with one source to test:**
```bash
npm run index rke2
```

**Time estimates (per source with OpenAI embeddings):**
- RKE2: ~3-4 minutes (30 pages)
- Longhorn: ~3-4 minutes (30 pages)
- Harvester: ~3-4 minutes (30 pages)
- NeuVector: ~3-4 minutes (30 pages)
- Kubewarden: ~3-4 minutes (31 pages)

**With Ollama (slower but free):**
- Each source: ~25-35 minutes

### Option 2: Index All New Sources

```bash
# Index only the new sources (not previously indexed)
npm run index rke2
npm run index longhorn
npm run index harvester
npm run index neuvector
npm run index kubewarden
```

### Option 3: Re-index Everything

```bash
# This will index all 8 sources
npm run index all
```

⚠️ **Note**: Since SUSE, Rancher, and K3s are already indexed, they'll be skipped unless you use `--force`.

## Verifying Indexing Status

### 1. Check Cache Statistics
```bash
npm run stats
```

Look for the "indexed" count:
```
rke2       30 indexed / 30 cached    ← Now indexed! ✅
```

### 2. Check in Web UI
1. Open http://localhost:3000
2. Go to **Sources** tab
3. Click **Refresh Sources**
4. Each source will show:
   - **Status**: "indexed" or "not indexed"
   - **Documents**: Count of indexed documents

### 3. Test Search
Once indexed, try searching:
```bash
# In Web UI: Search tab
Query: "How do I install RKE2?"
Source: RKE2 Documentation
```

## Common Issues

### Issue: "No results found"
**Cause**: Source not indexed yet  
**Solution**: Index the source first (see above)

### Issue: "Only getting results from SUSE/Rancher/K3s"
**Cause**: Other sources not indexed  
**Solution**: Index additional sources

### Issue: Web UI dropdowns not showing new sources
**Cause**: Web UI needs to reload sources  
**Solution**: 
1. Click "Refresh Sources" in Sources tab
2. Or restart web server: `npm run web`

### Issue: Indexing is very slow with Ollama
**Cause**: Local embedding generation is slower than OpenAI  
**Solution**: 
- Consider using OpenAI for embeddings (see `.env` configuration)
- Or be patient - it works, just takes longer

## Recommended Workflow

1. **Test with one source first**
   ```bash
   npm run index rke2
   ```

2. **Verify it worked**
   ```bash
   npm run stats
   ```

3. **Test in Web UI**
   - Search for something RKE2-specific
   - Check if results appear

4. **Index remaining sources**
   ```bash
   npm run index longhorn
   npm run index harvester
   npm run index neuvector
   npm run index kubewarden
   ```

5. **Verify all sources work**
   - Try searches from different sources
   - Ask questions that span multiple sources

## Performance Tips

### For Fastest Indexing (OpenAI)
```env
# In .env
USE_OPENAI_EMBEDDINGS=true
OPENAI_API_KEY=sk-your-key-here
```

**Time to index all 5 new sources**: ~15-20 minutes

### For Free/Local Indexing (Ollama)
```env
# In .env
USE_OPENAI_EMBEDDINGS=false
EMBEDDING_MODEL=nomic-embed-text
```

**Time to index all 5 new sources**: ~2.5-3 hours

### Hybrid Approach (Recommended)
```env
# In .env
USE_OPENAI_EMBEDDINGS=true    # Fast embeddings
AI_PROVIDER=ollama             # Free Q&A
```

This gives you:
- ✅ Fast indexing (OpenAI embeddings)
- ✅ Free Q&A (Ollama)
- ✅ Best of both worlds

## What Happens During Indexing

1. **Load from cache**: Pages already downloaded (fast)
2. **Clean content**: Remove HTML, keep markdown
3. **Chunk documents**: Split into ~1000 char chunks
4. **Generate embeddings**: Convert to vectors (slow part)
5. **Store in vector DB**: Save for semantic search
6. **Mark as indexed**: Update cache status

The cached pages make steps 1-2 instant. The slow part is step 4 (embeddings).

## Summary

- **Cached ≠ Indexed**: Cached pages aren't searchable until indexed
- **Indexing creates embeddings**: Required for semantic search
- **Start small**: Test with one source first
- **Use OpenAI for speed**: Or Ollama for free (slower)
- **Verify with stats**: Check `npm run stats` after indexing
- **Test in UI**: Make sure searches work before indexing more

See [SOURCES.md](./SOURCES.md) for more details on each documentation source.
