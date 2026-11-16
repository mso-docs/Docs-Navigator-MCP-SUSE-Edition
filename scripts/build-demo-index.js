#!/usr/bin/env node
/**
 * Builds public/demo-data/index.json: a small snapshot of real documentation pages that the
 * static GitHub Pages demo searches in the browser. Run it whenever you want a fresher snapshot:
 *
 *   npm run build-demo
 *
 * Pages are picked from each site's sitemap, preferring setup and architecture topics.
 * Respect each site's terms; this fetches a few dozen pages per source, one at a time.
 */
import { fetchSitemapUrls, rankUrls } from '../src/utils/sitemap.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

// Keep the crawl cache out of the repo.
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'suse-demo-'));
process.env.PAGE_CACHE_PATH = path.join(tmp, 'page-cache.db');
process.env.HTML_CACHE_DIR = path.join(tmp, 'html');
const { DocumentationService } = await import('../src/services/documentation-service.js');

const PER_SOURCE = parseInt(process.env.DEMO_PAGES_PER_SOURCE || '32', 10);
const CHUNK_CHARS = 900;
const MAX_CHUNKS_PER_PAGE = 8;

function chunk(text) {
  const out = [];
  let cur = '';
  for (const para of text.split(/\n\n+/)) {
    if (cur && cur.length + para.length > CHUNK_CHARS) {
      out.push(cur.trim());
      cur = para;
    } else {
      cur += (cur ? '\n\n' : '') + para;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const service = new DocumentationService();
const sources = [...service.sources.values()];
const chunks = [];
const summary = [];

for (const source of sources) {
  let urls;
  try {
    urls = rankUrls(await fetchSitemapUrls(source.baseUrl), source.baseUrl)
      .slice(0, PER_SOURCE)
      .map((e) => e.url);
  } catch (e) {
    console.error(`${source.id}: sitemap failed (${e.message})`);
    urls = [];
  }
  let pages = 0;
  for (const url of urls) {
    try {
      const { markdown, title } = await service.fetchDocumentation(url);
      const pieces = chunk(markdown.replace(/[\u200b\u00a0]/g, ' ').replace(/-----BEGIN [A-Z ]*(PRIVATE KEY|CERTIFICATE)-----[\s\S]*?-----END [A-Z ]*(PRIVATE KEY|CERTIFICATE)-----/g, '[key or certificate omitted]').replace(/[A-Za-z0-9+/=]{120,}/g, '[base64 data omitted]').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/!\[[^\]]*\]\([^)]*\)/g, ''))
        .filter((p) => p.length > 80)
        .slice(0, MAX_CHUNKS_PER_PAGE);
      if (!pieces.length) continue;
      pieces.forEach((c, i) => chunks.push({ s: source.id, u: url, t: title, i, c }));
      pages += 1;
    } catch (e) {
      console.error(`  skip ${url}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  console.error(`${source.id}: ${pages} pages`);
  summary.push({ id: source.id, name: source.name, baseUrl: source.baseUrl, documentCount: pages });
}

const out = { generatedAt: new Date().toISOString(), sources: summary, chunks };
await fs.mkdir('public/demo-data', { recursive: true });
await fs.writeFile('public/demo-data/index.json', JSON.stringify(out));
const size = (await fs.stat('public/demo-data/index.json')).size;
console.error(`Wrote ${chunks.length} chunks, ${(size / 1e6).toFixed(2)} MB`);
service.pageCache?.close?.();
process.exit(0);
