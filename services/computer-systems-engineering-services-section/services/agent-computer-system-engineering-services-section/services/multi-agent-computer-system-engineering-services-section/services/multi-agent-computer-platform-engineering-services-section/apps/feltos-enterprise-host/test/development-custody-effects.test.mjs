import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,statSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runProgram,developmentOperations} from '../../../../../../../apps/agent-organization-engine/lib/animating/src/becoming/doing/working/software-change/mission/development.mjs';
import {defaultFilesystemBinding} from '@red-cup-engineering/computer-system-engine/rpc/binding';
const digest=id=>id.slice(id.lastIndexOf(';')+1);
test('large real source changes use exact product custody, consume effects, reuse derivation and reject changed content',async()=>{
 const root=mkdtempSync(join(tmpdir(),'development-custody-'));
 try{
  writeFileSync(join(root,'large.mjs'),'// migration material\n'.repeat(24000));
  writeFileSync(join(root,'consumer.mjs'),'import assert from "node:assert/strict";import {answer} from "./large.mjs";assert.equal(answer,42);');
  const generated='export const answer=42;\nexport const catalog='+JSON.stringify(Array.from({length:90000},(_,id)=>({id,label:'item-'+id})))+';\n';
  const proposal={type:'SoftwareSourceTransformation',version:1,operations:[{kind:'replace-text',path:'large.mjs',text:generated}]};
  const input={objective:'Replace the migration material with the required answer consumed by the application',territory:root,writablePaths:['large.mjs'],readablePaths:[],authority:['receiver:test'],verifyCommand:'node consumer.mjs',acceptanceCommand:'node consumer.mjs',artifactProposal:proposal};
  let calls=0;
  const options={dataRoot:join(root,'custody'),receiver:{root,writablePaths:input.writablePaths,verifyCommand:input.verifyCommand,acceptanceCommand:input.acceptanceCommand},inquire:async(request,ports)=>{
   calls++;await ports.handlers.read_product({id:request.context.prior.id});
   return {role:request.role,text:'Derive the actual consumer requirement from the preceding product.',unresolved:['Semantic proof remains unestablished'],...(request.role==='artifact-specifications'?{product:{proposal}}:{})};
  }};
  const result=await runProgram(input,options);assert.equal(result.status,'applied');assert.equal(result.outcome.verified,true);assert.equal(calls,7);assert.match(readFileSync(join(root,'large.mjs'),'utf8'),/answer=42/);
  const question=result.engineeringDesign.question,history=join(options.dataRoot,'software-development',digest(question)+'.json');
  assert(statSync(history).size<200000,'the causal history does not embed the migration source repeatedly');
  const read=developmentOperations(defaultFilesystemBinding(options.dataRoot),{}).find(o=>o.verb==='aoe-development-product');
  const artifact=result.engineeringDesign.stages.at(-1).artifactId;
  const response=await read.execute({question,artifact},{},{invocation:{subject:'receiver:test'}});
  assert(response.totalBytes>2*1024*1024,'logical products exceed one physical carrier while reads remain bounded');
  assert.equal(readFileSync(join(root,'large.mjs'),'utf8'),generated);
  const product=join(options.dataRoot,'software-development','products',digest(artifact)+'.json');
  const held=JSON.parse(readFileSync(product,'utf8'));assert.equal(held.kind,'software-development.product-manifest');
  const chunk=join(options.dataRoot,'software-development','products','chunks',digest(held.value.chunks[0])+'.json');
  const changed=JSON.parse(readFileSync(chunk,'utf8'));changed.value.bytesBase64='substituted';writeFileSync(chunk,JSON.stringify(changed));
  await assert.rejects(read.execute({question,artifact},{},{invocation:{subject:'receiver:test'}}),/differs from its announced content address/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
