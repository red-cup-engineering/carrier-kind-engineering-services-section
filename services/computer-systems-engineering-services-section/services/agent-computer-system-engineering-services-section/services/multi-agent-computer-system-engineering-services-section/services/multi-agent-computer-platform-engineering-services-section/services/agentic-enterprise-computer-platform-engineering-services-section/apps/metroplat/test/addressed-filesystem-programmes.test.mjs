import {createOperationCatalog} from '@red-cup-engineering/computer-system-engine/rpc/operation';
import {dispatchWire} from '@red-cup-engineering/computer-system-engine/rpc/wire-dispatch';
import {journalRpcWitness} from '@red-cup-engineering/computer-system-engine/rpc/journal-witness';
import {processLeaseCoordinator} from '@red-cup-engineering/computer-system-engine/rpc/coordination';
import {existsSync} from 'node:fs';
import {surfaceEndpointOf} from "@red-cup-engineering/computer-system-engine/rpc/induce";
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {filesystemOperations,withFilesystemBinding} from '../src/resources/read-write-verbs.mjs';
import {deriveProgramContract,measureProgramContract} from '@red-cup-engineering/computer-system-engine/rpc/contract';
import {artifactId} from '@red-cup-engineering/semiotic-eavt-services-section/identity';
import {readWorkItemView} from '@red-cup-engineering/feltos/work/service';
import {defaultFilesystemBinding} from '@red-cup-engineering/computer-system-engine/rpc/binding';
import {operation,operationAs,operationDescriptor,operationFromDescriptor,lazyOperation,withOperationArguments,operationUtterances,programSchemaContract} from '@red-cup-engineering/computer-system-engine/rpc/operation';

test('addressed filesystem programmes preserve root bindings, aliases, lazy readiness, markdown, directories and causal work',async()=>{
 const root=mkdtempSync(join(tmpdir(),'programme-resources-'));
 try{
  const binding=defaultFilesystemBinding(root,{packageRoot:root,now:()=> '2026-10-07T12:00:00.000Z'});
  const [read,write]=withFilesystemBinding(filesystemOperations,binding);
  for(const value of [read,write])assert.equal(value.ref,filesystemOperations.find(o=>o.verb===value.verb).ref);
  assert.throws(()=>operation({verb:'substitute',program:read.body,run:()=> 'other code'}),/cannot substitute/);
  assert.equal(deriveProgramContract(read).move.digest,artifactId(read.body));assert.equal(measureProgramContract(read).reading,'unknown');
  const selection={...read.body};const pinned=operation({verb:'pinned',program:selection});selection.export=write.body.export;assert.equal(pinned.body.export,read.body.export);
  assert.throws(()=>operation({verb:'false-proof',program:read.body,runTerm:['star']}),/cannot substitute/);
  assert.deepEqual(surfaceEndpointOf(read).body,read.body);assert(JSON.stringify(operationUtterances(read)).includes(read.body.closure));
  programSchemaContract.assert({kind:'metroplat.program',verb:read.verb,inputFormat:read.inputFormat,outputFormat:read.outputFormat,options:read.options,body:read.body});
  const deferred=withOperationArguments(lazyOperation(operationDescriptor(read),()=>[read]),{}, {filesystemBinding:binding});
  await deferred.realize();
  const alias=operationAs(read,'consult');
  mkdirSync(join(root,'notes','topic'),{recursive:true});writeFileSync(join(root,'notes','topic','topic.md'),'# A retained node\n');
  const reading=await alias.execute({path:join(root,'notes','topic.md')});assert.match(reading.content,/retained node/);
  await write.execute({path:join(root,'notes','topic.md'),claim:{kind:'red-cup-engineering.markdown.edit-request',operations:[{operation:'set-body',body:'# An addressed edit\n'}]}});
  assert.match(readFileSync(join(root,'notes','topic','topic.md'),'utf8'),/addressed edit/);
  const packagePath=join(root,'package');
  await write.execute({path:packagePath,claim:{kind:'metroplat.directory-manifest',root:packagePath,files:{'one.json':'{"one":1}','notes.md':'# Package\n'}}});
  assert.equal(JSON.parse(readFileSync(join(packagePath,'one.json'),'utf8')).one,1);
  const directory=await deferred.execute({path:packagePath});assert.equal(JSON.parse(directory.content).kind,'metroplat.directory-manifest');assert.equal(JSON.parse(directory.content).files['notes.md'],'# Package\n');
  const actor='task:publish';
  const opening=await write.execute({token:'addressed-work',at:'2026-10-07T12:00:00.000Z',claim:{cell:actor,reading:'unknown',boundary:{role:'obligation',text:'publish resource'}}});
  assert.equal(typeof opening.admission.statements[0].id,'string');
  const closing=await write.execute({token:'addressed-work',at:'2026-10-07T12:01:00.000Z',causes:[opening.admission.statements[0].id],claim:{cell:actor,reading:'held',boundary:{role:'discharge',text:'resource published'}}});
  assert.equal(readWorkItemView(binding,'2026-10-07','addressed-work').diamonds,1);assert(closing.admission.statements.length>0);
  const restored=withOperationArguments(operationFromDescriptor(operationDescriptor(read)),{}, {filesystemBinding:binding});
  assert.equal(restored.ref,read.ref);assert.match((await restored.execute({path:join(root,'notes','topic.md')})).content,/addressed edit/);
  writeFileSync(join(root,'notes','topic.md'),'# An ambiguous second carrier\n');await assert.rejects(write.execute({path:join(root,'notes','topic.md'),claim:{kind:'red-cup-engineering.markdown.edit-request',operations:[{operation:'set-body',body:'forbidden'}]}}),/ambiguous markdown node/);assert.match(readFileSync(join(root,'notes','topic','topic.md'),'utf8'),/addressed edit/);
  const corrupted={...operationDescriptor(read),ref:write.ref};assert.throws(()=>operationFromDescriptor(corrupted),/address mismatch/);
 }finally{rmSync(root,{recursive:true,force:true});}
});


