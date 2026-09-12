const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Sheet {
  constructor() { this.values = []; }
  getLastRow() { return this.values.length; }
  getDataRange() { return {getValues: () => this.values.map(row => row.slice())}; }
  appendRow(row) { this.values.push(row.slice()); }
}

function createApi() {
  const sheets = new Map();
  const folders = new Map();
  const lock = {waitLock() {}, releaseLock() {}};
  let uuid = 0;
  const ss = {getSheetByName: name => sheets.get(name) || null, insertSheet(name) { const sh = new Sheet(); sheets.set(name, sh); return sh; }};
  const context = {
    Date, JSON, Math, Number, String, Array, Object, RegExp, Error,
    ContentService: {MimeType: {JSON: 'application/json'}, createTextOutput(text) { return {setMimeType() { return this; }, getContent() { return text; }}; }},
    SpreadsheetApp: {openById(id) { if (id !== 'sheet') throw new Error('bad sheet'); return ss; }},
    DriveApp: {getFolderById(id) { if (id !== 'root') throw new Error('bad root'); return folders.get('root'); }, getFileById(id) { return {getBlob() { return {getBytes() { return []; }}; }}; }},
    LockService: {getScriptLock() { return lock; }},
    Utilities: {
      DigestAlgorithm: {SHA_256: 'sha256'},
      computeDigest(_algorithm, text) { return [...crypto.createHash('sha256').update(text).digest()]; },
      getUuid() { uuid += 1; return `uuid-${uuid}`; },
      base64Decode(text) { return [...Buffer.from(text, 'base64')]; },
      base64Encode(bytes) { return Buffer.from(bytes).toString('base64'); },
      newBlob(bytes, mime, name) { return {bytes, mime, name}; }
    }
  };
  function folder(name) {
    const children = new Map(); const files = new Map();
    return {
      getFoldersByName(child) { const item = children.get(child); return {hasNext: () => !!item, next: () => item}; },
      createFolder(child) { const item = folder(child); children.set(child, item); return item; },
      createFile(blob) { const id = `file-${files.size + 1}`; files.set(id, blob); return {getId: () => id}; }
    };
  }
  folders.set('root', folder('root'));
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'), context);
  context.SHEET_ID = 'sheet'; context.ROOT_FOLDER_ID = 'root';
  const invoke = body => JSON.parse(context.doPost({postData: {contents: JSON.stringify(body)}}).getContent());
  const sheet = (name, headers) => { let sh = sheets.get(name); if (!sh) { sh = new Sheet(); sh.appendRow(headers); sheets.set(name, sh); } return sh; };
  return {invoke, sheet, context};
}

const headers = {
  roster: ['schoolYear','classId','studentId','grade','displayLabel','active','updatedAt'],
  rounds: ['roundId','schoolYear','classId','grade','stageId','topicId','phase','peerTargetCount','openedAt','peerOpenedAt','closedAt'],
  members: ['roundId','studentId','required','exemptionReason','updatedAt']
};
const image = 'data:image/jpeg;base64,' + Buffer.from([1, 2, 3, 4]).toString('base64');
const fullKs2 = Object.fromEntries(['feel','describe','form','meaning','judge'].map(id => [id, {open: `${id} detail`} ]));

