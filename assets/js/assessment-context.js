/* Shared, dependency-free context keys. These identify drafts, never authenticate a student. */
(function (root) {
  'use strict';
  function identityKey(identity) {
    if (!identity || !identity.className || !identity.studentId) return null;
    return JSON.stringify([identity.schoolYear || '2026-27', identity.className, identity.studentId]);
  }
  function artworkContext(state) {
    const source = state.source;
    let asset;
    if (source === 'self') {
      asset = state.activeSelfWorks && state.activeSelfWorks[state.topicId] || 'no-artwork';
    } else if (source === 'peer') {
      asset = state.selectedPeer;
    } else {
      asset = String(state.selectedArtistIndex || 0);
    }
    return [identityKey(state), state.grade, state.stage, state.topicId, source,
      asset, state.artworkRevision || 1];
  }
  function pinScope(state) {
    return JSON.stringify(artworkContext(state));
  }
  function answerKey(state, stepId, extra) {
    return JSON.stringify([...artworkContext(state), state.ks,
      state.ks === 'ks1' ? 1 : state.level, stepId, extra || '']);
  }
  function draftStorageKey(state) {
    const key = identityKey(state);
    return key ? 'va-lingo-drafts-v2:' + key : null;
  }
  function selectedWork(state) {
    const id = state.activeSelfWorks && state.activeSelfWorks[state.topicId];
    return ((state.selfWorks || {})[state.topicId] || []).find(work => work.id === id) || null;
  }
  function addWork(state, image, id, createdAt) {
    if (!id || !image || !state.topicId) throw new Error('作品資料不完整');
    state.selfWorks = state.selfWorks || {};
    state.activeSelfWorks = state.activeSelfWorks || {};
    const works = state.selfWorks[state.topicId] = state.selfWorks[state.topicId] || [];
    if (works.some(work => work.id === id)) throw new Error('作品編號重複');
    works.push({id, image, createdAt});
    state.activeSelfWorks[state.topicId] = id;
    return id;
  }
  function selectWork(state, id) {
    if (id !== null && !((state.selfWorks || {})[state.topicId] || []).some(work => work.id === id)) {
      throw new Error('找不到此課題的作品');
    }
    state.activeSelfWorks = state.activeSelfWorks || {};
    state.activeSelfWorks[state.topicId] = id;
  }
  const api = Object.freeze({identityKey, artworkContext, pinScope, answerKey,
    draftStorageKey, selectedWork, addWork, selectWork});
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VAAssessmentContext = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
