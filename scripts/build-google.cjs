const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script src="(assets\/js\/[^"<>]+)"\s*><\/script>/g, (_tag, file) => {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  return '<script>\n' + code.replace(/<\/script/gi, '<\\/script') + '\n</script>';
});
const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'curriculum.json'), 'utf8'));
const boot = '<script>window.VA_GOOGLE_HOSTED=true;window.VA_CURRICULUM=' + JSON.stringify(curriculum).replace(/</g, '\\u003c') + ';</script>';
html = html.replace('<head>', '<head>\n<base target="_top">\n' + boot);
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (!/\bsrc=/.test(m[1])) new vm.Script(m[2]);
}
if (/src="assets\//.test(html)) throw new Error('Unbundled local script');
const out = path.join(root, 'build', 'google');
fs.mkdirSync(out, {recursive:true});
fs.writeFileSync(path.join(out, 'App.html'), html);
console.log('Built build/google/App.html from the same index, modules and curriculum.');