test('Apps Script enforces token, school year, topic and assessment phase', () => {
  const api = createApi();
  api.sheet('roster_v1', headers.roster).appendRow(['2026-27','4A','01','p4','4A・01號',true,'']);
  api.sheet('roster_v1', headers.roster).appendRow(['2026-27','4A','02','p4','4A・02號',true,'']);
  api.sheet('rounds_v1', headers.rounds).appendRow(['4A2026','2026-27','4A','p4','stage1','p4-s1-2d','collecting',1,'','','']);
  api.sheet('rounds_v1', headers.rounds).appendRow(['4AOLD','2025-26','4A','p4','stage1','p4-s1-2d','collecting',1,'','','']);
  api.sheet('round_members_v1', headers.members).appendRow(['4A2026','01',true,'','']);
  api.sheet('round_members_v1', headers.members).appendRow(['4A2026','02',true,'','']);
  const login = id => api.invoke({action: 'login', payload: {classId: '4A', studentId: id}});
  const one = login('01'); const two = login('02');
  assert.equal(login('99').error.code, 'FORBIDDEN');
  assert.equal(one.ok, true); assert.equal(one.data.grade, 'p4');
  const call = (token, action, payload, requestId = `${action}-${Math.random()}`) => api.invoke({action, token, requestId, payload});
  assert.equal(call('', 'getRoundStatus', {roundId: '4A2026'}).error.code, 'FORBIDDEN');
  assert.equal(call(one.data.token, 'getRoundStatus', {roundId: '4AOLD'}).error.code, 'FORBIDDEN');
  const oversized = 'data:image/jpeg;base64,' + Buffer.alloc(250 * 1024 + 1, 1).toString('base64');
  assert.equal(call(one.data.token, 'uploadArtwork', {roundId: '4A2026', topicId: 'p4-s1-2d', sourceApp: 'va-lingo', imageMime: 'image/jpeg', imageBase64: oversized}).error.code, 'INVALID_INPUT');
  assert.equal(call(one.data.token, 'uploadArtwork', {roundId: '4A2026', topicId: 'other', sourceApp: 'va-lingo', imageMime: 'image/jpeg', imageBase64: image}).error.code, 'FORBIDDEN');
  const work1 = call(one.data.token, 'uploadArtwork', {roundId: '4A2026', topicId: 'p4-s1-2d', sourceApp: 'va-lingo', imageMime: 'image/jpeg', imageBase64: image}, 'upload-1');
  assert.equal(work1.ok, true);
  assert.equal(call(one.data.token, 'saveAssessment', {roundId: '4A2026', artworkId: work1.data.artworkId, artworkRevision: 1, type: 'self', ks: 'ks2', steps: {feel: {open: 'only one'}}}).error.code, 'INVALID_INPUT');
  assert.equal(call(one.data.token, 'saveAssessment', {roundId: '4A2026', artworkId: work1.data.artworkId, artworkRevision: 1, type: 'self', ks: 'ks2', steps: fullKs2}, 'self-1').ok, true);
  const work2 = call(two.data.token, 'uploadArtwork', {roundId: '4A2026', topicId: 'p4-s1-2d', sourceApp: 'va-lingo', imageMime: 'image/jpeg', imageBase64: image}, 'upload-2');
  assert.equal(call(two.data.token, 'saveAssessment', {roundId: '4A2026', artworkId: work2.data.artworkId, artworkRevision: 1, type: 'self', ks: 'ks2', steps: fullKs2}, 'self-2').ok, true);
  assert.equal(call(one.data.token, 'listPeerWorks', {roundId: '4A2026'}).error.code, 'ROUND_NOT_OPEN');
  api.sheet('rounds_v1', headers.rounds).values[1][6] = 'peer_open';
  assert.equal(call(one.data.token, 'listPeerWorks', {roundId: '4A2026'}).data.items.length, 1);
  assert.equal(call(one.data.token, 'saveAssessment', {roundId: '4A2026', artworkId: work1.data.artworkId, artworkRevision: 1, type: 'peer', ks: 'ks2', steps: fullKs2}).error.code, 'FORBIDDEN');
  assert.equal(call(one.data.token, 'saveAssessment', {roundId: '4A2026', artworkId: work2.data.artworkId, artworkRevision: 1, type: 'peer', ks: 'ks2', steps: {feel: {open: 'only one'}}}).error.code, 'INVALID_INPUT');
  assert.equal(call(one.data.token, 'saveAssessment', {roundId: '4A2026', artworkId: work2.data.artworkId, artworkRevision: 1, type: 'peer', ks: 'ks2', steps: fullKs2}, 'peer-1').ok, true);
  api.sheet('sessions_v1').values[1][7] = '2000-01-01T00:00:00.000Z';
  assert.equal(call(one.data.token, 'getRoundStatus', {roundId: '4A2026'}).error.code, 'TOKEN_EXPIRED');
});
