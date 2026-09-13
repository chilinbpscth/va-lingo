const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Sheet {
  constructor() { this.values = []; this.textColumns = new Set(); }
  getLastRow() { return this.values.length; }
  getDataRange() { return {getValues: () => this.values.map(row => row.slice())}; }
  getRangeList(columns) {
    return {setNumberFormat: format => {
      assert.equal(format, '@');
      for (const range of columns) {
        const letters = range.split(':')[0];
        let index=0; for (const c of letters) index=index*26+c.charCodeAt(0)-64;
        this.textColumns.add(index-1);
      }
    }};
  }
  appendRow(row) {
    this.values.push(row.map((value,index) =>
      typeof value === 'string' && value.startsWith("'") ? value.slice(1) :
      typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value));
  }
}

function createApi() {
  const sheets = new Map();
  const folders = new Map();
  const storedFiles = new Map();
  const lock = {waitLock() {}, releaseLock() {}};
  let uuid = 0;
  const ss = {getSheetByName: name => sheets.get(name) || null, insertSheet(name) { const sh = new Sheet(); sheets.set(name, sh); return sh; }};
  const context = {
    Date, JSON, Math, Number, String, Array, Object, RegExp, Error,
    ContentService: {MimeType: {JSON: 'application/json'}, createTextOutput(text) { return {setMimeType() { return this; }, getContent() { return text; }}; }},
    SpreadsheetApp: {openById(id) { if (id !== 'sheet') throw new Error('bad sheet'); return ss; }},
    DriveApp: {getFolderById(id) { if (id !== 'root') throw new Error('bad root'); return folders.get('root'); }, getFileById(id) { return {getBlob() { return {getBytes() { return storedFiles.get(id).bytes; }}; }}; }},
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
      createFile(blob) { const id = `file-${storedFiles.size + 1}`; files.set(id, blob); storedFiles.set(id, blob); return {getId: () => id}; }
    };
  }
  folders.set('root', folder('root'));
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'), context);
  context.SHEET_ID = 'sheet'; context.ROOT_FOLDER_ID = 'root';
  const invoke = body => process.env.VA_TEST_GOOGLE_RPC === '1'
    ? JSON.parse(JSON.stringify(context.callApi(body)))
    : JSON.parse(context.doPost({postData: {contents: JSON.stringify(body)}}).getContent());
  // Fixtures arrive via the Sheets RAW importer; backend appendRow uses its own coercing parser.
  const sheet = (name, headers) => new Proxy(context.apiSheet_(name, headers), {
    get(target, key) { if (key === 'appendRow') return row => target.values.push(row.slice()); return target[key]; }
  });
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
  api.sheet('roster_v1', headers.roster).appendRow(['2026-27','4A','03','p4','4A・03號',true,'']);
  api.sheet('rounds_v1', headers.rounds).appendRow(['4A2026','2026-27','4A','p4','stage1','p4-s1-2d','collecting',1,'','','']);
  api.sheet('rounds_v1', headers.rounds).appendRow(['4AOLD','2025-26','4A','p4','stage1','p4-s1-2d','collecting',1,'','','']);
  api.sheet('round_members_v1', headers.members).appendRow(['4A2026','01',true,'','']);
  api.sheet('round_members_v1', headers.members).appendRow(['4A2026','02',true,'','']);
  const login = id => api.invoke({action: 'login', payload: {classId: '4A', studentId: id}});
  const one = login('01'); const two = login('02');
  const three = login('03');
  assert.equal(login('99').error.code, 'FORBIDDEN');
  assert.equal(one.ok, true); assert.equal(one.data.grade, 'p4');
  const call = (token, action, payload, requestId = `${action}-${Math.random()}`) => api.invoke({action, token, requestId, payload});
  assert.equal(call('', 'getRoundStatus', {roundId: '4A2026'}).error.code, 'FORBIDDEN');
  assert.equal(call(one.data.token, 'getRoundStatus', {roundId: '4AOLD'}).error.code, 'FORBIDDEN');
  assert.equal(call(three.data.token, 'getRoundStatus', {roundId: '4A2026'}).error.code, 'FORBIDDEN');
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
  assert.deepEqual(call(one.data.token, 'listPeerWorks', {roundId:'4A2026'}).data.items[0].myAssessment.steps,fullKs2);
  assert.equal(call(two.data.token, 'listPeerWorks', {roundId:'4A2026'}).data.items[0].myAssessment,null);
  api.sheet('sessions_v1').values[1][7] = '2000-01-01T00:00:00.000Z';
  assert.equal(call(one.data.token, 'getRoundStatus', {roundId: '4A2026'}).error.code, 'TOKEN_EXPIRED');
});


