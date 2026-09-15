/* Build a snapshot from the current work only. Shared by the UI and the future Google adapter. */
(function(root) {
  'use strict';
  const Context = typeof module === 'object' && module.exports
    ? require('./assessment-context.js') : root.VAAssessmentContext;
  function occurrences(text, word) {
    return word ? text.split(word).length - 1 : 0;
  }
  function build(state, stepDefinitions, scaffolds, vocabulary) {
    const steps = {}, vocabUses = [];
    let completedStepCount = 0;
    const scaffoldMode = state.ks === 'ks1' || state.level === 1;
    for (const step of stepDefinitions) {
      const get = extra => Context.answerKey(state, step.id, extra);
      const entry = {id:step.id, title:step.title};
      if (scaffoldMode) {
        const template = scaffolds[step.id][state.ks];
        const count = (template.match(/class="scaffold-blank"/g) || []).length;
        const saved = state.answers[get('scaffold')] || [];
        entry.scaffold = Array.from({length:count}, (_,i) => String(saved[i] || '').trim());
        entry.text = entry.scaffold.filter(Boolean).join('／');
        entry.complete = count > 0 && entry.scaffold.every(Boolean);
      } else {
        entry.open = String(state.answers[get('open')] || '').trim();
        entry.text = entry.open;
        entry.rubric = {...(state.rubrics[get('rubric')] || {})};
        entry.complete = !!entry.open;
      }
      if (state.ks === 'ks1' && step.id === 'feel') {
        entry.mood = state.moods[get('mood')] || '';
        entry.complete = entry.complete && !!entry.mood;
      }
      if (entry.complete) completedStepCount++;
      for (const word of new Set(vocabulary)) {
        const occurrenceCount = occurrences(entry.text,word);
        if (occurrenceCount) vocabUses.push({stepId:step.id,vocabText:word,occurrenceCount,usageKind:'text-match'});
      }
      steps[step.id] = entry;
    }
    return {
      topicId:state.topicId, grade:state.grade, stageId:state.stage,
      assessmentType:state.source === 'self' ? 'self' : state.source === 'peer' ? 'peer' : 'practice',
      context:Context.artworkContext(state), steps, completedStepCount, vocabUses,
      pins:(state.pins || []).filter(pin => pin.scope === Context.pinScope(state)).map(pin => ({...pin}))
    };
  }
  const api = Object.freeze({build});
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VAAssessmentSnapshot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
