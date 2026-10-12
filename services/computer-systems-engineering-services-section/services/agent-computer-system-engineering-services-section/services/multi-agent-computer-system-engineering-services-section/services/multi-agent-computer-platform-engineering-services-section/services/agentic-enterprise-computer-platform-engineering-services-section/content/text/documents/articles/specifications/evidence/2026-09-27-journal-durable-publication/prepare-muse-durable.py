from pathlib import Path
import tempfile,hashlib,json,subprocess
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sp=Path(Path('/tmp/muse-spec-path').read_text());system=Path(Path('/tmp/muse-system-path').read_text());order=sp/'2026-09-27-journal-durable-publication-fabrication.md';contract=sp/'2026-09-27-muse-assist-fabrication-lld.md';assay=Path(tempfile.mkdtemp(prefix='muse-durable-assay-'))
(assay/'assay.mjs').write_text(r'''import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const source = process.argv[2];
if (process.argv[3] === '--child') {
  const { writeFileAtomicNew } = await import(pathToFileURL(source));
  process.stdout.write('ready\n');
  await new Promise(resolve => process.stdin.once('data', resolve));
  try { writeFileAtomicNew(process.argv[4], process.argv[5], { durable: true }); console.log(JSON.stringify({created:true,body:process.argv[5]})); }
  catch (e) { console.log(JSON.stringify({created:false,code:e.code,body:process.argv[5]})); }
  process.exit(0);
}
const root=fs.mkdtempSync('/tmp/durable-assay-');
const originals=Object.fromEntries(['openSync','closeSync','fsyncSync','linkSync','rmSync','writeFileSync'].map(k=>[k,fs[k]]));
let trace=[], descriptors=new Map(), fault=null;
for(const name of Object.keys(originals)) fs[name]=function(...args) {
  const target=name==='openSync'||name==='writeFileSync'||name==='rmSync'?String(args[0]):name==='linkSync'?String(args[1]):descriptors.get(args[0]);
  const kind=name==='fsyncSync'?(fs.fstatSync(args[0]).isDirectory()?'directory':'file'):undefined;
  trace.push({name,target,kind,flags:name==='openSync'?args[1]:undefined});
  if(fault?.({name,target,kind,args})) {const e=new Error('injected host failure');e.code='EIO';throw e;}
  const out=originals[name](...args);
  if(name==='openSync') descriptors.set(out,path.resolve(String(args[0])));
  if(name==='closeSync') descriptors.delete(args[0]);
  return out;
};
syncBuiltinESMExports();
const {writeFileAtomicNew}=await import(pathToFileURL(source));
const observations=[];const check=(name,ok,detail)=>observations.push({name,ok:Boolean(ok),...(detail===undefined?{}:{detail})});
const capture=fn=>{try{fn();return null}catch(e){return {code:e.code,name:e.name,message:e.message}}};
const reset=()=>{trace=[];fault=null};
const syncs=()=>trace.filter(e=>e.name==='fsyncSync');
const slot=path.join(root,'fresh','nested','slot');reset();
const err=capture(()=>writeFileAtomicNew(slot,Buffer.from([0,255,3,10]),{durable:true}));
check('durable actual bytes',!err&&fs.readFileSync(slot).equals(Buffer.from([0,255,3,10])));
check('durable private default mode',(fs.statSync(slot).mode&0o777)===0o600);
const published=trace.findIndex(e=>e.name==='linkSync');
check('file sync precedes publication',trace.some((e,i)=>e.name==='fsyncSync'&&e.kind==='file'&&i<published));
check('exclusive staging',trace.some(e=>e.name==='openSync'&&typeof e.flags==='string'&&e.flags.includes('x')));
const expected=[];for(let d=path.dirname(slot);;d=path.dirname(d)){expected.push(d);if(d===path.dirname(d))break;}
const dirs=syncs().filter(e=>e.kind==='directory').map(e=>e.target);
check('directory chain is synchronized bottom-up after publication',JSON.stringify(dirs)===JSON.stringify(expected)&&trace.every((e,i)=>e.kind!=='directory'||i>published),{expected,observed:dirs});
check('successful descriptor closure',descriptors.size===0);
reset();const occupied=capture(()=>writeFileAtomicNew(slot,'replacement',{durable:true}));
check('occupied final stays unchanged',occupied?.code==='EEXIST'&&fs.readFileSync(slot).equals(Buffer.from([0,255,3,10])));
check('occupied final itself synchronized',syncs().some(e=>e.kind==='file'&&e.target===slot));
check('occupied directory chain synchronized',JSON.stringify(syncs().filter(e=>e.kind==='directory').map(e=>e.target))===JSON.stringify(expected));
reset();fault=e=>e.name==='fsyncSync'&&e.kind==='file'&&e.target===slot;
const existingFailure=capture(()=>writeFileAtomicNew(slot,'replacement',{durable:true}));fault=null;
check('occupied sync failure is unavailable not EEXIST',existingFailure?.code==='EIO');
reset();const before=path.join(root,'before-send');fault=e=>e.name==='fsyncSync'&&e.kind==='file';
const beforeFailure=capture(()=>writeFileAtomicNew(before,'body',{durable:true}));fault=null;
check('pre-publication sync failure leaves no target',beforeFailure?.code==='EIO'&&!fs.existsSync(before)&&!trace.some(e=>e.name==='linkSync'));
reset();const after=path.join(root,'after-link');fault=e=>e.name==='fsyncSync'&&e.kind==='directory';
const afterFailure=capture(()=>writeFileAtomicNew(after,'retained',{durable:true}));fault=null;
check('post-publication failure retains target and reports uncertainty',afterFailure?.code==='EIO'&&fs.readFileSync(after,'utf8')==='retained');
reset();const noLink=path.join(root,'failed-link');fault=e=>e.name==='linkSync';const linkFailure=capture(()=>writeFileAtomicNew(noLink,'body',{durable:true}));fault=null;
check('non-EEXIST link failure preserved',linkFailure?.code==='EIO'&&!fs.existsSync(noLink)&&!syncs().some(e=>e.target===noLink));
reset();const invalid=path.join(root,'invalid','slot');const invalidFailure=capture(()=>writeFileAtomicNew(invalid,'body',{durable:'true'}));
check('invalid option refuses before mutation',invalidFailure?.name==='TypeError'&&!fs.existsSync(path.dirname(invalid))&&trace.length===0);
reset();const ordinary=path.join(root,'ordinary');writeFileAtomicNew(ordinary,'ordinary');
check('non-durable path preserved',syncs().length===0&&fs.readFileSync(ordinary,'utf8')==='ordinary'&&(fs.statSync(ordinary).mode&0o777)===(0o666&~process.umask()));
reset();const relative=path.relative(process.cwd(),path.join(root,'relative','slot'));const relativeFailure=capture(()=>writeFileAtomicNew(relative,'relative',{durable:true,mode:0o640}));
check('relative path and explicit permissions',!relativeFailure&&fs.readFileSync(relative,'utf8')==='relative'&&(fs.statSync(relative).mode&0o777)===(0o640&~process.umask()));
check('failure paths close descriptors',descriptors.size===0,{open:[...descriptors.values()]});
// Uninstrumented independent processes contend at the real local filesystem.
const race=path.join(root,'race-slot');const children=[];
for(let i=0;i<6;i++){
 const child=spawn(process.execPath,[process.argv[1],source,'--child',race,'writer-'+i],{stdio:['pipe','pipe','pipe']});
 let text='',stderr='';let readyResolve;const ready=new Promise(r=>readyResolve=r);
 child.stdout.on('data',b=>{text+=b;if(text.includes('ready\n'))readyResolve()});child.stderr.on('data',b=>stderr+=b);
 const done=new Promise(resolve=>child.on('close',code=>resolve({code,text,stderr})));
 children.push({child,ready,done});
}
await Promise.all(children.map(x=>x.ready));for(const x of children)x.child.stdin.end('go\n');
const results=await Promise.all(children.map(x=>x.done));const rows=results.map(x=>JSON.parse(x.text.trim().split('\n').at(-1)));const winners=rows.filter(x=>x.created);
check('independent processes have one winner',results.every(x=>x.code===0)&&winners.length===1&&rows.filter(x=>!x.created).every(x=>x.code==='EEXIST'),rows);
check('receiving file is the winning complete content',winners.length===1&&fs.readFileSync(race,'utf8')===winners[0].body);
const result={observations,passed:observations.filter(x=>x.ok).length,total:observations.length,limits:['Controlled local Linux process contention and injected syscall failures; no power interruption or remote filesystem assessed','This primitive does not establish journal integration or assistant behavior']};console.log(JSON.stringify(result,null,2));process.exitCode=result.passed===result.total?0:1;
''')
(assay/'manifest.json').write_text(json.dumps({'assaySha256':sha(assay/'assay.mjs'),'orderSha256':sha(order),'custody':'Root assessor; excluded from fresh isolated Luna input'},indent=2)+'\n')
r=Path(tempfile.mkdtemp(prefix='muse-durable-generation-'));old=Path('/tmp/muse-generation-eicd4it7');name='system/src/filesystem.mjs';src=system/'src/filesystem.mjs'
p={'purpose':'Generate only the closed durable create-only publication order as exact substring codemods. No tools or new files. Preserve unrelated functions. Private assays withheld.','workOrder':{'text':order.read_text(),'sha256':sha(order)},'realizationContract':{'text':contract.read_text(),'sha256':sha(contract)},'inputs':{name:{'text':src.read_text(),'sha256':sha(src)}},'assayCommitment':{'manifestSha256':sha(assay/'manifest.json'),'committedBeforeGeneration':True}}
(r/'public-input.json').write_text(json.dumps(p));schema=json.loads((old/'output-schema.json').read_text());schema['properties']['edits']['items']['properties']['path']['enum']=[name];(r/'output-schema.json').write_text(json.dumps(schema));profile=json.loads((old/'profile.json').read_text());profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in profile];(r/'profile.json').write_text(json.dumps(profile));(r/'source-paths.json').write_text(json.dumps({name:str(src)}));Path('/tmp/muse-durable-generation-run').write_text(str(r));Path('/tmp/muse-durable-assay').write_text(str(assay))
base=['bwrap','--unshare-all','--die-with-parent','--new-session','--ro-bind','/usr','/usr','--ro-bind','/lib','/lib','--ro-bind','/lib64','/lib64','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--dir','/work','--chdir','/work','--ro-bind','/home/emsenn/.local/lib/nodejs/node-v24.19.0-linux-x64/bin/node','/node','--ro-bind',str(assay),'/assays','--ro-bind',str(src),'/candidate.mjs']
(r/'assessment-profile.json').write_text(json.dumps(base));x=subprocess.run(base+['/node','/assays/assay.mjs','/candidate.mjs'],capture_output=True,text=True,timeout=60);(r/'baseline.json').write_text(json.dumps({'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr},indent=2));print(r);print('baseline',x.returncode);print(x.stderr[:600]);
if x.stdout:
 report=json.loads(x.stdout);print('baseline observations',report['passed'],'/',report['total']);print([o['name'] for o in report['observations'] if not o['ok']])
assert x.returncode==1 and 'observations' in x.stdout
script=Path('/tmp/invoke-muse-provenance.py').read_text().replace('/tmp/muse-provenance-generation-run','/tmp/muse-durable-generation-run');Path('/tmp/invoke-muse-durable.py').write_text(script)
