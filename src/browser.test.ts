import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from './store.js';

test('real browser captures two responses and clicks Next after saving', { timeout: 60000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(),'crawler-browser-'));
  const server = createServer((req,res) => {
    if (req.url?.startsWith('/api')) {
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify({ data:[{ question:`Question ${req.url}`, options:['A','B'] }] }));
    } else {
      res.setHeader('Content-Type','text/html');
      res.end('<button onclick="fetch(`/api?n=${++n}`)">Next</button><script>let n=1;fetch(`/api?n=${n}`)</script>');
    }
  });
  await new Promise<void>(r => server.listen(0,'127.0.0.1',r));
  try {
    const address = server.address() as { port:number };
    const child = spawn(process.execPath,['--import','tsx','src/cli.ts','--url',`http://127.0.0.1:${address.port}/`,'--pages','2','--timeout','30','--data',dir],{ stdio:['ignore','pipe','pipe'] });
    let output=''; child.stdout.on('data',chunk => output+=chunk); child.stderr.on('data',chunk => output+=chunk);
    const code = await new Promise<number|null>((resolve,reject) => { child.on('exit',resolve); child.on('error',reject); });
    assert.equal(code,0,output);
    const store = new Store(join(dir,'crawler.sqlite'));
    try {
      assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM responses').get()?.n,2);
      assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM questions').get()?.n,2);
    } finally { store.close(); }
  } finally { await new Promise<void>(r => server.close(() => r())); rmSync(dir,{recursive:true,force:true}); }
});
