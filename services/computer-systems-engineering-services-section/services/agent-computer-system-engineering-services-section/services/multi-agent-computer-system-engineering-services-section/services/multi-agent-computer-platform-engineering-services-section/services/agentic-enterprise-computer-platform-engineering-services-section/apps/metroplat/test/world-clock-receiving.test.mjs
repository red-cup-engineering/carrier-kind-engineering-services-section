import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import {createMetroplex,metroplexOperations} from '../src/metroplex.mjs';
import {openWorldStore} from '@red-cup-engineering/feltos/world-host';
import {metroplatFilesystemBinding} from '../src/mcp-binding.mjs';
import {releaseAgency} from '@red-cup-engineering/organizing/agency/held';
import {clockOperations,reconcileDeclaredSchedules,tickClock} from '@red-cup-engineering/organizing/work/recurring';
import {authorizationFromCapabilityAssertions,authorizationFromStanding} from '@red-cup-engineering/computer-system-engine/rpc/dispatch';
import {readStanding} from '../src/offices.mjs';
import {activateMcpRequestedCapabilities} from '../src/mcp-options.mjs';
const at='2026-10-08T12:00:00.000Z';

test('the native admitted schedule advances an idle inhabited dimension and retry cannot advance it twice',async()=>{
 const root=mkdtempSync(join(tmpdir(),'metro-clock-receiving-'));mkdirSync(join(root,'services','garden'),{recursive:true});writeFileSync(join(root,'services','garden','README.md'),'# Garden\n\nA quiet garden.');
 const binding=metroplatFilesystemBinding(join(root,'state'),{agencyRoot:root,repositoryRoot:root});const identity={id:'garden-instance',title:'Garden instance'};
 try{
  const city=createMetroplex({binding,identity,operations:()=>[]});await city.connect('visitor');await city.command('visitor','look');
  let store=openWorldStore({kind:'file',path:join(binding.dataRoot,'world','frontier.json')});assert.equal(store.load().engine.tick,0);store.close();
  const operations=metroplexOperations(binding,()=>operations,identity);const advance=operations.find(operation=>operation.verb==='metroplex-advance');
  const base=authorizationFromStanding(new Map([[advance.ref,'held']]),'installed-world');
  const authorize=authorizationFromCapabilityAssertions(base,(subject,invocation,operation)=>readStanding(binding,subject,{operation,input:invocation.input}));
  activateMcpRequestedCapabilities(binding.dataRoot,{operations},{subject:identity.id,requestedCapabilityVerbs:['metroplex-advance']},()=>at);
  const schedules=[{id:'world-heartbeat',verb:'metroplex-advance',input:{},account:identity.id,firstDueAt:at,everySeconds:60,maxAttempts:3,retryAfterSeconds:60}];
  reconcileDeclaredSchedules(binding,identity.id,schedules,()=>at);
  const clocks=clockOperations(binding,()=>operations,()=>authorize);const started=tickClock(binding,at);assert.equal(started.started.length,1);
  const readings=clocks.find(operation=>operation.verb==='schedules');let last;
  for(let attempt=0;attempt<100;attempt++){last=(await readings.execute({})).schedules[0]?.last;if(last)break;await pause(20);}
  assert.equal(last?.ok,true,JSON.stringify(last));
  store=openWorldStore({kind:'file',path:join(binding.dataRoot,'world','frontier.json')});assert.equal(store.load().engine.tick,1);store.close();
  const context={invocation:{subject:identity.id,caller:{transport:'clock',schedule:'world-heartbeat',occurrence:0}},decision:{ok:true}};
  const replay=await advance.execute({}, {},context);assert.equal(replay.replayed,true);assert.equal(replay.tick,1);
  const restarted=metroplexOperations(binding,()=>[],identity).find(operation=>operation.verb==='metroplex-advance');assert.equal((await restarted.execute({}, {},context)).replayed,true);
  assert.throws(()=>advance.execute({}, {},{...context,invocation:{...context.invocation,subject:'visitor'}}),/instance/);
  assert.throws(()=>advance.execute({}, {},{...context,invocation:{...context.invocation,caller:{transport:'http'}}}),/instance/);
  const later=await restarted.execute({}, {},{...context,invocation:{...context.invocation,caller:{...context.invocation.caller,occurrence:1}}});assert.equal(later.tick,2);
 }finally{releaseAgency(root);rmSync(root,{recursive:true,force:true});}
});
