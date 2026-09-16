const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');

// In-memory Google services. The production Code.gs + Guided.gs execute unmodified.
function createApi(snapshot) {
  const data=snapshot||{sheets:{},files:{},serial:0};
  let email='student@chilinbps.edu.hk';
  const sheet=name=>({
    getLastRow:()=>data.sheets[name].length,
    getDataRange:()=>({getValues:()=>structuredClone(data.sheets[name])}),
    getRangeList:()=>({setNumberFormat(){}}),
    appendRow(row){data.sheets[name].push(row.map(v=>typeof v==='string'&&v.startsWith("'")?v.slice(1):typeof v==='string'&&/^\d+$/.test(v)?Number(v):v));}
  });
  const folder={getFoldersByName:()=>({hasNext:()=>true,next:()=>folder}),createFolder:()=>folder,createFile(blob){const id='file-'+(++data.serial);data.files[id]=blob;return {getId:()=>id};}};
  const context={console,Date,JSON,Math,Number,String,Array,Object,RegExp,Error,Set,
    Session:{getActiveUser:()=>({getEmail:()=>email}),getEffectiveUser:()=>({getEmail:()=> 'owner@chilinbps.edu.hk'})},
    ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({setMimeType(){return this;},getContent:()=>text})},
    SpreadsheetApp:{openById:()=>({getSheetByName:name=>data.sheets[name]?sheet(name):null,insertSheet(name){data.sheets[name]=[];return sheet(name);}})},
    DriveApp:{getFolderById:()=>folder,getFileById(id){if(!data.files[id])throw new Error('missing file');return {getBlob:()=>({getBytes:()=>data.files[id].bytes,getDataAsString:()=>Buffer.from(data.files[id].bytes).toString()})};}},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_a,s)=>[...crypto.createHash('sha256').update(s).digest()],getUuid:()=>crypto.randomUUID(),base64Decode:s=>[...Buffer.from(s,'base64')],base64Encode:b=>Buffer.from(b).toString('base64'),newBlob:(bytes,mime,name)=>({bytes,mime,name})}
  };
  vm.createContext(context);
  for(const file of ['assets/js/guided-model.js','apps-script/Code.gs','apps-script/Guided.gs'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  context.SHEET_ID='synthetic-sheet';context.ROOT_FOLDER_ID='synthetic-root';
  function invoke(body,as='student@chilinbps.edu.hk') {email=as;return JSON.parse(context.doPost({postData:{contents:JSON.stringify(body)}}).getContent());}
  function seed(){
    data.sheets.roster_v1=[['schoolYear','classId','studentId','grade','displayLabel','active','updatedAt']];
    for(const grade of [2,5])for(const id of ['01','02','03'])data.sheets.roster_v1.push(['2026-27',grade+'A',id,'p'+grade,'PRIVATE-NAME',true,'']);
    data.sheets.teacher_access_v2=[['email','classIds','active'],['teacher@chilinbps.edu.hk','["2A","5A"]',true],['other@chilinbps.edu.hk','["5B"]',true]];
  }
  if(!snapshot)seed();
  return {data,context,invoke};
}
module.exports={createApi};
