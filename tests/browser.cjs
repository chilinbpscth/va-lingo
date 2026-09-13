const {chromium} = require('playwright');
const {createServer} = require('node:http');
const {readFile} = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 await require('node:fs/promises').mkdir(path.join(root,'test-results'),{recursive:true});
 const calls=[]; let expireSession=false; let recoveryStage;
 const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/exec') { let raw=''; for await(const chunk of req) raw+=chunk; const request=JSON.parse(raw); calls.push(request);
     if(expireSession && request.action==='getRoundStatus') {res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:false,error:{code:'TOKEN_EXPIRED',message:'登入已過期'}}));return;}
     const responses={login:{schoolYear:'2026-27',token:'synthetic-token',grade:'p4',displayLabel:'4A・01號'},getRoundStatus:{phase:'peer_open',readyCount:2,expectedCount:2,myProgress:{selfSubmitted:true,peerSubmittedCount:0,peerTargetCount:1,peerRemainingCount:1}},uploadArtwork:{artworkId:'art-synthetic',revision:1},saveAssessment:{assessmentId:'asm-synthetic',revision:1,completedStepCount:5},listPeerWorks:{items:[{artworkId:'peer-synthetic',revision:1,displayLabel:'同學作品',imageData:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLuzwAAAABJRU5ErkJggg=='}]}};
     if(request.action==='listOwnWorks') {
       const uploaded=calls.find(c=>c.action==='uploadArtwork').payload;
       const assessment=calls.find(c=>c.action==='saveAssessment' && c.payload.type==='self').payload;
       responses.listOwnWorks={items:[{artworkId:'art-synthetic',revision:1,roundId:request.payload.roundId,topicId:uploaded.topicId,stageId:recoveryStage,grade:'p4',imageData:uploaded.imageBase64,assessment:{steps:assessment.steps,pins:assessment.pins}}],nextOffset:null,totalCount:1};
     }
     res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,data:responses[request.action]||{}}));return; }
   const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}const body=await readFile(target);res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.json')?'application/json':target.endsWith('.html')?'text/html':target.endsWith('.png')?'image/png':'text/plain');res.end(body);}catch(e){res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.setDefaultTimeout(8000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('va-lingo-phase1-v1',JSON.stringify({studentId:'old-id',studentName:'LEGACY-PRIVATE',answers:{legacy:'keep'}})));
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
 async function login(studentId){await page.locator('#field-class').fill('4A');await page.locator('#field-student').fill(studentId);await page.locator('#btn-school-login').click();await page.waitForFunction(()=>document.querySelector('#gallery-status').textContent.includes('已登入'));}
 await page.evaluate(url=>localStorage.setItem('vaSubmitUrl',url), 'http://127.0.0.1:'+server.address().port+'/exec');
 await page.reload({waitUntil:'domcontentloaded'});
 await login('01');
 await page.locator('.source-tab[data-source="self"]').click();
 async function upload(color){const img=await page.evaluate(c=>{const v=document.createElement('canvas');v.width=64;v.height=64;v.getContext('2d').fillStyle=c;v.getContext('2d').fillRect(0,0,64,64);return v.toDataURL('image/png').split(',')[1];},color);await page.locator('#self-file').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(img,'base64')});}
 await upload('red');await page.locator('#self-work-history option').nth(1).waitFor({state:'attached'});
 const workA=await page.locator('#self-work-history').inputValue();
 await page.locator('#step-content .scaffold-blank').first().fill('我的第一份作品');
 await upload('blue');await page.locator('#self-work-history option').nth(2).waitFor({state:'attached'});
 assert.equal(await page.locator('#step-content .scaffold-blank').first().innerText(),'');
 await page.selectOption('#self-work-history',workA);
 assert.match(await page.locator('#step-content .scaffold-blank').first().innerText(),/我的第一份作品/);
 await login('02');await page.locator('.source-tab[data-source="self"]').click();
 assert.equal(await page.locator('#self-work-history').count(),0);
 assert.equal(await page.locator('#step-content .scaffold-blank').first().innerText(),'');
 await login('01');
 assert.match(await page.locator('#step-content .scaffold-blank').first().innerText(),/我的第一份作品/);
 assert.equal(await page.locator('#self-work-history option').count(),3);
 await page.reload({waitUntil:'domcontentloaded'});
 await login('01');
 assert.match(await page.locator('#step-content .scaffold-blank').first().innerText(),/我的第一份作品/);
 const storage=await page.evaluate(()=>({...localStorage}));
 assert.equal(JSON.parse(storage['va-lingo-phase1-v1']).answers.legacy,'keep');
 assert(!JSON.stringify(storage).includes('synthetic-token'));
 assert(!JSON.stringify(Object.entries(storage).filter(([k])=>k.startsWith('va-lingo-drafts-v2:'))).includes('PRIVATE'));
 assert(!(await page.locator('body').innerText()).includes('PRIVATE'));
 // Simulate full browser storage: switching students must not discard the unsaved work.
 await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('va-lingo-drafts-v2:'))throw new DOMException('full','QuotaExceededError');return window.originalSetItem.call(this,k,v);};});
 await page.locator('#step-content .scaffold-blank').first().fill('空間不足時保留');
 await page.locator('#field-class').fill('4A');await page.locator('#field-student').fill('02');await page.locator('#btn-school-login').click();
 assert.equal(await page.locator('#field-student').inputValue(),'01');
 assert.match(await page.locator('#step-content .scaffold-blank').first().innerText(),/空間不足時保留/);
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});
 await page.reload({waitUntil:'domcontentloaded'});
 await login('01');
 await page.locator('.source-tab[data-source="self"]').click();
 await page.locator('#step-content .scaffold-blank').first().fill('我的第一份作品');
 // The Apps Script contract is login -> upload -> self assessment, then a manual peer refresh.
 for (let step=0;step<5;step++) { await page.locator('.step-btn').nth(step).click(); const blanks=page.locator('#step-content .scaffold-blank'); const n=await blanks.count(); for(let i=0;i<n;i++) await blanks.nth(i).fill('線條'); }
 await page.locator('#gallery-session-input').fill('4A-2026-S1');
 await page.locator('#btn-gallery-publish').click();
 await page.waitForFunction(()=>document.querySelector('#gallery-status').textContent.includes('我的互評：0/1'));
 await page.locator('#btn-gallery-retry').click();
 await page.waitForFunction(()=>document.querySelector('#gallery-status').textContent.includes('已更新'));
 await page.locator('[data-live-work="peer-synthetic"]').click();
 await page.locator('#gallery-lb-use').click();
 for (let step=0;step<5;step++) { await page.locator('.step-btn').nth(step).click(); const blanks=page.locator('#step-content .scaffold-blank'); const n=await blanks.count(); for(let i=0;i<n;i++) await blanks.nth(i).fill('同學作品細節'); }
 await page.locator('#btn-peer-submit').click();
 await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('互評已提交'));
 const apiActions=calls.map(c=>c.action);
 assert(apiActions.includes('login'));
 assert.deepEqual(apiActions.slice(-6),['uploadArtwork','saveAssessment','getRoundStatus','listPeerWorks','listPeerWorks','saveAssessment']);
 assert.equal(calls.filter(c=>c.action==='saveAssessment')[0].payload.type,'self');
 assert.equal(calls.filter(c=>c.action==='saveAssessment')[1].payload.type,'peer');
 assert.equal(calls.find(c=>c.action==='saveAssessment').payload.steps.feel.complete,true);
 assert.equal(calls.find(c=>c.action==='listPeerWorks').payload.roundId,'4A2026');
 // A clean device has no saved artwork or answers; restore through the real button.
 recoveryStage=await page.evaluate(()=>JSON.parse(Object.entries(localStorage).find(([k])=>k.startsWith('va-lingo-drafts-v2:'))[1]).stage);
 await page.evaluate(()=>{for(const k of Object.keys(localStorage)) if(k.startsWith('va-lingo-drafts-v2:'))localStorage.removeItem(k);});
 await page.reload({waitUntil:'domcontentloaded'});
 await login('01');
 await page.locator('#gallery-session-input').fill('4A2026');
 await page.locator('#btn-own-recover').click();
 await page.waitForFunction(()=>document.querySelector('#gallery-status').textContent.includes('已取回 1'));
 await page.locator('.step-btn').first().click();
 assert.match(await page.locator('#step-content .scaffold-blank').first().innerText(),/線條/);
 assert.equal(await page.locator('#self-work-history option').count(),2);
 await page.locator('#step-content .scaffold-blank').first().locator('.blank-clear').click();
 await page.locator('#step-content .scaffold-blank').first().fill('取回後修改');
 await page.locator('#btn-own-recover').click();
 await page.waitForFunction(()=>document.querySelector('#gallery-status').textContent.includes('已取回 0'));
 assert.match(await page.locator('#step-content .scaffold-blank').first().innerText(),/取回後修改/);
 expireSession=true;
 await page.locator('#btn-gallery-join').click();
 await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('重新登入'));
 assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(root,'test-results/draft-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(root,'test-results/draft-mobile.png'),fullPage:true});
 console.log('PASS browser: image history, answer restore, student isolation, reload, legacy preservation, no displayed names; zero page errors.');
 } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
