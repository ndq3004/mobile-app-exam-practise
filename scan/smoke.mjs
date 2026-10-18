import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const server=spawn(process.execPath,['--import','tsx','src/scan-server.ts'],{env:{...process.env,SCAN_PORT:'4175'},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{ server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(`Server exited: ${code}`))); });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const errors=[]; page.on('pageerror', error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4175');
  const png = await page.evaluate(() => {
    const canvas=document.createElement('canvas'); canvas.width=800;canvas.height=1000;
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#ccc'; ctx.fillRect(0,0,800,1000);
    ctx.fillStyle='white'; ctx.fillRect(80,60,640,880);ctx.fillStyle='black';ctx.font='32px sans-serif';ctx.fillText('Test document 123',120,180);
    return Array.from(Uint8Array.from(atob(canvas.toDataURL().split(',')[1]),c=>c.charCodeAt(0)));
  });
  await page.locator('#file').setInputFiles({name:'document.png',mimeType:'image/png',buffer:Buffer.from(png)});
  await page.getByRole('button',{name:'Tạo bản scan'}).waitFor();
  await page.getByLabel('Góc 1 x',{exact:true}).fill('80'); await page.getByLabel('Góc 1 x',{exact:true}).press('Tab');
  await page.getByRole('button',{name:'Tạo bản scan'}).click();
  await page.waitForFunction(()=>!document.getElementById('download').disabled);
  assert.match(await page.locator('#status').textContent(),/đã sẵn sàng/);
  const downloadPromise=page.waitForEvent('download'); await page.locator('#download').click();
  const download=await downloadPromise; assert.equal(download.suggestedFilename(),'document-scan.png'); assert.equal(await download.failure(),null);
  await page.locator('#mode').selectOption('color'); assert.ok(await page.locator('#download').isDisabled());
  await page.locator('#process').click(); await page.waitForFunction(()=>!document.getElementById('download').disabled);
  assert.deepEqual(errors,[]);
  console.log('PASS: load image, edit corner, render black/white and color, download PNG; no browser errors.');
} finally { await browser.close(); server.kill(); }
