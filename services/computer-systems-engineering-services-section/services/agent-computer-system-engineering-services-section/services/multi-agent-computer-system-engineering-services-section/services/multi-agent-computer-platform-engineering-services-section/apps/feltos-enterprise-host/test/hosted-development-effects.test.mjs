import test from 'node:test';
import {createRequire} from 'node:module';
import {createActorClient} from '@red-cup-engineering/computer-system-engine/rpc/actor-client';
import {createActivityPubJournalCustody} from '@red-cup-engineering/activitypub-services-section/journal-custody';
const vocabPath=createRequire(import.meta.resolve('@red-cup-engineering/activitypub-services-section')).resolve('@fedify/vocab');
const {Service}=await import(vocabPath.replace(/\.cjs$/u,'.js'));
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,cpSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const reviewFixture=await import(new URL('../../test/fixtures/owning-source-review.mjs',import.meta.resolve('@red-cup-engineering/computer-code-development-engine/git/github-candidate')));
import {hostedDevelopmentOperations,hostedDevelopmentRequestAt} from '../src/software-development.mjs';
import {EnterpriseExecutionWorker} from '../src/enterprise-execution.mjs';
import {hostedWorkerWorldExecution} from '../src/worker-world.mjs';
import {metroplexOperations} from '@red-cup-engineering/metroplat/metroplex';
import {readStanding} from '@red-cup-engineering/metroplat/offices';
import {admitAgencyWorkAllocation} from '@red-cup-engineering/feltos/work/agency-work-allocation';
import {admitAgencyWorkExecution} from '@red-cup-engineering/feltos/work/agency-work-execution';
import {admitStructuredWorkIntent} from '@red-cup-engineering/feltos/work/structured-intent';
import {charterProviderDelegationAuthorizer} from '@red-cup-engineering/feltos/work/provider-delegation-authority';
import {readAgentWorkDispatchReadout} from '@red-cup-engineering/feltos/work/dispatch-readout';
import {admitHarnessCarriers,admitCharacterMasks} from '@red-cup-engineering/metroplat/offices';
import {projectSurface} from '@red-cup-engineering/metroplat/presentation/surface';
import {capabilityWitnessesForOperations} from '@red-cup-engineering/feltos/agents/capability-witnesses';
import {readCapabilityWitnesses} from '@red-cup-engineering/computer-system-engine/rpc/capability-claims';
import {induceVerifiedSoftwareMissionProposal} from '@red-cup-engineering/animating/software-change/mission/development';
import {agentCoordinationOperations} from '@red-cup-engineering/computer-code-development-engine/agent/service';
import {enterpriseOperationRuntime} from '../src/enterprise-runtime.mjs';
import {agencyMoved,releaseAgency} from '@red-cup-engineering/organizing/agency/held';
import {defaultFilesystemBinding} from '@red-cup-engineering/computer-system-engine/rpc/binding';
import {processAdmittedActorRequest} from '@red-cup-engineering/computer-system-engine/rpc/actor-processing';
import {projectSenActivity,senActivityObjectBytes,extractSenActivity} from '@red-cup-engineering/activitypub-services-section/sen-activity';
import {userSenMessage} from '@red-cup-engineering/a2a-services-section/sen-part';
import {createActivityPubNodeArrivalHandler} from '../src/activitypub-node.mjs';
const sender='https://requester.example/actors/engineer',at='2026-10-06T12:00:00.000Z';
const roles=['prior-art-synthesis','system-operational-concept','software-requirements-specification','software-architecture-specification','high-level-design','low-level-design','artifact-specifications'];
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'hosted-development-')),agencyRoot=join(root,'agency'),section=join(agencyRoot,'engineering');
 for(const dir of ['offices','skills','requirements','incumbencies'])mkdirSync(join(section,'lib/agency',dir),{recursive:true});
 const record=(pool,id,value)=>writeFileSync(join(section,'lib/agency',pool,id+'.json'),JSON.stringify({id,name:id,...value}));
 record('offices','engineer',{kind:'office','normative-structure':'Realize the specified consumer effect','deontic-profile':{},jurisdiction:'engineering','provides-skill':['develop']});
 record('skills','develop',{'closure-kind':'process','requires-capabilities':['aoe-develop-software','aoe-development-product'],method:'Research, derive, generate, receive and use the effect.'});
 record('incumbencies','engineer-seat',{office:'engineer',holder:sender,recognition:'t',induction:'t'});
 mkdirSync(join(root,'receiver'));mkdirSync(join(root,'custody'));
 writeFileSync(join(root,'receiver','shape.mjs'),'export const ItemSchema = {type:"object"};\n');
 writeFileSync(join(root,'receiver','consumer.mjs'),'import assert from "node:assert/strict";import {ItemSchema} from "./shape.mjs";assert.equal(ItemSchema.properties.id.minLength,1);\n');
 writeFileSync(join(root,'receiver','research.md'),'Consumer requires a nonempty identifier.\n');
 const review=reviewFixture.installReviewFixture(root);
 execFileSync('git',['init','--quiet','--initial-branch=main'],{cwd:root});
 execFileSync('git',['config','user.name','Controlled engineer'],{cwd:root});
 execFileSync('git',['config','user.email','engineer@example.invalid'],{cwd:root});
 execFileSync('git',['add','receiver'],{cwd:root});
 execFileSync('git',['commit','--quiet','-m','Original consumer'],{cwd:root});
 const sourceBase=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const origin=join(root,'remote.git');execFileSync('git',['init','--bare','--quiet',origin]);
 execFileSync('git',['remote','add','origin',origin],{cwd:root});execFileSync('git',['push','--quiet','origin','main'],{cwd:root});

 const contract={sourceBase,office:'engineering#engineer',objective:'Require a nonempty identifier for the consumer',territory:'receiver',
  writablePaths:['shape.mjs'],readablePaths:['shape.mjs','research.md'],verifyCommand:'node consumer.mjs',acceptanceCommand:'node consumer.mjs'};
 record('requirements','identifier',{'raised-by':sender,asks:{development:contract},'met-when':'The existing consumer accepts the generated schema'});
 return {root,review,agencyRoot,section,contract,record,binding:defaultFilesystemBinding(join(root,'custody'),{now:()=>at}),config:{agencyRoot,repositoryRoot:root,metroplatDataRoot:join(root,'custody'),instance:{name:'developer'}}};
}
function compute(f,calls,{revoke=false,changeRequirement=false}={}){
 return {inquire:async(request,ports)=>{
  calls.push(request.role);await ports.handlers.read_product({id:request.context.prior.id});
  const source=await ports.handlers.read_source({path:'research.md'});
  if(request.role==='artifact-specifications'){
   if(revoke){const file=join(f.section,'lib/agency/incumbencies/engineer-seat.json');rmSync(file);agencyMoved(f.agencyRoot,file);}
   if(changeRequirement){f.record('requirements','identifier',{'raised-by':sender,asks:{development:{...f.contract,objective:'Changed receiving demand'}},'met-when':'Changed'});agencyMoved(f.agencyRoot);}
  }
  return {role:request.role,text:'Derived '+request.role+' from '+source.value.text,unresolved:['Semantic proof unestablished'],
   ...(request.role==='artifact-specifications'?{product:{schemaModules:[{path:'shape.mjs',format:'javascript',entries:[{schema:{type:'object',properties:{id:{type:'string',minLength:1}}},exportName:'ItemSchema',typeName:'Item'}]}]}}:{})};
 }};
}
function invoke(f,operations,work='engineering#identifier',extra={}){
 const bytes=senActivityObjectBytes({objectKind:'metroplat.dispatch.arrival-material',value:{kind:'metroplat.dispatch.arrival-material',
  argv:['aoe-develop-software'],stdin:JSON.stringify({work,objective:f.contract.objective,...extra})}});
 const activity=projectSenActivity({type:'Create',origin:'https://requester.example',identifier:'engineer',recipient:'https://developer.example/actors/developer',
  objectBytes:bytes,a2aMessage:userSenMessage(bytes),agentCard:'https://requester.example/.well-known/agent-card.json',eventTime:at,a2aRole:'ROLE_USER'});
 return receive(f,operations,activity);
}
function receive(f,operations,activity){
 const replies=[];
 const handler=createActivityPubNodeArrivalHandler({dataRoot:f.binding.dataRoot,origin:'https://developer.example',rootName:'developer',actors:[{identifier:'developer',actorId:'https://developer.example/actors/developer'}],executeRequest:({event,admission,authenticatedActor})=>
  processAdmittedActorRequest({event,admission,authenticatedActor,operations,binding:f.binding,
   authorize:(candidate,operation,decidedAt)=>({kind:'metroplat.rpc.authorization:witness',ok:true,invocation:candidate.id,operation:operation.ref,subject:candidate.subject,reading:'held',evidence:['test:ingress-grant'],reasons:[],decidedAt})}),
  reply:async({result})=>{replies.push(result);return {delivered:true};}});
 return handler({recipient:'developer',jsonLd:activity,activity:{actorId:new URL(sender)},sender:{actorId:sender,inboxId:'https://requester.example/inbox'}}).then(result=>({result,replies}));
}
test('authored requirement and current office admit an actor request through receiving',async()=>{
 const f=fixture(),calls=[];
 try{
  const operations=hostedDevelopmentOperations({...f,compute:compute(f,calls)});
  const {result,replies}=await invoke(f,operations);
  assert.equal(result.result.code,0,result.result.stderr);assert.deepEqual(calls,roles);
  const outcome=JSON.parse(result.result.stdout);assert.equal(outcome.outcome.verified,true);assert.equal(replies.length,1);
  assert.equal(outcome.status,'submitted');
  const candidates=f.review.candidates();
  assert.equal(candidates.length,1);assert.equal(candidates[0].commit,outcome.delivery.commit);
  assert.equal(candidates[0].pullRequest,outcome.delivery.pullRequest);
  assert.match(outcome.delivery.transformation,/^ni:/);
  const received=reviewFixture.receiveReviewedFixture(f.root,f.contract.sourceBase,candidates[0].commit);
  const released=join(f.root,'received');mkdirSync(released);
  execFileSync('tar',['-xf','-','-C',released],{input:execFileSync('git',['archive',received],{cwd:f.root})});
  assert(existsSync(join(released,'receiver','shape.mjs')));
  execFileSync(process.execPath,['consumer.mjs'],{cwd:join(released,'receiver')});
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:f.root,encoding:'utf8'}).trim(),f.contract.sourceBase);
  assert.equal(execFileSync('git',['rev-parse','refs/remotes/origin/main'],{cwd:f.root,encoding:'utf8'}).trim(),f.contract.sourceBase);
  const index=execFileSync('git',['diff','--cached','--name-only'],{cwd:f.root,encoding:'utf8'});assert.equal(index,'');
  assert.equal(execFileSync('git',['ls-tree','-r','--name-only',outcome.delivery.commit],{cwd:f.root,encoding:'utf8'}).includes('custody/'),false);
  assert.match(readFileSync(join(f.root,'receiver','shape.mjs'),'utf8'),/minLength/);
  const bad=await invoke(f,operations,'engineering#unknown');assert.notEqual(bad.result.result.code,0);
  const changedConstraints=await invoke(f,operations,'engineering#identifier',{constraints:['requester-chosen']});assert.notEqual(changedConstraints.result.result.code,0);
  const changedClosure=await invoke(f,operations,'engineering#identifier',{workType:'inquiry'});assert.notEqual(changedClosure.result.result.code,0);
  const product=operations.find(operation=>operation.verb==='aoe-development-product');
  const read=await product.execute({question:outcome.question,artifact:outcome.effect,limit:4096},{},{invocation:{subject:sender}});
  assert(read.totalBytes>0);
  await assert.rejects(product.execute({question:outcome.question,artifact:outcome.effect,limit:4096},{},{invocation:{subject:'actor:unseated'}}),/no held office/);
  const runtime=enterpriseOperationRuntime({installed:{identity:{id:'developer'},applications:[],schedules:[]},config:f.config,environment:{}});
  assert(runtime.operationSources.some(source=>source.operations.some(operation=>operation.verb==='aoe-develop-software')));
 }finally{f.review.restore();releaseAgency(f.agencyRoot);rmSync(f.root,{recursive:true,force:true});}
});
for(const change of ['revoke','changeRequirement'])test(change+' during derivation prevents the consumer write',async()=>{
 const f=fixture(),calls=[];
 try{
  const before=readFileSync(join(f.root,'receiver','shape.mjs'),'utf8');
  const operations=hostedDevelopmentOperations({...f,compute:compute(f,calls,{[change]:true})});
  const {result}=await invoke(f,operations);assert.notEqual(result.result.code,0);
  assert.equal(readFileSync(join(f.root,'receiver','shape.mjs'),'utf8'),before);assert.deepEqual(calls,roles);
 }finally{f.review.restore();releaseAgency(f.agencyRoot);rmSync(f.root,{recursive:true,force:true});}
});


