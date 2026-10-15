import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {refreshComputeResourceObservation as refresh} from '../src/compute-observation.mjs';
import {createCausalResourceHead} from '@red-cup-engineering/semiotic-eavt-services-section/causal-resource-head';
import policy from './fixtures/compute-policy.json' with {type:'json'};
const now=()=> '2026-10-14T21:00:00Z';
const observation={googleCloud:{cloudRunRegion:'fixture-region'},oracleCloud:{}};
const reading=(observedAt='2026-10-14T20:00:00Z',billing=false)=>({observedAt,credentials:[],
 googleCloud:{status:'observed',projects:[{projectId:'fixture',billing:{status:'observed',enabled:billing},enabledComputeServices:[]}]},
 oracleCloud:{status:'unavailable'},cloudflare:{status:'credential-unavailable'}});
async function fixture(run){const root=await mkdtemp(join(tmpdir(),'compute-overlap-'));try{await run(root);}finally{await rm(root,{recursive:true,force:true});}}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function pending(dataRoot,record,scope=observation){
 const ready=deferred(),gate=deferred();
 const result=refresh({dataRoot,policy,observation:scope,environment:{},now,observe:async()=>{ready.resolve();await gate.promise;return record;}});
 return {ready:ready.promise,release:gate.resolve,result};
}
const published=root=>readFile(join(root,policy.recordFile),'utf8').then(JSON.parse);

test('simultaneous same-process duplicates and canonical root aliases publish one intact observation',()=>fixture(async root=>{
 const actual=join(root,'actual'),alias=join(root,'alias');
 const a=pending(actual,reading());await a.ready;await symlink(actual,alias,'dir');
 const b=pending(alias,reading());await b.ready;
 a.release();b.release();const results=await Promise.all([a.result,b.result]);
 const record=await published(actual);assert.deepEqual(results.map(x=>x.record),[record,record]);
 assert.equal(results.filter(x=>x.refreshed).length,1);
 assert.equal((await readdir(join(actual,'records'))).some(x=>x.endsWith('.tmp')||x.endsWith('.lock')),false);
}));

test('overlapping older collection finishes last without replacing newer JSON or returned value',()=>fixture(async root=>{
 const old=pending(root,reading()),fresh=pending(root,reading('2026-10-14T20:01:00Z',true));
 await Promise.all([old.ready,fresh.ready]);fresh.release();const newer=await fresh.result;
 old.release();const older=await old.result;
 assert.deepEqual(older.record,newer.record);assert.deepEqual(await published(root),newer.record);
 const head=createCausalResourceHead({recordType:policy.resourceRecordType,witnessType:policy.witnessType,event:policy.event});
 assert.equal(head.read(root,newer.facts.resourceSubjects[0]).asOf,newer.record.observedAt);
}));

test('equal-time conflicting evidence remains native and refuses replacement of prior JSON',()=>fixture(async root=>{
 const a=pending(root,reading()),b=pending(root,reading(undefined,true));await Promise.all([a.ready,b.ready]);
 a.release();const first=await a.result;const bytes=await readFile(join(root,policy.recordFile),'utf8');
 b.release();await assert.rejects(b.result,/contested at the same source time/);
 assert.equal(await readFile(join(root,policy.recordFile),'utf8'),bytes);
 const head=createCausalResourceHead({recordType:policy.resourceRecordType,witnessType:policy.witnessType,event:policy.event});
 assert.equal(head.read(root,first.facts.resourceSubjects[0]).state,'multiple-simultaneous-observations');
}));

test('a changed scope during collection refuses rather than silently replacing the other principal',()=>fixture(async root=>{
 await refresh({dataRoot:root,policy,observation,environment:{},now,observe:async()=>reading()});
 const b=pending(root,reading('2026-10-14T20:01:00Z'),{...observation,oracleCloud:{profile:'B'}});await b.ready;
 const c=await refresh({dataRoot:root,policy,observation:{...observation,oracleCloud:{profile:'C'}},environment:{},now,observe:async()=>reading('2026-10-14T20:02:00Z')});
 b.release();await assert.rejects(b.result,/scope changed during collection/);assert.deepEqual(await published(root),c.record);
}));

test('publication exception releases the actual lock and the callback stays synchronous',()=>fixture(async root=>{
 const bad=pending(root,{...reading(),observedAt:'invalid'});await bad.ready;bad.release();await assert.rejects(bad.result,/native observation envelope/);
 assert.equal((await readdir(join(root,'records'))).some(x=>x.endsWith('.lock')),false);
 const good=pending(root,reading());await good.ready;good.release();assert.deepEqual(await publishedAfter(good,root),(await good.result).record);
 const source=await readFile(new URL('../src/compute-observation.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source.slice(source.indexOf('return withFileLock(')),/\bawait\b/);
 assert.match(source,/publication\.lock/);assert.match(source,/writeFileAtomic\(path/);
}));
async function publishedAfter(pending,root){await pending.result;return published(root);}

function child(root,record){
 const source=`const {refreshComputeResourceObservation:refresh}=await import(process.argv[1]);const options=JSON.parse(process.argv[2]);
 const result=await refresh({...options,now:()=> '2026-10-14T21:00:00Z',observe:async()=>{process.stdout.write('ready\\n');await new Promise(r=>process.stdin.once('data',r));return options.reading;}});
 process.stdout.write(JSON.stringify(result.record)+'\\n');process.stdin.destroy();`;
 const proc=spawn(process.execPath,['--input-type=module','-e',source,new URL('../src/compute-observation.mjs',import.meta.url).href,JSON.stringify({dataRoot:root,policy,observation,environment:{},reading:record})],{env:{},stdio:['pipe','pipe','pipe']});
 let stdout='',stderr='';const ready=deferred();proc.stdout.on('data',b=>{stdout+=b;if(stdout.startsWith('ready\n'))ready.resolve();});proc.stderr.on('data',b=>stderr+=b);
 const result=once(proc,'close').then(([code])=>{assert.equal(code,0,stderr);return JSON.parse(stdout.split('\n')[1]);});
 return {ready:ready.promise,release:()=>proc.stdin.write('continue\n'),result};
}
test('two real processes retain newest publication when the older observer completes last',()=>fixture(async root=>{
 const a=child(root,reading()),b=child(root,reading('2026-10-14T20:01:00Z',true));
 await Promise.all([a.ready,b.ready]);b.release();const newer=await b.result;a.release();const older=await a.result;
 assert.deepEqual(older,newer);assert.deepEqual(await published(root),newer);
 assert.equal((await readdir(join(root,'records'))).some(x=>x.endsWith('.lock')||x.endsWith('.tmp')),false);
}));
