import {defaultFilesystemBinding} from '@red-cup-engineering/computer-system-engine/rpc/binding';
import {userSenMessage} from '@red-cup-engineering/a2a-services-section/sen-part';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {developmentOperations,compileEngineeringDesign,runProgram,DEVELOPMENT_STAGES,readDevelopmentProducts} from '@red-cup-engineering/animating/software-change/mission/development';
import {captureSoftwareChangeSource,projectFabricatedSoftwareChanges,induceVerifiedSoftwareMissionProposal} from '@red-cup-engineering/animating/software-change/mission/development';
import {projectSenActivity,senActivityObjectBytes,extractSenActivity} from '@red-cup-engineering/activitypub-services-section/sen-activity';
import {createActivityPubNodeArrivalHandler} from '../src/activitypub-node.mjs';
import {processAdmittedActorRequest} from '@red-cup-engineering/computer-system-engine/rpc/actor-processing';
import {arrivalDispatchClaimFromCloudEvent} from '@red-cup-engineering/computer-system-engine/rpc/arrival';

const at='2026-10-06T12:00:00.000Z';
const sender='https://requester.example/actors/human';
const origin='https://developer.example';
const recipient=origin+'/actors/developer';
const old='export const ItemSchema = {type:"object"};\n';
const check='node consumer.mjs';
function fixture(){
 const state=mkdtempSync(join(tmpdir(),'development-effect-'));
 for(const name of ['producer','receiver','custody'])mkdirSync(join(state,name));
 for(const name of ['producer','receiver']){
  writeFileSync(join(state,name,'shape.mjs'),old);
  writeFileSync(join(state,name,'obsolete.mjs'),'export const duplicate = true;\n');
  writeFileSync(join(state,name,'research.md'),'Require a nonempty string identifier.\n');
  writeFileSync(join(state,name,'consumer.mjs'),[
   'import assert from "node:assert/strict";',
   'import {existsSync} from "node:fs";',
   'import {ItemSchema} from "./shape.mjs";',
   'assert.deepEqual(ItemSchema.required,["id"]);',
   'assert.equal(ItemSchema.properties.id.minLength,1);',
   'assert.equal(existsSync("obsolete.mjs"),false);',
  ].join('\n'));
 }
 return {state,territory:join(state,'producer'),receiver:join(state,'receiver'),dataRoot:join(state,'custody')};
}
function demand(f){return {objective:'Require the identifier schema and retire its obsolete duplicate for the real consumer',
 territory:f.territory,writablePaths:['shape.mjs','obsolete.mjs'],readablePaths:['research.md','shape.mjs'],
 verifyCommand:check,acceptanceCommand:check,authority:['receiver:test-grant']};}
