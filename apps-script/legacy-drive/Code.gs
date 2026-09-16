/**
 * VA-Lingo 藝言堂 — Google Workspace 提交後端（Apps Script）
 *
 * 用途：接收前端 JSON POST，把學生評賞歷程寫入 Drive 資料夾，
 *       並可選寫入試算表 submissions 分頁作索引。
 *
 * 部署要點（詳見 ../DEPLOY-GOOGLE.md）：
 * 1. 在 Drive 建立根資料夾「VA-Lingo 提交」，把資料夾 ID 填入 ROOT_FOLDER_ID
 * 2.（選填）建立試算表，把試算表 ID 填入 SHEET_ID，然後執行 setup_()
 * 3. 部署 → 網頁應用程式：執行身分「我」；存取「學校網域」或「任何擁有連結的人」
 * 4. 把 /exec 網址貼到前端「雲端設定」
 *
 * CORS：ContentService JSON 回應即可；前端請用簡單 fetch POST（勿加自訂標頭）。
 * 圖片過大時仍會嘗試儲存；前端應先壓縮至約 1600px JPEG。
 */

// ========== 設定（部署前請填寫）==========
/** Drive 根資料夾 ID；建立資料夾後從網址複製，例如 .../folders/XXXXXXXX */
var ROOT_FOLDER_ID = '17649WLgqeOIf_7x5ejwkE1ezfyLPUe4U'; // ← 請填入；留空則提交會回傳錯誤

/** 選填：試算表 ID，用於 submissions 紀錄。留空則不寫 Sheet */
var SHEET_ID = '1O8ZTcYJdypGFRnMAe6Lk5TINwJDQCRn7gnfNv5UVwLA';

var VERSION = 'va-lingo-submit-1';
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
 * GET ?ping=1 → { ok:true, version:'va-lingo-submit-1' }
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
    message: 'VA-Lingo 提交 API。請用 POST JSON（action:submit），或 ?ping=1 檢查狀態。'
  });
}

// ---------- 提交 API ----------
/**
 * POST body（JSON 字串）：
 * {
 *   action: 'submit',
 *   className, studentName, studentId,
 *   ks, level, source, unit,
 *   steps: {...},
 *   pins: [...],
 *   imageBase64: 選填（data URL 或 raw base64）,
 *   imageMime: 選填
 * }
 */
