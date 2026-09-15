/* Browser-side GitHub Pages / static preview mock.
 * Enables window.VA_PREVIEW and intercepts POST /api (+ /preview/identity).
 * Synthetic roster mirrors tests/helpers/apps-script.cjs (2A/5A · 01–03). No school secrets.
 */
(function (root) {
  'use strict';

  var YEAR = '2026-27';
  var STORE_KEY = 'va-lingo-pages-preview-v1';
  var ROLE_KEY = 'va-lingo-pages-preview-role';

  function wantsPreview() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('preview') === '1') return true;
    } catch (_) {}
    var h = String(location.hostname || '');
    return h === 'localhost' || h === '127.0.0.1' || /\.github\.io$/i.test(h);
  }

  function detectBase() {
    var el = document.querySelector('base');
    if (el) {
      var href = el.getAttribute('href');
      if (href) {
        try {
          var u = new URL(href, location.href);
          var p = u.pathname || '/';
          return p.charAt(p.length - 1) === '/' ? p : p.replace(/[^/]*$/, '') || '/';
        } catch (_) {}
      }
    }
    var path = location.pathname || '/';
    if (/\/assets\//.test(path)) path = path.replace(/\/assets\/.*$/, '/');
    else if (/\.[a-zA-Z0-9]+$/.test(path)) path = path.replace(/\/[^/]+$/, '/');
    else if (path.charAt(path.length - 1) !== '/') path = path.replace(/\/[^/]*$/, '/') || '/';
    if (!path || path.charAt(0) !== '/') path = '/' + path;
    if (path.charAt(path.length - 1) !== '/') path += '/';
    return path;
  }

  function withBase(p) {
    if (!p || typeof p !== 'string') return p;
    if (/^(?:[a-z]+:)?\/\//i.test(p) || p.indexOf('data:') === 0 || p.indexOf('blob:') === 0) return p;
    var base = root.VA_BASE || '/';
    if (p.charAt(0) === '/') return base.replace(/\/$/, '') + p;
    return base + p;
  }

  root.VA_BASE = detectBase();
  root.VA_withBase = withBase;

  if (!wantsPreview()) return;

  root.VA_PREVIEW = true;

  function uuid() {
    if (root.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function nowIso() { return new Date().toISOString(); }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function ok(data) { return { ok: true, data: data || {} }; }

  function fail(code, message) { return { ok: false, error: { code: code, message: message } }; }

  function err(code, message) {
    var e = new Error(message);
    e.code = code;
    throw e;
  }

  function getRole() {
    try { return localStorage.getItem(ROLE_KEY) === 'teacher' ? 'teacher' : 'student'; } catch (_) { return 'student'; }
  }

  function setRole(role) {
    try { localStorage.setItem(ROLE_KEY, role === 'teacher' ? 'teacher' : 'student'); } catch (_) {}
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) return parsed;
      }
    } catch (_) {}
    return null;
  }

  function saveStore(store) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (_) {}
  }

  function emptyStore() {
    return {
      version: 1,
      sessions: {},
      rounds: [],
      assessments: [],
      artworks: [],
      feedback: [],
      seeded: false
    };
  }

  function roster() {
    var rows = [];
    var grades = [2, 5];
    var ids = ['01', '02', '03'];
    for (var g = 0; g < grades.length; g++) {
      for (var i = 0; i < ids.length; i++) {
        rows.push({
          schoolYear: YEAR,
          classId: grades[g] + 'A',
          studentId: ids[i],
          grade: 'p' + grades[g],
          displayLabel: 'PRIVATE-NAME',
          active: true
        });
      }
    }
    return rows;
  }

  function teacherClasses() { return ['2A', '5A']; }

  function latestById(items) {
    var map = {};
    for (var i = 0; i < items.length; i++) map[items[i].id] = items[i];
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function ensureSeed(store) {
    if (store.seeded) return;
    var M = root.VAGuided;
    if (!M) return;
    var grades = ['p2', 'p5'];
    for (var i = 0; i < grades.length; i++) {
      var grade = grades[i];
      var classId = grade.slice(1) + 'A';
      var plan = M.makePlan(grade, M.templates[grade].questions.reference.map(function (q) { return q.id; }), ['reference', 'self', 'peer']);
      var members = [];
      var rows = roster().filter(function (r) { return r.classId === classId; });
      for (var j = 0; j < rows.length; j++) {
        members.push({ studentId: rows[j].studentId, exempt: false, reason: '' });
      }
      store.rounds.push({
        id: 'rnd2_demo_' + grade,
        revision: 1,
        schoolYear: YEAR,
        classId: classId,
        grade: plan.grade,
        plan: plan,
        members: members,
        pairs: [],
        phase: 'collecting',
        createdAt: nowIso(),
        createdBy: 'teacher@chilinbps.edu.hk',
        requestId: 'demo-' + grade,
        requestHash: 'demo'
      });
    }
    store.seeded = true;
    saveStore(store);
  }

  function sessionFromToken(store, token) {
    if (!token) err('AUTH_REQUIRED', '請重新選擇班別及學號登入；本機內容會保留。');
    var s = store.sessions[token];
    if (!s) err('TOKEN_EXPIRED', '請重新選擇班別及學號登入；本機內容會保留。');
    if (new Date(s.expiresAt).getTime() <= Date.now()) err('TOKEN_EXPIRED', '請重新選擇班別及學號登入；本機內容會保留。');
    return { schoolYear: s.schoolYear, classId: s.classId, studentId: s.studentId, grade: s.grade };
  }

  function requireTeacher() {
    if (getRole() !== 'teacher') err('FORBIDDEN', '此帳戶未獲教師權限。');
    return { email: 'teacher@chilinbps.edu.hk', classes: teacherClasses() };
  }

  function publicRound(r, student) {
    var member = null;
    for (var i = 0; i < r.members.length; i++) {
      if (r.members[i].studentId === student.studentId) { member = r.members[i]; break; }
    }
    return {
      id: r.id,
      revision: r.revision,
      classId: r.classId,
      grade: r.grade,
      phase: r.phase,
      plan: r.plan,
      exempt: !!(member && member.exempt),
      createdAt: r.createdAt
    };
  }

  function progress(store, r) {
    var submitted = latestById(store.assessments.filter(function (a) {
      return a.roundId === r.id && a.status === 'submitted';
    }));
    return r.members.map(function (m) {
      var own = submitted.filter(function (a) { return a.studentId === m.studentId; });
      var selfs = own.filter(function (a) { return a.mode === 'self'; }).sort(function (a, b) {
        return a.updatedAt.localeCompare(b.updatedAt) || a.revision - b.revision;
      });
      var latestSelf = selfs.length ? selfs[selfs.length - 1] : null;
      return {
        studentId: m.studentId,
        exempt: !!m.exempt,
        exemptionReason: m.reason || '',
        referenceSubmitted: own.some(function (a) { return a.mode === 'reference'; }),
        selfSubmitted: !!latestSelf,
        artworkId: latestSelf ? latestSelf.targetId : null,
        peerSubmitted: own.some(function (a) { return a.mode === 'peer'; })
      };
    });
  }

  function findRound(store, id) {
    var list = latestById(store.rounds).filter(function (x) { return x.id === id; });
    if (!list.length) err('NOT_FOUND', '找不到課堂。');
    return list[0];
  }

  function studentRound(store, body, student) {
    var r = findRound(store, (body.payload || {}).roundId);
    var memberOk = r.members.some(function (m) { return m.studentId === student.studentId; });
    if (r.schoolYear !== student.schoolYear || r.classId !== student.classId || r.grade !== student.grade || !memberOk) {
      err('FORBIDDEN', '不能進入此課堂。');
    }
    return r;
  }

  function requestMeta(body) {
    var id = String(body.requestId || '').trim();
    if (!id) err('INVALID_INPUT', '缺少提交識別碼。');
    return { id: id, hash: JSON.stringify(body.payload || {}) };
  }

  function replay(items, request) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].requestId === request.id) {
        if (items[i].requestHash !== request.hash) err('REQUEST_CONFLICT', '這次重試的內容不同，請保留內容並重新操作。');
        return items[i];
      }
    }
    return null;
  }

  function owned(a, s) {
    return a.schoolYear === s.schoolYear && a.classId === s.classId && a.studentId === s.studentId;
  }

  function publicAssessment(a) {
    var out = clone(a);
    delete out.requestId;
    delete out.requestHash;
    return out;
  }

  function publicArt(art) {
    return {
      id: art.id,
      roundId: art.roundId,
      createdAt: art.createdAt,
      imageData: art.imageData || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y2ZWZkOSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTA0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNmQ3MzVmIj7kvZzmiJDkvZXkuK08L3RleHQ+PC9zdmc+'
    };
  }

  function findArtwork(store, id) {
    for (var i = 0; i < store.artworks.length; i++) {
      if (store.artworks[i].id === id) return store.artworks[i];
    }
    err('NOT_FOUND', '找不到作品。');
  }

  function handleApi(body) {
    var store = loadStore() || emptyStore();
    ensureSeed(store);
    var action = body && body.action;
    var M = root.VAGuided;

    try {
      if (action === 'loginOptions') {
        var classes = {};
        var rows = roster();
        for (var i = 0; i < rows.length; i++) {
          var c = rows[i].classId;
          if (!classes[c]) classes[c] = [];
          if (classes[c].indexOf(rows[i].studentId) < 0) classes[c].push(rows[i].studentId);
        }
        var out = Object.keys(classes).sort().map(function (id) {
          return {
            classId: id,
            studentIds: classes[id].slice().sort(function (a, b) {
              return String(a).localeCompare(String(b), 'en', { numeric: true });
            })
          };
        });
        return ok({ classes: out });
      }

      if (action === 'login') {
        var p = body.payload || {};
        var classId = String(p.classId || '').trim();
        var studentId = String(p.studentId || '').trim();
        if (!classId || !studentId) return fail('INVALID_INPUT', '請輸入班別及學號。');
        var found = null;
        var all = roster();
        for (var j = 0; j < all.length; j++) {
          if (all[j].classId === classId && all[j].studentId === studentId) { found = all[j]; break; }
        }
        if (!found) return fail('FORBIDDEN', '班別或學號未能核對。');
        var token = uuid() + uuid();
        var expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
        store.sessions[token] = {
          schoolYear: YEAR,
          classId: classId,
          studentId: studentId,
          grade: found.grade,
          expiresAt: expires
        };
        saveStore(store);
        return ok({
          token: token,
          expiresAt: expires,
          classId: classId,
          studentId: studentId,
          grade: found.grade,
          schoolYear: YEAR,
          displayLabel: classId + '・' + studentId + '號'
        });
      }

      if (action === 'listMyRounds') {
        var s = sessionFromToken(store, body.token);
        var rounds = latestById(store.rounds).filter(function (r) {
          return r.schoolYear === s.schoolYear && r.classId === s.classId && r.grade === s.grade &&
            r.members.some(function (m) { return m.studentId === s.studentId; });
        }).map(function (r) {
          var pub = publicRound(r, s);
          var prog = progress(store, r).filter(function (x) { return x.studentId === s.studentId; })[0];
          pub.progress = prog;
          return pub;
        });
        return ok({ rounds: rounds });
      }

      if (action === 'getNotebook') {
        var s2 = sessionFromToken(store, body.token);
        var r2 = studentRound(store, body, s2);
        var assessments = store.assessments.filter(function (a) {
          return a.roundId === r2.id && owned(a, s2);
        }).map(function (a) {
          var x = publicAssessment(a);
          x.feedback = store.feedback.filter(function (f) {
            return f.assessmentId === a.id && f.assessmentRevision === a.revision;
          }).map(function (f) {
            return {
              id: f.id,
              assessmentId: f.assessmentId,
              assessmentRevision: f.assessmentRevision,
              reviews: f.reviews,
              strengths: f.strengths,
              nextStep: f.nextStep,
              createdAt: f.createdAt
            };
          });
          return x;
        });
        var artworks = store.artworks.filter(function (a) {
          return a.roundId === r2.id && owned(a, s2);
        }).map(function (a) { return { id: a.id, createdAt: a.createdAt }; });
        var myArtIds = artworks.map(function (w) { return w.id; });
        var received = latestById(store.assessments.filter(function (a) {
          return a.roundId === r2.id && a.status === 'submitted' && a.mode === 'peer' && myArtIds.indexOf(a.targetId) >= 0;
        })).map(function (a) {
          return { id: a.id, targetId: a.targetId, revision: a.revision, responses: a.responses, updatedAt: a.updatedAt };
        });
        return ok({ round: publicRound(r2, s2), assessments: assessments, artworks: artworks, received: received });
      }

      if (action === 'getArtwork') {
        var s3 = sessionFromToken(store, body.token);
        var r3 = studentRound(store, body, s3);
        var art = findArtwork(store, (body.payload || {}).artworkId);
        var pairOk = (r3.pairs || []).some(function (pair) {
          return pair.studentId === s3.studentId && pair.artworkId === art.id;
        });
        if (art.roundId !== r3.id || (!owned(art, s3) && !pairOk)) err('FORBIDDEN', '不能查看這件作品。');
        return ok(publicArt(art));
      }

      if (action === 'uploadArtwork') {
        var s4 = sessionFromToken(store, body.token);
        var r4 = studentRound(store, body, s4);
        var p4 = body.payload || {};
        var req4 = requestMeta(body);
        if (r4.plan.activities.indexOf('self') < 0) err('FORBIDDEN', '本課沒有作品上傳活動。');
        var ownArts = store.artworks.filter(function (a) { return a.roundId === r4.id && owned(a, s4); });
        var prior = replay(ownArts, req4);
        if (prior) return ok({ artworkId: prior.id });
        if (r4.phase !== 'collecting') err('ROUND_NOT_OPEN', '本課已停止收集新作品，現有作品仍可查看。');
        var id4 = 'art2_' + uuid();
        var mime = String(p4.imageMime || 'image/jpeg');
        var imageData = String(p4.imageBase64 || '');
        if (imageData.indexOf('data:') !== 0) imageData = 'data:' + mime + ';base64,' + imageData;
        store.artworks.push({
          id: id4,
          roundId: r4.id,
          schoolYear: s4.schoolYear,
          classId: s4.classId,
          studentId: s4.studentId,
          mime: mime,
          imageData: imageData,
          createdAt: nowIso(),
          requestId: req4.id,
          requestHash: req4.hash
        });
        saveStore(store);
        return ok({ artworkId: id4 });
      }

      if (action === 'saveAssessment') {
        if (!M) err('SERVER_ERROR', '示範模組尚未就緒。');
        var s5 = sessionFromToken(store, body.token);
        var r5 = studentRound(store, body, s5);
        var p5 = body.payload || {};
        var req5 = requestMeta(body);
        var mode = p5.mode;
        var target = p5.targetId;
        if (r5.plan.activities.indexOf(mode) < 0) err('INVALID_INPUT', '本課沒有這項活動。');
        if (mode === 'reference') {
          if (target !== r5.plan.reference.id) err('FORBIDDEN', '名作與課題不符。');
        } else {
          var art5 = findArtwork(store, target);
          if (art5.roundId !== r5.id) err('FORBIDDEN', '作品與課堂不符。');
          if (mode === 'self' && !owned(art5, s5)) err('FORBIDDEN', '只能自評自己的作品。');
          if (mode === 'peer' && !(r5.pairs || []).some(function (pair) {
            return pair.studentId === s5.studentId && pair.artworkId === target && pair.targetStudentId !== s5.studentId;
          })) err('FORBIDDEN', '只能評賞本課獲配的作品。');
        }
        var ownAsm = store.assessments.filter(function (a) {
          return a.roundId === r5.id && owned(a, s5) && a.mode === mode && a.targetId === target;
        });
        var replayAsm = replay(ownAsm, req5);
        if (replayAsm) return ok(publicAssessment(replayAsm));
        if (r5.phase === 'closed' || (mode === 'peer' && r5.phase !== 'peer_open')) {
          err('ROUND_NOT_OPEN', '課堂已關閉，或老師尚未開放互評。');
        }
        var previous = ownAsm.length ? ownAsm[ownAsm.length - 1] : null;
        var base = Number(p5.baseRevision);
        if (!Number.isInteger(base) || base !== (previous ? previous.revision : 0)) {
          err('VERSION_CONFLICT', '學校已有較新的版本。本機內容已保留，請比較後再儲存。');
        }
        if (['draft', 'submitted'].indexOf(p5.status) < 0) err('INVALID_INPUT', '儲存狀態不正確。');
        var answers;
        try { answers = M.cleanResponses(r5.plan, mode, p5.responses); }
        catch (e) { err('INVALID_INPUT', e.message); }
        if (p5.status === 'submitted') {
          var missing = M.unanswered(r5.plan, mode, answers);
          if (missing.length) err('INCOMPLETE', '請回應或指出需要協助的地方：' + missing.join('、'));
        }
        var record = {
          id: previous ? previous.id : ('asm2_' + uuid()),
          schemaVersion: 2,
          roundId: r5.id,
          schoolYear: s5.schoolYear,
          classId: s5.classId,
          studentId: s5.studentId,
          ks: r5.plan.ks,
          planVersion: r5.plan.version,
          mode: mode,
          targetId: target,
          revision: base + 1,
          status: p5.status,
          responses: answers,
          feeling: String(p5.feeling || '').trim().slice(0, 80),
          updatedAt: nowIso(),
          requestId: req5.id,
          requestHash: req5.hash
        };
        store.assessments.push(record);
        saveStore(store);
        return ok(publicAssessment(record));
      }

      if (action === 'listPeerWorks') {
        var s6 = sessionFromToken(store, body.token);
        var r6 = studentRound(store, body, s6);
        if (['peer_open', 'closed'].indexOf(r6.phase) < 0) err('ROUND_NOT_OPEN', '老師尚未開放互評。請稍後再更新清單。');
        var pair = (r6.pairs || []).filter(function (x) { return x.studentId === s6.studentId; })[0];
        return ok({
          items: pair ? [publicArt(findArtwork(store, pair.artworkId))] : [],
          readOnly: r6.phase === 'closed'
        });
      }

      if (action === 'teacherContext') {
        var t = requireTeacher();
        var rowsT = roster();
        return ok({
          classes: t.classes.map(function (c) {
            var members = rowsT.filter(function (r) { return r.classId === c; });
            return {
              classId: c,
              grade: members.length ? members[0].grade : '',
              studentIds: members.map(function (r) { return r.studentId; })
            };
          }),
          templates: M ? Object.keys(M.templates).map(function (id) { return M.clone(M.templates[id]); }) : []
        });
      }

      if (action === 'teacherRounds') {
        var t2 = requireTeacher();
        var roundsT = latestById(store.rounds).filter(function (r) {
          return r.schoolYear === YEAR && t2.classes.indexOf(r.classId) >= 0;
        }).map(function (r) {
          var outR = clone(r);
          outR.progress = progress(store, r);
          return outR;
        });
        return ok({ rounds: roundsT });
      }

      if (action === 'createRound') {
        if (!M) err('SERVER_ERROR', '示範模組尚未就緒。');
        var t3 = requireTeacher();
        var p3 = body.payload || {};
        var req3 = requestMeta(body);
        if (t3.classes.indexOf(p3.classId) < 0) err('FORBIDDEN', '沒有此班的教師權限。');
        var existing = replay(store.rounds.filter(function (r) { return r.createdBy === t3.email; }), req3);
        if (existing) return ok(existing);
        var plan;
        try { plan = M.makePlan(p3.templateId, p3.objectiveIds, p3.activities); }
        catch (e) { err('INVALID_INPUT', e.message); }
        var rosterC = roster().filter(function (r) { return r.classId === p3.classId; });
        if (!rosterC.length || rosterC.some(function (r) { return r.grade !== plan.grade; })) {
          err('INVALID_INPUT', '課題年級與班別不符。');
        }
        var members = [];
        for (var m = 0; m < rosterC.length; m++) {
          if (!members.some(function (x) { return x.studentId === rosterC[m].studentId; })) {
            members.push({ studentId: rosterC[m].studentId, exempt: false, reason: '' });
          }
        }
        var round = {
          id: 'rnd2_' + uuid(),
          revision: 1,
          schoolYear: YEAR,
          classId: p3.classId,
          grade: plan.grade,
          plan: plan,
          members: members,
          pairs: [],
          phase: 'collecting',
          createdAt: nowIso(),
          createdBy: t3.email,
          requestId: req3.id,
          requestHash: req3.hash
        };
        store.rounds.push(round);
        saveStore(store);
        return ok(round);
      }

      if (action === 'updateRound') {
        if (!M) err('SERVER_ERROR', '示範模組尚未就緒。');
        var t4 = requireTeacher();
        var pU = body.payload || {};
        var rU = findRound(store, pU.roundId);
        if (rU.schoolYear !== YEAR || t4.classes.indexOf(rU.classId) < 0) err('FORBIDDEN', '不能管理此班課堂。');
        var reqU = requestMeta(body);
        var replayU = replay(store.rounds.filter(function (x) {
          return x.id === rU.id && x.updatedBy === t4.email;
        }), reqU);
        if (replayU) return ok(replayU);
        if (pU.baseRevision !== rU.revision) err('VERSION_CONFLICT', '課堂已有更新，請重新讀取。');
        if (rU.phase === 'closed') err('ROUND_NOT_OPEN', '已關閉課堂不能重新修改。');
        var outU = clone(rU);
        if (pU.exemptions !== undefined) {
          if (rU.phase !== 'collecting' || !Array.isArray(pU.exemptions)) err('INVALID_INPUT', '互評開放後配對及豁免已固定。');
          outU.members = outU.members.map(function (m) {
            var ex = pU.exemptions.filter(function (x) { return x.studentId === m.studentId; })[0];
            return { studentId: m.studentId, exempt: !!ex, reason: ex ? String(ex.reason || '').trim().slice(0, 300) : '' };
          });
          if (outU.members.some(function (m) { return m.exempt && !m.reason; })) err('INVALID_INPUT', '請記錄缺席或豁免原因。');
        }
        if (pU.phase === 'peer_open') {
          if (rU.phase !== 'collecting' || rU.plan.activities.indexOf('peer') < 0) err('INVALID_INPUT', '本課不能開放互評。');
          var eligible = progress(store, outU).filter(function (m) { return !m.exempt; });
          if (eligible.some(function (m) { return !m.selfSubmitted; })) err('NOT_READY', '仍有學生未交作品及自評，請先核對或記錄豁免。');
          try { outU.pairs = M.pairs(eligible); }
          catch (e) { err('NOT_READY', e.message); }
          outU.phase = 'peer_open';
        } else if (pU.phase === 'closed') {
          outU.phase = 'closed';
        } else if (pU.phase !== undefined && pU.phase !== rU.phase) {
          err('INVALID_INPUT', '課堂狀態不正確。');
        }
        outU.revision++;
        outU.updatedAt = nowIso();
        outU.updatedBy = t4.email;
        outU.requestId = reqU.id;
        outU.requestHash = reqU.hash;
        store.rounds.push(outU);
        saveStore(store);
        return ok(outU);
      }

      if (action === 'teacherOverview') {
        var t5 = requireTeacher();
        var rO = findRound(store, (body.payload || {}).roundId);
        if (rO.schoolYear !== YEAR || t5.classes.indexOf(rO.classId) < 0) err('FORBIDDEN', '不能管理此班課堂。');
        var submitted = latestById(store.assessments.filter(function (a) {
          return a.roundId === rO.id && a.status === 'submitted';
        }));
        var entries = submitted.map(function (a) {
          var outE = publicAssessment(a);
          outE.feedback = store.feedback.filter(function (f) {
            return f.assessmentId === a.id && f.assessmentRevision === a.revision;
          });
          outE.needsHelp = Object.keys(a.responses || {}).some(function (k) {
            return a.responses[k] && a.responses[k].support === 'help';
          });
          outE.pendingOral = false;
          return outE;
        });
        return ok({ round: rO, progress: progress(store, rO), entries: entries });
      }

      if (action === 'teacherDetail') {
        var t6 = requireTeacher();
        var pD = body.payload || {};
        var rD = findRound(store, pD.roundId);
        if (rD.schoolYear !== YEAR || t6.classes.indexOf(rD.classId) < 0) err('FORBIDDEN', '不能管理此班課堂。');
        var allD = store.assessments.filter(function (a) {
          return a.roundId === rD.id && a.id === pD.assessmentId && a.status === 'submitted';
        });
        if (!allD.length) err('NOT_FOUND', '找不到已交回應。');
        var selected = pD.revision == null ? allD[allD.length - 1] : allD.filter(function (a) {
          return a.revision === pD.revision;
        })[0];
        if (!selected) err('NOT_FOUND', '找不到指定的已交版本。');
        return ok({
          round: rD,
          assessment: publicAssessment(selected),
          history: allD.map(publicAssessment),
          feedback: store.feedback.filter(function (f) { return f.assessmentId === selected.id; }),
          artwork: selected.mode === 'reference' ? null : publicArt(findArtwork(store, selected.targetId))
        });
      }

      if (action === 'saveFeedback') {
        var t7 = requireTeacher();
        var pF = body.payload || {};
        var rF = findRound(store, pF.roundId);
        if (rF.schoolYear !== YEAR || t7.classes.indexOf(rF.classId) < 0) err('FORBIDDEN', '不能管理此班課堂。');
        var reqF = requestMeta(body);
        var evidence = store.assessments.filter(function (a) {
          return a.roundId === rF.id && a.id === pF.assessmentId && a.revision === pF.assessmentRevision && a.status === 'submitted';
        })[0];
        if (!evidence) err('NOT_FOUND', '必須選擇一個已交版本。');
        var priorF = replay(store.feedback.filter(function (f) {
          return f.assessmentId === evidence.id && f.createdBy === t7.email;
        }), reqF);
        if (priorF) {
          return ok({
            id: priorF.id,
            assessmentId: priorF.assessmentId,
            assessmentRevision: priorF.assessmentRevision,
            reviews: priorF.reviews,
            strengths: priorF.strengths,
            nextStep: priorF.nextStep,
            createdAt: priorF.createdAt
          });
        }
        var reviews = {};
        var qs = rF.plan.questions[evidence.mode] || [];
        for (var qi = 0; qi < qs.length; qi++) {
          var q = qs[qi];
          var x = (pF.reviews || {})[q.id] || {};
          reviews[q.id] = { rating: x.rating || '未評閱', oralNote: String(x.oralNote || '').trim().slice(0, 1000) };
        }
        var fb = {
          id: 'fb2_' + uuid(),
          roundId: rF.id,
          assessmentId: evidence.id,
          assessmentRevision: evidence.revision,
          reviews: reviews,
          strengths: String(pF.strengths || '').trim().slice(0, 1500),
          nextStep: String(pF.nextStep || '').trim().slice(0, 1500),
          createdAt: nowIso(),
          createdBy: t7.email,
          requestId: reqF.id,
          requestHash: reqF.hash
        };
        store.feedback.push(fb);
        saveStore(store);
        return ok({
          id: fb.id,
          assessmentId: fb.assessmentId,
          assessmentRevision: fb.assessmentRevision,
          reviews: fb.reviews,
          strengths: fb.strengths,
          nextStep: fb.nextStep,
          createdAt: fb.createdAt
        });
      }

      if (action === 'legacyRounds') {
        sessionFromToken(store, body.token);
        return ok({ rounds: [] });
      }

      if (action === 'legacyOwnWorks') {
        sessionFromToken(store, body.token);
        return ok({ items: [], nextOffset: null });
      }

      return fail('UNKNOWN_ACTION', '未知操作。');
    } catch (e) {
      return fail(e.code || 'SERVER_ERROR', e.code ? e.message : '服務暫時未能完成操作，請保留內容後再試。');
    }
  }

  function jsonResponse(obj, status) {
    return new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  function pathOf(input) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url);
      return new URL(url, location.href).pathname;
    } catch (_) {
      return '';
    }
  }

  function isMockPath(pathname) {
    return pathname === '/api' || pathname === '/preview/identity' ||
      pathname.slice(-4) === '/api' || pathname.slice(-17) === '/preview/identity';
  }

  var nativeFetch = root.fetch.bind(root);
  root.fetch = function (input, init) {
    var pathname = pathOf(input);
    if (!isMockPath(pathname)) return nativeFetch(input, init);
    init = init || {};
    var method = String(init.method || (typeof input !== 'string' && input && input.method) || 'GET').toUpperCase();
    if (method !== 'POST') return Promise.resolve(jsonResponse({}, 405));

    return Promise.resolve().then(function () {
      var bodyText = init.body;
      if (bodyText == null && typeof input !== 'string' && input && typeof input.clone === 'function') {
        return input.clone().text();
      }
      return typeof bodyText === 'string' ? bodyText : (bodyText == null ? '{}' : String(bodyText));
    }).then(function (raw) {
      var body = {};
      try { body = JSON.parse(raw || '{}'); } catch (_) { body = {}; }
      if (pathname === '/preview/identity' || pathname.slice(-17) === '/preview/identity') {
        if (body.role !== 'teacher' && body.role !== 'student') return jsonResponse({}, 400);
        setRole(body.role);
        return jsonResponse({ ok: true });
      }
      return jsonResponse(handleApi(body));
    }).catch(function (e) {
      return jsonResponse(fail('SERVER_ERROR', e.message || 'Preview mock error'), 500);
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