test('the current grant is checked against the file selected by CLI options before any effect',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'programme-scope-')),root=join(directory,'granted'),outside=join(directory,'outside.json');mkdirSync(root);
 try{
  const binding=defaultFilesystemBinding(root,{packageRoot:root,now:()=> '2026-10-07T12:00:00.000Z'});
  const operations=withFilesystemBinding(filesystemOperations,binding),catalog=createOperationCatalog(operations),write=operations.find(op=>op.verb==='write');let observed;
  const authorize=(inv,op,decidedAt)=>{observed=inv;const ok=inv.input.path.startsWith(root+'/');return {kind:ok?'metroplat.rpc.authorization:witness':'metroplat.rpc.authorization:obstruction',ok,invocation:inv.id,operation:op.ref,subject:inv.subject,reading:ok?'held':'unknown',evidence:[],reasons:ok?[]:['current file grant is absent'],decidedAt};};
  const options={subject:'actor:peer',program:'resource-actor',request:artifactId({request:'outside'}),operation:write.ref,now:binding.now,caller:{transport:'cli'},witness:journalRpcWitness(root),coordinate:processLeaseCoordinator(root)};
  const refused=await dispatchWire(catalog,['write','--path',outside],JSON.stringify({path:join(root,'allowed.json'),claim:{attempt:true}}),options,authorize);
  assert.equal(refused.code,1);assert.equal(observed.input.path,outside);assert(!existsSync(outside));assert(!existsSync(join(root,'allowed.json')));
  const selected=join(root,'selected.json');
  const accepted=await dispatchWire(catalog,['write','--path',selected],JSON.stringify({path:outside,claim:{accepted:true}}),{...options,request:artifactId({request:'inside'})},authorize);
  assert.equal(accepted.code,0,accepted.stderr);assert.equal(observed.input.path,selected);assert.equal(JSON.parse(readFileSync(selected,'utf8')).accepted,true);assert(!existsSync(outside));
 }finally{rmSync(directory,{recursive:true,force:true});}
});
