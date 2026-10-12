import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {grantAssertion,revokeAssertion,can} from '@red-cup-engineering/computer-networking-engineering-services-section/object-capability';
import {readHead,get,extend,put,writeHead} from '@red-cup-engineering/semiotic-eavt-services-section/store';
import {recordFile,headFile} from '@red-cup-engineering/semiotic-eavt-services-section/layout';
import {admitCapabilityAssertions,readCapabilityAssertions,capabilityAssertionFeed as TYPE} from '../src/rpc/capability-assertions.mjs';
import {authorizationFromCapabilityAssertions,authorizationFromStanding} from '../src/rpc/dispatch.mjs';
import {operation} from '../src/rpc/operation.mjs';
import {invocation} from '../src/rpc/invocation.mjs';
const AT='2026-10-12T00:00:00.000Z';
const fixture=t=>{const root=mkdtempSync(join(tmpdir(),'capability-records-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;};
const grant=()=>grantAssertion('fixture','alice','infograph#orientation',AT);
const deny=()=>revokeAssertion('fixture','alice','infograph#orientation','2026-10-12T00:01:00.000Z');
const admit=(root,assertion)=>admitCapabilityAssertions({dataRoot:root,date:AT.slice(0,10),assertions:[assertion]});
test('named authority records expose actual addressed witnesses and refresh on every read',t=>{
 const root=fixture(t);assert.deepEqual(readCapabilityAssertions(root,{strict:true}),[]);
 const receipt=admit(root,grant());assert.equal(receipt.kind,'capability.assertion-records');
 const row=get(root,TYPE,receipt.addresses[0]);assert.deepEqual(row.v,grant());assert.deepEqual(readHead(root,TYPE,TYPE).frontier,receipt.addresses);
 assert.deepEqual(readCapabilityAssertions(root,{strict:true}),[grant()]);admit(root,deny());assert.equal(readCapabilityAssertions(root,{strict:true}).length,2);
});
test('a real second-process revocation reaches the actual RPC authorization adapter immediately',t=>{
 const root=fixture(t);admit(root,grant());
 const action=operation({verb:'orientation',run:()=>null});
 const request=invocation({request:'fixture',subject:'alice',operation:action.ref,verb:action.verb,resource:'infograph',input:null,caller:{transport:'fixture'},observedAt:AT});
 const check=authorizationFromCapabilityAssertions(authorizationFromStanding(new Map([[action.ref,'potential']])),()=>readCapabilityAssertions(root,{strict:true}));
 assert.equal(check(request,action,AT).ok,true);
 execFileSync(process.execPath,['--input-type=module','--eval',`import {admitCapabilityAssertions} from './src/rpc/capability-assertions.mjs';admitCapabilityAssertions(${JSON.stringify({dataRoot:root,assertions:[deny()]})});`],{cwd:new URL('..',import.meta.url),stdio:'pipe'});
 assert.equal(check(request,action,AT).ok,false);
});
test('missing and corrupted denied records refuse despite unchanged head and never revive preceding grant',t=>{
 const root=fixture(t);admit(root,grant());const receipt=admit(root,deny()),before=readHead(root,TYPE,TYPE),file=recordFile(root,TYPE,receipt.addresses[0]);
 writeFileSync(file,'{broken\n');assert.throws(()=>readCapabilityAssertions(root,{strict:true}),{code:'CAPABILITY_ASSERTIONS_UNAVAILABLE'});assert.deepEqual(readCapabilityAssertions(root),[]);
 rmSync(file);assert.deepEqual(readHead(root,TYPE,TYPE),before);assert.throws(()=>readCapabilityAssertions(root,{strict:true}),{code:'CAPABILITY_ASSERTIONS_UNAVAILABLE'});
});
test('truncation, invalid bound and malformed claim refuse, with original cause retained',t=>{
 const root=fixture(t);admit(root,grant());admit(root,deny());
 assert.throws(()=>readCapabilityAssertions(root,{strict:true,limit:1}),e=>e.code==='CAPABILITY_ASSERTIONS_UNAVAILABLE'&&e.cause instanceof Error);
 assert.throws(()=>readCapabilityAssertions(root,{strict:true,limit:0}),{code:'CAPABILITY_ASSERTIONS_UNAVAILABLE'});
 extend(root,TYPE,TYPE,{e:'bad',a:{kind:'capability.assertion'},v:{kind:'wrong'},t:AT});assert.throws(()=>readCapabilityAssertions(root,{strict:true}),{code:'CAPABILITY_ASSERTIONS_UNAVAILABLE'});
});
test('unrelated types never grant authority and a missing cross-type cause remains incomplete',t=>{
 const root=fixture(t),foreign=put(root,'unrelated',{v:grant()});
 writeHead(root,TYPE,TYPE,{frontier:[{type:'unrelated',id:foreign}]});assert.deepEqual(readCapabilityAssertions(root,{strict:true}),[]);
 rmSync(recordFile(root,'unrelated',foreign));assert.throws(()=>readCapabilityAssertions(root,{strict:true}),{code:'CAPABILITY_ASSERTIONS_UNAVAILABLE'});
});
test('malformed named heads and retired layout are unknown, not a clean empty authority',t=>{
 const root=fixture(t);admit(root,grant());writeFileSync(headFile(root,TYPE,TYPE),'{bad');assert.throws(()=>readCapabilityAssertions(root,{strict:true}),{code:'CAPABILITY_ASSERTIONS_UNAVAILABLE'});
 assert.throws(()=>admitCapabilityAssertions({dataRoot:root,rootName:'retired',assertions:[grant()]}),/actual settlement/);
});

test('record migration preserves the actual public extremal standing independently of storage',t=>{
 const root=fixture(t),raw=[grant(),deny()];for(const assertion of raw)admit(root,assertion);
 const direct=can(raw,'alice','infograph#orientation');assert.equal(direct.value,'contested');assert.equal(direct.granted,true);assert.equal(direct.revoked,true);
 assert.deepEqual(can(readCapabilityAssertions(root,{strict:true}),'alice','infograph#orientation'),direct);
});
test('the actual capability consumer refuses a named frontier replaced between its initial and final reads',()=>{
 const code=`
  import fs from 'node:fs';import assert from 'node:assert/strict';import {syncBuiltinESMExports} from 'node:module';import {tmpdir} from 'node:os';import {join} from 'node:path';
  import {grantAssertion,revokeAssertion,capabilityRef} from '@red-cup-engineering/computer-networking-engineering-services-section/object-capability';
  import {put,writeHead,readHead} from '@red-cup-engineering/semiotic-eavt-services-section/store';import {headFile} from '@red-cup-engineering/semiotic-eavt-services-section/layout';
  import {admitCapabilityAssertions,readCapabilityAssertions,capabilityAssertionFeed as type} from './src/rpc/capability-assertions.mjs';
  const root=fs.mkdtempSync(join(tmpdir(),'authority-frontier-'));
  try{
   const at='2026-10-12T00:00:00.000Z',grant=grantAssertion('fixture','alice','infograph#orientation',at);
   admitCapabilityAssertions({dataRoot:root,assertions:[grant]});const before=readHead(root,type,type);
   const deny=revokeAssertion('fixture','alice','infograph#orientation',at),address=put(root,type,{e:capabilityRef(deny.holder,deny.grants),a:{kind:'capability.assertion'},v:deny,t:at,causes:before.frontier});
   const file=headFile(root,type,type),read=fs.readFileSync;let reads=0;
   fs.readFileSync=(...args)=>{if(args[0]===file&&++reads===2)writeHead(root,type,type,{frontier:[address]});return read(...args);};syncBuiltinESMExports();
   assert.throws(()=>readCapabilityAssertions(root,{strict:true}),e=>e.code==='CAPABILITY_ASSERTIONS_UNAVAILABLE'&&/frontier changed/.test(e.cause.message));assert.ok(reads>=2);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
 `;
 execFileSync(process.execPath,['--input-type=module','--eval',code],{cwd:new URL('..',import.meta.url),stdio:'pipe',timeout:5000});
});
