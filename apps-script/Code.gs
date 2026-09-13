/**
 * VA-Lingo 藝言堂 — Google Workspace 提交後端（Apps Script）
 *
 * 用途：以短期 token 核對班別及學號，把作品寫入 Drive、評賞與課堂進度寫入 Sheet。
 *
 * 部署要點（詳見 ../DEPLOY-GOOGLE.md）：
 * 1. 在 Drive 建立根資料夾「VA-Lingo 提交」，把資料夾 ID 填入 ROOT_FOLDER_ID
 * 2. 建立試算表，把試算表 ID 填入 SHEET_ID，然後執行 setup_()
 * 3. 部署 → 網頁應用程式：執行身分「我」；存取範圍按學校帳戶政策設定並實測；不可為方便改成公開存取
 * 4. 把 /exec 網址貼到前端「雲端設定」
 *
 * CORS：前端以簡單 fetch POST（text/plain）送 JSON，避免 preflight。
 */

// ========== 設定（部署前請填寫）==========
/** Drive 根資料夾 ID；建立資料夾後從網址複製，例如 .../folders/XXXXXXXX */
var ROOT_FOLDER_ID = ''; // 部署時由 IT 填入；不可把學校實際 ID commit 到 repo

/** 私有 Sheet ID；登入、課堂、作品及評賞索引均在此儲存。 */
var SHEET_ID = ''; // 部署時由 IT 填入；不可把學校實際 ID commit 到 repo

var ACTIVE_SCHOOL_YEAR = '2026-27'; // IT 更新學年；舊學年名冊保留但不能登入

var VERSION = 'va-lingo-google-mvp-1';
var TZ = 'Asia/Hong_Kong';

