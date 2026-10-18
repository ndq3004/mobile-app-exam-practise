import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, questionObjects } from './store.js';

test('raw JSON, deduplication, atomic checkpoint and reopen', () => {
  const dir = mkdtempSync(join(tmpdir(),'crawler-test-'));
  const path = join(dir,'test.sqlite');
  let store = new Store(path);
  try {
    const raw = '{ "data": [{"question":"Q?","options":["A","B"]}] }';
    const questions = questionObjects(JSON.parse(raw));
    assert.equal(questions.length,1);
    assert.equal(store.save('exam','https://test/api','https://test/1',raw,questions).added,1);
    assert.equal(store.save('exam','https://test/api','https://test/1',raw,questions).fresh,false);
    assert.equal(store.db.prepare('SELECT raw_json FROM responses').get()?.raw_json,raw);
    assert.equal(store.checkpoint('exam')?.saved_pages,1);
    const reordered = [{ options:['A','B'], question:'Q?' }];
    assert.equal(store.save('exam','https://test/api','https://test/2',JSON.stringify(reordered),reordered).added,0);
    store.close(); store = new Store(path);
    assert.equal(store.checkpoint('exam')?.page_url,'https://test/2');
    assert.equal(store.checkpoint('exam')?.saved_pages,2);
  } finally { store.close(); rmSync(dir,{recursive:true,force:true}); }
});