function doPost(e) {
  try {
    var body = parseBody_(e);
    var action = String(body.action || 'submit').trim();
    if (action === 'submit') {
      return handleSubmit_(body);
    }
    return err_('未知的 action：「' + action + '」。目前只支援 submit。');
  } catch (ex) {
    return err_('伺服器錯誤：' + (ex.message || String(ex)));
  }
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

function handleSubmit_(body) {
  var className = sanitizeName_(body.className || body.klass || '');
  var studentId = sanitizeName_(body.studentId || body.sid || '');
  var studentName = sanitizeName_(body.studentName || body.name || '');

  if (!className) {
    return err_('請選擇班別（className）。');
  }
  if (!studentId && !studentName) {
    return err_('請選擇學生（需要學號或姓名）。');
  }

  if (!ROOT_FOLDER_ID) {
    return err_('尚未設定 ROOT_FOLDER_ID。請 IT 在 Code.gs 填入 Drive 根資料夾 ID 後重新部署。');
  }

  var root;
  try {
    root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  } catch (ex) {
    return err_('找不到根資料夾。請檢查 ROOT_FOLDER_ID 是否正確，以及部署帳號是否有權限。');
  }

  // 路徑：班別 / 學號_姓名 /
  var classFolder = ensureChildFolder_(root, className || '未分班');
  var studentLabel = buildStudentFolderName_(studentId, studentName);
  var studentFolder = ensureChildFolder_(classFolder, studentLabel);

  var now = new Date();
  var submittedAt = Utilities.formatDate(now, TZ, "yyyy-MM-dd'T'HH:mm:ss");

  // submission.json：中繼資料 + steps + pins（圖片另存，避免重複塞進 JSON）
  var meta = {
    version: VERSION,
    submittedAt: submittedAt,
    className: className,
    studentId: studentId,
    studentName: studentName,
    ks: body.ks || '',
    level: body.level != null ? body.level : '',
    source: body.source || '',
    unit: body.unit || '觀我香港：熱鬧的香港',
    steps: body.steps || {},
    pins: Array.isArray(body.pins) ? body.pins : [],
    answers: body.answers || null,
    moods: body.moods || null,
    rubrics: body.rubrics || null,
    hasImage: !!(body.imageBase64)
  };

  var jsonBlob = Utilities.newBlob(
    JSON.stringify(meta, null, 2),
    'application/json',
    'submission.json'
  );
  var jsonFile = upsertFile_(studentFolder, 'submission.json', jsonBlob);

  var artworkFile = null;
  if (body.imageBase64) {
    try {
      artworkFile = saveArtwork_(studentFolder, body.imageBase64, body.imageMime);
      meta.hasImage = true;
    } catch (imgErr) {
      // 圖片失敗仍保留 JSON；回傳警告
      return json_({
        ok: true,
        folderUrl: studentFolder.getUrl(),
        fileUrl: jsonFile.getUrl(),
        warning: '評賞已儲存，但圖片儲存失敗：' + (imgErr.message || String(imgErr))
      });
    }
  }

  // 選填：寫入試算表索引
  if (SHEET_ID) {
    try {
      appendSubmissionRow_({
        time: submittedAt,
        className: className,
        studentId: studentId,
        studentName: studentName,
        source: body.source || '',
        ks: body.ks || '',
        folderUrl: studentFolder.getUrl()
      });
    } catch (sheetErr) {
      // Sheet 失敗不阻斷 Drive 提交
    }
  }

  return json_({
    ok: true,
    folderUrl: studentFolder.getUrl(),
    fileUrl: artworkFile ? artworkFile.getUrl() : jsonFile.getUrl()
  });
}

// ---------- Drive 輔助 ----------
function sanitizeName_(s) {
  s = String(s || '').trim();
  // 移除路徑危險字元與控制字元
  s = s.replace(/[\/\\:\*\?"<>\|\u0000-\u001f]/g, '_');
  s = s.replace(/\s+/g, ' ');
  if (s.length > 80) s = s.substring(0, 80);
  return s;
}

function buildStudentFolderName_(id, name) {
  if (id && name) return id + '_' + name;
  if (id) return id;
  return name || '未知名';
}

function ensureChildFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

/** 同名檔案則刪舊建新（避免 MIME／內容殘留），否則新建 */
function upsertFile_(folder, filename, blob) {
  var it = folder.getFilesByName(filename);
  while (it.hasNext()) {
    it.next().setTrashed(true);
  }
  return folder.createFile(blob.setName(filename));
}

function saveArtwork_(folder, imageBase64, imageMime) {
  var raw = String(imageBase64 || '');
  var mime = String(imageMime || '').trim();
  // 剝離 data URL 前綴：data:image/jpeg;base64,....
  var m = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (m) {
    mime = mime || m[1];
    raw = m[2];
  }
  raw = raw.replace(/\s/g, '');
  if (!raw) throw new Error('圖片資料為空。');

  mime = mime || 'image/jpeg';
  var ext = 'jpg';
  if (mime.indexOf('png') !== -1) ext = 'png';
  else if (mime.indexOf('webp') !== -1) ext = 'webp';
  else if (mime.indexOf('gif') !== -1) ext = 'gif';
  else {
    mime = 'image/jpeg';
    ext = 'jpg';
  }

  var bytes = Utilities.base64Decode(raw);
  var filename = 'artwork.' + ext;
  var blob = Utilities.newBlob(bytes, mime, filename);

  // 刪除舊 artwork.* 再寫入（統一檔名）
  var names = ['artwork.jpg', 'artwork.jpeg', 'artwork.png', 'artwork.webp', 'artwork.gif'];
  names.forEach(function (n) {
    var it = folder.getFilesByName(n);
    while (it.hasNext()) it.next().setTrashed(true);
  });

  return folder.createFile(blob);
}

// ---------- Sheet 輔助 ----------
function appendSubmissionRow_(row) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName('submissions');
  if (!sh) {
    sh = ss.insertSheet('submissions');
    sh.appendRow(['time', 'class', 'id', 'name', 'source', 'ks', 'folderUrl']);
  }
  // 若首列空白，補上標題
  if (sh.getLastRow() === 0) {
    sh.appendRow(['time', 'class', 'id', 'name', 'source', 'ks', 'folderUrl']);
  }
  sh.appendRow([
    row.time,
    row.className,
    row.studentId,
    row.studentName,
    row.source,
    row.ks,
    row.folderUrl
  ]);
}

/**
 * 一次性設定：若已填 SHEET_ID，建立／補齊 submissions 標題列。
 * 在 Apps Script 編輯器手動執行 setup_()。
 */
function setup_() {
  if (!SHEET_ID) {
    throw new Error('請先在 Code.gs 填入 SHEET_ID，或留空略過試算表。');
  }
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName('submissions');
  if (!sh) sh = ss.insertSheet('submissions');
  var headers = ['time', 'class', 'id', 'name', 'source', 'ks', 'folderUrl'];
  var first = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  var empty = first.every(function (v) { return String(v).trim() === ''; });
  if (empty || sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  if (ROOT_FOLDER_ID) {
    try {
      DriveApp.getFolderById(ROOT_FOLDER_ID);
    } catch (ex) {
      throw new Error('ROOT_FOLDER_ID 無效或無權限：' + ex.message);
    }
  }
  return 'setup_ 完成：submissions 標題已就緒。';
}
