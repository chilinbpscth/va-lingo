const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const front = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const backend = fs.readFileSync(path.join(root, 'apps-script/Code.gs'), 'utf8');

test('Google MVP actions are present at both sides of the contract', () => {
  for (const action of ['login','getRoundStatus','uploadArtwork','saveAssessment','listPeerWorks']) {
    assert.match(front, new RegExp("googleApi\\('" + action + "'"));
    assert.match(backend, new RegExp("action === '" + action + "'"));
  }
});

test('the client has no Firebase code or automatic peer listener', () => {
  assert.doesNotMatch(front, /firebase|\bfbAuth\b|\bfbDb\b/i);
  assert.match(front, /更新清單/);
  assert.match(front, /listPeerWorks/);
  assert.match(front, /submitPeerAssessment/);
  assert.match(front, /pendingUploadRequestId/);
  assert.match(front, /cloudSubmissionBusy/);
  assert.match(front, /handleSessionError/);
  assert.match(front, /TOKEN_EXPIRED/);
});

test('Apps Script validates a token and never returns roster names to the client', () => {
  assert.match(backend, /tokenHash_\(token\)/);
  assert.match(backend, /TOKEN_TTL_MS/);
  assert.match(backend, /LockService\.getScriptLock\(\)/);
  assert.match(backend, /withWriteLock_\(function\(\)/);
  assert.match(backend, /requireSession_\(body\)/);
  assert.match(backend, /completedSteps_\(steps, ks\)/);
  assert.match(backend, /topicId !== value_\(round\.row,'topicId'\)/);
  assert.match(backend, /value_\(round,'schoolYear'\) !== session\.schoolYear/);
  assert.match(backend, /bytes\.length > 250 \* 1024/);
  assert.match(front, /GOOGLE_ARTWORK_MAX_CHARS = 341000/);
  assert.doesNotMatch(backend, /steps\[id\]\.complete === true/);
  assert.doesNotMatch(backend, /studentName.*displayLabel|displayLabel.*studentName/);
  assert.doesNotMatch(front, /roster\.json/);
});
