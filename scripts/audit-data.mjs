import fs from 'node:fs';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

// Local, read-only source inspection; no network or database writes.
const load = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const data = load('data/examprepper-exam-36.json');
const questions = data.questions;
const files = fs.readdirSync('data').filter(name => /^examprepper-page-\d+\.json$/.test(name))
  .sort((a, b) => Number(a.match(/(\d+)\.json$/)[1]) - Number(b.match(/(\d+)\.json$/)[1]));
const pages = files.map(name => load(`data/${name}`).props.pageProps);
assert.equal(pages.length, data.pages);
pages.forEach((page, i) => { assert.equal(page.currentPage, i + 1); assert.deepEqual(page.exam, data.exam); });
assert.ok(same(pages.flatMap(page => page.questions), questions), 'Page data differs from aggregate');
assert.equal(questions.length, data.exam.numberOfQuestions);
assert.equal(new Set(questions.map(q => q.id)).size, questions.length);
assert.deepEqual(questions.map(q => q.question_id), Array.from({length: questions.length}, (_, i) => i + 1));
assert.ok(same(load('data/raw-json-row-1.json'), load('data/examprepper-page-1.json')));
const db = new DatabaseSync('data/crawler.sqlite', {readOnly: true});
let database;
try {
  const rows = db.prepare('SELECT json FROM questions').all().map(row => JSON.parse(row.json));
  assert.ok(same(rows.sort((a,b) => a.question_id-b.question_id), questions));
  const responses = db.prepare('SELECT raw_json FROM responses').all();
  const storedPages = responses.map(row => JSON.parse(row.raw_json).props.pageProps).sort((a,b) => a.currentPage-b.currentPage);
  assert.ok(same(storedPages, pages));
  database = {questions: rows.length, responses: responses.length, checkpoints: db.prepare('SELECT count(*) AS n FROM checkpoints').get().n};
} finally { db.close(); }
const ids = predicate => questions.filter(predicate).map(q => q.question_id);
const fieldStats = Object.fromEntries([...new Set(questions.flatMap(Object.keys))].sort().map(key => [key, {
  types: [...new Set(questions.map(q => Array.isArray(q[key]) ? 'array' : typeof q[key]))].sort(),
  missing: questions.filter(q => q[key] == null).length,
  empty: questions.filter(q => q[key] === '' || (Array.isArray(q[key]) && !q[key].length)).length
}]));
const comments = [];
function visitComments(items) { for (const item of items ?? []) { comments.push(item); visitComments(item.comments); } }
questions.forEach(q => visitComments(q.discussion));
const groups = new Map();
for (const q of questions) {
  const text = q.question_text.replace(/\s+/g, ' ').trim();
  groups.set(text, [...(groups.get(text) ?? []), q.question_id]);
}
const strings = [];
function visit(value, path) {
  if (typeof value === 'string') strings.push({path, value});
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, child]) => visit(child, `${path}.${key}`));
}
questions.forEach(q => visit(q, `question[${q.question_id}]`));
const report = {
  exam: data.exam, source: data.source, capturedAt: data.capturedAt,
  verified: {pages: pages.length, questions: questions.length, pageAggregateMatch: true, rawRowMatchesPage1: true, sqliteMatchesPagesAndAggregate: true, database},
  fieldStats,
  duplicateTextGroups: [...groups.values()].filter(group => group.length > 1),
  missingChoices: ids(q => !q.choices || !Object.keys(q.choices).length),
  missingQuestionText: ids(q => !q.question_text.trim()),
  missingAnswers: ids(q => !q.answer.trim()),
  invalidAnswerLabels: ids(q => q.choices && [...q.answer].some(label => !Object.hasOwn(q.choices, label))),
  answerDisagreements: ids(q => q.answer !== q.answer_ET),
  multipleAnswerQuestions: ids(q => q.answer.length > 1),
  explanations: questions.filter(q => q.answer_description.trim()).map(q => ({question: q.question_id, text: q.answer_description})),
  questionImages: questions.filter(q => q.question_images.length).map(q => ({question: q.question_id, urls: q.question_images})),
  answerImages: ids(q => q.answer_images.length),
  communityMissing: ids(q => !q.answers_community.length),
  communityUnparseable: questions.flatMap(q => q.answers_community.filter(text => !/^[A-Z]+ \(\d+(?:\.\d+)?%\)$/.test(text)).map(text => ({question: q.question_id, text}))),
  comments: {totalIncludingReplies: comments.length, questions: ids(q => q.discussion.length).length, fields: [...new Set(comments.flatMap(Object.keys))].sort()},
  contentMarkers: {
    html: strings.filter(s => /<\/?(?:table|pre|code|img|p|br|math)\b/i.test(s.value)).map(s => s.path),
    math: strings.filter(s => /\\(?:frac|begin|sqrt)\b|\$\$|\\\(/.test(s.value)).map(s => s.path),
    fencedCode: strings.filter(s => /```/.test(s.value)).map(s => s.path),
    encodingSuspects: strings.filter(s => /ג€|�|â€|Ã/.test(s.value)).map(s => s.path)
  },
  samples: Object.fromEntries([1, 94, 103, 141, 145, 158].map(n => {
    const q = questions.find(q => q.question_id === n);
    const {discussion, ...sample} = q;
    return [n, {...sample, discussionCount: discussion.length}];
  }))
};
fs.mkdirSync('docs', {recursive: true});
fs.writeFileSync('docs/data-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({...report, fieldStats: undefined, samples: undefined}, null, 2));
