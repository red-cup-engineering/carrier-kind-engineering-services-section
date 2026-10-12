import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createMetroplex,metroplexOperations} from '@red-cup-engineering/metroplat/metroplex';
import {readStanding,admitHarnessCarriers,admitCharacterMasks} from '@red-cup-engineering/metroplat/offices';
import {filesystemOperations,withFilesystemBinding} from '@red-cup-engineering/metroplat/resources/read-write-verbs';
import {defaultFilesystemBinding} from '@red-cup-engineering/computer-system-engine/rpc/binding';
import {authorizationFromStanding} from '@red-cup-engineering/computer-system-engine/rpc/dispatch';
import {createActorClient} from '@red-cup-engineering/computer-system-engine/rpc/actor-client';
import {processAdmittedActorRequest} from '@red-cup-engineering/computer-system-engine/rpc/actor-processing';
import {createActivityPubNodeArrivalHandler} from '../src/activitypub-node.mjs';
import {projectSenActivity,senActivityObjectBytes,extractSenActivity} from '@red-cup-engineering/activitypub-services-section/sen-activity';
import {createActivityPubJournalCustody} from '@red-cup-engineering/activitypub-services-section/journal-custody';
import {createRequire} from 'node:module';
import {openWorldStore} from '@red-cup-engineering/feltos/world-host';
import {tell,declareFunctional,value} from '@red-cup-engineering/feltos/world';
import {practice} from '@red-cup-engineering/feltos/skills';
import {releaseAgency} from '@red-cup-engineering/organizing/agency/held';
import {admitAgencyWorkAllocation} from '@red-cup-engineering/feltos/work/agency-work-allocation';
import {admitAgencyWorkExecution} from '@red-cup-engineering/feltos/work/agency-work-execution';
import {admitStructuredWorkIntent} from '@red-cup-engineering/feltos/work/structured-intent';
import {charterProviderDelegationAuthorizer} from '@red-cup-engineering/feltos/work/provider-delegation-authority';
import {readAgentWorkDispatchReadout} from '@red-cup-engineering/feltos/work/dispatch-readout';
import {projectSurface} from '@red-cup-engineering/metroplat/presentation/surface';
import {capabilityWitnessesForOperations} from '@red-cup-engineering/feltos/agents/capability-witnesses';
import {readCapabilityWitnesses} from '@red-cup-engineering/computer-system-engine/rpc/capability-claims';
import {EnterpriseExecutionWorker} from '../src/enterprise-execution.mjs';
import {hostedWorkerWorldExecution} from '../src/worker-world.mjs';
const vocab=createRequire(import.meta.resolve('@red-cup-engineering/activitypub-services-section')).resolve('@fedify/vocab');
const {Service}=await import(vocab.replace(/\.cjs$/u,'.js'));
const at='2026-10-07T12:00:00.000Z';