test('accepted source resumes delivery without repeating inference or mutation',async()=>{
 const f=fixture(),calls=[];let receives=0;
 try{
  const incumbent=join(f.section,'lib/agency/incumbencies/engineer-seat.json'),held=readFileSync(incumbent);
  const own=compute(f,calls);own.receive=request=>{
   receives++;const result=induceVerifiedSoftwareMissionProposal(request);
   rmSync(incumbent);agencyMoved(f.agencyRoot,incumbent);return result;
  };
  const operations=hostedDevelopmentOperations({...f,compute:own});
  const original=await invoke(f,operations),outcome=JSON.parse(original.result.result.stdout);
  assert.equal(outcome.status,'awaiting-delivery');assert.equal(outcome.outcome.verified,true);
  assert.equal((f.review.candidates()).length,0);
  const accepted=readFileSync(join(f.root,'receiver','shape.mjs'));
  writeFileSync(incumbent,held);agencyMoved(f.agencyRoot,incumbent);
  const resumed=await invoke(f,operations,'engineering#identifier',{resume:{question:outcome.question,effect:outcome.effect}});
  assert.equal(resumed.result.result.code,0,resumed.result.result.stderr);
  const delivered=JSON.parse(resumed.result.result.stdout);
  assert.equal(delivered.status,'submitted');assert.equal(delivered.effect,outcome.effect);
  assert.deepEqual(calls,roles);assert.equal(receives,1);
  assert.deepEqual(readFileSync(join(f.root,'receiver','shape.mjs')),accepted);
  assert.equal((f.review.candidates()).length,1);
  const again=await invoke(f,operations,'engineering#identifier',{resume:{question:outcome.question,effect:outcome.effect}});
  assert.equal(JSON.parse(again.result.result.stdout).delivery.commit,delivered.delivery.commit);
  const changed={...f.contract,scope:'changed receiving scope'};
  f.record('requirements','identifier',{'raised-by':sender,asks:{development:changed},'met-when':'Changed'});agencyMoved(f.agencyRoot);
  await assert.rejects(operations.find(operation=>operation.verb==='aoe-develop-software').execute(
   {work:'engineering#identifier',objective:f.contract.objective,resume:{question:outcome.question,effect:outcome.effect}},[],
   {invocation:{subject:sender}}),/superseded requirement/);
 }finally{f.review.restore();releaseAgency(f.agencyRoot);rmSync(f.root,{recursive:true,force:true});}
});
test('missing or substituted original source and failed acceptance publish no candidate',async()=>{
 for(const kind of ['missing','substituted','acceptance']){
  const f=fixture(),calls=[];
  try{
   if(kind==='missing'){
    const {sourceBase,...unbound}=f.contract;
    f.record('requirements','identifier',{'raised-by':sender,asks:{development:unbound},'met-when':'Requires declared original source'});agencyMoved(f.agencyRoot);
   }else if(kind==='substituted'){
    writeFileSync(join(f.root,'receiver','shape.mjs'),'export const ItemSchema={type:"string"};\n');
   }else writeFileSync(join(f.root,'receiver','consumer.mjs'),'throw new Error("consumer refuses");\n');
   const held=readFileSync(join(f.root,'receiver','shape.mjs'),'utf8');
   const operations=hostedDevelopmentOperations({...f,compute:compute(f,calls)}),{result}=await invoke(f,operations);
   assert.notEqual(result.result.code,0);assert.equal(readFileSync(join(f.root,'receiver','shape.mjs'),'utf8'),held);
   assert.equal((f.review.candidates()).length,0);
   if(kind==='missing')assert.equal(calls.length,0);
  }finally{f.review.restore();releaseAgency(f.agencyRoot);rmSync(f.root,{recursive:true,force:true});}
 }
});
test('an inquiry answers without source publication authority',async()=>{
 const f=fixture(),calls=[];
 try{
  const {sourceBase,...contract}=f.contract;contract.workType='inquiry';f.contract=contract;
  f.record('requirements','identifier',{'raised-by':sender,asks:{development:contract},'met-when':'Research answer'});agencyMoved(f.agencyRoot);
  const before=readFileSync(join(f.root,'receiver','shape.mjs'));
  const {result}=await invoke(f,hostedDevelopmentOperations({...f,compute:compute(f,calls)}),'engineering#identifier',{workType:'inquiry'});
  assert.equal(result.result.code,0,result.result.stderr);assert.equal(JSON.parse(result.result.stdout).outcome.answered,true);
  assert.deepEqual(readFileSync(join(f.root,'receiver','shape.mjs')),before);
  assert.equal((f.review.candidates()).length,0);
 }finally{f.review.restore();releaseAgency(f.agencyRoot);rmSync(f.root,{recursive:true,force:true});}
});

 test('agent actuation delivers the operative requirement to an actor and receives a usable source effect',async()=>{
 const f=fixture(),calls=[],delivered=[];
 try {
  const programs=hostedDevelopmentOperations({...f,compute:compute(f,calls)});
  const actuator=agentCoordinationOperations(f.binding,{
   developmentRequestAt:hostedDevelopmentRequestAt(f),operations:()=>programs,
   actorMesh:{submit:async(subject,request,{admit})=>{
    admit();assert.equal(subject,sender);assert.equal(request.operation,programs.find(p=>p.verb==='aoe-develop-software').ref);
    delivered.push(await invoke(f,programs,request.input.work,request.input));
    return {request:'urn:request:operative-identifier',recipient:'https://developer.example/actors/developer'};
   }}
  }).find(p=>p.verb==='agent-actuation');
  await assert.rejects(actuator.execute({work:'engineering#identifier'},[],{invocation:{subject:'actor:unseated'}}),/no held office/);
  const submission=await actuator.execute({work:'engineering#identifier'},[],{invocation:{subject:sender}});
  assert.equal(submission.status,'submitted');assert.equal(delivered.length,1);assert.deepEqual(calls,roles);
  const {result,replies}=delivered[0];assert.equal(result.result.code,0,result.result.stderr);assert.equal(replies.length,1);
  const outcome=JSON.parse(result.result.stdout),candidate=f.review.candidates()[0];assert.equal(candidate.commit,outcome.delivery.commit);
  const received=reviewFixture.receiveReviewedFixture(f.root,f.contract.sourceBase,candidate.commit),released=join(f.root,'actuated-received');mkdirSync(released);
  execFileSync('tar',['-xf','-','-C',released],{input:execFileSync('git',['archive',received],{cwd:f.root})});
  execFileSync(process.execPath,['consumer.mjs'],{cwd:join(released,'receiver')});
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:f.root,encoding:'utf8'}).trim(),f.contract.sourceBase);
  const stale=hostedDevelopmentRequestAt(f)('engineering#identifier',sender);
  const incumbent=join(f.section,'lib/agency/incumbencies/engineer-seat.json');rmSync(incumbent);agencyMoved(f.agencyRoot,incumbent);
  assert.throws(()=>stale.admit(),/no held office/);
  await assert.rejects(actuator.execute({work:'engineering#identifier'},[],{invocation:{subject:sender}}),/no held office/);
  assert.equal(delivered.length,1);
 }finally{f.review.restore();releaseAgency(f.agencyRoot);rmSync(f.root,{recursive:true,force:true});}
});

