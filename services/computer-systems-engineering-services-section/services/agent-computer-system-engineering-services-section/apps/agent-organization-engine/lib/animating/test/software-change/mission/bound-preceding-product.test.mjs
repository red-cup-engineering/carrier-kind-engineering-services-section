import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';
import {runProgram,DEVELOPMENT_STAGES}from '../../../src/becoming/doing/working/software-change/mission/development.mjs';
import {createToolPlatform}from '@red-cup-engineering/computer-inference-engine/openai/tool-agent';
test('each derivation reads its bound preceding product and receiving consumes the resulting source transformation',async t=>{
 const root=mkdtempSync(join(tmpdir(),'bound-product-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 writeFileSync(join(root,'result.txt'),'before');writeFileSync(join(root,'theory.txt'),'Identity selection belongs to deterministic receiving; inference derives the necessary transformation.');
 writeFileSync(join(root,'check.cjs'),"const assert=require('node:assert/strict');const fs=require('node:fs');assert.equal(fs.readFileSync(require('node:path').join(__dirname,'result.txt'),'utf8'),'derived effect');");
 const check=process.execPath+' '+join(root,'check.cjs'),stages=[],ids=[],observations=[];
 const proposal={type:'SoftwareSourceTransformation',version:1,operations:[{kind:'replace-text',path:'result.txt',text:'derived effect'}]};
 const input={objective:'Use the bound prior product and source law to realize the admitted effect.',territory:root,writablePaths:['result.txt'],readablePaths:['theory.txt'],authority:['human:test-allocation'],artifactProposal:proposal,verifyCommand:check,acceptanceCommand:check};
 const result=await runProgram(input,{dataRoot:join(root,'data'),producerActor:'actor:fixture-producer',qualifyConstruction:request=>({kind:'software-development.construction-review',request:request.id,actor:'actor:independent-reviewer',office:'engineering#reviewer',decision:'admitted',evidence:request.checks.map(check=>({check,source:request.stages.find(stage=>stage.role===request.evidenceRoles[check]).artifact}))}),receiver:{root,writablePaths:['result.txt'],verifyCommand:check,acceptanceCommand:check},authorizeEffect:async e=>{if(e.phase==='product-read')observations.push(e.id)},inquire:async(request,ports)=>{
  let reads=0;const priorTool=ports.tools.find(tool=>tool.function.name==='read_product');
  const platform=createToolPlatform({tools:[priorTool],toolHandlers:{read_product:async args=>{reads++;return ports.handlers.read_product(args)}}});
  const refusal=await platform.execute('read_product',{id:'ni:///sha-256;'+('A'.repeat(43))},{allowedEffects:['read_product']});
  assert.equal(refusal.ok,false);assert.equal(reads,0);
  const current=await platform.execute('read_product',{limit:16384},{allowedEffects:['read_product']});
  assert.equal(current.ok,true);assert.equal(current.value.id,request.context.prior.id);
  assert.equal(JSON.parse(current.value.text).id,request.context.prior.id);
  if(request.role==='prior-art-synthesis'){const source=await ports.handlers.read_source({id:request.context.sources[0].id});assert.match(source.value.text,/deterministic receiving/);}
  const explicit=await platform.execute('read_product',{id:request.context.prior.id,limit:16384},{allowedEffects:['read_product']});
  assert.equal(explicit.ok,true);assert.deepEqual(explicit.value,current.value);assert.equal(reads,2);
  stages.push(request.role);ids.push(current.value.id);
  return{role:request.role,text:'Derive '+request.role+' from the observed preceding product '+current.value.id+' under the admitted source law.',unresolved:[],...(request.role==='artifact-specifications'?{product:{proposal}}:{})};
 }});
 assert.equal(result.status,'applied');assert.equal(result.outcome.verified,true);
 assert.deepEqual(stages,DEVELOPMENT_STAGES);assert.equal(new Set(ids).size,7);
 assert.equal(readFileSync(join(root,'result.txt'),'utf8'),'derived effect');
 assert.equal(observations.length,14);
});