test('retry IDs are isolated by class and round, and missing IDs cannot deduplicate', () => {
  const api = createApi();
  const outcomes = [];
  for (const [classId, roundId] of [['4A','round-a'], ['4B','round-b'], ['4A','round-c']]) {
    if (roundId !== 'round-c') api.sheet('roster_v1', headers.roster).appendRow(['2026-27',classId,'01','p4','Seat 01',true,'']);
    api.sheet('rounds_v1', headers.rounds).appendRow([roundId,'2026-27',classId,'p4','stage1','topic','collecting',1,'','','']);
    api.sheet('round_members_v1', headers.members).appendRow([roundId,'01',true,'','']);
    const token = api.invoke({action:'login',payload:{classId,studentId:'01'}}).data.token;
    const upload = {action:'uploadArtwork',token,requestId:'same-upload',payload:{roundId,topicId:'topic',sourceApp:'va-lingo',imageMime:'image/jpeg',imageBase64:image}};
    assert.equal(api.invoke({...upload,requestId:''}).error.code,'INVALID_INPUT');
    const work = api.invoke(upload).data;
    assert.equal(api.invoke(upload).data.artworkId,work.artworkId);
    const assessment = {action:'saveAssessment',token,requestId:'same-self',payload:{roundId,artworkId:work.artworkId,artworkRevision:1,type:'self',ks:'ks2',steps:fullKs2}};
    assert.equal(api.invoke({...assessment,requestId:''}).error.code,'INVALID_INPUT');
    const saved = api.invoke(assessment).data;
    assert.equal(api.invoke(assessment).data.assessmentId,saved.assessmentId);
    outcomes.push({work:work.artworkId,assessment:saved.assessmentId});
  }
  assert.equal(new Set(outcomes.map(o=>o.work)).size,3);
  assert.equal(new Set(outcomes.map(o=>o.assessment)).size,3);
  assert.equal(api.sheet('artworks_v1').getLastRow(),4);
  assert.equal(api.sheet('assessments_v1').getLastRow(),4);
});

test('direct peer submissions enforce self readiness, uniqueness and quota', () => {
  const api = createApi();
  api.sheet('rounds_v1',headers.rounds).appendRow(['r','2026-27','4A','p4','stage1','topic','collecting',1,'','','']);
  const students = ['01','02','03'].map(studentId => {
    api.sheet('roster_v1',headers.roster).appendRow(['2026-27','4A',studentId,'p4','Seat',true,'']);
    api.sheet('round_members_v1',headers.members).appendRow(['r',studentId,true,'','']);
    const token = api.invoke({action:'login',payload:{classId:'4A',studentId}}).data.token;
    const work = api.invoke({action:'uploadArtwork',token,requestId:'upload-'+studentId,payload:{roundId:'r',topicId:'topic',sourceApp:'va-lingo',imageMime:'image/jpeg',imageBase64:image}}).data;
    return {token,work};
  });
  const save = (author,target,type,requestId) => api.invoke({action:'saveAssessment',token:students[author].token,requestId,payload:{roundId:'r',artworkId:students[target].work.artworkId,artworkRevision:1,type,ks:'ks2',steps:fullKs2}});
  api.sheet('rounds_v1').values[1][6]='peer_open';
  assert.equal(save(0,1,'peer','early').error.code,'FORBIDDEN');
  assert.equal(save(0,0,'self','self0').ok,true);
  assert.equal(save(0,1,'peer','target-unready').error.code,'FORBIDDEN');
  assert.equal(save(1,1,'self','self1').ok,true);
  assert.equal(save(2,2,'self','self2').ok,true);
  const first=save(0,1,'peer','peer1');
  assert.equal(first.ok,true);
  assert.equal(save(0,1,'peer','peer1').data.assessmentId,first.data.assessmentId);
  assert.equal(save(0,1,'peer','duplicate').error.code,'ALREADY_SUBMITTED');
  assert.equal(save(0,2,'peer','over-quota').error.code,'PEER_QUOTA_REACHED');
  assert.equal(api.sheet('assessments_v1').getLastRow(),5);
});

