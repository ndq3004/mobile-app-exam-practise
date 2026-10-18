import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responseJson, payloadPageUrl } from './payload.js';
test('original Next JSON from HTML and canonical checkpoint from API payload',()=>{
  const raw = '{ "props":{"pageProps":{"exam":{"id":36},"currentPage":2}} }';
  assert.equal(responseJson(`<html><script type="application/json" id="__NEXT_DATA__">${raw}</script></html>`,true),raw);
  assert.equal(responseJson('<html>challenge</html>',true),undefined);
  assert.equal(responseJson(raw,false),raw);
  assert.equal(payloadPageUrl(JSON.parse(raw),'https://www.examprepper.co/exam/36/1'),'https://www.examprepper.co/exam/36/2');
});
