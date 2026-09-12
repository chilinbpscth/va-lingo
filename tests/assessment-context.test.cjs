const {test} = require('node:test');
const assert = require('node:assert/strict');
const Context = require('../assets/js/assessment-context.js');
function student(overrides = {}) {
  return {schoolYear:'2026-27', className:'4A', studentId:'01', grade:'p4', stage:'stage1',
    topicId:'p4-s1-2d', source:'self', ks:'ks2', level:1, selfWorks:{}, activeSelfWorks:{}, ...overrides};
}

test('same seat in different classes and school years has independent drafts', () => {
  const keys = [student(), student({className:'4B'}), student({schoolYear:'2027-28'}),
    student({studentId:'02'})].map(Context.draftStorageKey);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(Context.draftStorageKey(student({studentId:''})), null);
});
test('context distinguishes author, topic, work, revision, mode and assessment step', () => {
  const base = student();
  Context.addWork(base, 'data:image/png;base64,A', 'work-1', '2026-09-13');
  const variations = [base, {...base, className:'4B'}, {...base, studentId:'02'},
    {...base, topicId:'p4-s2-2d'}, {...base, source:'peer',selectedPeer:'work-1'},
    {...base, level:2}, {...base, artworkRevision:2},
    {...base, activeSelfWorks:{[base.topicId]:'work-2'}}];
  assert.equal(new Set(variations.map(s => Context.answerKey(s,'feel','scaffold'))).size, variations.length);
  assert.notEqual(Context.answerKey(base,'feel','scaffold'), Context.answerKey(base,'judge','scaffold'));
});
test('new upload preserves old image and assessment; selecting an old work restores its scope', () => {
  const s = student();
  Context.addWork(s,'first-image','a','2026-09-13');
  const oldScope = Context.answerKey(s,'feel','scaffold');
  const oldPinScope = Context.pinScope(s);
  Context.addWork(s,'second-image','b','2026-09-13');
  assert.notEqual(Context.answerKey(s,'feel','scaffold'),oldScope);
  assert.notEqual(Context.pinScope(s),oldPinScope);
  assert.equal(s.selfWorks[s.topicId].length,2);
  Context.selectWork(s,'a');
  assert.equal(Context.selectedWork(s).image,'first-image');
  assert.equal(Context.answerKey(s,'feel','scaffold'),oldScope);
  Context.selectWork(s,null);
  assert.equal(Context.selectedWork(s),null);
  assert.equal(s.selfWorks[s.topicId].length,2);
});
test('different curriculum topics cannot accidentally reuse or select an image', () => {
  const s = student();
  Context.addWork(s,'first-image','a','2026-09-13');
  s.topicId='p4-s2-2d';
  assert.equal(Context.selectedWork(s),null);
  assert.throws(() => Context.selectWork(s,'a'), /找不到/);
  s.topicId='p4-s1-2d';
  assert.equal(Context.selectedWork(s).id,'a');
});
test('master artist slots have separate answers; scaffold and open responses stay separate', () => {
  const s = student({source:'master',selectedArtistIndex:0});
  const key = Context.answerKey(s,'feel','scaffold');
  s.selectedArtistIndex=1;
  assert.notEqual(Context.answerKey(s,'feel','scaffold'),key);
  assert.notEqual(Context.answerKey(s,'feel','open'),Context.answerKey(s,'feel','scaffold'));
});
