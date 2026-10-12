import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {runProgram,readDevelopmentProducts,developmentOperations} from '../../../../../../../apps/agent-organization-engine/lib/animating/src/becoming/doing/working/software-change/mission/development.mjs';
import {defaultFilesystemBinding} from '@red-cup-engineering/computer-system-engine/rpc/binding';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(new URL('../../../../../../../apps/agent-organization-engine/lib/animating/package.json',import.meta.url));
const {immutableContentKey}=await import(pathToFileURL(require.resolve('@red-cup-engineering/immutable-content-custody-service')));
const digest=id=>id.slice(id.lastIndexOf(';')+1);
const rawNi=text=>'ni:///sha-256;'+createHash('sha256').update(text).digest('base64url');

test('read-only research holds large exact source bodies, pins windows and projects them through current actor authority',async()=>{
 const root=mkdtempSync(join(tmpdir(),'source-research-'));
 try{
  const source='Research 😀 é\n'.repeat(180000),path='theory.md',dataRoot=join(root,'custody');
  writeFileSync(join(root,path),source);let window;
  const result=await runProgram({objective:'Use the original research without any writable target',workType:'inquiry',territory:root,writablePaths:[],readablePaths:[path],authority:['receiver:research']},{dataRoot,inquire:async(request,ports)=>{
   await ports.handlers.read_product({id:request.context.prior.id});
   const reference=request.context.sources.find(source=>source.label===path);
   assert(reference,'the host derives addressed sources from the admitted snapshot');
   assert.equal(request.context.readablePaths,undefined,'model context has addressed resource references, not a second pathname catalog');
   window=await ports.handlers.read_source({id:reference.id,offset:65531,limit:37});
   assert.equal(window.content,rawNi(source));assert.equal(window.value.text,Array.from(source).slice(65531,65568).join(''));
   const next=await ports.handlers.read_source({id:window.id,offset:65568,limit:23});assert.equal(next.id,window.id);
   await assert.rejects(ports.handlers.read_source({path,id:rawNi('other version')}));
   await assert.rejects(ports.handlers.read_source({path,extraneousAuthority:'admin'}));
   await assert.rejects(ports.handlers.read_source({path:'../outside'}));
   return {role:request.role,text:'The held source is consumed as grounded research.',unresolved:['Semantic proof is unestablished']};
  }});
  assert.equal(result.status,'answered');assert.equal(result.engineeringDesign.source,null);
  const question=result.engineeringDesign.question,products=readDevelopmentProducts(dataRoot,question);
  const held=products.find(product=>product.kind==='software-development.source');
  assert.equal(held.value.content,window.content);assert.equal(held.value.text,undefined);
  assert.equal(window.byteLength,Buffer.byteLength(source));
  assert(statSync(join(dataRoot,'software-development',digest(question)+'.json')).size<200000);
  assert.equal(products.filter(product=>product.kind==='software-development.source').length,1);
  writeFileSync(join(root,path),'New research edition');
  let permitted=true,reads=0;
  const read=developmentOperations(defaultFilesystemBinding(dataRoot),{softwareDevelopment:{receiveProduct:async({subject})=>{
   assert.equal(subject,'receiver:research');if(!permitted)throw new Error('operative requirement withdrawn');reads++;
  }}}).find(operation=>operation.verb==='aoe-development-product');
  const context={invocation:{subject:'receiver:research'}};
  const view=await read.execute({question,artifact:held.id,projection:'source-text',offset:65531,limit:37},{},context);
  assert.equal(view.text,window.value.text);assert.equal(view.content,window.content);assert.equal(reads,2);
  const descriptor=await read.execute({question,artifact:held.id},{},context);
  assert.equal(JSON.parse(Buffer.from(descriptor.bytesBase64,'base64').toString()).value.content,window.content);
  permitted=false;await assert.rejects(read.execute({question,artifact:held.id,projection:'source-text'},{},context),/withdrawn/);
  permitted=true;
  const body=join(dataRoot,'software-development','sources','objects',immutableContentKey(window.content));
  const corrupt=Buffer.from(source);corrupt[corrupt.length-1]=88;writeFileSync(body,corrupt);
  await assert.rejects(read.execute({question,artifact:held.id,projection:'source-text',offset:0,limit:17},{},context),/declared ni identity/);
  assert.equal(readFileSync(join(root,path),'utf8'),'New research edition');
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('research source mutation cannot mix editions inside a derivation and binary carriers cannot masquerade as text',async()=>{
 const root=mkdtempSync(join(tmpdir(),'source-versions-'));
 try{
  writeFileSync(join(root,'text.md'),'Original 😀 source');writeFileSync(join(root,'binary'),'text\0binary');writeFileSync(join(root,'invalid'),Buffer.from([255,254]));
  await runProgram({objective:'Pin the admitted source version',workType:'inquiry',territory:root,writablePaths:[],readablePaths:['text.md','binary','invalid']},{dataRoot:join(root,'custody'),inquire:async(request,ports)=>{
   await ports.handlers.read_product({id:request.context.prior.id});const first=await ports.handlers.read_source({path:'text.md',limit:9});
   writeFileSync(join(root,'text.md'),'Substituted source');
   await assert.rejects(ports.handlers.read_source({path:'text.md',id:first.id,offset:9,limit:9}),/admitted content identity/);
   await assert.rejects(ports.handlers.read_source({path:'binary'}),/text carrier/);
   await assert.rejects(ports.handlers.read_source({path:'invalid'}),/encoded data/);
   return {role:request.role,text:'Changed and non-text sources are refused.',unresolved:[]};
  }});
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('all seven engineering products activate deterministic authoritative schema and runtime receiving',async()=>{
 const root=mkdtempSync(join(tmpdir(),'source-schema-'));
 try{
  const schema={$schema:'https://json-schema.org/draft/2020-12/schema',$id:'research/answer',title:'ResearchAnswer',description:'The admitted research answer',type:'object',additionalProperties:false,required:['answer'],properties:{answer:{type:'integer',const:42}}};
  const entry={schema,exportName:'answerSchema',typeName:'ResearchAnswer',runtimeName:'answerType'};
  const typeSystem=import.meta.resolve('@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type');
  const admission=require.resolve('@red-cup-engineering/computer-data-engineering-services-section/type-system');
  const runtimeBinding={name:'defineSchemaType',from:typeSystem,genericSchema:true};
  writeFileSync(join(root,'theory.md'),'The useful research answer is 42.\n'.repeat(10000));
  writeFileSync(join(root,'consumer.mjs'),'import assert from "node:assert/strict";import {readFileSync} from "node:fs";import {answerType,answerSchema} from "./answer.mjs";const {admit}=await import("'+pathToFileURL(admission).href+'");assert.equal(admit(answerType,{answer:42}).ok,true);assert.equal(admit(answerType,{answer:41}).ok,false);const specification=JSON.parse(readFileSync(new URL("./answer.schema.json",import.meta.url)));assert.deepEqual(specification,answerSchema);assert.equal(specification["x-codegen"].runtimeName,"answerType");');
  const input={objective:'Research a requirement and receive its deterministic specification and actual runtime consumer',territory:root,writablePaths:['answer.mjs','answer.schema.json'],readablePaths:['theory.md'],authority:['receiver:schema'],verifyCommand:'node consumer.mjs',acceptanceCommand:'node consumer.mjs'};
  let calls=0;
  const result=await runProgram(input,{dataRoot:join(root,'custody'),receiver:{root,writablePaths:input.writablePaths,verifyCommand:input.verifyCommand,acceptanceCommand:input.acceptanceCommand},inquire:async(request,ports)=>{
   calls++;await ports.handlers.read_product({id:request.context.prior.id});await ports.handlers.read_source({path:'theory.md',limit:100});
   return {role:request.role,text:'The admitted research requirement is consumed by the next engineering transformation.',unresolved:[],...(request.role==='artifact-specifications'?{product:{schemaModules:[{path:'answer.mjs',specificationPath:'answer.schema.json',format:'javascript',runtimeBinding,entries:[entry]}]}}:{})};
  }});
  assert.equal(result.status,'applied');assert.equal(result.outcome.verified,true);assert.equal(calls,7);
  assert.equal(JSON.parse(readFileSync(join(root,'answer.schema.json'),'utf8')).properties.answer.const,42);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('source identities are host-derived from admission and do not cross a directory link or revoked standing',async()=>{
 const root=mkdtempSync(join(tmpdir(),'addressed-research-'));
 try{
  const {mkdirSync,symlinkSync}=await import('node:fs');mkdirSync(join(root,'documents'));mkdirSync(join(root,'private'));
  writeFileSync(join(root,'documents','public.md'),'Public research');writeFileSync(join(root,'private','secret.md'),'Private resource');
  symlinkSync(join(root,'private'),join(root,'documents','shortcut'),'dir');
  let allowed=true;
  await runProgram({objective:'Use source identities within current standing',workType:'inquiry',territory:root,writablePaths:[],readablePaths:['documents','documents/public.md']},{dataRoot:join(root,'custody'),authorizeEffect:async()=>{if(!allowed)throw new Error('standing withdrawn');},inquire:async(request,ports)=>{
   await ports.handlers.read_product({id:request.context.prior.id});const reference=request.context.sources[0];
   const view=await ports.handlers.read_source({id:reference.id});assert.equal(view.value.text,'Public research');
   await assert.rejects(ports.handlers.read_source({id:rawNi('unadmitted source')}),/outside the admitted reading lane/);
   await assert.rejects(ports.handlers.read_source({path:'documents/shortcut/secret.md'}),/unadmitted link/);
   allowed=false;await assert.rejects(ports.handlers.read_source({id:reference.id}),/standing withdrawn/);allowed=true;
   return {role:request.role,text:'The exact admitted resource was read and unauthorized alternate resources were refused.',unresolved:[]};
  }});
 }finally{rmSync(root,{recursive:true,force:true});}
});
