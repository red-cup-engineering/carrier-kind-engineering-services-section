import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {actorRequestProcessing,requestProcessingThread,processingEntryValue} from '../src/rpc/actor-processing.mjs';
import {ARRIVAL_PROCESS_FEED} from '../src/rpc/arrival.mjs';
import {extend,put,writeHead} from '@red-cup-engineering/semiotic-eavt-services-section/store';
import {semanticId} from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
const id=semanticId('request'),subjectBinding=semanticId('binding'),requestMaterial=semanticId('exact call');
const base={cloudEventIdentity:id,packetDigest:'packet',requester:'https://gateway.example/actors/world',executor:'account:alice',hand:'session:alice',subjectBinding,service:{kind:'world-gateway',world:'one-world'}};
const row=(state,sequence)=>({...processingEntryValue(base,state,[],state==='executing'?undefined:{code:state==='processed'?0:1,stdout:'',stderr:state==='processed'?'':'denied'}),requestMaterial,sequence,at:'2026-10-15T02:00:00Z'});
function fixture(t){const root=mkdtempSync(join(tmpdir(),'bound-request-state-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return {root,name:requestProcessingThread(id),read:()=>actorRequestProcessing(root,id,{bound:{subjectBinding,requestMaterial,packetDigest:'packet'}})};}
test('bound unpaid state accepts only the exact legal once-only traces',t=>{
 for(const states of [['executing'],['obstructed'],['executing','processed'],['executing','obstructed']]){
  const f=fixture(t);assert.equal(f.read(),undefined);
  for(const [index,state] of states.entries())extend(f.root,ARRIVAL_PROCESS_FEED,f.name,row(state,index+1));
  assert.equal(f.read().state,states.at(-1));assert.equal(f.read().sequence,states.length);
 }
});
test('bound state refuses malformed transition fields and terminal output custody',t=>{
 const patches=[{kind:'other'},{state:'payment-required'},{sequence:0},{sequence:3},{sequence:1},
  {subjectBinding:undefined},{requestMaterial:undefined},{packetDigest:''},{requester:''},{executor:''},{hand:''},{obstructions:'none'},
  {code:undefined},{code:1},{code:-1},{code:0.5},{stdout:undefined},{stderr:undefined},{stdoutBytes:1},{stderrBytes:1},{stdoutSha256:'wrong'},{stderrSha256:'wrong'},
  {causes:[]},{causes:[semanticId('missing')]},{executor:'account:bob'},{hand:'session:bob'},{service:{kind:'world-gateway',world:'other'}}];
 for(const patch of patches){const f=fixture(t),start=extend(f.root,ARRIVAL_PROCESS_FEED,f.name,row('executing',1));
  const value={...row('processed',2),causes:[start],...patch};for(const key of Object.keys(value))if(value[key]===undefined)delete value[key];
  const address=put(f.root,ARRIVAL_PROCESS_FEED,value);writeHead(f.root,ARRIVAL_PROCESS_FEED,f.name,{frontier:[address]});
  assert.throws(f.read,/actor request state|cannot substitute/,JSON.stringify(patch));
 }
});
test('bound state refuses skipped starts, forks and any post-terminal transition',t=>{
 for(const states of [['processed'],['obstructed','processed'],['executing','processed','obstructed']]){
  const f=fixture(t);for(const [index,state] of states.entries())extend(f.root,ARRIVAL_PROCESS_FEED,f.name,row(state,index+1));
  assert.throws(f.read,/actor request state/);
 }
 const f=fixture(t),first=put(f.root,ARRIVAL_PROCESS_FEED,{...row('executing',1),causes:[]}),other=put(f.root,ARRIVAL_PROCESS_FEED,{...row('executing',1),at:'later',causes:[]});
 const end=put(f.root,ARRIVAL_PROCESS_FEED,{...row('processed',2),causes:[first,other]});writeHead(f.root,ARRIVAL_PROCESS_FEED,f.name,{frontier:[end]});assert.throws(f.read,/actor request state/);
});
test('legacy unbound processing reader retains historical and payment states',t=>{
 const f=fixture(t);extend(f.root,ARRIVAL_PROCESS_FEED,f.name,{kind:'metroplat.arrival.processing-witness',cloudEventIdentity:id,state:'payment-required',sequence:1,obstructions:[]});
 assert.equal(actorRequestProcessing(f.root,id).state,'payment-required');assert.throws(f.read,/actor request state/);
});