// ---------- JSON 回應 ----------
function json_(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function err_(msg) {
  return json_({ ok: false, error: msg });
}

// ---------- 健康檢查 ----------
/**
 * GET ?ping=1 → { ok:true, version:'va-lingo-google-mvp-1' }
 * 其他 GET 回傳簡短說明（避免空白頁困惑）
 */
function doGet(e) {
  e = e || {};
  var p = e.parameter || {};
  if (String(p.ping || '') === '1') {
    return json_({ ok: true, version: VERSION });
  }
  return json_({
    ok: true,
    version: VERSION,
    message: 'VA-Lingo Google MVP API。請用已登入的 POST JSON，或 ?ping=1 檢查狀態。'
  });
}

// ---------- 提交 API ----------
/** POST body 是 { action, requestId, token, payload }；詳見 DEPLOY-GOOGLE.md。 */
function doPost(e) {
  try {
    var body = parseBody_(e);
    var action = String(body.action || 'submit').trim();
    if (action === 'login') return login_(body);
    if (action === 'getRoundStatus') return getRoundStatus_(body);
    if (action === 'uploadArtwork') return uploadArtwork_(body);
    if (action === 'saveAssessment') return saveAssessment_(body);
    if (action === 'listPeerWorks') return listPeerWorks_(body);
    if (action === 'listOwnWorks') return listOwnWorks_(body);
    if (action === 'submit') return apiFail_('NOT_SUPPORTED', '舊 submit API 已退役；請使用登入後的 MVP 操作。');
    return apiFail_('UNKNOWN_ACTION', '未知的操作。');
  } catch (ex) {
    return err_('伺服器錯誤：' + (ex.message || String(ex)));
  }
}

// ---------- MVP identity, artwork and assessment API ----------
// The public client sends an opaque short-lived token in the POST body. Name is
// intentionally never returned or used as a browser-visible identity.
var ROSTER_SHEET = 'roster_v1';
var SESSION_SHEET = 'sessions_v1';
var ROUND_SHEET = 'rounds_v1';
var MEMBER_SHEET = 'round_members_v1';
var ARTWORK_SHEET = 'artworks_v1';
var ASSESSMENT_SHEET = 'assessments_v1';
var REQUEST_SHEET = 'requests_v1';
var TOKEN_TTL_MS = 45 * 60 * 1000;

function apiOk_(data) { return json_({ ok: true, data: data || {} }); }
function apiFail_(code, message) { return json_({ ok: false, error: { code: code, message: message } }); }
function writeError_(error, message) {
  var code = error && error.message;
  if (code === 'TOKEN_EXPIRED' || code === 'AUTH_REQUIRED' || code === 'INVALID_INPUT') return apiFail_(code, message);
  return apiFail_('RETRYABLE_WRITE_ERROR', message);
}
function withWriteLock_(work) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return work(); } finally { lock.releaseLock(); }
}
function apiSheet_(name, headers) {
  if (!SHEET_ID) throw new Error('尚未設定 SHEET_ID。');
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); }
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  return sh;
}
function rows_(sheet) {
  if (sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getValues();
  return values.slice(1).map(function(row) {
    var obj = {}; values[0].forEach(function(key, i) { obj[key] = row[i]; }); return obj;
  });
}
function value_(row, key) { return row[key] == null ? '' : String(row[key]); }
function nowIso_() { return new Date().toISOString(); }
function safeText_(s, max) {
  s = String(s == null ? '' : s).trim().replace(/[\u0000-\u001f]/g, ' ');
  // Spreadsheet formula injection protection for any user-entered string.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, max || 5000);
}
function randomId_(prefix) { return prefix + '_' + Utilities.getUuid(); }
function tokenHash_(token) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token);
  return bytes.map(function(b) { var n = b < 0 ? b + 256 : b; return ('0' + n.toString(16)).slice(-2); }).join('');
}
function requireSession_(body) {
  var token = String(body.token || '');
  if (!token) throw new Error('AUTH_REQUIRED');
  var sh = apiSheet_(SESSION_SHEET, ['sessionId','tokenHash','schoolYear','classId','studentId','grade','issuedAt','expiresAt','revokedAt']);
  var hash = tokenHash_(token);
  var hit = rows_(sh).filter(function(row) { return value_(row, 'tokenHash') === hash && !value_(row, 'revokedAt'); })[0];
  if (!hit || new Date(value_(hit, 'expiresAt')).getTime() <= Date.now()) throw new Error('TOKEN_EXPIRED');
  return { classId:value_(hit,'classId'), studentId:value_(hit,'studentId'), grade:value_(hit,'grade'), schoolYear:value_(hit,'schoolYear') };
}
function login_(body) {
  return withWriteLock_(function() { try {
    var p = body.payload || {};
    var classId = safeText_(p.classId, 30), studentId = safeText_(p.studentId, 30);
    if (!classId || !studentId) return apiFail_('INVALID_INPUT', '請輸入班別及學號。');
    var roster = apiSheet_(ROSTER_SHEET, ['schoolYear','classId','studentId','grade','displayLabel','active','updatedAt']);
    var found = rows_(roster).filter(function(row) {
      return value_(row,'schoolYear') === ACTIVE_SCHOOL_YEAR && value_(row,'classId') === classId && value_(row,'studentId') === studentId && String(row.active).toLowerCase() !== 'false';
    })[0];
    if (!found) return apiFail_('FORBIDDEN', '班別或學號未能核對。');
    var rawToken = Utilities.getUuid() + Utilities.getUuid();
    var issued = new Date(), expires = new Date(issued.getTime() + TOKEN_TTL_MS);
    apiSheet_(SESSION_SHEET, ['sessionId','tokenHash','schoolYear','classId','studentId','grade','issuedAt','expiresAt','revokedAt'])
      .appendRow([randomId_('ses'), tokenHash_(rawToken), value_(found,'schoolYear'), classId, studentId, value_(found,'grade'), issued.toISOString(), expires.toISOString(), '']);
    return apiOk_({token:rawToken, expiresAt:expires.toISOString(), classId:classId, studentId:studentId, grade:value_(found,'grade'), schoolYear:ACTIVE_SCHOOL_YEAR, displayLabel:classId + '・' + studentId + '號'});
  } catch (e) { return apiFail_('RETRYABLE_WRITE_ERROR', e.message || String(e)); } });
}
function round_(roundId) {
  var sheet = apiSheet_(ROUND_SHEET, ['roundId','schoolYear','classId','grade','stageId','topicId','phase','peerTargetCount','openedAt','peerOpenedAt','closedAt']);
  return rows_(sheet).filter(function(row) { return value_(row,'roundId') === roundId; })[0] || null;
}
function requireRound_(body, session) {
  var roundId = safeText_((body.payload || {}).roundId, 64), round = round_(roundId);
  if (!round) throw new Error('NOT_FOUND');
  if (value_(round,'schoolYear') !== session.schoolYear || value_(round,'classId') !== session.classId || value_(round,'grade') !== session.grade) throw new Error('FORBIDDEN');
  return { id:roundId, row:round };
}
function requireRoundMember_(roundId, session) {
  var members = rows_(apiSheet_(MEMBER_SHEET, ['roundId','studentId','required','exemptionReason','updatedAt']));
  var member = members.filter(function(row) {
    return value_(row,'roundId') === roundId && value_(row,'studentId') === session.studentId && String(row.required).toLowerCase() !== 'false';
  })[0];
  if (!member) throw new Error('FORBIDDEN');
  return member;
}
function readyStudents_(roundId) {
  var sh = apiSheet_(ASSESSMENT_SHEET, ['assessmentId','revision','artworkId','artworkRevision','roundId','authorClassId','authorStudentId','type','stepsJson','pinsJson','vocabJson','completedStepCount','status','createdAt','updatedAt','requestId']);
  var out = {};
  rows_(sh).forEach(function(row) { if (value_(row,'roundId') === roundId && value_(row,'type') === 'self' && value_(row,'status') === 'submitted' && Number(row.completedStepCount) === 5) out[value_(row,'authorStudentId')] = true; });
  return out;
}
function getRoundStatus_(body) {
  try {
    var session = requireSession_(body), round = requireRound_(body, session); requireRoundMember_(round.id, session);
    var members = rows_(apiSheet_(MEMBER_SHEET, ['roundId','studentId','required','exemptionReason','updatedAt']))
      .filter(function(row) { return value_(row,'roundId') === round.id && String(row.required).toLowerCase() !== 'false'; });
    var ready = readyStudents_(round.id), count = members.filter(function(member) { return ready[value_(member,'studentId')]; }).length;
    var own = rows_(apiSheet_(ASSESSMENT_SHEET, assessmentHeaders_())).filter(function(row) {
      return value_(row,'roundId') === round.id && value_(row,'authorClassId') === session.classId && value_(row,'authorStudentId') === session.studentId && value_(row,'status') === 'submitted';
    });
    var peerIds = {};
    own.forEach(function(row) { if (value_(row,'type') === 'peer') peerIds[value_(row,'artworkId') + ':' + value_(row,'artworkRevision')] = true; });
    var peerCount = Object.keys(peerIds).length, target = Number(round.row.peerTargetCount) || 0;
    return apiOk_({roundId:round.id, phase:value_(round.row,'phase'), expectedCount:members.length, readyCount:count,
      myProgress:{selfSubmitted:!!ready[session.studentId],peerSubmittedCount:peerCount,peerTargetCount:target,peerRemainingCount:Math.max(0,target-peerCount)}});
  } catch (e) { return apiFail_(e.message === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'FORBIDDEN', '未能讀取課堂狀態。'); }
}

