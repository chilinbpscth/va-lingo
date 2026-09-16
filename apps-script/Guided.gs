/* Guided v2: independent, append-only records; v1 data and API remain unchanged.
 * Deploy together with Code.gs and generated GuidedModel.gs (npm run build:google).
 */
var SCHOOL_DOMAIN = 'chilinbps.edu.hk';

function v2Error_(code, message) { var e = new Error(message); e.code = code; throw e; }
function v2Text_(value, max) { var s = String(value == null ? '' : value).trim(); if (s.length > max) v2Error_('INVALID_INPUT', '輸入內容太長。'); return s; }
function v2School_() {
  var email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email || email.split('@')[1] !== SCHOOL_DOMAIN) v2Error_('SCHOOL_AUTH_REQUIRED', '請使用學校 Google 帳戶重新開啟藝術時間膠囊。');
  return email;
}
function v2Teacher_() {
  var email = v2School_();
  var access = rows_(apiSheet_('teacher_access_v2', ['email','classIds','active'])).filter(function(r) { return String(r.email).toLowerCase() === email && String(r.active).toLowerCase() === 'true'; })[0];
  if (!access) v2Error_('FORBIDDEN', '此帳戶未獲教師權限。');
  var classes; try { classes = JSON.parse(access.classIds); } catch (_) { classes = []; }
  if (!Array.isArray(classes) || !classes.length) v2Error_('FORBIDDEN', '尚未為教師設定班別。');
  return {email:email, classes:classes.map(String)};
}
function v2Student_(body) { v2School_(); try { return requireSession_(body); } catch (e) { v2Error_(e.message === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'AUTH_REQUIRED', '請重新選擇班別及學號登入；本機內容會保留。'); } }
function v2Roster_() { return rows_(apiSheet_(ROSTER_SHEET, ['schoolYear','classId','studentId','grade','displayLabel','active','updatedAt'])).filter(function(r) { return value_(r,'schoolYear') === ACTIVE_SCHOOL_YEAR && String(r.active).toLowerCase() !== 'false'; }); }
function v2All_(type) { return rows_(apiSheet_(type + '_v2', ['recordId','dataJson'])).map(function(r) { return JSON.parse(r.dataJson); }); }
function v2Latest_(items) { var map = {}; items.forEach(function(x) { map[x.id] = x; }); return Object.keys(map).map(function(id) { return map[id]; }); }
function v2Append_(type, item) { appendApiRow_(apiSheet_(type + '_v2', ['recordId','dataJson']), ['recordId','dataJson'], [item.id, JSON.stringify(item)]); return item; }
function v2Round_(id) { var r = v2Latest_(v2All_('rounds')).filter(function(x) { return x.id === id; })[0]; if (!r) v2Error_('NOT_FOUND', '找不到課堂。'); return r; }
function v2StudentRound_(body, student) {
  var r = v2Round_((body.payload || {}).roundId);
  if (r.schoolYear !== student.schoolYear || r.classId !== student.classId || r.grade !== student.grade || !r.members.some(function(m) { return m.studentId === student.studentId; })) v2Error_('FORBIDDEN', '不能進入此課堂。');
  return r;
}
function v2TeacherRound_(body, teacher) { var r = v2Round_((body.payload || {}).roundId); if (r.schoolYear !== ACTIVE_SCHOOL_YEAR || teacher.classes.indexOf(r.classId) < 0) v2Error_('FORBIDDEN', '不能管理此班課堂。'); return r; }
function v2PublicRound_(r, student) { var member = r.members.filter(function(m) { return m.studentId === student.studentId; })[0]; return {id:r.id,revision:r.revision,classId:r.classId,grade:r.grade,phase:r.phase,plan:r.plan,exempt:!!(member && member.exempt),createdAt:r.createdAt}; }
function v2Request_(body) { var id = v2Text_(body.requestId,100); if (!id) v2Error_('INVALID_INPUT','缺少提交識別碼。'); return {id:id,hash:tokenHash_(JSON.stringify(body.payload || {}))}; }
function v2Replay_(items, request) {
  var old = items.filter(function(x) { return x.requestId === request.id; })[0];
  if (old && old.requestHash !== request.hash) v2Error_('REQUEST_CONFLICT', '這次重試的內容不同，請保留內容並重新操作。');
  return old;
}
function v2Owned_(a,s) { return a.schoolYear === s.schoolYear && a.classId === s.classId && a.studentId === s.studentId; }
function v2Submitted_(roundId) { return v2Latest_(v2All_('assessments').filter(function(a) { return a.roundId === roundId && a.status === 'submitted'; })); }
function v2Progress_(r) {
  var submitted = v2Submitted_(r.id);
  return r.members.map(function(m) {
    var own = submitted.filter(function(a) { return a.studentId === m.studentId; });
    var latestSelf = own.filter(function(a) { return a.mode === 'self'; }).sort(function(a,b) { return a.updatedAt.localeCompare(b.updatedAt) || a.revision-b.revision; }).pop();
    return {studentId:m.studentId,exempt:!!m.exempt,exemptionReason:m.reason || '',referenceSubmitted:own.some(function(a) { return a.mode === 'reference'; }),selfSubmitted:!!latestSelf,artworkId:latestSelf ? latestSelf.targetId : null,peerSubmitted:own.some(function(a) { return a.mode === 'peer'; })};
  });
}
function v2Feedback_(assessmentId, revision) { return v2All_('feedback').filter(function(f) { return f.assessmentId === assessmentId && (revision == null || f.assessmentRevision === revision); }); }
function v2PublicFeedback_(f) { return {id:f.id,assessmentId:f.assessmentId,assessmentRevision:f.assessmentRevision,reviews:f.reviews,strengths:f.strengths,nextStep:f.nextStep,createdAt:f.createdAt}; }
function v2Image_(art) { return 'data:' + art.mime + ';base64,' + Utilities.base64Encode(DriveApp.getFileById(art.driveFileId).getBlob().getBytes()); }
function v2Artwork_(id) { var art = v2All_('artworks').filter(function(a) { return a.id === id; })[0]; if (!art) v2Error_('NOT_FOUND','找不到作品。'); return art; }
function v2PublicArt_(art) { return {id:art.id,roundId:art.roundId,createdAt:art.createdAt,imageData:v2Image_(art)}; }
function v2AssessmentPublic_(a) { var out=VAGuided.clone(a); delete out.requestId;delete out.requestHash; return out; }

