const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const html = fs.readFileSync('index.html', 'utf8');
let count = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (/\bsrc=/.test(match[1])) continue;
  new vm.Script(match[2], {filename:`index.html:inline-${++count}`});
}
const tracked = execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0');
if (tracked.some(path => /(^|\/)roster\.school\.json$/.test(path))) {
  throw new Error('roster.school.json 不可被 Git 追蹤');
}
console.log(`${count} inline scripts parse; private roster is not tracked.`);