test('fresh sessions recover only their own submitted progress', () => {
  const api=createApi();
  for (const id of ['01','02']) {
    api.sheet('roster_v1',headers.roster).appendRow(['2026-27','4A',id,'p4','Seat',true,'']);
    api.sheet('round_members_v1',headers.members).appendRow(['r',id,true,'','']);
  }
  api.sheet('rounds_v1',headers.rounds).appendRow(['r','2026-27','4A','p4','stage1','topic','collecting',2,'','','']);
  const login=id=>api.invoke({action:'login',payload:{classId:'4A',studentId:id}}).data.token;
  const token=login('01');
  const work=api.invoke({action:'uploadArtwork',token,requestId:'u',payload:{roundId:'r',topicId:'topic',sourceApp:'va-lingo',imageMime:'image/jpeg',imageBase64:image}}).data;
  api.invoke({action:'saveAssessment',token,requestId:'s',payload:{roundId:'r',artworkId:work.artworkId,type:'self',ks:'ks2',steps:fullKs2}});
  const status=id=>api.invoke({action:'getRoundStatus',token:login(id),payload:{roundId:'r'}}).data;
  assert.equal(status('01').myProgress.selfSubmitted,true);
  assert.equal(status('02').myProgress.selfSubmitted,false);
  assert.equal(status('02').readyCount,1);
  assert.equal(status('01').myProgress.peerRemainingCount,2);
});

test('new device recovery returns own images and assessments with bounded pages', () => {
  const api=createApi();
  api.sheet('rounds_v1',headers.rounds).appendRow(['r','2026-27','4A','p4','stage1','topic','collecting',1,'','','']);
  const login=id=>api.invoke({action:'login',payload:{classId:'4A',studentId:id}}).data.token;
  for(const id of ['01','02']) {
    api.sheet('roster_v1',headers.roster).appendRow(['2026-27','4A',id,'p4','PRIVATE-NAME',true,'']);
    api.sheet('round_members_v1',headers.members).appendRow(['r',id,true,'','']);
    const token=login(id);
    for(let n=0;n<2;n++) {
      const work=api.invoke({action:'uploadArtwork',token,requestId:'u'+n,payload:{roundId:'r',topicId:'topic',sourceApp:'va-lingo',imageMime:'image/jpeg',imageBase64:image}}).data;
      api.invoke({action:'saveAssessment',token,requestId:'s'+n,payload:{roundId:'r',artworkId:work.artworkId,type:'self',ks:'ks2',steps:fullKs2}});
    }
  }
  const read=(id,offset=0)=>api.invoke({action:'listOwnWorks',token:login(id),payload:{roundId:'r',offset}});
  const first=read('01').data, second=read('01',first.nextOffset).data;
  assert.equal(first.items.length,1);
  assert.equal(first.totalCount,2);
  assert.equal(first.items[0].imageData,image);
  assert.equal(second.nextOffset,null);
  assert.notEqual(first.items[0].artworkId,read('02').data.items[0].artworkId);
  assert.deepEqual(first.items[0].assessment.steps,fullKs2);
  assert.equal(JSON.stringify(first).includes('PRIVATE-NAME'),false);
  assert.equal(read('01',-1).error.code,'INVALID_INPUT');
  assert.equal(api.invoke({action:'listOwnWorks',payload:{roundId:'r'}}).ok,false);
});


test('KS2 scaffold mode accepts complete blanks without requiring a KS1 mood',()=>{
 const api=createApi();
 const steps=Object.fromEntries(['feel','describe','form','meaning','judge'].map(id=>[id,{scaffold:['line','shape']}]));
 assert.equal(api.context.completedSteps_(steps,'ks2',1),5);
 assert.equal(api.context.completedSteps_(steps,'ks2',2),0);
 assert.equal(api.context.completedSteps_(steps,'ks1',1),4);
 steps.form.scaffold[1]='';
 assert.equal(api.context.completedSteps_(steps,'ks2',1),4);
});

test('login ignores archived school years and never echoes a private display label',()=>{
 const api=createApi();
 const roster=api.sheet('roster_v1',headers.roster);
 roster.appendRow(['2025-26','4A','01','p3','PRIVATE OLD NAME',true,'']);
 roster.appendRow(['2026-27','4A','01','p4','PRIVATE NEW NAME',true,'']);
 const result=api.invoke({action:'login',payload:{classId:'4A',studentId:'01'}});
 assert.equal(result.data.schoolYear,'2026-27');
 assert.equal(result.data.grade,'p4');
 assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
 api.context.ACTIVE_SCHOOL_YEAR='2027-28';
 assert.equal(api.invoke({action:'login',payload:{classId:'4A',studentId:'01'}}).error.code,'FORBIDDEN');
});

