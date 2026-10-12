from pathlib import Path
import json,hashlib,tempfile,subprocess
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sp=Path(Path('/tmp/muse-spec-path').read_text());paths0=json.loads(Path('/tmp/muse-presentation-input-paths.json').read_text());v=Path(paths0['victor/src/page.mjs']).parent;t=Path(paths0['tufte/src/tufte-rendering.mjs']).parent
assay=Path(tempfile.mkdtemp(prefix='muse-provenance-assay-'))
(assay/'assay.mjs').write_text('''import {mkdtemp,writeFile} from 'node:fs/promises';
const [victor]=process.argv.slice(2);
const {build}=await import(victor+'/src/build.mjs');
const {normalizeProjectConfig}=await import(victor+'/src/config.mjs');
const roots=await Promise.all([mkdtemp('/tmp/source-a-'),mkdtemp('/tmp/source-b-')]);
for(const root of roots)for(const name of ['start','details'])await writeFile(root+'/'+name+'.md',`---\\ntitle: ${name}\\ndate-created: '2026-09-27'\\ntype: page\\nstatus: active\\n---\\n\\n# Reading\\n\\nPublic information.\\n`);
const cfg=normalizeProjectConfig({home:'start',tufte:true,archives:false,search:false,pwa:false,site:{baseIri:'https://fixture.example/',name:'Fixture'}}).config;
const results=[];for(const root of roots)results.push(await build({...cfg,contentDir:root}));
let checks=0;const failures=[];const check=(ok,id)=>{checks++;if(!ok)failures.push(id)};
const [a,b]=results;check(a.report.refusals.length===0&&b.report.refusals.length===0,'admitted');
check(JSON.stringify([...a.artifacts.keys()].sort())===JSON.stringify([...b.artifacts.keys()].sort()),'same-inventory');
for(const [path,body] of a.artifacts){check(Buffer.from(body).equals(Buffer.from(b.artifacts.get(path))),'portable-'+path);check(!String(body).includes('file://')&&!roots.some(root=>String(body).includes(root)),'public-'+path)}
for(const [i,r] of results.entries())for(const [name,cell] of r.catalog.cells){check(cell.source.provenance.href.startsWith('file://'+roots[i]+'/'),'private-source-'+i+'-'+name);for(const path of [name==='start'?'index.html':name+'/index.html',name+'/index.html',name+'/neighborhood/index.html'])check(r.report.artifactProvenance[path].source===cell.address,'semantic-'+i+'-'+path)}
console.log(JSON.stringify({checks,passed:checks-failures.length,failures}));process.exitCode=failures.length?1:0;
''')
(assay/'manifest.json').write_text(json.dumps({'assaySha256':sha(assay/'assay.mjs'),'orderSha256':sha(sp/'2026-09-27-victor-public-provenance-fabrication.md')},indent=2))
r=Path(tempfile.mkdtemp(prefix='muse-provenance-generation-'));old=Path('/tmp/muse-generation-eicd4it7');order=sp/'2026-09-27-victor-public-provenance-fabrication.md';contract=sp/'2026-09-27-muse-assist-fabrication-lld.md'
paths={'victor/src/build.mjs':str(v/'build.mjs'),'victor/src/catalog.mjs':str(v/'catalog.mjs')}
p={'purpose':'Derive only the closed public-provenance work order as exact unique-substring edits. No tools or new files. Protected catalog source is API context only. Private assays are withheld. Preserve Unicode exactly.','workOrder':{'text':order.read_text(),'sha256':sha(order)},'realizationContract':{'text':contract.read_text(),'sha256':sha(contract)},'inputs':{n:{'text':Path(p).read_text(),'sha256':sha(Path(p))} for n,p in paths.items()},'assayCommitment':{'manifestSha256':sha(assay/'manifest.json'),'committedBeforeGeneration':True}}
(r/'public-input.json').write_text(json.dumps(p));schema=json.loads((old/'output-schema.json').read_text());schema['properties']['edits']['items']['properties']['path']['enum']=['victor/src/build.mjs'];(r/'output-schema.json').write_text(json.dumps(schema));profile=json.loads((old/'profile.json').read_text());profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in profile];(r/'profile.json').write_text(json.dumps(profile));(r/'source-paths.json').write_text(json.dumps(paths));Path('/tmp/muse-provenance-generation-run').write_text(str(r));Path('/tmp/muse-provenance-assay').write_text(str(assay))
base=json.loads(Path('/tmp/muse-assessment-root-z_89l8is/assessment-profile.json').read_text());base=[x.replace('/tmp/muse-assessment-root-z_89l8is','/tmp/muse-assessment-root-d_mayvdu').replace('/tmp/muse-assay-Ok4n4B/assay.mjs',str(assay/'assay.mjs')) for x in base];base+=['--ro-bind',str(v),str(v),'--ro-bind',str(t),str(t)]
(r/'assessment-profile.json').write_text(json.dumps(base));x=subprocess.run(base+['/node','/assays/assay.mjs',str(v.parent)],capture_output=True,text=True);(r/'baseline.json').write_text(json.dumps({'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr}));print(r);print(x.stdout);print(x.stderr[:1000]);assert x.returncode==1 and 'portable-report.json' in x.stdout
script=Path('/tmp/invoke-muse-presentation.py').read_text().replace('/tmp/muse-presentation-generation-run','/tmp/muse-provenance-generation-run');Path('/tmp/invoke-muse-provenance.py').write_text(script)