function inquiry(calls){
 return async (request,ports)=>{
  calls.push(request.role);
  await ports.handlers.read_product({id:request.context.prior.id});
  if(request.context.fabricationFeedback)await ports.handlers.read_product({id:request.context.fabricationFeedback.id});
  const source=await ports.handlers.read_source({path:'research.md'});
  return {role:request.role,text:'Derived '+request.role+' from '+source.value.text,
   unresolved:['Semantic proof remains unestablished'],
   ...(request.role==='artifact-specifications'?{product:{schemaModules:[{path:'shape.mjs',format:'javascript',
    entries:[{schema:{type:'object',required:['id'],properties:{id:{type:'string',minLength:1}}},
     exportName:'ItemSchema',typeName:'Item'}]}],retire:['obsolete.mjs']}}:{})};
 };
}
function authorize(invocation,operation,decidedAt){
 const ok=invocation.subject===sender;
 return {kind:ok?'metroplat.rpc.authorization:witness':'metroplat.rpc.authorization:obstruction',
  ok,invocation:invocation.id,operation:operation.ref,subject:invocation.subject,
  reading:ok?'held':'unknown',evidence:['receiver:test-authority'],reasons:ok?[]:['not granted'],decidedAt};
}
test('another actor inbox activates design, deterministic fabrication, receiving and a correlated reply',async()=>{
 const f=fixture(),calls=[],replies=[];
 try{
  const operations=developmentOperations({dataRoot:f.dataRoot},{softwareDevelopment:{
   receiveDemand:async ({request,subject})=>{
    assert.equal(subject,sender);assert.equal(request.objective,demand(f).objective);
    return {demand:demand(f),authority:['receiver:test-grant'],execution:{
     inquire:inquiry(calls),receiver:{root:f.receiver,writablePaths:['shape.mjs','obsolete.mjs'],verifyCommand:check,acceptanceCommand:check}}};
   },
  }});
  const handler=createActivityPubNodeArrivalHandler({dataRoot:f.dataRoot,rootName:'developer-test',origin,
   actors:[{identifier:'developer'}],
   executeRequest:async ({event,authenticatedActor,admission})=>{
    return processAdmittedActorRequest({event,admission,authenticatedActor,operations,authorize,
     binding:defaultFilesystemBinding(f.dataRoot,{now:()=>at,rootName:'developer-test'})});
   },
   reply:async ({request,result,identifier,recipient:to,inbox})=>{
    assert.equal(inbox,'https://requester.example/inbox');
    const activity=projectSenActivity({type:'Accept',origin,identifier,recipient:to,
     objectBytes:senActivityObjectBytes({objectKind:'metroplat.dispatch.result',value:{request,result}}),
     agentCard:origin+'/.well-known/agent-card.json',eventTime:at});
    replies.push(activity);
    return {delivered:true};
   },
  });
  const requestBytes=senActivityObjectBytes({objectKind:'metroplat.dispatch.arrival-material',
   value:{kind:'metroplat.dispatch.arrival-material',argv:['aoe-develop-software'],
    stdin:JSON.stringify({objective:demand(f).objective,work:'urn:test:admitted-work'})}});
  const activity=projectSenActivity({type:'Create',origin:'https://requester.example',identifier:'human',recipient,
   objectBytes:requestBytes,a2aMessage:userSenMessage(requestBytes),
   agentCard:'https://requester.example/.well-known/agent-card.json',eventTime:at,a2aRole:'ROLE_USER'});
  const arrival={recipient:'developer',jsonLd:activity,activity:{actorId:new URL(sender)},
   sender:{actorId:sender,inboxId:'https://requester.example/inbox'}};
  const first=await handler(arrival);
  assert.equal(first.result.code,0,JSON.stringify(first.result));
  assert.deepEqual(calls,DEVELOPMENT_STAGES);
  const outcome=JSON.parse(first.result.stdout);
  assert.equal(outcome.status,'applied');assert.equal(outcome.outcome.verified,true);
  assert.equal(readFileSync(join(f.territory,'shape.mjs'),'utf8'),old);
  assert.equal(existsSync(join(f.territory,'obsolete.mjs')),true);
  assert.equal(existsSync(join(f.receiver,'obsolete.mjs')),false);
  assert.match(readFileSync(join(f.receiver,'shape.mjs'),'utf8'),/minLength/);
  const read=operations.find(operation=>operation.verb==='aoe-development-product');
  const window=await read.execute({question:outcome.question,artifact:outcome.effect},{},{invocation:{subject:sender}});
  const effect=JSON.parse(Buffer.from(window.bytesBase64,'base64').toString('utf8'));
  assert.equal(effect.kind,'software-development.effect');
  assert.equal(effect.value.semanticProof,'unestablished');
  const proposal=await read.execute({question:outcome.question,artifact:effect.value.proposal},{},{invocation:{subject:sender}});
  assert.equal(JSON.parse(Buffer.from(proposal.bytesBase64,'base64').toString('utf8')).kind,'software-development.proposal');
  const second=await handler(arrival);
  assert.equal(second.result.replayed,true);
  assert.equal(calls.length,7);
  assert.equal(replies.length,2);
  const reply=extractSenActivity(replies[0],{expectedActor:recipient,expectedRecipient:sender});
  assert.equal(arrivalDispatchClaimFromCloudEvent(reply.cloudEvent),undefined);
  const denied={...arrival,sender:{actorId:'https://intruder.example/actors/agent',inboxId:'https://intruder.example/inbox'}};
  await assert.rejects(handler(denied),/wrong canonical|actor|sender/);
 }finally{rmSync(f.state,{recursive:true,force:true});}
});
test('engineering reuse consumes current research bytes and does not rebuy identical products',async()=>{
 const f=fixture(),calls=[];try{
  const input={...demand(f),workType:'inquiry'},options={dataRoot:f.dataRoot,inquire:inquiry(calls)};
  const first=await compileEngineeringDesign(input,options);
  const second=await compileEngineeringDesign(input,options);
  assert.equal(calls.length,1);assert.equal(second.inferenceAttempts,0);
  writeFileSync(join(f.territory,'research.md'),'The new identifier requirement has changed.\n');
  const third=await compileEngineeringDesign(input,options);
  assert.equal(calls.length,2);
  assert.notEqual(first.stages[0].artifactId,third.stages[0].artifactId);
 }finally{rmSync(f.state,{recursive:true,force:true});}
});
test('retirement receiving restores removed source when its consumer refuses',()=>{
 const f=fixture();try{
  const source=captureSoftwareChangeSource({root:f.receiver,writablePaths:['obsolete.mjs']});
  const proposal=projectFabricatedSoftwareChanges(source,{type:'SoftwareSourceTransformation',version:1,
   operations:[{kind:'remove',path:'obsolete.mjs'}]});
  assert.throws(()=>induceVerifiedSoftwareMissionProposal({root:f.receiver,writablePaths:['obsolete.mjs'],
   verifyCommand:'node -e "process.exit(1)"',acceptanceCommand:'node -e "process.exit(1)"',proposal}),/rolled back/);
  assert.equal(readFileSync(join(f.receiver,'obsolete.mjs'),'utf8'),'export const duplicate = true;\n');
 }finally{rmSync(f.state,{recursive:true,force:true});}
});


