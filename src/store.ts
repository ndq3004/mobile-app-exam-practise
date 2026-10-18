import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function questionObjects(value: unknown): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  function visit(v: unknown) {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(visit); return; }
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.some(k => /^(question|questionText|question_text|stem|prompt)$/i.test(k)) &&
        keys.some(k => /^(answers|options|choices|answer|correctAnswer|correct_answer)$/i.test(k))) {
      found.push(obj); return;
    }
    Object.values(obj).forEach(visit);
  }
  visit(value); return found;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => JSON.stringify(k)+':'+canonical(v)).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS responses(id INTEGER PRIMARY KEY, scope TEXT NOT NULL, hash TEXT NOT NULL, url TEXT NOT NULL, page_url TEXT NOT NULL, captured_at TEXT NOT NULL, raw_json TEXT NOT NULL, UNIQUE(scope,hash));
      CREATE TABLE IF NOT EXISTS questions(scope TEXT NOT NULL, hash TEXT NOT NULL, response_id INTEGER NOT NULL, json TEXT NOT NULL, PRIMARY KEY(scope,hash));
      CREATE TABLE IF NOT EXISTS checkpoints(scope TEXT PRIMARY KEY, page_url TEXT NOT NULL, saved_pages INTEGER NOT NULL, updated_at TEXT NOT NULL);`);
  }
  save(scope: string, url: string, pageUrl: string, raw: string, questions: Record<string, unknown>[]) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.db.prepare('INSERT OR IGNORE INTO responses(scope,hash,url,page_url,captured_at,raw_json) VALUES(?,?,?,?,?,?)').run(scope,hash(raw),url,pageUrl,new Date().toISOString(),raw);
      const row = this.db.prepare('SELECT id FROM responses WHERE scope=? AND hash=?').get(scope,hash(raw))!;
      let added = 0;
      for (const q of questions) added += Number(this.db.prepare('INSERT OR IGNORE INTO questions VALUES(?,?,?,?)').run(scope,hash(canonical(q)),row.id as number,JSON.stringify(q)).changes);
      if (result.changes) this.db.prepare(`INSERT INTO checkpoints VALUES(?,?,1,?) ON CONFLICT(scope) DO UPDATE SET page_url=excluded.page_url,saved_pages=saved_pages+1,updated_at=excluded.updated_at`).run(scope,pageUrl,new Date().toISOString());
      this.db.exec('COMMIT'); return { responseId: row.id, added, fresh: Boolean(result.changes) };
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  checkpoint(scope: string) { return this.db.prepare('SELECT * FROM checkpoints WHERE scope=?').get(scope); }
  close() { this.db.close(); }
}
