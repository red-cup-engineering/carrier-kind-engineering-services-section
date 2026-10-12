import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {activityPubProvider} from '../src/serve-instance.mjs';
import {workspaceReadoutOperations} from '@red-cup-engineering/computer-code-development-engine/workspace/readout';
import {defaultFilesystemBinding} from '@red-cup-engineering/computer-system-engine/rpc/binding';
import {operationFromDescriptor,withOperationArguments} from '@red-cup-engineering/computer-system-engine/rpc/operation';
import {admitModuleClosure} from '@red-cup-engineering/javascript-node-services-section/module-closure';

test('an actual enterprise provider publishes exact workspace code by NI, another binding executes it, and code survives withdrawal and restart',async()=>{
 const root=mkdtempSync(join(tmpdir(),'enterprise-source-custody-'));let federation;
 try{
  const a=join(root,'provider-source'),b=join(root,'receiving-source');for(const directory of [a,b])mkdirSync(directory);
  writeFileSync(join(a,'source.mjs'),'provider source');writeFileSync(join(b,'source.mjs'),'receiving source');
  const binding=defaultFilesystemBinding(a,{repositoryRoot:a});let operations=workspaceReadoutOperations(binding);
  const original=operations.find(op=>op.verb==='workspace-file-slice');
  const config={stateDir:root,metroplatDataRoot:a,instance:{name:'source-owner'},activityPub:{origin:'https://source.example',identifier:'source-owner',actorName:'Source owner',summary:'Holds source',keyPath:join(root,'keys.json'),stateDirectory:join(root,'inbox.state')}};
  const open=()=>activityPubProvider(config,{}, {binding,operationSurface:async()=>({operations})});
  federation=await open();
  const offeredResponse=await federation.provider.fetch(new Request('https://source.example/actors/source-owner/programs.json'));assert.equal(offeredResponse.status,200);
  const offered=(await offeredResponse.json()).operations.find(op=>op.verb==='workspace-file-slice');assert.equal(offered.body.closure,original.body.closure);
  const ni=offered.body.closure,url='https://source.example/.well-known/ni/sha-256/'+ni.split(';')[1];
  const response=await federation.provider.fetch(new Request(url));assert.equal(response.status,200);const material=await response.json();admitModuleClosure(ni,material);
  const receiving=defaultFilesystemBinding(b,{repositoryRoot:b});
  const programme=withOperationArguments(operationFromDescriptor(offered),{},{workspaceBinding:receiving});
  assert.equal((await programme.execute({scope:'repository',path:'source.mjs'})).lines[0].text,'receiving source');
  assert(existsSync(join(root,'programmes','objects')));
  const head=await federation.provider.fetch(new Request(url,{method:'HEAD'}));assert.equal(head.status,200);
  operations=[];await federation.close();federation=await open();
  const restored=await federation.provider.fetch(new Request(url));assert.equal(restored.status,200);assert.deepEqual(await restored.json(),material);
  const removed=await federation.provider.fetch(new Request('https://source.example/actors/source-owner/programs.json'));assert.equal((await removed.json()).operations.length,0);
 }finally{await federation?.close();rmSync(root,{recursive:true,force:true});}
});