test('an actor turn discovers warranted work, receives the source effect and does no duplicate work after restart',async()=>{
 const f=fixture(),calls=[];let custody,sends=0;
 try{
  const programs=hostedDevelopmentOperations({...f,compute:compute(f,calls)}),requestAt=hostedDevelopmentRequestAt(f);
  const open=()=>{custody=createActivityPubJournalCustody({stateDirectory:join(f.root,'requester-state')});};open();
  const provider={origin:'https://requester.example',retainRequest:wire=>custody.outbox.retainRequest(wire),retainOutbound:wire=>custody.outbox.append(wire),
   resolveActor:async id=>id==='engineer'?{identifier:id}:null,federation:{createContext:()=>({
    lookupObject:async()=>new Service({id:new URL('https://developer.example/actors/developer'),inbox:new URL('https://developer.example/inbox')}),
    sendActivity:async(_sender,_recipient,activity)=>{
     sends++;const wire=await activity.toJsonLd(),received=await receive(f,programs,wire);
     const reply=projectSenActivity({type:'Create',origin:'https://developer.example',identifier:'developer',recipient:sender,agentCard:'https://developer.example/actors/developer/agent-card.json',eventTime:new Date().toISOString(),objectBytes:senActivityObjectBytes({objectKind:'metroplat.dispatch.result',value:{request:extractSenActivity(wire,{expectedActor:sender,expectedRecipient:"https://developer.example/actors/developer"}).envelopeNi,result:received.result.result}})});
     await custody.inbox.retain({recipient:'engineer',jsonLd:reply});
    }
   })}};
  const turn=()=>{
   const client=createActorClient({provider,origin:provider.origin,inbox:{replyFor:input=>custody.inbox.replyFor(input)},admitSender:async identifier=>assert.equal(identifier,'engineer')});
   return agentCoordinationOperations(f.binding,{developmentRequestAt:requestAt,operations:()=>programs,actorMesh:{submit:async(subject,request,{admit,reuse})=>{
    assert.equal(subject,sender);return client.send({identifier:'engineer',address:'https://developer.example/actors/developer',text:JSON.stringify(request),admit,reuse});
   }}}).find(p=>p.verb==='agent-turn');
  };
  const first=await turn().execute({},[],{invocation:{subject:sender}});assert.equal(first.activated.length,1);assert.equal(sends,1);assert.deepEqual(calls,roles);
  const candidate=f.review.candidates()[0];assert(candidate);
  const received=reviewFixture.receiveReviewedFixture(f.root,f.contract.sourceBase,candidate.commit),released=join(f.root,'turn-received');mkdirSync(released);
  execFileSync('tar',['-xf','-','-C',released],{input:execFileSync('git',['archive',received],{cwd:f.root})});execFileSync(process.execPath,['consumer.mjs'],{cwd:join(released,'receiver')});
  open();
  const again=await turn().execute({},[],{invocation:{subject:sender}});assert.equal(again.activated[0].status,'received');assert.equal(sends,1);assert.deepEqual(calls,roles);assert.equal(custody.outbox.count(),1);
  const foreign=await turn().execute({},[],{invocation:{subject:'actor:unseated'}});assert.deepEqual(foreign.activated,[]);assert.equal(sends,1);
  const selected=requestAt('engineering#identifier',sender);f.record('requirements','identifier',{'raised-by':sender,asks:{development:{...f.contract,objective:'Revised current demand'}},'met-when':'Revised'});agencyMoved(f.agencyRoot);
  const stale=await invoke(f,programs,selected.request.work,selected.request);assert.notEqual(stale.result.result.code,0);assert.match(stale.result.result.stderr,/superseded requirement/);assert.deepEqual(calls,roles);
  const incumbent=join(f.section,'lib/agency/incumbencies/engineer-seat.json');rmSync(incumbent);agencyMoved(f.agencyRoot,incumbent);assert.deepEqual((await turn().execute({},[],{invocation:{subject:sender}})).activated,[]);assert.equal(sends,1);
 }finally{f.review.restore();releaseAgency(f.agencyRoot);rmSync(f.root,{recursive:true,force:true});}
});