test('receiver counterexamples activate new derivation and the corrected consumer effect',async()=>{
 const f=fixture(),calls=[];try{
  let counterexample;
  const options={dataRoot:f.dataRoot,receiver:{root:f.receiver,writablePaths:['shape.mjs','obsolete.mjs'],verifyCommand:check,acceptanceCommand:check},
   inquire:async (request,ports)=>{
    const artifact=await inquiry(calls)(request,ports);
    if(request.context.fabricationFeedback){
     const received=await ports.handlers.read_product({id:request.context.fabricationFeedback.id,limit:16384});
     counterexample=JSON.parse(received.text);
    }
    if(request.role==='artifact-specifications'&&!counterexample)artifact.product.schemaModules[0].entries[0].schema.properties.id.minLength=0;
    return artifact;
   }};
  const result=await runProgram(demand(f),options);
  assert.equal(result.status,'applied');assert.equal(result.outcome.verified,true);
  assert.equal(counterexample.kind,'software-development.receiving-refusal');
  assert.equal(counterexample.value.receiving.verification.passed,false);
  assert.deepEqual(calls,[...DEVELOPMENT_STAGES,'artifact-specifications']);
  assert.match(readFileSync(join(f.receiver,'shape.mjs'),'utf8'),/"minLength": 1/);
 }finally{rmSync(f.state,{recursive:true,force:true});}
});

