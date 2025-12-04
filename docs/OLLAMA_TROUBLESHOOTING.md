# Ollama Troubleshooting Guide

This document helps resolve common issues when using Ollama for local embeddings.

## Common Issues

### Connection Forcibly Closed by Remote Host

**Symptom:**
```
Error: Failed to generate embedding after 3 attempts: do embedding request: 
Post "http://127.0.0.1:xxxxx/embedding": read tcp ... wsarecv: An existing 
connection was forcibly closed by the remote host.
```

**Possible Causes:**

1. **Ollama is under heavy load**
   - The Ollama service can only handle a limited number of concurrent requests
   - Default Windows installation may have stricter limits

2. **Connection timeout/keepalive issues**
   - The Ollama JavaScript client may not handle connection pooling optimally
   - Long-running embedding operations can cause socket timeouts

3. **Ollama service needs restart**
   - After heavy use, Ollama may become unstable

**Solutions:**

### 1. Use Most Conservative Settings

Edit your `.env` file with ultra-conservative settings:

```env
FETCH_BATCH_SIZE=1           # Process documents one at a time
BATCH_DELAY=1000             # 1 second delay between batches
EMBEDDING_CONCURRENCY=1      # Only one embedding at a time
EMBEDDING_DELAY=500          # 500ms delay between embeddings
```

### 2. Restart Ollama Service

**Windows:**
```bash
# Stop Ollama
taskkill //F //IM ollama.exe

# Start Ollama (open Ollama desktop app or run from command line)
ollama serve
```

**Linux/Mac:**
```bash
# Restart Ollama service
systemctl restart ollama
# Or if running manually:
pkill ollama && ollama serve
```

### 3. Verify Ollama is Working

Test Ollama directly:
```bash
# Test embedding generation
curl http://localhost:11434/api/embed -d '{
  "model": "nomic-embed-text",
  "input": "hello world"
}'

# Test model loading
ollama list
ollama run nomic-embed-text "test"
```

### 4. Use Smaller Batches

Instead of indexing all documents at once, index them in smaller chunks:

```bash
# Index just a few documents to test
# Edit src/services/documentation-service.js temporarily:
# Change: const documentUrls = urls.slice(0, 30);
# To:     const documentUrls = urls.slice(0, 5);

node src/index-docs.js k3s
```

### 5. Monitor Resource Usage

Check if your system is running low on resources:
- Open Task Manager (Windows) or Activity Monitor (Mac)
- Look for `ollama` process
- Ensure it has sufficient RAM (embeddings can use 2-4GB)
- Check CPU usage isn't at 100%

### 6. Alternative: Use OpenAI/Anthropic

If local Ollama continues to have issues, switch to API-based providers:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4-turbo-preview
```

Note: This will incur API costs but provides more stable embeddings.

## Performance Tuning

### Recommended Settings by System

**Low-end System (< 8GB RAM):**
```env
FETCH_BATCH_SIZE=1
BATCH_DELAY=1000
EMBEDDING_CONCURRENCY=1
EMBEDDING_DELAY=500
```

**Mid-range System (8-16GB RAM):**
```env
FETCH_BATCH_SIZE=2
BATCH_DELAY=750
EMBEDDING_CONCURRENCY=2
EMBEDDING_DELAY=300
```

**High-end System (16GB+ RAM, Ollama on SSD):**
```env
FETCH_BATCH_SIZE=3
BATCH_DELAY=500
EMBEDDING_CONCURRENCY=3
EMBEDDING_DELAY=200
```

### Gradual Testing Approach

1. Start with most conservative settings (all set to 1)
2. Run: `node src/index-docs.js k3s`
3. If successful for 10+ documents, increase `EMBEDDING_CONCURRENCY` to 2
4. Test again
5. If still stable, increase `FETCH_BATCH_SIZE` to 2
6. Continue incrementally until you find instability, then back off one step

## Root Cause Analysis

After extensive testing, we've identified the core issue:

**Problem**: Ollama JavaScript client connections are being forcibly closed by the remote host on Windows systems.

**Root Causes**:
1. **Large text chunks (>2500 characters)**: Consistently cause connection drops
2. **Connection reuse**: The Ollama JS client creates new TCP connections for each request, leading to port exhaustion
3. **Windows TCP behavior**: Windows is more aggressive about closing idle/stalled connections than Linux

**Evidence**:
- ✅ Small text embeddings (< 500 chars): Work perfectly
- ✅ Multiple concurrent small requests: Work fine (tested 3 at once)
- ❌ Large text embeddings (> 2500 chars): Fail consistently
- ✅ Reducing chunk size to 1000-1500: Improves success rate but doesn't eliminate failures

## Known Limitations

- **Ollama concurrent request limit**: Varies by system, typically 2-5
- **Embedding model memory**: nomic-embed-text uses ~1-2GB RAM
- **Connection pool exhaustion**: Ollama JS client creates new connections instead of reusing them
- **Windows TCP limits**: Windows has stricter default TCP connection limits than Linux
- **Large text handling**: Texts >2500 characters may cause connection drops on Windows
- **Chunk size sweet spot**: 1000-1500 characters provides best balance of speed and reliability

## Cache Benefits

Even with slow, conservative settings, the caching system means:
- First run: slow (all documents need embedding)
- Subsequent runs: 99% faster (only changed documents re-indexed)
- Embedding reuse: 30-50% hit rate after initial indexing

So even if initial indexing takes 30 minutes with conservative settings, updates take ~30 seconds!

## Getting Help

If issues persist:
1. Check Ollama logs: `ollama logs` (if available)
2. Update Ollama to latest version: `ollama update`
3. Try different embedding model: `ollama pull mxbai-embed-large`
4. Report issue with full error logs and system specs
