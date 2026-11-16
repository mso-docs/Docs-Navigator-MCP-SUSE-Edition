import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const STOPWORDS = new Set(
  'a an and are as at be by for from has have how i in is it its of on or that the this to was what when where which who why with you your do does can'.split(
    ' '
  )
);

/**
 * Keyword search over document chunks, backed by SQLite FTS5 (BM25 ranking).
 * It needs no embedding model and no network, so search works even when Ollama is not running.
 */
export class LexicalIndex {
  constructor(dbPath = process.env.LEXICAL_DB_PATH || './data/lexical.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  open() {
    if (this.db) return this.db;
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING fts5(
        content,
        title,
        source UNINDEXED,
        url UNINDEXED,
        doc_id UNINDEXED,
        chunk UNINDEXED,
        tokenize = 'porter unicode61'
      );
    `);
    return this.db;
  }

  /** Replace every chunk of one document. */
  replaceDocument(docId, metadata, chunks) {
    const db = this.open();
    const remove = db.prepare('DELETE FROM chunks WHERE doc_id = ?');
    const insert = db.prepare(
      'INSERT INTO chunks (content, title, source, url, doc_id, chunk) VALUES (?, ?, ?, ?, ?, ?)'
    );
    db.transaction(() => {
      remove.run(docId);
      chunks.forEach((text, i) =>
        insert.run(text, metadata.title || '', metadata.source || '', metadata.url || '', docId, i)
      );
    })();
  }

  deleteDocument(docId) {
    this.open().prepare('DELETE FROM chunks WHERE doc_id = ?').run(docId);
  }

  clear() {
    this.open().exec('DELETE FROM chunks');
  }

  count() {
    return this.open().prepare('SELECT COUNT(*) AS n FROM chunks').get().n;
  }

  countBySource() {
    return this.open()
      .prepare('SELECT source, COUNT(DISTINCT doc_id) AS docs FROM chunks GROUP BY source')
      .all();
  }

  static toMatchQuery(text) {
    const tokens = (text.toLowerCase().match(/[a-z0-9][a-z0-9_.-]*[a-z0-9]|[a-z0-9]/g) || []).filter(
      (t) => !STOPWORDS.has(t)
    );
    const unique = [...new Set(tokens)];
    return unique.map((t) => `"${t.replace(/"/g, '')}"`).join(' OR ');
  }

  /** Best chunk per document, in the same shape the vector search returns. */
  search(query, source = 'all', limit = 5) {
    const match = LexicalIndex.toMatchQuery(query);
    if (!match) return [];
    const db = this.open();
    const params = [match];
    let sourceClause = '';
    if (source && source !== 'all') {
      sourceClause = 'AND source = ?';
      params.push(source);
    }
    params.push(limit * 6);
    const rows = db
      .prepare(
        `SELECT content, title, source, url, doc_id, bm25(chunks, 1.0, 4.0) AS rank
         FROM chunks WHERE chunks MATCH ? ${sourceClause}
         ORDER BY rank LIMIT ?`
      )
      .all(...params);
    const seen = new Map();
    for (const row of rows) {
      if (seen.has(row.doc_id)) continue;
      seen.set(row.doc_id, {
        content: row.content,
        metadata: { source: row.source, url: row.url, title: row.title, score: -row.rank },
      });
      if (seen.size >= limit) break;
    }
    return [...seen.values()];
  }

  close() {
    if (this.db) this.db.close();
    this.db = null;
  }
}
