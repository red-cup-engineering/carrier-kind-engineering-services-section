from pathlib import Path
import json,subprocess
r=Path(Path('/tmp/muse-wire-generation-run').read_text());a=Path(Path('/tmp/muse-wire-assay').read_text());script=Path('/tmp/diagnose-wire-envelope.mjs')
script.write_text('''import fs from 'node:fs';import {pathToFileURL} from 'node:url';
const dep=JSON.parse(fs.readFileSync('/assays/dependencies.json'));const spec=s=>dep.resolutions[pathToFileURL(dep.entry).href+'\\n'+s];
const {journalWitness}=await import(pathToFileURL(dep.entry));const {addressArtifact}=await import(pathToFileURL(dep.code+'/src/semiotic-eavt/identity/index.mjs'));const {tm}=await import(spec('@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation'));const {eavtKey}=await import(spec('@red-cup-engineering/eavt-services-section/row'));const {canonicalizeJson,canonicalJson,JSON_RESOURCE_ENVELOPE}=await import(spec('@red-cup-engineering/json-services-section'));
const out=[];
for(const size of [260000,261000,262000]){
const journal='journal-fixture',time='2026-09-27T12:00:00.000Z';const c={kind:'metroplat.journal.unique-command',version:1,domain:'interaction',key:{context:'context-fixture',principal:'person-fixture',requestId:'req-fixture'},subject:'person-fixture',value:{text:'x'.repeat(size)},causes:[],artifactRefs:[]};
try{const payload=[c.subject,'metroplat.journal.unique-admission',c,time];const witness=journalWitness({kind:'metroplat.journal.observation',seat:c.key.principal,claim:tm.mark('metroplat.journal.unique-admission'),address:tm.mark(eavtKey(payload)),time,causes:[],payload,referencedArtifacts:[]});const record={kind:'metroplat.journal.unique-record',version:1,journal,commandRef:addressArtifact(c).ref,witness,artifacts:[]};const bytes=Buffer.byteLength(canonicalJson(record));let bounded;try{canonicalizeJson(record,JSON_RESOURCE_ENVELOPE);bounded=true}catch(e){bounded={code:e.code,message:e.message.slice(0,200)}}out.push({size,recordBytes:bytes,bounded});}catch(e){out.push({size,constructionFailure:{code:e.code,message:e.message.slice(0,200)}})}
}console.log(JSON.stringify(out,null,2));
''')
profile=json.loads((r/'assessment-profile.json').read_text());cmd=profile+['--ro-bind',str(script),'/diagnose.mjs','/node','--no-warnings','--experimental-loader','/assays/resolve.mjs','/diagnose.mjs'];x=subprocess.run(cmd,capture_output=True,text=True,timeout=60);(r/'independent-envelope-diagnostic.json').write_text(json.dumps({'exitCode':x.returncode,'stdout':x.stdout,'stderr':x.stderr},indent=2));print(x.stdout);print(x.stderr)
