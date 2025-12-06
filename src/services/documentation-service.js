import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { VectorService } from './vector-service.js';
import { CacheService } from './cache-service.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export class DocumentationService {
  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    this.vectorService = new VectorService();
    this.sources = new Map();
    
    // Use SQLite cache by default, fall back to JSON Map if USE_JSON_CACHE=true
    this.useJsonCache = process.env.USE_JSON_CACHE === 'true';
    
    if (this.useJsonCache) {
      this.pageCache = new Map();
      this.pageCachePath = process.env.PAGE_CACHE_PATH || './data/page-cache.json';
      console.log('📦 Using JSON cache (legacy mode)');
    } else {
      this.pageCache = new CacheService(process.env.PAGE_CACHE_PATH || './data/page-cache.db');
      console.log('📦 Using SQLite cache');
    }
    
    this.htmlCacheDir = process.env.HTML_CACHE_DIR || './data/html';
    this.pageCacheStats = {
      hits304: 0,
      hitsCached: 0,
      misses: 0,
      loaded: 0,
      skipped: 0,
    };
    this.pageCacheLoaded = false;
    this.initializeSources();
  }

  initializeSources() {
    const sources = [
      {
        id: 'suse',
        name: 'SUSE Documentation',
        baseUrl: process.env.SUSE_DOCS_BASE_URL || 'https://documentation.suse.com',
        status: 'active',
      },
      {
        id: 'rancher',
        name: 'Rancher Documentation',
        baseUrl: process.env.RANCHER_DOCS_URL || 'https://ranchermanager.docs.rancher.com',
        status: 'active',
      },
      {
        id: 'k3s',
        name: 'K3s Documentation',
        baseUrl: process.env.K3S_DOCS_URL || 'https://docs.k3s.io',
        status: 'active',
      },
      {
        id: 'rke2',
        name: 'RKE2 Documentation',
        baseUrl: process.env.RKE2_DOCS_URL || 'https://docs.rke2.io',
        status: 'active',
      },
      {
        id: 'longhorn',
        name: 'Longhorn Documentation',
        baseUrl: process.env.LONGHORN_DOCS_URL || 'https://longhorn.io/docs',
        status: 'active',
      },
      {
        id: 'harvester',
        name: 'Harvester Documentation',
        baseUrl: process.env.HARVESTER_DOCS_URL || 'https://docs.harvesterhci.io',
        status: 'active',
      },
      {
        id: 'neuvector',
        name: 'NeuVector Documentation',
        baseUrl: process.env.NEUVECTOR_DOCS_URL || 'https://open-docs.neuvector.com',
        status: 'active',
      },
      {
        id: 'kubewarden',
        name: 'Kubewarden Documentation',
        baseUrl: process.env.KUBEWARDEN_DOCS_URL || 'https://docs.kubewarden.io',
        status: 'active',
      },
    ];

    sources.forEach((source) => {
      this.sources.set(source.id, source);
    });
  }

  async listSources() {
    await this.loadPageCache();
    
    // Count indexed documents per source
    const sourceCounts = new Map();
    
    for (const [url, cacheEntry] of this.pageCache.entries()) {
      if (cacheEntry.indexed) {
        // Extract source from URL or use cached source info
        const source = cacheEntry.source || this.getSourceFromUrl(url);
        if (source) {
          sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
        }
      }
    }
    
    // Add document counts to source definitions
    return Array.from(this.sources.values()).map(source => ({
      ...source,
      documentCount: sourceCounts.get(source.id) || 0,
      status: sourceCounts.get(source.id) > 0 ? 'indexed' : 'not indexed'
    }));
  }
  
  getSourceFromUrl(url) {
    // Determine source from URL pattern
    for (const [id, source] of this.sources.entries()) {
      if (url.startsWith(source.baseUrl)) {
        return id;
      }
    }
    return null;
  }

  async loadPageCache() {
    if (this.pageCacheLoaded) return;

    if (this.useJsonCache) {
      // Legacy JSON cache
      try {
        const cacheDir = path.dirname(this.pageCachePath);
        await fs.mkdir(cacheDir, { recursive: true });

        const data = await fs.readFile(this.pageCachePath, 'utf-8');
        const cacheData = JSON.parse(data);

        // Load into Map
        for (const [key, value] of Object.entries(cacheData)) {
          this.pageCache.set(key, value);
        }

        this.pageCacheStats.loaded = this.pageCache.size;
        console.log(`📦 Loaded ${this.pageCacheStats.loaded} cached pages from disk`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('Failed to load page cache:', error.message);
        }
      }
    } else {
      // SQLite cache
      try {
        await this.pageCache.initialize();
        this.pageCacheStats.loaded = this.pageCache.size;
        console.log(`📦 Loaded ${this.pageCacheStats.loaded} cached pages from SQLite`);
      } catch (error) {
        console.error('Failed to load page cache:', error.message);
      }
    }

    this.pageCacheLoaded = true;
  }

  async savePageCache() {
    if (this.useJsonCache) {
      // Legacy JSON cache
      try {
        const cacheDir = path.dirname(this.pageCachePath);
        await fs.mkdir(cacheDir, { recursive: true });

        const cacheData = Object.fromEntries(this.pageCache);
        await fs.writeFile(this.pageCachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
        console.log(`💾 Saved ${this.pageCache.size} page cache entries`);
      } catch (error) {
        console.error('Failed to save page cache:', error.message);
      }
    } else {
      // SQLite cache auto-saves on each operation, just log the count
      console.log(`💾 SQLite cache contains ${this.pageCache.size} page entries`);
    }
  }

  hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  sanitizeFilename(url) {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  async saveHtmlToCache(url, html) {
    try {
      await fs.mkdir(this.htmlCacheDir, { recursive: true });
      const filename = this.sanitizeFilename(url) + '.html';
      const filepath = path.join(this.htmlCacheDir, filename);
      await fs.writeFile(filepath, html, 'utf-8');
      return filepath;
    } catch (error) {
      console.error(`Failed to save HTML for ${url}:`, error.message);
      return null;
    }
  }

  async loadHtmlFromCache(filepath) {
    try {
      return await fs.readFile(filepath, 'utf-8');
    } catch (error) {
      return null;
    }
  }

  async fetchPageWithCache(url) {
    await this.loadPageCache();

    const cached = this.pageCache.get(url);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    // Add conditional request headers if we have cached data
    if (cached) {
      if (cached.etag) {
        headers['If-None-Match'] = cached.etag;
      }
      if (cached.lastModified) {
        headers['If-Modified-Since'] = cached.lastModified;
      }
    }

    try {
      const response = await axios.get(url, {
        headers,
        timeout: 15000,
        maxRedirects: 3,
        validateStatus: (status) => status < 400 || status === 304,
      });

      // 304 Not Modified - use cached HTML
      if (response.status === 304 && cached?.htmlPath) {
        this.pageCacheStats.hits304++;
        const html = await this.loadHtmlFromCache(cached.htmlPath);
        if (html) {
          return { html, fromCache: true, status: 304 };
        }
      }

      // Fresh fetch - save and update cache
      this.pageCacheStats.misses++;
      const html = response.data;
      const contentHash = this.hashContent(html);

      // Check if content actually changed
      if (cached?.contentHash === contentHash && cached?.htmlPath) {
        this.pageCacheStats.hitsCached++;
        const cachedHtml = await this.loadHtmlFromCache(cached.htmlPath);
        if (cachedHtml) {
          // Update cache metadata but use existing HTML
          this.pageCache.set(url, {
            ...cached,
            lastChecked: Date.now(),
            etag: response.headers.etag || cached.etag,
            lastModified: response.headers['last-modified'] || cached.lastModified,
          });
          return { html: cachedHtml, fromCache: true, status: 'unchanged' };
        }
      }

      // New or changed content
      const htmlPath = await this.saveHtmlToCache(url, html);

      this.pageCache.set(url, {
        url,
        etag: response.headers.etag,
        lastModified: response.headers['last-modified'],
        contentHash,
        htmlPath,
        lastChecked: Date.now(),
      });

      return { html, fromCache: false, status: 200 };
    } catch (error) {
      // If request fails but we have cached data, use it
      if (cached?.htmlPath) {
        console.warn(`Failed to fetch ${url}, using cached version`);
        this.pageCacheStats.hitsCached++;
        const html = await this.loadHtmlFromCache(cached.htmlPath);
        if (html) {
          return { html, fromCache: true, status: 'error-fallback' };
        }
      }
      throw new Error(`Failed to fetch documentation from ${url}: ${error.message}`);
    }
  }

  async fetchDocumentation(url) {
    try {
      const { html } = await this.fetchPageWithCache(url);

      const $ = cheerio.load(html);

      // Extract title from HTML before we remove elements
      let title = '';
      
      // Try to get title from various sources
      const titleTag = $('title').first().text();
      const h1Tag = $('h1').first().text();
      const ogTitle = $('meta[property="og:title"]').attr('content');
      const twitterTitle = $('meta[name="twitter:title"]').attr('content');
      
      // Prefer h1, then og:title, then title tag, then twitter:title
      title = h1Tag || ogTitle || titleTag || twitterTitle || '';
      
      // Clean up title (remove site name suffixes, extra whitespace, special chars)
      title = title
        .replace(/\s*[\|\-\–]\s*.*(Documentation|Docs|SUSE|Rancher|K3s|RKE2|Longhorn|Harvester|NeuVector|Kubewarden).*$/i, '')
        .replace(/\[#\]\([^)]+\s+"Permalink"\)/g, '') // Remove [#](url "Permalink")
        .replace(/\s+/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#160;/g, ' ')
        .replace(/Â/g, '')
        .trim();
      
      // Limit title length
      if (title.length > 80) {
        title = title.substring(0, 77) + '...';
      }

      // Remove script, style, and nav elements
      $('script, style, nav, header, footer, .sidebar, .navigation').remove();

      // Extract main content (adjust selectors based on actual doc structure)
      let content = '';
      const mainSelectors = [
        'main',
        'article',
        '.content',
        '.documentation-content',
        '#content',
        '.main-content',
      ];

      for (const selector of mainSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.html() || '';
          break;
        }
      }

      // Fallback to body if no main content found
      if (!content) {
        content = $('body').html() || '';
      }

      // Convert HTML to Markdown
      const markdown = this.turndownService.turndown(content);

      // Return both markdown and extracted title
      return { markdown, title: title || 'Untitled' };
    } catch (error) {
      throw new Error(`Failed to fetch documentation from ${url}: ${error.message}`);
    }
  }

  async indexDocumentation(sourceId, forceRefresh = false) {
    const sources = sourceId === 'all' 
      ? Array.from(this.sources.values()) 
      : [this.sources.get(sourceId)].filter(Boolean);

    if (sources.length === 0) {
      return { success: false, documentsIndexed: 0, error: 'Invalid source ID' };
    }

    // Reset cache stats before indexing
    this.resetPageCacheStats();
    this.vectorService.aiService.resetCacheStats();

    let totalDocuments = 0;
    const errors = [];

    for (const source of sources) {
      try {
        source.status = 'indexing';
        const count = await this.indexSource(source, forceRefresh);
        totalDocuments += count;
        source.status = 'active';
        source.lastIndexed = new Date();
        source.documentCount = count;
      } catch (error) {
        source.status = 'error';
        errors.push(`${source.name}: ${error}`);
      }
    }

    // Save both caches after indexing
    await this.savePageCache();
    await this.vectorService.aiService.saveEmbeddingCache();

    // Get and display cache statistics
    const embeddingStats = this.vectorService.aiService.getCacheStats();
    const pageStats = this.getPageCacheStats();
    
    console.log(`\n📊 Cache Statistics:`);
    console.log(`\n   📄 Page Cache:`);
    console.log(`      Loaded: ${pageStats.loaded}`);
    console.log(`      Skipped (unchanged): ${pageStats.skipped}`);
    console.log(`      304 Not Modified: ${pageStats.hits304}`);
    console.log(`      Unchanged (hash match): ${pageStats.hitsCached}`);
    console.log(`      New/Modified: ${pageStats.misses}`);
    console.log(`      Total cached: ${this.pageCache.size}`);
    
    console.log(`\n   🧠 Embedding Cache:`);
    console.log(`      Loaded: ${embeddingStats.loaded}`);
    console.log(`      Hits: ${embeddingStats.hits}`);
    console.log(`      Misses: ${embeddingStats.misses}`);
    console.log(`      Hit rate: ${embeddingStats.hitRate}`);
    console.log(`      Total cached: ${embeddingStats.currentSize}\n`);

    return {
      success: errors.length === 0,
      documentsIndexed: totalDocuments,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      cacheStats: {
        page: pageStats,
        embedding: embeddingStats,
      },
    };
  }

  async shouldSkipDocument(url, forceRefresh) {
    if (forceRefresh) return false;

    await this.loadPageCache();
    const cached = this.pageCache.get(url);
    
    if (!cached) return false;

    // Check if document was indexed and content hash exists
    if (cached.indexed && cached.contentHash) {
      return true;
    }

    return false;
  }

  async indexSource(source, forceRefresh) {
    // This is a simplified implementation
    // In a real scenario, you'd crawl the sitemap or use a documented structure
    const urlData = await this.discoverDocumentUrls(source);
    
    // Pre-filter URLs based on lastmod and cache
    const documentUrls = await this.preFilterUrls(urlData, forceRefresh);
    
    console.log(`Indexing ${documentUrls.length} documents from ${source.name} (pre-filtered from ${urlData.length})...`);
    
    // Process documents in parallel batches for much faster indexing
    // Reduced default to 3 to avoid overwhelming Ollama
    const BATCH_SIZE = parseInt(process.env.FETCH_BATCH_SIZE) || 3;
    let indexed = 0;
    let skipped = 0;
    
    for (let i = 0; i < documentUrls.length; i += BATCH_SIZE) {
      const batch = documentUrls.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          // Check if we can skip this document
          const shouldSkip = await this.shouldSkipDocument(url, forceRefresh);
          
          if (shouldSkip) {
            const cached = this.pageCache.get(url);
            // Ensure source is set for skipped documents
            if (cached && !cached.source) {
              cached.source = source.id;
              this.pageCache.set(url, cached);
            }
            // Verify with a HEAD request or conditional GET
            try {
              const response = await axios.head(url, {
                headers: {
                  'If-None-Match': cached.etag,
                  'If-Modified-Since': cached.lastModified,
                },
                timeout: 5000,
                validateStatus: (status) => status < 400 || status === 304,
              });
              
              if (response.status === 304) {
                // Document definitely unchanged, skip it
                this.pageCacheStats.skipped++;
                return { url, skipped: true };
              }
            } catch (error) {
              // If HEAD fails, proceed with full fetch
            }
          }

          const { markdown, title } = await this.fetchDocumentation(url);
          await this.vectorService.addDocument({
            id: url,
            content: markdown,
            metadata: {
              source: source.id,
              url,
              title: title || this.extractTitle(markdown),
              indexedAt: new Date().toISOString(),
            },
          });

          // Mark as indexed in page cache and update last_checked timestamp
          const cached = this.pageCache.get(url);
          if (cached) {
            cached.indexed = true;
            cached.source = source.id;  // Store source for accurate counting
            cached.last_checked = Date.now();
            this.pageCache.set(url, cached);
          }
          
          return { url, skipped: false };
        })
      );
      
      // Count successful indexes and skips
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          if (result.value.skipped) {
            skipped++;
            console.log(`⊘ Skipped (unchanged) (${indexed + skipped}/${documentUrls.length}): ${batch[idx]}`);
          } else {
            indexed++;
            console.log(`✓ Indexed (${indexed + skipped}/${documentUrls.length}): ${batch[idx]}`);
          }
        } else {
          console.error(`✗ Failed to index ${batch[idx]}:`, result.reason?.message || result.reason);
        }
      });
      
      // Add delay between batches to prevent overwhelming Ollama
      if (i + BATCH_SIZE < documentUrls.length) {
        const batchDelay = parseInt(process.env.BATCH_DELAY) || 500;
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    console.log(`\n📈 Processed: ${indexed} indexed, ${skipped} skipped (unchanged)`);
    return indexed;
  }

  async discoverDocumentUrls(source) {
    // Parse sitemap and extract URLs with optional lastmod timestamps
    const urlData = [];

    try {
      // Try to fetch sitemap
      const sitemapUrl = `${source.baseUrl}/sitemap.xml`;
      const response = await axios.get(sitemapUrl, { timeout: 10000 });
      const $ = cheerio.load(response.data, { xmlMode: true });
      
      $('url').each((_, element) => {
        const $url = $(element);
        const loc = $url.find('loc').text();
        const lastmod = $url.find('lastmod').text(); // May be empty if not present
        
        // Filter out blog posts, archives, and search pages
        if (loc && 
            !loc.includes('/blog') && 
            !loc.includes('/archive') && 
            !loc.includes('/search') &&
            !loc.includes('/tags/') &&
            !loc.includes('/authors')) {
          urlData.push({
            url: loc,
            lastmod: lastmod ? new Date(lastmod).getTime() : null,
          });
        }
      });

      if (urlData.length === 0) {
        console.warn(`No valid URLs found in sitemap for ${source.name}, using fallback`);
        const fallbackUrls = this.getFallbackUrls(source);
        urlData.push(...fallbackUrls.map(url => ({ url, lastmod: null })));
      }
    } catch (error) {
      // Fallback: return common documentation pages
      console.error(`Could not fetch sitemap for ${source.name}, using fallback URLs`);
      const fallbackUrls = this.getFallbackUrls(source);
      urlData.push(...fallbackUrls.map(url => ({ url, lastmod: null })));
    }

    // Limit based on source to keep indexing reasonable
    const limit = source.id === 'suse' ? 50 : 30;
    return urlData.slice(0, limit);
  }

  async preFilterUrls(urlData, forceRefresh) {
    // Pre-filter URLs to skip those that definitely haven't changed
    // This prevents unnecessary HTTP requests
    
    if (forceRefresh) {
      // If forcing refresh, process all URLs
      return urlData.map(item => item.url);
    }

    const urlsToProcess = [];
    let preFiltered = 0;

    for (const item of urlData) {
      const { url, lastmod } = item;
      const cached = this.pageCache.get(url);

      if (!cached) {
        // Not in cache, must fetch
        urlsToProcess.push(url);
        continue;
      }

      // Check if we can skip based on lastmod timestamp
      if (lastmod && cached.last_checked) {
        if (lastmod <= cached.last_checked) {
          // Sitemap lastmod is older than our last check - definitely unchanged
          preFiltered++;
          continue;
        }
      }

      // Need to check this URL (either no lastmod, or it's newer than cache)
      urlsToProcess.push(url);
    }

    if (preFiltered > 0) {
      console.log(`⚡ Pre-filtered ${preFiltered} URLs based on lastmod timestamps`);
    }

    return urlsToProcess;
  }

  getFallbackUrls(source) {
    // Provide some common starting URLs for each source
    switch (source.id) {
      case 'suse':
        return [
          `${source.baseUrl}/sles/15-SP5/`,
          `${source.baseUrl}/sle-micro/5.5/`,
        ];
      case 'rancher':
        return [
          `${source.baseUrl}/getting-started/overview`,
          `${source.baseUrl}/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/launch-kubernetes-with-rancher`,
        ];
      case 'k3s':
        return [
          `${source.baseUrl}/`,
          `${source.baseUrl}/installation`,
          `${source.baseUrl}/architecture`,
        ];
      case 'rke2':
        return [
          `${source.baseUrl}/install/quickstart`,
          `${source.baseUrl}/install/configuration`,
          `${source.baseUrl}/architecture`,
          `${source.baseUrl}/advanced`,
        ];
      case 'longhorn':
        return [
          `${source.baseUrl}/latest/`,
          `${source.baseUrl}/latest/deploy/install/`,
          `${source.baseUrl}/latest/concepts/`,
          `${source.baseUrl}/latest/best-practices/`,
        ];
      case 'harvester':
        return [
          `${source.baseUrl}/v1.3/`,
          `${source.baseUrl}/v1.3/install/requirements`,
          `${source.baseUrl}/v1.3/vm/create-vm`,
        ];
      case 'neuvector':
        return [
          `${source.baseUrl}/basics/overview`,
          `${source.baseUrl}/deploying/kubernetes`,
          `${source.baseUrl}/navigation/multicluster`,
        ];
      case 'kubewarden':
        return [
          `${source.baseUrl}/quick-start`,
          `${source.baseUrl}/writing-policies/`,
          `${source.baseUrl}/operator-manual/`,
        ];
      default:
        return [];
    }
  }

  extractTitle(markdown) {
    const lines = markdown.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
    }
    return 'Untitled';
  }

  getPageCacheStats() {
    return {
      ...this.pageCacheStats,
      totalCached: this.pageCache.size,
    };
  }

  resetPageCacheStats() {
    this.pageCacheStats.hits304 = 0;
    this.pageCacheStats.hitsCached = 0;
    this.pageCacheStats.misses = 0;
  }
}
