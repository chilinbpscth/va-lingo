const {test}=require('node:test');
const assert=require('node:assert/strict');
const Context=require('../assets/js/assessment-context.js');
const Recovery=require('../assets/js/assessment-recovery.js');
test('cloud recovery restores answer scope and preserves local edits on repeated recovery',()=>{
 const state={schoolYear:'2026-27',className:'4A',studentId:'01',grade:'p4',stage:'stage1',topicId:'topic',ks:'ks2',level:2,source:'self',selfWorks:{},activeSelfWorks:{},answers:{},moods:{},rubrics:{},pins:[]};
 const item={artworkId:'a',revision:1,roundId:'r',topicId:'topic',stageId:'stage1',grade:'p4',imageData:'data:image/png;base64,AAAA',assessment:{steps:{feel:{open:'cloud answer'}},pins:[{x:20,y:30,note:'look'}]}};
 assert.equal(Recovery.merge(state,item),true);
 const key=Context.answerKey(state,'feel','open');
 assert.equal(state.answers[key],'cloud answer');
 assert.equal(state.pins[0].scope,Context.pinScope(state));
 state.answers[key]='local revision';
 assert.equal(Recovery.merge(state,item),false);
 assert.equal(state.answers[key],'local revision');
 assert.equal(state.selfWorks.topic.length,1);
 assert.equal(state.pins.length,1);
});
