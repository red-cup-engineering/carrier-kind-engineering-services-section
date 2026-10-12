import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile,readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {declaredObligations,readObligationRecords} from '../src/declared-obligations.mjs';
import {obligationsApp} from '../src/obligations.mjs';
const principal={provider:'bearer',subjectHash:'fixture-owner'};
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'obligation-receiving-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
const source=(records,discharges)=>({module:fileURLToPath(new URL('../src/declared-obligations.mjs',import.meta.url)),export:'declaredObligations',configuration:{records,discharges}});
const app=(root,sources)=>obligationsApp({stateDir:join(root,'state'),sources,navigation:[],runAs:async()=>({bearers:[]})});
async function page(application){const r=await application.resources.find(x=>x.id==='ops-obligations').handler({locals:{principal},req:{method:'GET',headers:{}},url:new URL('https://fixture.test/obligations')});return String(r.body);}
test('a configured missing record directory refuses, while an existing empty directory is observed empty',async t=>{
 const root=await fixture(t),records=join(root,'records');
 assert.throws(()=>readObligationRecords(records),e=>e.code==='OBLIGATION_RECORDS_UNAVAILABLE'&&!e.message.includes(root));
 await assert.rejects(declaredObligations({records}).obligations(),e=>e.code==='OBLIGATION_RECORDS_UNAVAILABLE');
 await mkdir(records);assert.deepEqual(readObligationRecords(records),[]);assert.deepEqual(await declaredObligations({records}).obligations(),[]);
});
test('the real page cannot declare nothing waiting when its configured records are unavailable',async t=>{
 const root=await fixture(t),application=app(root,[source(join(root,'missing'),join(root,'discharges'))]);
 const rendered=await page(application);assert.match(rendered,/Could not read every source/);assert.doesNotMatch(rendered,/Nothing waits on you|The house needs nothing/);
 assert.equal(await application.landing(principal),'/obligations');assert.deepEqual(await readdir(root),[]);
});
test('a genuine empty source returns to the city and reports its observed empty state',async t=>{
 const root=await fixture(t),records=join(root,'records');await mkdir(records);
 const application=app(root,[source(records,join(root,'discharges'))]);assert.match(await page(application),/Nothing waits on you/);assert.equal(await application.landing(principal),'/play');
});
test('recovered records render without losing original discharge receipts',async t=>{
 const root=await fixture(t),records=join(root,'records'),discharges=join(root,'discharges');await mkdir(discharges);
 const receipt=JSON.stringify({type:'ObligationDischarge',id:'already-received',at:'2026-10-01T00:00:00Z'});await writeFile(join(discharges,'already-received.json'),receipt);
 const application=app(root,[source(records,discharges)]);assert.match(await page(application),/Could not read every source/);
 await mkdir(records);
 for(const id of ['already-received','still-waiting'])await writeFile(join(records,id+'.json'),JSON.stringify({type:'Obligation',id,kind:'fixture',to:['fixture-owner'],title:id,why:'Fixture source receiving'}));
 const rendered=await page(application);assert.match(rendered,/still-waiting/);assert.doesNotMatch(rendered,/already-received|Could not read every source|Nothing waits on you/);
 assert.equal(await readFile(join(discharges,'already-received.json'),'utf8'),receipt);assert.equal(await application.landing(principal),'/obligations');
});
function walk(application,id,{post=false}={}) {
 const req=post?Object.assign(Readable.from([Buffer.from('value=fixture')]),{method:'POST',headers:{origin:'https://fixture.test',host:'fixture.test','content-type':'application/x-www-form-urlencoded'}}):{method:'GET',headers:{}};
 return application.resources.find(x=>x.id==='ops-obligations.walk').handler({locals:{principal},req,params:{source:'declared',id},url:new URL(`https://fixture.test/obligations/declared/${id}`)});
}
test('the real walk distinguishes unread sources from a genuinely absent or completed obligation',async t=>{
 const root=await fixture(t),records=join(root,'records'),discharges=join(root,'discharges'),application=app(root,[source(records,discharges)]);
 for(const post of [false,true]){const r=await walk(application,'missing',{post});assert.equal(r.status,503);assert.match(String(r.body),/Could not read every source/);assert.doesNotMatch(String(r.body),/already done|Nothing to walk/);}
 await mkdir(records);assert.equal((await walk(application,'missing')).status,404);
 await writeFile(join(records,'done.json'),JSON.stringify({type:'Obligation',id:'done',kind:'fixture',to:['fixture-owner'],title:'Done'}));
 await mkdir(discharges);await writeFile(join(discharges,'done.json'),'{}');assert.equal((await walk(application,'done')).status,404);
});
test('a completed walk retains its receipt but sends the person to unread sources rather than the city',async t=>{
 const root=await fixture(t),records=join(root,'records'),discharges=join(root,'discharges');await mkdir(records);
 await writeFile(join(records,'one.json'),JSON.stringify({type:'Obligation',id:'one',kind:'fixture',to:['fixture-owner'],title:'One',done:{title:'Received',content:'This result is in custody'}}));
 const primary=source(records,discharges);primary.configuration.drivers=[{kind:'fixture',instances:r=>[{id:r.id}],prepare:()=>({}),capture:async()=>({custody:'synthetic result'})}];
 const otherModule=join(root,'other-source.mjs');
 await writeFile(otherModule,`export {declaredObligations} from ${JSON.stringify(new URL('../src/declared-obligations.mjs',import.meta.url).href)};`);
 const other=source(join(root,'other-missing'),join(root,'other-discharges'));other.module=otherModule;
 const application=app(root,[primary,other]);
 assert.equal((await walk(application,'one')).status,200);
 const received=await walk(application,'one',{post:true});assert.equal(received.status,200);
 assert.match(String(received.body),/This result is in custody/);assert.match(String(received.body),/Review unread obligation sources|Could not read every source/);assert.doesNotMatch(String(received.body),/Go to the city|href="\/play"/);
 assert.equal(JSON.parse(await readFile(join(discharges,'one.json'),'utf8')).id,'one');
});