test('isolated tool agents inhabit the shared city, use practiced world skills and request allocated effects from another actor',async()=>{
 const root=mkdtempSync(join(tmpdir(),'world-worker-')),agencyRoot=join(root,'agency'),hostRoot=join(root,'host'),ownRoot=join(root,'enterprise'),receiverRoot=join(root,'receiver');
 const section=join(agencyRoot,'workshop/lib/agency'),subject='actor:worker',session='fixture-world-session',scope='work-item:inhabited-delivery';
 const office='workshop#engineer',duty='emsenn/duty/inhabited-delivery',caps=['write','read'];
 let worker;
 try{
  for(const pool of ['characters','offices','skills','incumbencies'])mkdirSync(join(section,pool),{recursive:true});
  mkdirSync(receiverRoot,{recursive:true});
  const record=(pool,id,body)=>writeFileSync(join(section,pool,id+'.json'),JSON.stringify({id,name:id,...body}));
  record('characters','worker',{id:subject,kind:'harness',host:'fixture-host',harness:'controlled-worker'});
  record('offices','engineer',{kind:'office','normative-structure':'Receive the scoped resource effect','deontic-profile':{},'provides-skill':['resources']});
  record('skills','resources',{'closure-kind':'process','requires-capabilities':caps,method:'Use the shared world to request the addressed write'});
  record('incumbencies','worker-seat',{office:'engineer',holder:subject,recognition:'t',induction:'t'});
  const own=defaultFilesystemBinding(ownRoot,{now:()=>at});
  const binding={...defaultFilesystemBinding(hostRoot,{agencyRoot,now:()=>at}),workBindings:()=>[own]};
  const fileOps=withFilesystemBinding(filesystemOperations,defaultFilesystemBinding(receiverRoot)),write=fileOps.find(operation=>operation.verb==='write'),read=fileOps.find(operation=>operation.verb==='read');
  const seed=createMetroplex({binding,operations:()=>fileOps,identity:{title:'Shared city'}});
  const actor=(await seed.connect(subject)).actor,human=(await seed.connect('human')).actor;
  let store=openWorldStore({kind:'file',path:join(hostRoot,'world/frontier.json')}),engine=store.load().engine;
  let world=declareFunctional(engine.world,['exit:orchard','exit:back','exit-requires:orchard','offers-action:read:metroplat.metroplex']);
  world=tell(world,[
   {subject:'garden',predicate:'kind',object:'world'},{subject:'garden',predicate:'part-of',object:'enterprise-dimension'},
   {subject:'garden',predicate:'action-policy',object:'authored'},
   {subject:'garden',predicate:'offers-action:read:metroplat.metroplex',object:{verb:'read',capability:'metroplat.metroplex',description:'Read the growing book',requires:{skills:{gardening:20},areas:['beds']}}},
   {subject:'beds',predicate:'kind',object:'area'},{subject:'beds',predicate:'part-of',object:'garden'},
   {subject:'orchard',predicate:'kind',object:'room'},{subject:'orchard',predicate:'name',object:'Shared orchard'},{subject:'orchard',predicate:'part-of',object:'beds'},
   {subject:'orchard',predicate:'exit:back',object:'metroplex'},{subject:'metroplex',predicate:'exit:orchard',object:'orchard'},
   {subject:'metroplex',predicate:'exit-requires:orchard',object:{skills:{gardening:20}}},
  ],{source:'world-author'});
  world=practice(world,actor,'gardening',25).world;
  store.save({...engine,world});store.close();
  const levels=['endeavor:delivery','campaign:delivery','project:delivery','plan:delivery','task:delivery',scope];
  admitStructuredWorkIntent(own,{kind:'metroplat.work.structured-intent',id:'inhabited-delivery',producer:{id:'fixture',revision:'1'},
   sources:[{id:'assignment',kind:'natural-language-prompt',locator:'test:inhabited-delivery'}],
   items:levels.map((cell,index)=>({cell,...(index?{parent:levels[index-1]}:{}),...(cell===scope?{work:'delivery',skill:'resources'}:{}),
    text:cell,evidence:[],provenance:[{source:'assignment',start:index,end:index+1,unit:'unicode-code-point'}]}))},
   {at:at.slice(0,10),subject:'fixture-world-demand'});
  admitAgencyWorkAllocation(own,{kind:'metroplat.work.agency-work-allocation',id:'world-delivery-allocation',subject:'fixture-world-demand',
   office:{id:office},duty,character:{id:subject,model:'fixture-model',capabilities:caps},officeService:{id:duty,requiredCapabilities:caps},
   allocation:{scope,delegation:{provider:subject,operations:[write.ref],effects:[write.effects.class],authority:'fixture-charter'}}},{
    at:at.slice(0,10),resolveModelCharacter:({id,model})=>({id,model,capabilities:caps}),
    authorizeProviderDelegation:charterProviderDelegationAuthorizer({providers:[subject],resolveHolderOffices:()=>[{office,charter:'fixture-office',powers:caps}],
     resolveOffice:()=>({office,charter:'fixture-office',powers:caps}),operationOf:ref=>ref===write.ref?write:undefined}),
    resolveAuthority:()=>({office:{id:office,bearsDuty:[duty],deonticProfile:{delivery:'duty'}},duty:{id:duty,work:'delivery',claim:'claim:delivery',skills:['resources'],delegation:true},
     work:{id:'delivery',needs:['resources'],receiverCondition:'Actual received file has the allocated value'},skill:{id:'resources',closureKind:'process',requiresCapabilities:caps,method:'Request the scoped write from the storage actor'},
     officeService:{id:duty,requiredCapabilities:caps}}),
   });
  admitHarnessCarriers({dataRoot:hostRoot,date:at.slice(0,10),carriers:[{kind:'metroplat.harness-carrier',character:subject,model:'fixture-model',harness:'controlled-worker',session,capabilities:[...caps,'metroplex-connect','metroplex-command'],reading:'held',issuer:'fixture',at}]});
  admitCharacterMasks({dataRoot:hostRoot,date:at.slice(0,10),masks:[{kind:'metroplat.character-mask',account:'session:'+session,character:subject,reading:'held',issuer:'fixture',at}]});
  let item=readAgentWorkDispatchReadout(own,at.slice(0,10),subject).queue.find(entry=>entry.scope===scope);
  admitAgencyWorkExecution(own,{...item,execution:{session,model:'fixture-model'}},'started');
  item=readAgentWorkDispatchReadout(own,at.slice(0,10),subject).queue.find(entry=>entry.scope===scope);
  const custody=createActivityPubJournalCustody({stateDirectory:join(root,'actor-state')});
  const origin='https://world.example',sender=origin+'/actors/worker',recipient='https://storage.example/actors/storage';
  let sends=0;
  const receiver=createActivityPubNodeArrivalHandler({dataRoot:receiverRoot,rootName:'storage',origin:'https://storage.example',actors:[{identifier:'storage'}],
   executeRequest:({event,admission,authenticatedActor})=>processAdmittedActorRequest({event,admission,authenticatedActor,operations:fileOps,
    binding:defaultFilesystemBinding(receiverRoot),authorize:authorizationFromStanding(new Map(fileOps.map(operation=>[operation.ref,'held'])))}),
   reply:async({request,result})=>{
    const reply=projectSenActivity({type:'Accept',origin:'https://storage.example',identifier:'storage',recipient:sender,
     agentCard:'https://storage.example/agent-card.json',eventTime:at,objectBytes:senActivityObjectBytes({objectKind:'metroplat.dispatch.result',value:{request,result}})});
    await custody.inbox.retain({recipient:'worker',jsonLd:reply});return {delivered:true};
   }});
  const provider={origin,retainRequest:wire=>custody.outbox.retainRequest(wire),retainOutbound:wire=>custody.outbox.append(wire),resolveActor:async()=>({identifier:'worker'}),
   federation:{createContext:()=>({lookupObject:async()=>new Service({id:new URL(recipient),inbox:new URL('https://storage.example/inbox')}),
    sendActivity:async(_sender,_receiver,activity)=>{sends++;const jsonLd=await activity.toJsonLd();await receiver({recipient:'storage',jsonLd,activity:{actorId:new URL(sender)},sender:{actorId:sender,inboxId:origin+'/inbox'}});}})}};
  const client=createActorClient({provider,origin,inbox:{list:({identifier})=>custody.inbox.list({recipient:identifier}),replyFor:input=>custody.inbox.replyFor(input)},admitSender:async id=>assert.equal(id,'worker')});
  const mesh={submit:(account,request,{admit})=>{assert.equal(account,subject);return client.send({identifier:'worker',address:recipient,text:JSON.stringify(request),admit});},
   send:(account,address,text,{admit}={})=>client.send({identifier:'worker',address,text,admit}),
   read:()=>client.read({identifier:'worker'})};
  let operations=[...fileOps];
  operations=[...metroplexOperations(binding,()=>operations,{title:'Shared city'},mesh),...fileOps];
  const surface=projectSurface(readCapabilityWitnesses(capabilityWitnessesForOperations(operations)),{packageName:'infograph',capabilityAssertions:(subject,invocation,operation)=>readStanding(binding,subject,{operation,input:invocation?.input})});
  const executeWorld=hostedWorkerWorldExecution({binding,config:{agencyRoot},worker:{character:subject,session,model:'fixture-model'},
   realmOf:enterprise=>{assert.equal(enterprise,'workshop');return {binding:own,officeKeys:new Set([office])};},operations:()=>operations,authorize:surface.authorize});
  const start=()=>new EnterpriseExecutionWorker({hostPath:root,environment:process.env,workerUrl:new URL('./fixtures/world-inhabitant-worker.mjs',import.meta.url),executeWorld});
  worker=start();
  const path=join(receiverRoot,'shared.json');
  const moves=[{name:'metroplex-connect',input:{}},{name:'metroplex-command',input:{line:'travel metroplex'}},{name:'metroplex-command',input:{line:'go orchard'}},
   {name:'metroplex-command',input:{line:'write '+JSON.stringify({path,claim:{inhabited:true}})}},
   {name:'metroplex-command',input:{line:'message storage@storage.example '+JSON.stringify({verb:'read',operation:read.ref,input:{path}})}},
   {name:'metroplex-command',input:{line:'messages'}},{name:'metroplex-command',input:{line:'where'}}];
  const run=moves=>worker.execute({operation:'enterprise-work-run',input:{enterprise:'workshop',root:ownRoot,hostRoot,agencyRoot,receiverRoot,item,subject,session,at,moves},
   arguments:{},context:{invocation:{subject:'host-clock'},decision:{ok:true},startedAt:at,evidence:[]}});
  const first=await run(moves);assert.equal(first.outcome.result.kind,'skill-result',JSON.stringify(first));
  const results=JSON.parse(first.outcome.result.value.output);
  assert.equal(results[2].value.situation.world,'garden');assert.equal(results[2].value.situation.area,'beds');
  assert(results[2].value.situation.actions.some(action=>action.command==='read'));
  assert.equal(results.at(-1).value.situation.place,'orchard');
  assert(existsSync(path),JSON.stringify(results));assert.deepEqual(JSON.parse(readFileSync(path,'utf8')),{inhabited:true});assert.equal(sends,1);
  assert(results[4].value.messages.some(text=>text.includes('outside this current allocated method')));
  assert(results[5].value.packages.find(p=>p.name==='Comm.Inbox').data.items.some(item=>item.kind==='metroplat.dispatch.result'&&item.value.result.code===0));
  assert(first.calls.every(call=>call.tools.every(name=>name.startsWith('metroplex-'))),'hosted workers expose the lived world rather than raw backend tools');
  assert(!existsSync(join(ownRoot,'world/frontier.json')),'enterprise work custody has no shadow city');
  const invoke=(verb,input,subject)=>operations.find(operation=>operation.verb===verb).execute(input,{}, {invocation:{subject}});
  assert.equal((await invoke('metroplex-command',{line:'where'},subject)).situation.place,'orchard');
  await invoke('metroplex-command',{line:'travel metroplex'},'human');
  const refused=await invoke('metroplex-command',{line:'go orchard'},'human');
  assert.equal(refused.situation.place,'metroplex');assert(refused.messages.some(text=>text.includes('requires gardening 20')));
  await worker.close();worker=start();
  assert.equal(JSON.parse((await run([{name:'metroplex-command',input:{line:'where'}}])).outcome.result.value.output)[0].value.situation.place,'orchard');
  admitAgencyWorkExecution(own,item,'failed','withdrawn allocation');
  const held=await run([{name:'metroplex-command',input:{line:'go back'}}]);
  assert.equal(JSON.parse(held.outcome.result.value.output)[0].ok,false);
  assert.equal((await invoke('metroplex-command',{line:'where'},subject)).situation.place,'orchard');
  store=openWorldStore({kind:'file',path:join(hostRoot,'world/frontier.json')});engine=store.load().engine;
  assert.equal(value(engine.world,actor,'skill:gardening'),25);assert.equal(value(engine.world,human,'skill:gardening'),null);
  store.close();
 }finally{await worker?.close();releaseAgency(agencyRoot);rmSync(root,{recursive:true,force:true});}
});
