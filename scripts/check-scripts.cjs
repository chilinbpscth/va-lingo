const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
let count=0;
for(const file of ['index.html','legacy-firebase.html','assets/demo/index.html'])for(const match of fs.readFileSync(file,'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(/\bsrc=/.test(match[1]))continue;new vm.Script(match[2],{filename:file+':inline-'+(++count)});}
for(const file of fs.readdirSync('assets/js'))if(file.endsWith('.js'))new vm.Script(fs.readFileSync('assets/js/'+file,'utf8'),{filename:file});
for(const file of ['Code.gs','Guided.gs'])new vm.Script(fs.readFileSync('apps-script/'+file,'utf8'),{filename:file});
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0');
if(tracked.some(p=>/(^|\/)roster\.school\.json$/.test(p)))throw new Error('Private roster must not be tracked');
console.log('Both frontends, all JS modules and Apps Script parse; private roster is not tracked.');

new vm.Script(fs.readFileSync('assets/demo/demo.js','utf8'),{filename:'demo.js'});
