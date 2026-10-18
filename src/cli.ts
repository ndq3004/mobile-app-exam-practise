import { chromium, type Cookie } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { questionObjects, Store } from './store.js';
import { responseJson, payloadPageUrl } from './payload.js';

const { values: args } = parseArgs({ options: {
  url: { type: 'string' }, cookies: { type: 'string' }, match: { type: 'string' },
  pages: { type: 'string', default: '1' }, timeout: { type: 'string', default: '600' },
  next: { type: 'string' }, resume: { type: 'boolean', default: false },
  channel: { type: 'string' }, data: { type: 'string', default: 'data' },
} });
if (!args.url) throw new Error('Cần --url URL_TRANG_DE');
const target = new URL(args.url);
const sourceHost = target.hostname.replace(/^www\./, '');
if (!['http:', 'https:'].includes(target.protocol)) throw new Error('URL phải là HTTP(S)');
const maxPages = Number(args.pages), timeout = Number(args.timeout) * 1000;
if (!Number.isInteger(maxPages) || maxPages < 1 || !Number.isFinite(timeout) || timeout <= 0) throw new Error('pages và timeout phải lớn hơn 0');
const matcher = args.match ? new RegExp(args.match) : undefined;
const dir = resolve(args.data); mkdirSync(dir, { recursive: true });
const store = new Store(resolve(dir, 'crawler.sqlite'));
const scope = target.href;
const checkpoint = args.resume ? store.checkpoint(scope) : undefined;
const context = await chromium.launchPersistentContext(resolve(dir, 'profile'), { headless: false, channel: args.channel });
let saved = 0, generation = 0, handledGeneration = -1, failure: unknown;
let queue = Promise.resolve();
try {
  if (args.cookies) {
    const input = JSON.parse(readFileSync(resolve(args.cookies), 'utf8'));
    const list = Array.isArray(input) ? input : input.cookies;
    if (!Array.isArray(list)) throw new Error('Cookie phải là mảng JSON hoặc storageState có cookies');
    const cookies: Cookie[] = list.map((c: any) => ({ name: c.name, value: c.value, domain: c.domain, path: c.path || '/',
      expires: c.expires ?? c.expirationDate ?? -1, httpOnly: Boolean(c.httpOnly), secure: Boolean(c.secure),
      sameSite: /strict/i.test(c.sameSite ?? '') ? 'Strict' : /none|no_restriction/i.test(c.sameSite ?? '') ? 'None' : 'Lax' }));
    await context.addCookies(cookies);
  }
  const page = context.pages()[0] ?? await context.newPage();
  page.on('response', response => {
    const captureGeneration = generation;
    const isDocument = response.request().resourceType() === 'document';
    const pageUrl = isDocument ? response.url() : page.url();
    const host = new URL(response.url()).hostname;
    if (host !== sourceHost && !host.endsWith('.' + sourceHost)) return;
    if (!['document','xhr','fetch'].includes(response.request().resourceType())) return;
    if (!response.ok()) return;
    queue = queue.then(async () => {
      if (handledGeneration === captureGeneration) return;
      const body = await response.text().catch(() => '');
      const raw = responseJson(body,isDocument);
      if (!raw) return;
      let payload: unknown; try { payload = JSON.parse(raw); } catch { return; }
      const questions = questionObjects(payload);
      console.log(`[JSON] ${new URL(response.url()).pathname} | ${raw.length} ký tự | ${questions.length} câu`);
      if (matcher ? !matcher.test(response.url()) : questions.length === 0) return;
      const result = store.save(scope,response.url(),payloadPageUrl(payload,pageUrl),raw,questions);
      writeFileSync(resolve(dir, 'last-response.json'), raw, { mode: 0o600 });
      handledGeneration = captureGeneration; saved++;
      console.log(`[SAVED] response=${result.responseId}, câu mới=${result.added}, trùng=${!result.fresh}`);
    }).catch(error => { failure = error; });
  });
  console.log('Trình duyệt đã mở. Đăng nhập Google thủ công và mở đề nếu cần. Không đóng cửa sổ khi đang bắt dữ liệu.');
  await page.goto(checkpoint?.page_url as string ?? target.href, { waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + timeout;
  let advanced = 0;
  while (saved < maxPages && Date.now() < deadline) {
    if (failure) throw failure;
    if (page.isClosed()) throw new Error('Trình duyệt đã đóng trước khi hoàn tất');
    await queue;
    if (saved > advanced && saved < maxPages) {
      const next = args.next ? page.locator(args.next) : page.getByRole('button', { name: /^next(?: question)?$/i });
      if (await next.count() !== 1 || !await next.isEnabled()) throw new Error('Không tìm thấy một nút Next khả dụng; cung cấp --next CSS_SELECTOR');
      generation++; advanced = saved;
      await next.click();
    }
    await new Promise(r => setTimeout(r,250));
  }
  await queue;
  if (failure) throw failure;
  if (saved < maxPages) throw new Error(`Hết thời gian: lưu ${saved}/${maxPages} trang. Kiểm tra đăng nhập hoặc dùng --match sau khi xác minh endpoint.`);
  console.log(`Hoàn tất: ${saved} trang. SQLite: ${resolve(dir,'crawler.sqlite')}`);
} finally { await queue; await context.close(); store.close(); }
