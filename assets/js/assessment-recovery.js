(function(root) {
  'use strict';
  const Context = typeof module === 'object' && module.exports ? require('./assessment-context.js') : root.VAAssessmentContext;
  function merge(state, item) {
    if (!item || !item.artworkId || !item.topicId || !item.imageData) throw new Error('作品資料不完整');
    const works = state.selfWorks[item.topicId] || [];
    if (works.some(w => w.serverArtworkId === item.artworkId && w.serverRoundId === item.roundId && Number(w.serverArtworkRevision) === Number(item.revision))) return false;
    const id = 'google:' + item.artworkId + ':' + item.revision;
    const ks = ['p1','p2','p3'].includes(item.grade) ? 'ks1' : 'ks2';
    const steps = item.assessment && item.assessment.steps || {};
    const level = Object.values(steps).some(s => Array.isArray(s.scaffold)) ? 1 : 2;
    const context = {...state, grade:item.grade,stage:item.stageId,topicId:item.topicId,source:'self',ks,level,artworkRevision:item.revision,
      activeSelfWorks:{...state.activeSelfWorks,[item.topicId]:id}};
    state.selfWorks[item.topicId] = [...works,{id,image:item.imageData,createdAt:item.createdAt,serverArtworkId:item.artworkId,serverArtworkRevision:item.revision,serverRoundId:item.roundId,recoveredLevel:level}];
    for (const [stepId,step] of Object.entries(steps)) {
      for (const kind of ['scaffold','open']) if (step[kind] !== undefined) state.answers[Context.answerKey(context,stepId,kind)] = step[kind];
      if (step.mood) state.moods[Context.answerKey(context,stepId,'mood')] = step.mood;
      if (step.rubric) state.rubrics[Context.answerKey(context,stepId,'rubric')] = step.rubric;
    }
    for (const pin of item.assessment && item.assessment.pins || []) state.pins.push({...pin,scope:Context.pinScope(context)});
    if (!state.activeSelfWorks[item.topicId]) state.activeSelfWorks[item.topicId] = id;
    return true;
  }
  if (typeof module === 'object' && module.exports) module.exports = {merge};
  else root.VAAssessmentRecovery = {merge};
})(typeof globalThis !== 'undefined' ? globalThis : this);
