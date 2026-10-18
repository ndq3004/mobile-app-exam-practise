import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/scan.js', ['scan.js', 'text/javascript; charset=utf-8']],
  ['/scan-core.js', ['scan-core.js', 'text/javascript; charset=utf-8']],
]);
const port = Number(process.env.SCAN_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SCAN_PORT phải từ 1 đến 65535.');
const server = createServer(async (req, res) => {
  const file = files.get((req.url ?? '/').split('?')[0]);
  if (req.method !== 'GET' || !file) { res.writeHead(404).end('Not found'); return; }
  try {
    const data = await readFile(new URL(`../scan/${file[0]}`, import.meta.url));
    res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(500).end('Không đọc được giao diện scan.'); }
});
server.on('error', (error) => { console.error(`Không mở được tool scan: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Tool scan: http://127.0.0.1:${port} — Ctrl+C để dừng.`));