function artworkHeaders_() { return ['artworkId','revision','roundId','classId','studentId','grade','topicId','sourceApp','mediaType','driveFileId','mime','byteSize','contentHash','status','createdAt','updatedAt','requestId']; }
function assessmentHeaders_() { return ['assessmentId','revision','artworkId','artworkRevision','roundId','authorClassId','authorStudentId','type','stepsJson','pinsJson','vocabJson','completedStepCount','status','createdAt','updatedAt','requestId']; }
function imageBlob_(base64, mime) {
  var raw = String(base64 || ''), match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (match) { mime = match[1]; raw = match[2]; }
  if (['image/jpeg','image/png','image/webp'].indexOf(mime) === -1) throw new Error('INVALID_INPUT');
  var bytes = Utilities.base64Decode(raw.replace(/\s/g, ''));
  if (!bytes.length || bytes.length > 250 * 1024) throw new Error('INVALID_INPUT');
  var ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return { bytes:bytes, mime:mime, ext:ext };
}
function uploadArtwork_(body) {
  return withWriteLock_(function() { try {
    var session = requireSession_(body), round = requireRound_(body, session), p = body.payload || {}; requireRoundMember_(round.id, session);
    if (value_(round.row,'phase') !== 'collecting') return apiFail_('ROUND_NOT_OPEN', '課堂已停止收集作品。');
    var topicId = safeText_(p.topicId, 80), sourceApp = safeText_(p.sourceApp, 40);
    if (!topicId || ['va-lingo','paper-cut','face-change','shadow-puppet'].indexOf(sourceApp) === -1) return apiFail_('INVALID_INPUT','作品資料不正確。');
    if (topicId !== value_(round.row,'topicId')) return apiFail_('FORBIDDEN','作品課題與課堂不符。');
    var image = imageBlob_(p.imageBase64, String(p.imageMime || ''));
    if (!body.requestId || !String(body.requestId).trim()) return apiFail_('INVALID_INPUT','缺少提交識別碼。');
    var requestId = safeText_(body.requestId, 100), sheet = apiSheet_(ARTWORK_SHEET, artworkHeaders_());
    var prior = rows_(sheet).filter(function(row) { return value_(row,'requestId') === requestId && value_(row,'studentId') === session.studentId && value_(row,'classId') === session.classId && value_(row,'roundId') === round.id; })[0];
    if (prior) return apiOk_({artworkId:value_(prior,'artworkId'), revision:Number(prior.revision), status:value_(prior,'status')});
    var root = DriveApp.getFolderById(ROOT_FOLDER_ID), artworkId = randomId_('art'), folder = ensureChildFolder_(ensureChildFolder_(ensureChildFolder_(root, session.schoolYear), session.classId), session.studentId);
    var file = folder.createFile(Utilities.newBlob(image.bytes, image.mime, artworkId + '.' + image.ext));
    var now = nowIso_(), hash = tokenHash_(Utilities.base64Encode(image.bytes));
    sheet.appendRow([artworkId,1,round.id,session.classId,session.studentId,session.grade,topicId,sourceApp,'image',file.getId(),image.mime,image.bytes.length,hash,'uploaded',now,now,requestId]);
    return apiOk_({artworkId:artworkId,revision:1,status:'uploaded'});
  } catch (e) { return writeError_(e, '未能儲存作品。'); } });
}
function completedSteps_(steps, ks, level) {
  var ids = ['feel','describe','form','meaning','judge'];
  return ids.filter(function(id) {
    var step = steps && steps[id];
    if (!step || typeof step !== 'object') return false;
    if (ks === 'ks1' || level === 1) {
      var blanks = Array.isArray(step.scaffold) ? step.scaffold : [];
      return blanks.length > 0 && blanks.every(function(value) { return safeText_(value, 500).length > 0; }) && (ks !== 'ks1' || id !== 'feel' || safeText_(step.mood, 40).length > 0);
    }
    return safeText_(step.open, 3000).length > 0;
  }).length;
}
function saveAssessment_(body) {
  return withWriteLock_(function() { try {
    var session = requireSession_(body), round = requireRound_(body, session), p = body.payload || {}; requireRoundMember_(round.id, session);
    var type = p.type === 'peer' ? 'peer' : 'self', artworkId = safeText_(p.artworkId,100), revision = Number(p.artworkRevision || 1);
    if (!artworkId || !Number.isFinite(revision)) return apiFail_('INVALID_INPUT','評賞作品資料不正確。');
    var artworks = rows_(apiSheet_(ARTWORK_SHEET, artworkHeaders_()));
    var artwork = artworks.filter(function(row) { return value_(row,'artworkId') === artworkId && Number(row.revision) === revision && value_(row,'roundId') === round.id; })[0];
    if (!artwork || (type === 'self' && value_(artwork,'studentId') !== session.studentId) || (type === 'peer' && value_(artwork,'studentId') === session.studentId)) return apiFail_('FORBIDDEN','沒有權限提交這份評賞。');
    if (type === 'peer' && value_(round.row,'phase') !== 'peer_open') return apiFail_('ROUND_NOT_OPEN','老師尚未開放互評。');
    var ks = p.ks === 'ks1' ? 'ks1' : p.ks === 'ks2' ? 'ks2' : '';
    if (!ks) return apiFail_('INVALID_INPUT','評賞程度不正確。');
    var level = p.level === undefined ? 2 : Number(p.level);
    if (level !== 1 && level !== 2) return apiFail_('INVALID_INPUT','評賞模式不正確。');
    var steps = p.steps || {}, count = completedSteps_(steps, ks, level);
    if (count !== 5) return apiFail_('INVALID_INPUT', type === 'peer' ? '請完成互評五步驟。' : '請完成評賞五步驟。');
    if (!body.requestId || !String(body.requestId).trim()) return apiFail_('INVALID_INPUT','缺少提交識別碼。');
    var requestId = safeText_(body.requestId,100), sh = apiSheet_(ASSESSMENT_SHEET, assessmentHeaders_());
    var prior = rows_(sh).filter(function(row) { return value_(row,'requestId') === requestId && value_(row,'authorStudentId') === session.studentId && value_(row,'authorClassId') === session.classId && value_(row,'roundId') === round.id && value_(row,'artworkId') === artworkId && Number(row.artworkRevision) === revision && value_(row,'type') === type; })[0];
    if (prior) return apiOk_({assessmentId:value_(prior,'assessmentId'),revision:Number(prior.revision),completedStepCount:Number(prior.completedStepCount)});
    if (type === 'peer') {
      var ready = readyStudents_(round.id);
      if (!ready[session.studentId] || !ready[value_(artwork,'studentId')]) return apiFail_('FORBIDDEN','請先完成自評，並選擇已完成自評的同學作品。');
      var submitted = rows_(sh).filter(function(row) {
        return value_(row,'roundId') === round.id && value_(row,'authorClassId') === session.classId && value_(row,'authorStudentId') === session.studentId && value_(row,'type') === 'peer' && value_(row,'status') === 'submitted';
      });
      if (submitted.some(function(row) { return value_(row,'artworkId') === artworkId && Number(row.artworkRevision) === revision; })) return apiFail_('ALREADY_SUBMITTED','這件作品已提交互評。');
      var quota = Number(round.row.peerTargetCount);
      if (!Number.isInteger(quota) || quota < 1) return apiFail_('ROUND_NOT_OPEN','老師尚未設定互評配額。');
      if (submitted.length >= quota) return apiFail_('PEER_QUOTA_REACHED','你已完成本課堂的互評配額。');
    }
    var now = nowIso_(), id = randomId_('asm');
    sh.appendRow([id,1,artworkId,revision,round.id,session.classId,session.studentId,type,JSON.stringify(steps),JSON.stringify(p.pins || []),JSON.stringify(p.vocabUses || []),count,'submitted',now,now,requestId]);
    return apiOk_({assessmentId:id,revision:1,completedStepCount:count,status:'submitted'});
  } catch (e) { return writeError_(e, '未能儲存評賞。'); } });
}
// Private recovery: one image per page bounds the response size on school Wi-Fi.
function listOwnWorks_(body) {
  try {
    var session = requireSession_(body), round = requireRound_(body, session);
    requireRoundMember_(round.id, session);
    var offset = Number((body.payload || {}).offset || 0);
    if (!Number.isInteger(offset) || offset < 0) return apiFail_('INVALID_INPUT','作品頁碼不正確。');
    var own = rows_(apiSheet_(ARTWORK_SHEET, artworkHeaders_())).filter(function(row) {
      return value_(row,'roundId') === round.id && value_(row,'classId') === session.classId && value_(row,'studentId') === session.studentId;
    });
    var assessments = rows_(apiSheet_(ASSESSMENT_SHEET, assessmentHeaders_())).filter(function(row) {
      return value_(row,'roundId') === round.id && value_(row,'authorClassId') === session.classId && value_(row,'authorStudentId') === session.studentId && value_(row,'type') === 'self';
    });
    var items = own.slice(offset, offset + 1).map(function(row) {
      var history = assessments.filter(function(a) { return value_(a,'artworkId') === value_(row,'artworkId') && Number(a.artworkRevision) === Number(row.revision); });
      var latest = history.length ? history[history.length - 1] : null;
      var bytes = DriveApp.getFileById(value_(row,'driveFileId')).getBlob().getBytes();
      return {artworkId:value_(row,'artworkId'),revision:Number(row.revision),roundId:round.id,
        topicId:value_(row,'topicId'),stageId:value_(round.row,'stageId'),grade:session.grade,
        sourceApp:value_(row,'sourceApp'),createdAt:value_(row,'createdAt'),
        imageData:'data:' + value_(row,'mime') + ';base64,' + Utilities.base64Encode(bytes),
        assessment:latest ? {assessmentId:value_(latest,'assessmentId'),steps:JSON.parse(value_(latest,'stepsJson') || '{}'),pins:JSON.parse(value_(latest,'pinsJson') || '[]'),completedStepCount:Number(latest.completedStepCount),status:value_(latest,'status')} : null};
    });
    return apiOk_({items:items,nextOffset:offset + 1 < own.length ? offset + 1 : null,totalCount:own.length});
  } catch (e) { return apiFail_(e.message === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'FORBIDDEN','未能讀取自己的作品。'); }
}

