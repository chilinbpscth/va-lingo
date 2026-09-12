const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const Context = require('../assets/js/assessment-context.js');
const Snapshot = require('../assets/js/assessment-snapshot.js');
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
// Use the real teaching templates so coverage tracks changes to required blanks.
const start=html.indexOf('    const STEPS =');
const end=html.indexOf('    const RUBRICS =',start);
const {STEPS,SCAFFOLDS}=vm.runInNewContext(html.slice(start,end)+'; ({STEPS,SCAFFOLDS})');
function state(ks='ks2',level=1) { return {ks,level,className:'4A',studentId:'01',grade:'p4',stage:'stage1',topicId:'test',
  source:'self',activeSelfWorks:{test:'work-1'},answers:{},moods:{},rubrics:{},pins:[]}; }
function build(s) {return Snapshot.build(s,STEPS,SCAFFOLDS,['線條','色彩']);}
function fillScaffold(s) {for(const step of STEPS) {
  const n=(SCAFFOLDS[step.id][s.ks].match(/class="scaffold-blank"/g)||[]).length;
  s.answers[Context.answerKey(s,step.id,'scaffold')]=Array(n).fill('線條');
}}
test('visiting all five steps is not completion; partial blanks stay incomplete',()=>{
 const s=state(); assert.equal(build(s).completedStepCount,0);
 s.answers[Context.answerKey(s,'describe','scaffold')]=['線條'];
 assert.equal(build(s).completedStepCount,0);
 fillScaffold(s);assert.equal(build(s).completedStepCount,5);
 s.answers[Context.answerKey(s,'form','scaffold')][0]='  ';
 assert.equal(build(s).completedStepCount,4);
});
test('KS1 feeling includes mood; KS2 open writing uses its own responses',()=>{
 const s=state('ks1');fillScaffold(s);assert.equal(build(s).completedStepCount,4);
 s.moods[Context.answerKey(s,'feel','mood')]='😊';assert.equal(build(s).completedStepCount,5);
 const open=state('ks2',2);fillScaffold(open);assert.equal(build(open).completedStepCount,0);
 for(const step of STEPS)open.answers[Context.answerKey(open,step.id,'open')]='色彩';
 assert.equal(build(open).completedStepCount,5);
});
test('snapshot excludes other students, topics and works; pins use the current context',()=>{
 const s=state(); fillScaffold(s);
 s.pins=[{id:'own',scope:Context.pinScope(s)},{id:'other',scope:'other'}];
 assert.deepEqual(build(s).pins.map(p=>p.id),['own']);
 s.activeSelfWorks.test='work-2';
 assert.equal(build(s).completedStepCount,0);assert.deepEqual(build(s).pins,[]);
});
test('vocabulary counts final text; removed words and replay do not accumulate',()=>{
 const s=state('ks2',2), key=Context.answerKey(s,'feel','open');
 s.answers[key]='線條與色彩，線條有節奏';
 const first=build(s);assert.equal(first.vocabUses.find(v=>v.vocabText==='線條').occurrenceCount,2);
 assert.deepEqual(build(s),first);
 s.answers[key]='色彩';assert.deepEqual(build(s).vocabUses.map(v=>v.vocabText),['色彩']);
 assert.equal(build(s).vocabUses[0].usageKind,'text-match');
});
