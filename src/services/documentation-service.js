import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { VectorService } from './vector-service.js';

export class DocumentationService {
  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    this.vectorService = new VectorService();
    this.sources = new Map();
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
    ];

    sources.forEach((source) => {
      this.sources.set(source.id, source);
    });
  }

  async listSources() {
    return Array.from(this.sources.values());
  }

  async fetchDocumentation(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 15000,
        maxRedirects: 3,
      });

      const $ = cheerio.load(response.data);

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

      return markdown;
    } catch (error) {
      throw new Error(`Failed to fetch documentation from ${url}: ${error}`);
    }
  }

  async indexDocumentation(sourceId, forceRefresh = false) {
    const sources = sourceId === 'all' 
      ? Array.from(this.sources.values()) 
      : [this.sources.get(sourceId)].filter(Boolean);

    if (sources.length === 0) {
      return { success: false, documentsIndexed: 0, error: 'Invalid source ID' };
    }

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

    return {
      success: errors.length === 0,
      documentsIndexed: totalDocuments,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  async indexSource(source, forceRefresh) {
    // This is a simplified implementation
    // In a real scenario, you'd crawl the sitemap or use a documented structure
    const documentUrls = await this.discoverDocumentUrls(source);
    
    console.log(`Indexing ${documentUrls.length} documents from ${source.name}...`);
    
    // Process documents in parallel batches for much faster indexing
    const BATCH_SIZE = 5; // Process 5 documents at a time
    let indexed = 0;
    
    for (let i = 0; i < documentUrls.length; i += BATCH_SIZE) {
      const batch = documentUrls.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const content = await this.fetchDocumentation(url);
          await this.vectorService.addDocument({
            id: url,
            content,
            metadata: {
              source: source.id,
              url,
              title: this.extractTitle(content),
              indexedAt: new Date().toISOString(),
            },
          });
          return url;
        })
      );
      
      // Count successful indexes
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          indexed++;
          console.log(`✓ Indexed (${indexed}/${documentUrls.length}): ${batch[idx]}`);
        } else {
          console.error(`✗ Failed to index ${batch[idx]}:`, result.reason?.message || result.reason);
        }
      });
    }

    return indexed;
  }

  async discoverDocumentUrls(source) {
    // Simplified URL discovery
    // In production, parse sitemap.xml or implement proper crawling
    const urls = [];

    try {
      // Try to fetch sitemap
      const sitemapUrl = `${source.baseUrl}/sitemap.xml`;
      const response = await axios.get(sitemapUrl, { timeout: 10000 });
      const $ = cheerio.load(response.data, { xmlMode: true });
      
      $('url > loc').each((_, element) => {
        const url = $(element).text();
        if (url && (url.includes('/docs/') || url.includes('/documentation/'))) {
          urls.push(url);
        }
      });
    } catch (error) {
      // Fallback: return common documentation pages
      console.error(`Could not fetch sitemap for ${source.name}, using fallback URLs`);
      urls.push(...this.getFallbackUrls(source));
    }

    // Limit based on source to keep indexing reasonable
    const limit = source.id === 'suse' ? 50 : 30;
    return urls.slice(0, limit);
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
}
