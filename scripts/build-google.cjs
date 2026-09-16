const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'build/google');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const escapeScript=s=>s.replace(/<\/script/gi,'<\\/script');
fs.mkdirSync(out,{recursive:true});
let html=read('index.html');
const assets={};for(const file of ['assets/guided/school-crest.png','assets/guided/companions.png','assets/guided/mona-lisa.jpg','assets/guided/wheat-field.jpg'])assets[file]='data:image/'+(file.endsWith('.png')?'png':'jpeg')+';base64,'+fs.readFileSync(path.join(root,file)).toString('base64');
const css=read('assets/guided/style.css').replace("url('companions.png')",'url("'+assets['assets/guided/school-crest.png','assets/guided/companions.png']+'")');
let demo=read('assets/demo/index.html')
  .replace('<link rel="stylesheet" href="../guided/style.css">','<style>'+css+'</style>')
  .replace('<link rel="stylesheet" href="demo.css">','<style>'+read('assets/demo/demo.css')+'</style>')
  .replace('src="../guided/school-crest.png"','src="'+assets['assets/guided/school-crest.png']+'"')
  .replace('<script src="demo.js"></script>','<script>'+escapeScript(read('assets/demo/demo.js'))+'</script>')
  .replace('<head>','<head><base target="_top">');
demo=demo.replaceAll('href="/"','href="__CAPSULE_HOME_URL__"');
html=html.replace('</body>','<script type="application/json" id="capsule-demo">'+JSON.stringify(demo).replace(/</g,'\\u003c')+'</script></body>');
html=html.replace('<head>','<head>\n<base target="_top">\n<script>window.VA_APP_URL="__CAPSULE_HOME_URL__";window.VA_ASSETS='+JSON.stringify(assets).replace(/</g,'\\u003c')+';</script>');
html=html.replace('<link rel="stylesheet" href="assets/guided/style.css">','<style>'+css+'</style>');
html=html.replace(/<script src="(assets\/js\/[^"<>]+)"><\/script>/g,(_,file)=>'<script>'+escapeScript(read(file))+'</script>');
html=html.replace('src="assets/guided/school-crest.png"','src="'+assets['assets/guided/school-crest.png']+'"');
for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(!m[0].startsWith('<script type="application/json"'))new vm.Script(m[1]);
if(/(?:src|href)="assets\//.test(html))throw new Error('Unbundled asset');
fs.writeFileSync(path.join(out,'App.html'),html);
fs.writeFileSync(path.join(out,'GuidedModel.gs'),read('assets/js/guided-model.js'));
for(const file of ['Code.gs','Guided.gs','appsscript.json'])fs.copyFileSync(path.join(root,'apps-script',file),path.join(out,file));
// Preserve the baseline browser regression without making its UI the new entry.
let legacy=read('legacy.html').replace('<head>','<head><script>window.VA_GOOGLE_HOSTED=true;window.VA_CURRICULUM='+JSON.stringify(JSON.parse(read('curriculum.json'))).replace(/</g,'\\u003c')+';</script>');
legacy=legacy.replace(/<script src="(assets\/js\/[^"<>]+)"\s*><\/script>/g,(_,file)=>'<script>'+escapeScript(read(file))+'</script>');
fs.writeFileSync(path.join(out,'Legacy.html'),legacy);
const checks={};for(const file of ['App.html','Code.gs','Guided.gs','GuidedModel.gs','appsscript.json'])checks[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex');
fs.writeFileSync(path.join(out,'SHA256.json'),JSON.stringify(checks,null,2)+'\n');
console.log('Built self-contained App.html and three Apps Script sources. No school IDs or roster included.');
