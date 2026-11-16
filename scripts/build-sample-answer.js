#!/usr/bin/env node
/**
 * Writes public/demo-data/sample.json, the sample answer shown on the static demo.
 *
 *   npm run build-sample                       # quote the best passage (no model needed)
 *   AI_PROVIDER=huggingface HF_TOKEN=hf_... npm run build-sample   # have an open model write it
 *
 * The token needs the "Make calls to Inference Providers" permission. Nothing is stored except
 * the answer text, the model name, and the source links.
 */
import fs from 'fs/promises';
import { LexicalIndex } from '../src/services/lexical-service.js';

const QUESTION = process.env.SAMPLE_QUESTION || 'How do I quickly install K3s?';
const SOURCE = process.env.SAMPLE_SOURCE || 'k3s';

const data = JSON.parse(await fs.readFile('public/demo-data/index.json', 'utf8'));
const index = new LexicalIndex(':memory:');
const byDoc = new Map();
for (const c of data.chunks) {
  if (!byDoc.has(c.u)) byDoc.set(c.u, { meta: { title: c.t, source: c.s, url: c.u }, chunks: [] });
  byDoc.get(c.u).chunks.push(c.c);
}
for (const [url, { meta, chunks }] of byDoc) index.replaceDocument(url, meta, chunks);

const hits = index.search(QUESTION, SOURCE, 3);
if (!hits.length) throw new Error('No passages matched the sample question');
const sources = hits.map((h) => ({ url: h.metadata.url, title: h.metadata.title }));

let result;
if (process.env.AI_PROVIDER && process.env.AI_PROVIDER !== 'none' && process.env.AI_PROVIDER !== 'ollama' && process.env.HF_TOKEN) {
  try {
    const { AIService } = await import('../src/services/ai-service.js');
    const ai = new AIService();
    const answer = await ai.answerQuestion(QUESTION, hits, undefined);
    result = { mode: 'generated', model: ai.model, answer: answer.trim() };
  } catch (error) {
    console.error('Model call failed, quoting the passage instead:', String(error).slice(0, 200));
  }
}
if (!result) {
  // Quote the first two chunks of the best page, exactly as the docs word them.
  const best = hits[0].metadata.url;
  const pieces = data.chunks.filter((c) => c.u === best).sort((a, b) => a.i - b.i).slice(0, 2).map((c) => c.c.replace(/^On this page\s*/i, '').trim());
  let text = pieces.join('\n\n');
  if (text.length > 1100) text = text.slice(0, text.lastIndexOf('\n', 1100)).trim();
  result = { mode: 'extract', answer: text };
}

await fs.writeFile('public/demo-data/sample.json', JSON.stringify({ question: QUESTION, ...result, sources }, null, 2) + '\n');
console.error(`Wrote sample (${result.mode}) with ${sources.length} sources`);
