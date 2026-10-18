import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { Store, questionObjects } from './store.js';
const {values} = parseArgs({options:{file:{type:'string'},url:{type:'string'},data:{type:'string',default:'data'}}});
if (!values.file || !values.url) throw new Error('Cần --file JSON_FILE --url PAGE_URL');
const raw = readFileSync(resolve(values.file),'utf8');
const questions = questionObjects(JSON.parse(raw));
if (!questions.length) throw new Error('Không tìm thấy câu hỏi trong JSON');
const store = new Store(resolve(values.data!,'crawler.sqlite'));
try { console.log(store.save(values.url,values.url+'#__NEXT_DATA__',values.url,raw,questions)); }
finally { store.close(); }
