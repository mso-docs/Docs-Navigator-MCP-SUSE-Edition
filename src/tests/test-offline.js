// Offline tests: no network, no Ollama, no API keys. Run with `npm test`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'suse-nav-test-'));
const env = {
  ...process.env,
  SEARCH_MODE: 'lexical',
  AI_PROVIDER: 'none',
  LEXICAL_DB_PATH: path.join(tmp, 'lexical.db'),
  VECTOR_DB_PATH: path.join(tmp, 'vectors'),
  PAGE_CACHE_PATH: path.join(tmp, 'page-cache.db'),
  HTML_CACHE_DIR: path.join(tmp, 'html'),
  EMBEDDING_CACHE_PATH: path.join(tmp, 'emb.json'),
};
Object.assign(process.env, env);

let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${name}\n     ${error.stack || error}`);
  }
}

const { LexicalIndex } = await import('../services/lexical-service.js');
const { VectorService } = await import('../services/vector-service.js');
const { rankUrls } = await import('../utils/sitemap.js');

await test('lexical index ranks by relevance and filters by source', () => {
  const ix = new LexicalIndex(':memory:');
  ix.replaceDocument('a', { title: 'Install K3s', source: 'k3s', url: 'https://x/a' }, ['Run the install script to set up K3s on a node.']);
  ix.replaceDocument('b', { title: 'Backups', source: 'longhorn', url: 'https://x/b' }, ['Longhorn backups go to an S3 target.']);
  assert.equal(ix.search('how do I install k3s', 'all', 3)[0].metadata.url, 'https://x/a');
  assert.deepEqual(ix.search('backup target', 'k3s', 3), []);
  assert.equal(ix.search('backups', 'longhorn', 3).length, 1);
  assert.deepEqual(ix.search('the of and', 'all', 3), []);
});

await test('search survives quotes and operators in the query', () => {
  const ix = new LexicalIndex(':memory:');
  ix.replaceDocument('a', { title: 't', source: 's', url: 'u' }, ['hello world']);
  assert.doesNotThrow(() => ix.search('"hello" OR NEAR( AND * -world', 'all', 3));
});

await test('vector service in lexical mode indexes and searches with no embedding model', async () => {
  const vs = new VectorService();
  await vs.addDocument({ id: 'doc1', content: 'RKE2 needs ports 9345 and 6443 open between nodes.\n\nSecond paragraph.', metadata: { source: 'rke2', url: 'https://x/rke2', title: 'Requirements' } });
  const hits = await vs.search('which ports does rke2 need', 'all', 3);
  assert.equal(hits[0].metadata.title, 'Requirements');
});

await test('rankUrls drops blogs and old versions and prefers install pages', () => {
  const base = 'https://docs.example.com';
  const ranked = rankUrls(
    [
      { url: `${base}/blog/news` },
      { url: `${base}/v1.2/install/requirements` },
      { url: `${base}/v1.10/install/requirements` },
      { url: `${base}/v1.10/misc/notes` },
    ],
    base
  ).map((e) => e.url);
  assert.deepEqual(ranked, [`${base}/v1.10/install/requirements`, `${base}/v1.10/misc/notes`]);
});

await test('huggingface provider calls the OpenAI-compatible router with the token', async () => {
  const http = await import('node:http');
  let seen;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      seen = { auth: req.headers.authorization, url: req.url, model: JSON.parse(body).model };
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ id: 'x', object: 'chat.completion', created: 0, model: seen.model, choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'Open the ports [Source 1].' } }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.AI_PROVIDER = 'huggingface';
  process.env.HF_TOKEN = 'hf_test_token';
  process.env.HF_BASE_URL = `http://127.0.0.1:${server.address().port}/v1`;
  const { AIService } = await import('../services/ai-service.js');
  const ai = new AIService();
  try {
    assert.equal(await ai.checkAvailability(), true);
    const answer = await ai.answerQuestion('ports?', [{ content: 'ports 9345', metadata: { title: 'Req', url: 'https://x' } }]);
    assert.match(answer, /Source 1/);
    assert.equal(seen.auth, 'Bearer hf_test_token');
    assert.equal(seen.model, 'meta-llama/Llama-3.3-70B-Instruct');
  } finally {
    server.close();
    process.env.AI_PROVIDER = 'none';
    delete process.env.HF_TOKEN;
    delete process.env.HF_BASE_URL;
  }
});

await test('MCP server lists all six tools and answers over stdio', async () => {
  const client = new Client({ name: 'test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(root, 'src', 'index.js')], env, stderr: 'pipe' });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ['ask_question', 'get_doc_section', 'index_documentation', 'list_doc_sources', 'search_docs', 'summarize_doc']);
    assert.ok(tools.find((t) => t.name === 'search_docs').inputSchema.properties.source.enum.includes('longhorn'));
    const sources = await client.callTool({ name: 'list_doc_sources', arguments: {} });
    assert.equal(JSON.parse(sources.content[0].text).length, 8);
    const found = await client.callTool({ name: 'search_docs', arguments: { query: 'ports rke2' } });
    assert.ok(found.content[0].text.includes('Requirements'));
    const asked = await client.callTool({ name: 'ask_question', arguments: { question: 'which ports does rke2 need' } });
    assert.ok(asked.content[0].text.includes('best matching passages'), 'falls back to passages without a model');
  } finally {
    await client.close();
  }
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} test(s) failed` : '\nAll tests passed');
process.exit(failed ? 1 : 0);
