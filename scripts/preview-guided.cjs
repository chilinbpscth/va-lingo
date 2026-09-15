const {createServer}=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {createApi}=require('../tests/helpers/apps-script.cjs');
const M=require('../assets/js/guided-model.js');
const root=path.resolve(__dirname,'..');
function makePreview({file,seedRounds=true,hosted=false}={}){
 const snapshot=file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):undefined;
 const api=createApi(snapshot);let serial=0;
 if(!snapshot&&seedRounds)for(const grade of ['p2','p5'])api.invoke({schemaVersion:2,action:'createRound',requestId:'demo-'+grade,payload:{classId:grade.slice(1)+'A',templateId:grade,objectiveIds:M.templates[grade].questions.reference.map(q=>q.id),activities:['reference','self','peer']}},'teacher@chilinbps.edu.hk');
 const persist=()=>{if(file){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(api.data));}};
 const server=createServer(async(req,res)=>{try{
   const url=new URL(req.url,'http://localhost');
   res.setHeader('Cache-Control','no-store');
   if(req.method==='POST'&&['/api','/preview/identity'].includes(url.pathname)){
     let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1024*1024){res.writeHead(413).end();return;}}
     const body=JSON.parse(raw||'{}');res.setHeader('Content-Type','application/json; charset=utf-8');
     if(url.pathname==='/preview/identity'){if(!['teacher','student'].includes(body.role)){res.writeHead(400).end('{}');return;}res.setHeader('Set-Cookie','va_preview_role='+body.role+'; HttpOnly; SameSite=Strict; Path=/');res.end('{"ok":true}');return;}
     const role=/(?:^|;\s*)va_preview_role=teacher(?:;|$)/.test(req.headers.cookie||'')?'teacher':'student';
     const reply=api.invoke(body,role+'@chilinbps.edu.hk');persist();res.end(JSON.stringify(reply));return;
   }
   if(req.method!=='GET'){res.writeHead(405).end();return;}
   if(hosted&&url.pathname==='/'){
     api.context.APP_HTML_FILE_ID='hosted-app';
     api.data.files['hosted-app']={bytes:[...fs.readFileSync(path.join(root,'build/google/App.html'))]};
     api.context.ScriptApp={getService:()=>({getUrl:()=> 'http://'+req.headers.host+'/'})};
     api.context.HtmlService={createHtmlOutput:html=>({html,setTitle(){return this;},addMetaTag(){return this;}})};
     let html=api.context.doGet({parameter:Object.fromEntries(url.searchParams)}).html;
     if(url.searchParams.get('demo')!=='1')html=html.replace('<head>','<head><script>window.VA_PREVIEW=true;</script>');
     res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;
   }
   if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return;}
   const requested=decodeURIComponent(url.pathname),relative=requested==='/'?(hosted?'build/google/App.html':'index.html'):requested.slice(1);
   if(relative!=='index.html'&&relative!=='legacy.html'&&relative!=='legacy-firebase.html'&&relative!=='build/google/App.html'&&!relative.startsWith('assets/')){res.writeHead(404).end();return;}
   const filename=path.resolve(root,relative);if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
   let data=fs.readFileSync(filename);const ext=path.extname(filename);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png'})[ext]||'application/octet-stream');
   if(ext==='.html')data=data.toString().replace('<head>','<head><script>window.VA_PREVIEW=true;</script>');
   res.end(data);
 }catch(e){res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'}).end('Preview error: '+e.message);}});
 return {server,api,persist};
}
if(require.main===module){const file=process.env.VA_PREVIEW_DATA||path.resolve(root,'work/art-time-capsule-preview-data.json');const {server,persist}=makePreview({file});server.listen(Number(process.env.PORT)||8768,'127.0.0.1',()=>console.log('藝言堂・時間膠囊 local preview: http://127.0.0.1:'+server.address().port));process.on('SIGINT',()=>{persist();server.close(()=>process.exit(0));});}
module.exports={makePreview};
