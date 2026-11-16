import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = { 'User-Agent': 'docs-navigator-mcp (+https://github.com/mso-docs/Docs-Navigator-MCP-SUSE-Edition)' };
const SKIP = /\/(blog|archive|search|tags|authors|release-notes|changelog)(\/|$)|\.(pdf|zip|png|jpe?g|svg)$/i;
const PREFER = /install|quick|getting-started|requirements|architecture|upgrade|backup|network|security|storage|cluster|overview|introduction|concepts|high-avail/i;
const VERSION = /\/(v?\d+\.\d+(?:\.\d+)?)(?=\/)/;
const LOCALE = /\/(es|fr|de|ja|zh|pt|ko)\//i;

async function readSitemap(url, depth = 0) {
  const { data } = await axios.get(url, { timeout: 30000, headers: UA });
  const $ = cheerio.load(data, { xmlMode: true });
  const nested = $('sitemap > loc')
    .map((_, e) => $(e).text().trim())
    .get();
  if (nested.length && depth < 1) {
    const all = [];
    for (const n of nested.slice(0, 6)) {
      try {
        all.push(...(await readSitemap(n, depth + 1)));
      } catch {
        // one broken child sitemap should not hide the others
      }
    }
    return all;
  }
  return $('url')
    .map((_, e) => ({
      url: $(e).find('loc').text().trim(),
      lastmod: $(e).find('lastmod').text().trim() || null,
    }))
    .get();
}

/** Read a site's sitemap, trying the docs path first and the site root second. */
export async function fetchSitemapUrls(baseUrl) {
  const root = new URL(baseUrl).origin;
  const candidates = [`${baseUrl.replace(/\/$/, '')}/sitemap.xml`, `${root}/sitemap.xml`];
  let lastError;
  for (const candidate of [...new Set(candidates)]) {
    try {
      const urls = await readSitemap(candidate);
      if (urls.length) return urls;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Sitemap was empty');
}

/** Keep pages under baseUrl, drop blogs and old versions, and put setup and architecture topics first. */
export function rankUrls(entries, baseUrl) {
  const pages = entries.filter((e) => e.url.startsWith(baseUrl) && !SKIP.test(e.url) && !LOCALE.test(e.url));
  const versions = pages.map((e) => VERSION.exec(e.url)?.[1]).filter(Boolean);
  const numeric = (v) => v.replace(/^v/, '').split('.').map(Number);
  const latest = versions.sort((a, b) => {
    const [x, y] = [numeric(a), numeric(b)];
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (y[i] || 0) - (x[i] || 0);
    return 0;
  })[0];
  const current = latest ? pages.filter((e) => !VERSION.test(e.url) || VERSION.exec(e.url)[1] === latest) : pages;
  const score = (u) => (PREFER.test(u) ? 0 : 10) + u.split('/').length;
  return [...new Map(current.map((e) => [e.url, e])).values()].sort(
    (a, b) => score(a.url) - score(b.url) || a.url.localeCompare(b.url)
  );
}