function listPeerWorks_(body) {
  try {
    var session = requireSession_(body), round = requireRound_(body, session); requireRoundMember_(round.id, session);
    if (value_(round.row,'phase') !== 'peer_open') return apiFail_('ROUND_NOT_OPEN','老師尚未開放互評。');
    var selfReady = readyStudents_(round.id);
    if (!selfReady[session.studentId]) return apiFail_('FORBIDDEN','請先提交自己的作品及自評。');
    var works = rows_(apiSheet_(ARTWORK_SHEET, artworkHeaders_())).filter(function(row) {
      return value_(row,'roundId') === round.id && value_(row,'studentId') !== session.studentId && value_(row,'status') === 'uploaded' && selfReady[value_(row,'studentId')];
    }).slice(0, 12);
    var myReviews = rows_(apiSheet_(ASSESSMENT_SHEET, assessmentHeaders_())).filter(function(row) {
      return value_(row,'roundId') === round.id && value_(row,'authorClassId') === session.classId && value_(row,'authorStudentId') === session.studentId && value_(row,'type') === 'peer';
    });
    var items = works.map(function(row) {
      var data = DriveApp.getFileById(value_(row,'driveFileId')).getBlob().getBytes();
      var review = myReviews.filter(function(a) { return value_(a,'artworkId') === value_(row,'artworkId') && Number(a.artworkRevision) === Number(row.revision); }).pop();
      return {artworkId:value_(row,'artworkId'), revision:Number(row.revision), topicId:value_(row,'topicId'), stageId:value_(round.row,'stageId'), grade:session.grade, sourceApp:value_(row,'sourceApp'), displayLabel:'同學作品', imageData:'data:' + value_(row,'mime') + ';base64,' + Utilities.base64Encode(data),
        myAssessment:review ? {steps:JSON.parse(value_(review,'stepsJson') || '{}'),pins:JSON.parse(value_(review,'pinsJson') || '[]'),status:value_(review,'status')} : null};
    });
    return apiOk_({items:items,refreshedAt:nowIso_()});
  } catch (e) { return apiFail_(e.message === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'RETRYABLE_WRITE_ERROR','未能更新同學作品清單。'); }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('沒有收到 POST 內容。請確認前端有送 JSON body。');
  }
  var raw = e.postData.contents;
  try {
    return JSON.parse(raw);
  } catch (ex) {
    throw new Error('JSON 格式不正確，無法解析。');
  }
}

function ensureChildFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

/** 一次性設定：建立 MVP 運作分頁；名冊、課堂及應交名單由老師填寫。 */
function setup_() {
  if (!SHEET_ID) {
    throw new Error('請先在 Code.gs 填入 SHEET_ID。');
  }
  apiSheet_(ROSTER_SHEET, ['schoolYear','classId','studentId','grade','displayLabel','active','updatedAt']);
  apiSheet_(SESSION_SHEET, ['sessionId','tokenHash','schoolYear','classId','studentId','grade','issuedAt','expiresAt','revokedAt']);
  apiSheet_(ROUND_SHEET, ['roundId','schoolYear','classId','grade','stageId','topicId','phase','peerTargetCount','openedAt','peerOpenedAt','closedAt']);
  apiSheet_(MEMBER_SHEET, ['roundId','studentId','required','exemptionReason','updatedAt']);
  apiSheet_(ARTWORK_SHEET, artworkHeaders_());
  apiSheet_(ASSESSMENT_SHEET, assessmentHeaders_());
  if (ROOT_FOLDER_ID) {
    try {
      DriveApp.getFolderById(ROOT_FOLDER_ID);
    } catch (ex) {
      throw new Error('ROOT_FOLDER_ID 無效或無權限：' + ex.message);
    }
  }
  return 'setup_ 完成：MVP Sheet 分頁已就緒。';
}