test('peer pages reach beyond twelve works and closed rounds allow reading but reject writing',()=>{
 const api=createApi();
 api.sheet('roster_v1',headers.roster).appendRow(['2026-27','4A','01','p4','Seat',true,'']);
 api.sheet('rounds_v1',headers.rounds).appendRow(['r','2026-27','4A','p4','stage1','topic','closed',1,'','','']);
 api.sheet('round_members_v1',headers.members).appendRow(['r','01',true,'','']);
 const token=api.invoke({action:'login',payload:{classId:'4A',studentId:'01'}}).data.token;
 // Seed rows with the same column schema used by the real service.
 api.context.DriveApp.getFileById=()=>({getBlob:()=>({getBytes:()=>[1,2,3]})});
 const works=api.sheet('artworks_v1',api.context.artworkHeaders_());
 const reviews=api.sheet('assessments_v1',api.context.assessmentHeaders_());
 for(let n=1;n<=15;n++) {
   const id=String(n).padStart(2,'0');
   works.appendRow(['a'+n,1,'r','4A',id,'p4','topic','va-lingo','image','f'+n,'image/jpeg',3,'','uploaded','','','u'+n]);
   reviews.appendRow(['s'+n,1,'a'+n,1,'r','4A',id,'self',JSON.stringify(fullKs2),'[]','[]',5,'submitted','','','s'+n]);
 }
 let offset=0;const ids=[];
 do {const response=api.invoke({action:'listPeerWorks',token,payload:{roundId:'r',offset}}).data;
   assert.equal(response.readOnly,true);assert(response.items.length<=6);
   ids.push(...response.items.map(i=>i.artworkId));offset=response.nextOffset;
 } while(offset!==null);
 assert.equal(new Set(ids).size,14);
 for(const type of ['self','peer']) assert.equal(api.invoke({action:'saveAssessment',token,requestId:'closed-'+type,payload:{roundId:'r',artworkId:type==='self'?'a1':'a2',type,ks:'ks2',steps:fullKs2}}).error.code,'ROUND_NOT_OPEN');
});


test('hosted page reads only its configured private artifact; ping stays JSON', () => {
  const api = createApi();
  api.context.APP_HTML_FILE_ID = 'private-app-v2';
  api.context.DriveApp.getFileById = id => {
    assert.equal(id, 'private-app-v2');
    return {getBlob: () => ({getDataAsString: () => '<html>hosted-app</html>'})};
  };
  api.context.HtmlService = {createHtmlOutput: html => ({html, setTitle(){return this;}, addMetaTag(){return this;}})};
  assert.equal(api.context.doGet({parameter:{}}).html, '<html>hosted-app</html>');
  assert.equal(JSON.parse(api.context.doGet({parameter:{ping:'1'}}).getContent()).ok, true);
});

test('public setup wrapper rejects students and missing Google identities', () => {
  const api = createApi();
  let active = 'student@example.test';
  api.context.Session = {getActiveUser: () => ({getEmail: () => active}), getEffectiveUser: () => ({getEmail: () => 'owner@example.test'})};
  assert.throws(() => api.context.setupMvpTest(), /只限部署擁有者/);
  active = '';
  assert.throws(() => api.context.setupMvpTest(), /只限部署擁有者/);
  active = 'owner@example.test';
  assert.match(api.context.setupMvpTest(), /完成/);
});


test('leading-zero identity survives Sheets writes and corrupted old sessions fail closed', () => {
  const api = createApi();
  api.sheet('roster_v1',headers.roster).appendRow(['2026-27','4A','01','p4','Seat',true,'']);
  api.sheet('rounds_v1',headers.rounds).appendRow(['r','2026-27','4A','p4','stage1','topic','collecting',1,'','','']);
  api.sheet('round_members_v1',headers.members).appendRow(['r','01',true,'','']);
  const first = api.invoke({action:'login',payload:{classId:'4A',studentId:'01'}});
  const sh = api.context.apiSheet_('sessions_v1',[]);
  assert.equal(sh.values[1][4],'01');
  assert.equal(api.invoke({action:'getRoundStatus',token:first.data.token,payload:{roundId:'r'}}).ok,true);
  sh.values[1][4]=1; // Historical real Sheets corruption: do not infer or pad it.
  const rejected=api.invoke({action:'getRoundStatus',token:first.data.token,payload:{roundId:'r'}});
  assert.equal(rejected.error.code,'TOKEN_EXPIRED');
  assert.equal(sh.values[1][4],1);
  const fresh=api.invoke({action:'login',payload:{classId:'4A',studentId:'01'}});
  assert.equal(sh.values[2][4],'01');
  assert.equal(api.invoke({action:'getRoundStatus',token:fresh.data.token,payload:{roundId:'r'}}).ok,true);
});