test('inference consumes bounded source and addressed prior products',async()=>{
 const f=fixture();
 try{
  const text='Read this research in source windows. '.repeat(900);writeFileSync(join(f.territory,'research.md'),text);
  const input=demand(f),observed=[];
  const design=await compileEngineeringDesign(input,{dataRoot:f.dataRoot,inquire:async(request,ports)=>{
   assert(!JSON.stringify(request.context).includes(text));
   assert(!JSON.stringify(request.context).includes(old));
   await ports.handlers.read_product({id:request.context.prior.id});
  const source=await ports.handlers.read_source({path:'research.md',offset:13,limit:17});
   assert.equal(source.value.text,Array.from(text).slice(13,30).join(''));assert.equal(source.projection.complete,false);
   const prior=await ports.handlers.read_product({id:request.context.prior.id,limit:16384});
   const product=JSON.parse(prior.text);assert.equal(product.id,request.context.prior.id);
   await assert.rejects(ports.handlers.read_product({id:'ni:///sha-256;'+'a'.repeat(43)}),/not in this derivation/);
   if(request.role==='high-level-design'){
    const architecture=request.context.products.find(product=>product.role==='software-architecture-specification');
    const window=await ports.handlers.read_product({id:architecture.id,limit:16384});
    assert.equal(JSON.parse(window.text).value.role,'software-architecture-specification');
   }
   observed.push(request.role);
   return {role:request.role,text:'A compact derived product for '+request.role,unresolved:['Semantic proof unestablished'],...(request.role==='artifact-specifications'?{product:{schemaModules:[{path:'shape.mjs',format:'javascript',entries:[{schema:{type:'object',required:['id'],properties:{id:{type:'string',minLength:1}}},exportName:'ItemSchema',typeName:'Item'}]}],retire:['obsolete.mjs']}}:{})};
  }});
  assert.equal(design.stages.length,7);assert.equal(observed.length,7);
 }finally{rmSync(f.state,{recursive:true,force:true});}
});


test('engine grounds contribution inputs in stage-local reads and refuses forged provenance',async()=>{
 const f=fixture();
 try{
  const sourceIds=[];
  const design=await compileEngineeringDesign(demand(f),{dataRoot:f.dataRoot,inquire:async(request,ports)=>{
   await ports.handlers.read_product({id:request.context.prior.id});
   if(request.role==='prior-art-synthesis')sourceIds.push((await ports.handlers.read_source({path:'research.md',offset:0,limit:9})).id);
   return {role:request.role,text:'Contributed '+request.role,unresolved:['Unestablished semantic derivation'],...(request.role==='artifact-specifications'?{product:{schemaModules:[{path:'shape.mjs',format:'javascript',entries:[{schema:{type:'object',required:['id'],properties:{id:{type:'string',minLength:1}}},exportName:'ItemSchema',typeName:'Item'}]}],retire:['obsolete.mjs']}}:{})};
  }});
  const products=readDevelopmentProducts(f.dataRoot,design.question);
  const first=products.find(product=>product.id===design.stages[0].artifactId).value;
  const second=products.find(product=>product.id===design.stages[1].artifactId).value;
  assert(first.inputs.includes(sourceIds[0]));assert.equal(first.readings.find(reading=>reading.kind==='source-view').length,9);
  assert(!second.inputs.includes(sourceIds[0]));assert(second.inputs.includes(design.stages[0].artifactId));
  assert.equal(first.semanticProof,'unestablished');assert.equal(first.admission,'machine-grounded-contribution');
  await assert.rejects(compileEngineeringDesign({...demand(f),objective:'Reject a producer-forged input',workType:'inquiry'},{dataRoot:f.dataRoot,inquire:async(request,ports)=>{
   await ports.handlers.read_product({id:request.context.prior.id});
   return {role:request.role,text:'A claim',inputs:['invented-input'],unresolved:[]};
  }}));
  await assert.rejects(compileEngineeringDesign({...demand(f),objective:'Require actual prior consumption',workType:'inquiry'},{dataRoot:f.dataRoot,inquire:async request=>({role:request.role,text:'A claim without reading',unresolved:[]})}),/did not read its preceding product/);
 }finally{rmSync(f.state,{recursive:true,force:true});}
});