function v2LoginOptions_() {
  v2School_(); var classes = {};
  v2Roster_().forEach(function(r) { var c=value_(r,'classId'); if (!classes[c]) classes[c]=[]; var id=value_(r,'studentId'); if(classes[c].indexOf(id)<0)classes[c].push(id); });
  return {classes:Object.keys(classes).sort().map(function(c) { return {classId:c,studentIds:classes[c].sort(function(a,b){return a.localeCompare(b,'en',{numeric:true});})}; })};
}
function v2MyRounds_(body) {
  var s=v2Student_(body), rounds=v2Latest_(v2All_('rounds')).filter(function(r){return r.schoolYear===s.schoolYear && r.classId===s.classId && r.grade===s.grade && r.members.some(function(m){return m.studentId===s.studentId;});});
  return {rounds:rounds.map(function(r){var out=v2PublicRound_(r,s);out.progress=v2Progress_(r).filter(function(p){return p.studentId===s.studentId;})[0];return out;})};
}
function v2Notebook_(body) {
  var s=v2Student_(body),r=v2StudentRound_(body,s);
  var all=v2All_('assessments').filter(function(a){return a.roundId===r.id && v2Owned_(a,s);});
  var history=all.map(function(a){var x=v2AssessmentPublic_(a);x.feedback=v2Feedback_(a.id,a.revision).map(v2PublicFeedback_);return x;});
  var myArtIds=v2All_('artworks').filter(function(a){return a.roundId===r.id && v2Owned_(a,s);}).map(function(a){return {id:a.id,createdAt:a.createdAt};});
  var received=v2Submitted_(r.id).filter(function(a){return a.mode==='peer' && myArtIds.some(function(w){return w.id===a.targetId;});}).map(function(a){return {id:a.id,targetId:a.targetId,revision:a.revision,responses:a.responses,updatedAt:a.updatedAt};});
  return {round:v2PublicRound_(r,s),assessments:history,artworks:myArtIds,received:received};
}
function v2GetArtwork_(body) {
  var s=v2Student_(body),r=v2StudentRound_(body,s),art=v2Artwork_((body.payload || {}).artworkId);
  if(art.roundId!==r.id || (!v2Owned_(art,s) && !r.pairs.some(function(p){return p.studentId===s.studentId && p.artworkId===art.id; })))v2Error_('FORBIDDEN','不能查看這件作品。');
  return v2PublicArt_(art);
}
function v2Upload_(body) {
  var s=v2Student_(body),r=v2StudentRound_(body,s),p=body.payload||{},req=v2Request_(body);
  if(r.plan.activities.indexOf('self')<0)v2Error_('FORBIDDEN','本課沒有作品上傳活動。');
  var own=v2All_('artworks').filter(function(a){return a.roundId===r.id && v2Owned_(a,s);});
  var prior=v2Replay_(own,req);if(prior)return {artworkId:prior.id};
  if(r.phase!=='collecting')v2Error_('ROUND_NOT_OPEN','本課已停止收集新作品，現有作品仍可查看。');
  var image=imageBlob_(p.imageBase64,p.imageMime),id=randomId_('art2');
  var folder=ensureChildFolder_(ensureChildFolder_(ensureChildFolder_(DriveApp.getFolderById(ROOT_FOLDER_ID),s.schoolYear),s.classId),s.studentId);
  var file=folder.createFile(Utilities.newBlob(image.bytes,image.mime,id+'.'+image.ext));
  v2Append_('artworks',{id:id,roundId:r.id,schoolYear:s.schoolYear,classId:s.classId,studentId:s.studentId,driveFileId:file.getId(),mime:image.mime,createdAt:nowIso_(),requestId:req.id,requestHash:req.hash});
  return {artworkId:id};
}
function v2SaveAssessment_(body) {
  var s=v2Student_(body),r=v2StudentRound_(body,s),p=body.payload||{},req=v2Request_(body),mode=p.mode,target=p.targetId;
  if(r.plan.activities.indexOf(mode)<0)v2Error_('INVALID_INPUT','本課沒有這項活動。');
  if(mode==='reference'){if(target!==r.plan.reference.id)v2Error_('FORBIDDEN','名作與課題不符。');}
  else {var art=v2Artwork_(target);if(art.roundId!==r.id)v2Error_('FORBIDDEN','作品與課堂不符。');
    if(mode==='self'&&!v2Owned_(art,s))v2Error_('FORBIDDEN','只能自評自己的作品。');
    if(mode==='peer'&&!r.pairs.some(function(pair){return pair.studentId===s.studentId&&pair.artworkId===target&&pair.targetStudentId!==s.studentId;}))v2Error_('FORBIDDEN','只能評賞本課獲配的作品。');
  }
  var own=v2All_('assessments').filter(function(a){return a.roundId===r.id&&v2Owned_(a,s)&&a.mode===mode&&a.targetId===target;});
  var replay=v2Replay_(own,req);if(replay)return v2AssessmentPublic_(replay);
  if(r.phase==='closed' || (mode==='peer'&&r.phase!=='peer_open'))v2Error_('ROUND_NOT_OPEN','課堂已關閉，或老師尚未開放互評。');
  var previous=own.length?own[own.length-1]:null,base=Number(p.baseRevision);
  if(!Number.isInteger(base)||base!==(previous?previous.revision:0))v2Error_('VERSION_CONFLICT','學校已有較新的版本。本機內容已保留，請比較後再儲存。');
  if(['draft','submitted'].indexOf(p.status)<0)v2Error_('INVALID_INPUT','儲存狀態不正確。');
  var answers;try{answers=VAGuided.cleanResponses(r.plan,mode,p.responses);}catch(e){v2Error_('INVALID_INPUT',e.message);}
  if(p.status==='submitted') {var missing=VAGuided.unanswered(r.plan,mode,answers);if(missing.length)v2Error_('INCOMPLETE','請回應或指出需要協助的地方：'+missing.join('、'));}
  var record={id:previous?previous.id:randomId_('asm2'),schemaVersion:2,roundId:r.id,schoolYear:s.schoolYear,classId:s.classId,studentId:s.studentId,ks:r.plan.ks,planVersion:r.plan.version,mode:mode,targetId:target,revision:base+1,status:p.status,responses:answers,feeling:v2Text_(p.feeling,80),updatedAt:nowIso_(),requestId:req.id,requestHash:req.hash};
  v2Append_('assessments',record);return v2AssessmentPublic_(record);
}
function v2PeerWork_(body) {
  var s=v2Student_(body),r=v2StudentRound_(body,s);
  if(['peer_open','closed'].indexOf(r.phase)<0)v2Error_('ROUND_NOT_OPEN','老師尚未開放互評。請稍後再更新清單。');
  var pair=r.pairs.filter(function(p){return p.studentId===s.studentId;})[0];
  return {items:pair?[v2PublicArt_(v2Artwork_(pair.artworkId))]:[],readOnly:r.phase==='closed'};
}
function v2TeacherContext_() {
  var t=v2Teacher_(),roster=v2Roster_();
  return {classes:t.classes.map(function(c){var members=roster.filter(function(r){return value_(r,'classId')===c;});return {classId:c,grade:members.length?value_(members[0],'grade'):'',studentIds:members.map(function(r){return value_(r,'studentId');})};}),templates:Object.keys(VAGuided.templates).map(function(id){return VAGuided.clone(VAGuided.templates[id]);})};
}
function v2TeacherRounds_() {var t=v2Teacher_();return {rounds:v2Latest_(v2All_('rounds')).filter(function(r){return r.schoolYear===ACTIVE_SCHOOL_YEAR&&t.classes.indexOf(r.classId)>=0;}).map(function(r){var out=VAGuided.clone(r);out.progress=v2Progress_(r);return out;})};}
function v2CreateRound_(body) {
  var t=v2Teacher_(),p=body.payload||{},req=v2Request_(body);
  if(t.classes.indexOf(p.classId)<0)v2Error_('FORBIDDEN','沒有此班的教師權限。');
  var existing=v2Replay_(v2All_('rounds').filter(function(r){return r.createdBy===t.email;}),req);if(existing)return existing;
  var plan;try{plan=VAGuided.makePlan(p.templateId,p.objectiveIds,p.activities);}catch(e){v2Error_('INVALID_INPUT',e.message);}
  var roster=v2Roster_().filter(function(r){return value_(r,'classId')===p.classId;});
  if(!roster.length||roster.some(function(r){return value_(r,'grade')!==plan.grade;}))v2Error_('INVALID_INPUT','課題年級與班別不符。');
  var members=[];roster.forEach(function(r){var id=value_(r,'studentId');if(!members.some(function(m){return m.studentId===id;}))members.push({studentId:id,exempt:false,reason:''});});
  return v2Append_('rounds',{id:randomId_('rnd2'),revision:1,schoolYear:ACTIVE_SCHOOL_YEAR,classId:p.classId,grade:plan.grade,plan:plan,members:members,pairs:[],phase:'collecting',createdAt:nowIso_(),createdBy:t.email,requestId:req.id,requestHash:req.hash});
}
function v2UpdateRound_(body) {
  var t=v2Teacher_(),r=v2TeacherRound_(body,t),p=body.payload||{},req=v2Request_(body);
  var replay=v2Replay_(v2All_('rounds').filter(function(x){return x.id===r.id&&x.updatedBy===t.email;}),req);if(replay)return replay;
  if(p.baseRevision!==r.revision)v2Error_('VERSION_CONFLICT','課堂已有更新，請重新讀取。');
  if(r.phase==='closed')v2Error_('ROUND_NOT_OPEN','已關閉課堂不能重新修改。');
  var out=VAGuided.clone(r);
  if(p.exemptions!==undefined){
    if(r.phase!=='collecting'||!Array.isArray(p.exemptions))v2Error_('INVALID_INPUT','互評開放後配對及豁免已固定。');
    if(p.exemptions.some(function(x){return !r.members.some(function(m){return m.studentId===x.studentId;});}))v2Error_('INVALID_INPUT','豁免名單不屬於此課堂。');
    out.members=out.members.map(function(m){var ex=p.exemptions.filter(function(x){return x.studentId===m.studentId;})[0];return {studentId:m.studentId,exempt:!!ex,reason:ex?v2Text_(ex.reason,300):''};});
    if(out.members.some(function(m){return m.exempt&&!m.reason;}))v2Error_('INVALID_INPUT','請記錄缺席或豁免原因。');
  }
  if(p.phase==='peer_open'){
    if(r.phase!=='collecting'||r.plan.activities.indexOf('peer')<0)v2Error_('INVALID_INPUT','本課不能開放互評。');
    var eligible=v2Progress_(out).filter(function(m){return !m.exempt;});
    if(eligible.some(function(m){return !m.selfSubmitted;}))v2Error_('NOT_READY','仍有學生未交作品及自評，請先核對或記錄豁免。');
    try{out.pairs=VAGuided.pairs(eligible);}catch(e){v2Error_('NOT_READY',e.message);}out.phase='peer_open';
  }else if(p.phase==='closed'){out.phase='closed';}
  else if(p.phase!==undefined&&p.phase!==r.phase)v2Error_('INVALID_INPUT','課堂狀態不正確。');
  out.revision++;out.updatedAt=nowIso_();out.updatedBy=t.email;out.requestId=req.id;out.requestHash=req.hash;
  return v2Append_('rounds',out);
}
function v2TeacherOverview_(body) {
  var t=v2Teacher_(),r=v2TeacherRound_(body,t),submitted=v2Submitted_(r.id);
  var entries=submitted.map(function(a){var out=v2AssessmentPublic_(a);out.feedback=v2Feedback_(a.id,a.revision).map(v2PublicFeedback_);out.needsHelp=Object.values(a.responses).some(function(x){return x.support==='help';});var latest=out.feedback[out.feedback.length-1];out.pendingOral=Object.keys(a.responses).some(function(id){return a.responses[id].support==='oral'&&!(latest&&latest.reviews[id]&&latest.reviews[id].oralNote);});return out;});
  return {round:r,progress:v2Progress_(r),entries:entries};
}
function v2TeacherDetail_(body) {
  var t=v2Teacher_(),r=v2TeacherRound_(body,t),p=body.payload||{};
  var all=v2All_('assessments').filter(function(a){return a.roundId===r.id&&a.id===p.assessmentId&&a.status==='submitted';});
  if(!all.length)v2Error_('NOT_FOUND','找不到已交回應。');
  var selected=p.revision==null?all[all.length-1]:all.filter(function(a){return a.revision===p.revision;})[0];
  if(!selected)v2Error_('NOT_FOUND','找不到指定的已交版本。');
  return {round:r,assessment:v2AssessmentPublic_(selected),history:all.map(v2AssessmentPublic_),feedback:v2Feedback_(selected.id).map(v2PublicFeedback_),artwork:selected.mode==='reference'?null:v2PublicArt_(v2Artwork_(selected.targetId))};
}
function v2SaveFeedback_(body) {
  var t=v2Teacher_(),r=v2TeacherRound_(body,t),p=body.payload||{},req=v2Request_(body);
  var evidence=v2All_('assessments').filter(function(a){return a.roundId===r.id&&a.id===p.assessmentId&&a.revision===p.assessmentRevision&&a.status==='submitted';})[0];
  if(!evidence)v2Error_('NOT_FOUND','必須選擇一個已交版本。');
  var prior=v2Replay_(v2All_('feedback').filter(function(f){return f.assessmentId===evidence.id&&f.createdBy===t.email;}),req);if(prior)return v2PublicFeedback_(prior);
  var reviews={};r.plan.questions[evidence.mode].forEach(function(q){var x=(p.reviews||{})[q.id]||{};var rating=x.rating||'未評閱';if(VAGuided.ratings.indexOf(rating)<0)v2Error_('INVALID_INPUT','教師觀察狀態不正確。');var oral=v2Text_(x.oralNote,1000);if(oral&&evidence.responses[q.id].support!=='oral')v2Error_('INVALID_INPUT','此問題沒有待口頭回應。');reviews[q.id]={rating:rating,oralNote:oral};});
  var f={id:randomId_('fb2'),roundId:r.id,assessmentId:evidence.id,assessmentRevision:evidence.revision,reviews:reviews,strengths:v2Text_(p.strengths,1500),nextStep:v2Text_(p.nextStep,1500),createdAt:nowIso_(),createdBy:t.email,requestId:req.id,requestHash:req.hash};
  if(!f.strengths&&!f.nextStep&&!Object.values(reviews).some(function(x){return x.rating!=='未評閱'||x.oralNote;}))v2Error_('INVALID_INPUT','請先記錄觀察、口頭回應或回饋。');
  return v2PublicFeedback_(v2Append_('feedback',f));
}
function v2LegacyRounds_(body){var s=v2Student_(body);return {rounds:rows_(apiSheet_(ROUND_SHEET,['roundId','schoolYear','classId','grade','stageId','topicId','phase','peerTargetCount','openedAt','peerOpenedAt','closedAt'])).filter(function(r){return value_(r,'schoolYear')===s.schoolYear&&value_(r,'classId')===s.classId&&value_(r,'grade')===s.grade;}).map(function(r){return {id:value_(r,'roundId'),topicId:value_(r,'topicId')};})};}

