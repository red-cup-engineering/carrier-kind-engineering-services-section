import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const moduleUrl=new URL('../../src/rpc/coordination.mjs',import.meta.url).href;
function child(root,body){
 return JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`
  import {mkdirSync,writeFileSync,unlinkSync,readFileSync} from 'node:fs';
  import {join} from 'node:path';
  const {processLeaseCoordinator}=await import(${JSON.stringify(moduleUrl)});
  const root=${JSON.stringify(root)},parent=${process.pid};
  const invoke=coordinate=>coordinate({id:'controlled-request'},{ref:'controlled-operation'},'2026-10-10T03:30:00Z');
  ${body}
 `],{encoding:'utf8'}));
}
test('many owned data roots share one exit cleanup and release their actual leases',()=>{
 const root=mkdtempSync(join(tmpdir(),'lease-lifetime-'));
 try{
  const result=child(root,`
   const before=process.listenerCount('exit'),leases=[];
   for(let i=0;i<24;i++){
    const path=join(root,String(i)),a=invoke(processLeaseCoordinator(path)),b=invoke(processLeaseCoordinator(join(path,'..',String(i))));
    if(!a.ok||!b.ok||a.lease!==b.lease)throw new Error('same root did not retain its process holder');
    leases.push(a.lease);
   }
   console.log(JSON.stringify({added:process.listenerCount('exit')-before,leases}));
  `);
  assert.equal(result.added,1);
  assert.equal(result.leases.length,24);
  assert(result.leases.every(path=>!existsSync(path)));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('held-cache replacement cannot authorize execution or delete the other live process lease',()=>{
 const root=mkdtempSync(join(tmpdir(),'lease-holder-'));
 try{
  const result=child(root,`
   const coordinate=processLeaseCoordinator(root),first=invoke(coordinate);
   if(!first.ok)throw new Error('original lease refused');
   writeFileSync(first.lease,String(parent));
   const refused=invoke(coordinate);
   console.log(JSON.stringify({refused,lease:first.lease}));
  `);
  assert.equal(result.refused.ok,false);
  assert.equal(result.refused.kind,'metroplat.rpc.coordination:obstruction');
  assert.equal(readFileSync(result.lease,'utf8'),String(process.pid));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('removed lease is acquired again under actual filesystem custody',()=>{
 const root=mkdtempSync(join(tmpdir(),'lease-reacquire-'));
 try{
  const result=child(root,`
   const coordinate=processLeaseCoordinator(root),first=invoke(coordinate);
   unlinkSync(first.lease);
   const next=invoke(coordinate),holder=readFileSync(next.lease,'utf8');
   console.log(JSON.stringify({ok:next.ok,holder,pid:process.pid,lease:next.lease}));
  `);
  assert.equal(result.ok,true);assert.equal(result.holder,String(result.pid));
  assert.equal(existsSync(result.lease),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