test('an isolated world inhabitant requests its allocated development through another actor and receives the running consumer',async()=>{
 const f=fixture(),calls=[],scope='work-item:identifier',session='fixture-development-session';
 let worker,custody,sends=0;
 try{
  f.contract.scope=scope;
  const capabilities=['agent-turn','aoe-develop-software','aoe-development-product'];
  f.record('skills','develop',{'closure-kind':'process','requires-capabilities':capabilities,method:'Activate the scoped development requirement and receive its source.'});
  f.record('requirements','identifier',{'raised-by':sender,asks:{development:f.contract},'met-when':'Consumer accepts nonempty identifier'});
  agencyMoved(f.agencyRoot);
  const hostBinding={...defaultFilesystemBinding(join(f.root,'host-custody'),{now:()=>at,agencyRoot:f.agencyRoot}),workBindings:()=>[f.binding]};
  const activation=agentCoordinationOperations(f.binding).find(operation=>operation.verb==='agent-turn');
  const levels=['endeavor:identifier','campaign:identifier','project:identifier','plan:identifier','task:identifier',scope];
  admitStructuredWorkIntent(f.binding,{kind:'metroplat.work.structured-intent',id:'worker-development',
   producer:{id:'fixture',revision:'1'},sources:[{id:'assignment',kind:'natural-language-prompt',locator:'test:worker-development'}],
   items:levels.map((cell,index)=>({cell,...(index?{parent:levels[index-1]}:{}),
    ...(cell===scope?{work:'identifier-work',skill:'develop'}:{}),text:cell,evidence:[],
    provenance:[{source:'assignment',start:index,end:index+1,unit:'unicode-code-point'}]}))},
   {at:at.slice(0,10),subject:'fixture-development-demand'});
  const office='engineering#engineer',duty='emsenn/duty/develop';
  admitAgencyWorkAllocation(f.binding,{kind:'metroplat.work.agency-work-allocation',id:'worker-development-allocation',
   subject:'fixture-development-demand',office:{id:office},duty,
   character:{model:'fixture-model',id:sender,capabilities},officeService:{id:duty,requiredCapabilities:capabilities},
   allocation:{scope,delegation:{provider:sender,operations:[activation.ref],effects:['external'],authority:'fixture-charter'}}},{
    at:at.slice(0,10),resolveModelCharacter:({id,model})=>({id,model,capabilities}),
    authorizeProviderDelegation:charterProviderDelegationAuthorizer({providers:[sender],isConnectedProvider:provider=>provider===sender,
     resolveOffice:()=>({office,charter:'fixture-office',powers:capabilities}),
     operationOf:ref=>ref===activation.ref?activation:undefined,
     resolveHolderOffices:()=>[{office,charter:'fixture-office',powers:capabilities}]}),
    resolveAuthority:()=>({office:{id:office,bearsDuty:[duty],deonticProfile:{'identifier-work':'duty'}},
     duty:{id:duty,work:'identifier-work',claim:'claim:identifier',skills:['develop'],delegation:true},
     work:{id:'identifier-work',needs:['develop'],receiverCondition:'Actual consumer accepts received source'},
     skill:{id:'develop',closureKind:'process',requiresCapabilities:capabilities,method:'Activate development for the exact scoped requirement'},
     officeService:{id:duty,requiredCapabilities:capabilities}}),
   });
  let item=readAgentWorkDispatchReadout(f.binding,at.slice(0,10),sender).queue.find(entry=>entry.scope===scope);
  admitHarnessCarriers({dataRoot:hostBinding.dataRoot,date:at.slice(0,10),carriers:[
   {kind:'metroplat.harness-carrier',character:sender,model:'fixture-model',harness:'controlled-worker',session,capabilities,reading:'held',issuer:'fixture',at}]});
  admitCharacterMasks({dataRoot:hostBinding.dataRoot,date:at.slice(0,10),masks:[
   {kind:'metroplat.character-mask',account:'session:'+session,character:sender,reading:'held',issuer:'fixture',at}]});
  admitAgencyWorkExecution(f.binding,{...item,execution:{session,model:'fixture-model'}},'started');
  item=readAgentWorkDispatchReadout(f.binding,at.slice(0,10),sender).queue.find(entry=>entry.scope===scope);
  assert.equal(item.state,'in-flight');assert.equal(item.execution.session,session);
  const programs=hostedDevelopmentOperations({...f,compute:compute(f,calls)}),requestAt=hostedDevelopmentRequestAt(f);
  let actorPrograms;
  const open=()=>{custody=createActivityPubJournalCustody({stateDirectory:join(f.root,'worker-actor-state')});};open();
  const provider={origin:'https://requester.example',retainRequest:wire=>custody.outbox.retainRequest(wire),retainOutbound:wire=>custody.outbox.append(wire),
   resolveActor:async identifier=>identifier==='engineer'?{identifier}:null,federation:{createContext:()=>({
    lookupObject:async()=>new Service({id:new URL('https://developer.example/actors/developer'),inbox:new URL('https://developer.example/inbox')}),
    sendActivity:async(_sender,_recipient,activity)=>{
     sends++;const wire=await activity.toJsonLd(),received=await receive(f,actorPrograms,wire);
     const request=extractSenActivity(wire,{expectedActor:sender,expectedRecipient:'https://developer.example/actors/developer'}).envelopeNi;
     const reply=projectSenActivity({type:'Create',origin:'https://developer.example',identifier:'developer',recipient:sender,
      agentCard:'https://developer.example/actors/developer/agent-card.json',eventTime:at,
      objectBytes:senActivityObjectBytes({objectKind:'metroplat.dispatch.result',value:{request,result:received.result.result}})});
     await custody.inbox.retain({recipient:'engineer',jsonLd:reply});
    }
   })}};
  const mesh={submit:async(subject,request,{admit,reuse=false})=>{
   assert.equal(subject,sender);
   const client=createActorClient({provider,origin:provider.origin,inbox:{replyFor:input=>custody.inbox.replyFor(input)},admitSender:async id=>assert.equal(id,'engineer')});
   return client.send({identifier:'engineer',address:'https://developer.example/actors/developer',text:JSON.stringify(request),admit,reuse});
  },
   send:async()=>{throw new Error('this development exercise sends typed power requests');},
   read:()=>createActorClient({provider,origin:provider.origin,inbox:{list:input=>custody.inbox.list(input)},admitSender:async id=>assert.equal(id,'engineer')}).read({identifier:'engineer'}),
  };
  const actuator=agentCoordinationOperations(hostBinding,{developmentRequestAt:requestAt,operations:()=>programs,actorMesh:mesh});
  actorPrograms=[...programs,...actuator];
  let operations;
  operations=[...metroplexOperations(hostBinding,()=>operations,{title:'Shared development world'},mesh),...actorPrograms];
  const surface=projectSurface(readCapabilityWitnesses(capabilityWitnessesForOperations(operations)),{packageName:'infograph',
   capabilityAssertions:(subject,invocation,operation)=>readStanding(hostBinding,subject,{operation,input:invocation?.input})});
  const executeWorld=hostedWorkerWorldExecution({binding:hostBinding,config:f.config,worker:{character:sender,session,model:'fixture-model'},
   realmOf:enterprise=>{assert.equal(enterprise,'engineering');return {binding:f.binding,officeKeys:new Set([office])};},operations:()=>operations,authorize:surface.authorize});
  const start=()=>new EnterpriseExecutionWorker({hostPath:f.root,environment:process.env,
   workerUrl:new URL('./fixtures/world-inhabitant-worker.mjs',import.meta.url),executeWorld});
  worker=start();
  const run=moves=>worker.execute({operation:'enterprise-work-run',input:{enterprise:'engineering',root:f.binding.dataRoot,hostRoot:hostBinding.dataRoot,
   agencyRoot:f.agencyRoot,receiverRoot:f.root+'/receiver',item,subject:sender,session,at,moves},arguments:{},
   context:{invocation:{subject:'host-clock'},decision:{ok:true},startedAt:at,evidence:[]}});
  const requestMove={name:'metroplex-command',input:{line:'agent-turn '+JSON.stringify({work:'engineering#identifier'})}};
  const first=await run([{name:'metroplex-connect',input:{}},requestMove,{name:'metroplex-command',input:{line:'messages'}}]);
  assert.equal(first.outcome.result.kind,'skill-result',JSON.stringify(first));assert.equal(sends,2);assert.deepEqual(calls,roles);
  const issuance=JSON.parse(first.outcome.providerEvidence.find(value=>value.startsWith('worker-issued-resource-allowance:')).slice('worker-issued-resource-allowance:'.length));
  assert.deepEqual(issuance.initial,{requests:null,toolCalls:null,outputTokens:null});
  assert.deepEqual(issuance.remaining,issuance.initial);
  assert.deepEqual(issuance.issued,{requests:'4',toolCalls:'3',outputTokens:null});
  assert(first.calls.every(call=>call.tools.every(name=>name.startsWith('metroplex-'))));
  const candidate=f.review.candidates()[0];assert(candidate);
  const received=reviewFixture.receiveReviewedFixture(f.root,f.contract.sourceBase,candidate.commit),released=join(f.root,'worker-received');mkdirSync(released);
  execFileSync('tar',['-xf','-','-C',released],{input:execFileSync('git',['archive',received],{cwd:f.root})});
  execFileSync(process.execPath,['consumer.mjs'],{cwd:join(released,'receiver')});
  await worker.close();open();worker=start();
  const again=await run([requestMove,{name:'metroplex-command',input:{line:'messages'}}]);
  assert.equal(again.outcome.result.kind,'skill-result');assert.equal(sends,3);assert.deepEqual(calls,roles);
  assert.equal(f.review.candidates().length,1);
  f.record('requirements','identifier',{'raised-by':sender,asks:{development:{...f.contract,scope:'work-item:another-duty'}},'met-when':'Changed duty'});
  agencyMoved(f.agencyRoot);
  const changed=await run([requestMove]);
  assert(JSON.parse(changed.outcome.result.value.output)[0].value.messages.some(text=>text.includes('outside its exact allocated requirement')));
  assert.equal(sends,3);
  admitAgencyWorkExecution(f.binding,item,'failed','withdrawn fixture allocation');
  const revoked=await run([{name:'metroplex-command',input:{line:'where'}}]);
  assert.equal(JSON.parse(revoked.outcome.result.value.output)[0].ok,false);assert.equal(sends,3);
 }finally{await worker?.close();f.review.restore();releaseAgency(f.agencyRoot);rmSync(f.root,{recursive:true,force:true});}
});
