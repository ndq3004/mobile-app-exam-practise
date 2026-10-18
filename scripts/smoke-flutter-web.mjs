import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../app/build/web/', import.meta.url));
const types = {'.html':'text/html', '.js':'application/javascript', '.json':'application/json',
  '.wasm':'application/wasm', '.png':'image/png', '.woff2':'font/woff2', '.ttf':'font/ttf'};
const server = createServer((req, res) => {
  const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end(); return;
  }
  res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({channel: 'chrome', headless: true});
  const page = await browser.newPage({viewport: {width: 1280, height: 844}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.text().includes('App initialization failed:')) errors.push(message.text());
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`, {waitUntil: 'networkidle'});
  await page.locator('flt-semantics-placeholder').evaluate(element => element.click());
  await page.getByText('Một câu hỏi, thêm một điều hiểu rõ', {exact: true}).waitFor({timeout: 60000});
  await page.getByText('Chưa đăng nhập', {exact: true}).waitFor();
  await page.getByRole('button', {name: /Đã lưu/}).click();
  await page.getByText('Những câu hỏi bạn lưu sẽ xuất hiện ở đây.', {exact: true}).waitFor();
  await page.reload({waitUntil: 'networkidle'});
  await page.locator('flt-semantics-placeholder').evaluate(element => element.click());
  await page.getByText('Những câu hỏi bạn lưu sẽ xuất hiện ở đây.', {exact: true}).waitFor({timeout: 60000});
  await page.setViewportSize({width: 390, height: 844});
  await page.getByRole('tab', {name: /Tài khoản/}).click();
  await page.getByText('Phiên bản phát triển', {exact: true}).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: real Firebase initialization + signed-out Auth state, desktop/mobile navigation, hash-route reload, no runtime errors.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