function apiV2_(body) {
  try {
    var action=body.action;
    var writes=['createRound','updateRound','uploadArtwork','saveAssessment','saveFeedback','login'];
    var run=function(){
      if(action==='login'){v2School_();return login_(body);}
      var routes={loginOptions:v2LoginOptions_,listMyRounds:v2MyRounds_,getNotebook:v2Notebook_,getArtwork:v2GetArtwork_,uploadArtwork:v2Upload_,saveAssessment:v2SaveAssessment_,listPeerWorks:v2PeerWork_,teacherContext:v2TeacherContext_,teacherRounds:v2TeacherRounds_,createRound:v2CreateRound_,updateRound:v2UpdateRound_,teacherOverview:v2TeacherOverview_,teacherDetail:v2TeacherDetail_,saveFeedback:v2SaveFeedback_,legacyRounds:v2LegacyRounds_};
      if(action==='legacyOwnWorks'){v2Student_(body);return listOwnWorks_(body);}
      if(!routes[action])v2Error_('UNKNOWN_ACTION','未知操作。');
      return apiOk_(routes[action](body));
    };
    // login already holds the v1 write lock; avoid nested ScriptLock acquisition.
    return writes.indexOf(action)>=0&&action!=='login'?withWriteLock_(run):run();
  } catch(e) {return apiFail_(e.code||'SERVER_ERROR',e.code?e.message:'服務暫時未能完成操作，請保留內容後再試。');}
}
