import {mkdtemp,writeFile} from 'node:fs/promises';
const [victor]=process.argv.slice(2);
const {build}=await import(victor+'/src/build.mjs');
const {normalizeProjectConfig}=await import(victor+'/src/config.mjs');
const roots=await Promise.all([mkdtemp('/tmp/source-a-'),mkdtemp('/tmp/source-b-')]);
for(const root of roots)for(const name of ['start','details'])await writeFile(root+'/'+name+'.md',`---\ntitle: ${name}\ndate-created: '2026-09-27'\ntype: page\nstatus: active\n---\n\n# Reading\n\nPublic information.\n`);
const cfg=normalizeProjectConfig({home:'start',tufte:true,archives:false,search:false,pwa:false,site:{baseIri:'https://fixture.example/',name:'Fixture'}}).config;
const results=[];for(const root of roots)results.push(await build({...cfg,contentDir:root}));
let checks=0;const failures=[];const check=(ok,id)=>{checks++;if(!ok)failures.push(id)};
const [a,b]=results;check(a.report.refusals.length===0&&b.report.refusals.length===0,'admitted');
check(JSON.stringify([...a.artifacts.keys()].sort())===JSON.stringify([...b.artifacts.keys()].sort()),'same-inventory');
for(const [path,body] of a.artifacts){check(Buffer.from(body).equals(Buffer.from(b.artifacts.get(path))),'portable-'+path);check(!String(body).includes('file://')&&!roots.some(root=>String(body).includes(root)),'public-'+path)}
for(const [i,r] of results.entries())for(const [name,cell] of r.catalog.cells){check(cell.source.provenance.href.startsWith('file://'+roots[i]+'/'),'private-source-'+i+'-'+name);for(const path of [name==='start'?'index.html':name+'/index.html',name+'/index.html',name+'/neighborhood/index.html'])check(r.report.artifactProvenance[path].source===cell.address,'semantic-'+i+'-'+path)}
console.log(JSON.stringify({checks,passed:checks-failures.length,failures}));process.exitCode=failures.length?1:0;
