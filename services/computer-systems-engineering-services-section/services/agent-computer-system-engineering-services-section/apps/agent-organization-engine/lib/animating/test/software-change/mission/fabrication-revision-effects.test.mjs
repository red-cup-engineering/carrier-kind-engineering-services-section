import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runProgram,DEVELOPMENT_STAGES,readDevelopmentProducts} from '@red-cup-engineering/animating/software-change/mission';

function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'native-fabrication-revision-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 writeFileSync(join(root,'shape.mjs'),'export const ItemSchema={type:"object"};');
 writeFileSync(join(root,'consumer.mjs'),'import assert from "node:assert/strict";import {ItemSchema} from "./shape.mjs";assert.equal(ItemSchema.properties.id.minLength,1);');
 const command=process.execPath+' consumer.mjs';
 return {root,input:{objective:'Require a nonempty identifier',territory:root,writablePaths:['shape.mjs'],readablePaths:['shape.mjs','consumer.mjs'],verifyCommand:command,acceptanceCommand:command},
  options:{dataRoot:join(root,'custody'),receiver:{root,writablePaths:['shape.mjs'],verifyCommand:command,acceptanceCommand:command}}};
}
const valid={schemaModules:[{path:'shape.mjs',format:'javascript',entries:[{exportName:'ItemSchema',typeName:'Item',schema:{type:'object',required:['id'],properties:{id:{type:'string',minLength:1}}}}]}]};
test('invalid native handoff stops once and requires an independently authored new specification',async t=>{
 const f=fixture(t),roles=[];let finals=0;
 await assert.rejects(runProgram(f.input,{...f.options,inquire:async(request,ports)=>{
  roles.push(request.role);await ports.handlers.read_product({limit:16384});
  return {role:request.role,text:'Derived '+request.role,unresolved:[],
   ...(request.role==='artifact-specifications'?{product:++finals===1?{schemaModules:[]}:valid}:{})};
 }}),error=>{
  assert.equal(error.code,'AOE_DESIGN_REVISION_REQUIRED');
  assert.match(error.developmentObligation,/^ni:\/\/\/sha-256;/);
  return true;
 });
 assert.deepEqual(roles,DEVELOPMENT_STAGES);
 assert.equal(finals,1,'engine must not automatically ask for a second candidate');
 assert.equal(readFileSync(join(f.root,'shape.mjs'),'utf8'),'export const ItemSchema={type:"object"};');
 // The ordinary demand's refusal is retained under its original addressed question.
 const result=await runProgram({...f.input,artifacts:{'artifact-specifications':{
  role:'artifact-specifications',text:'Reviewed native schema module specification',
  unresolved:[],product:valid}}},{...f.options,inquire:async(request,ports)=>{
  await ports.handlers.read_product({limit:16384});
  return {role:request.role,text:'Derived '+request.role,unresolved:[]};
 }});
 assert.equal(result.status,'applied');
 assert.equal(result.outcome.verified,true);
 const {ItemSchema}=await import('file://'+join(f.root,'shape.mjs'));
 assert.equal(ItemSchema.properties.id.minLength,1);
});

test('a repeated unmodified refuted native handoff cannot change source',async t=>{
 const f=fixture(t);let finals=0;
 const derive=async(request,ports)=>{
  await ports.handlers.read_product({limit:16384});
  if(request.role==='artifact-specifications')finals++;
  return {role:request.role,text:'Derived '+request.role,unresolved:[],
   ...(request.role==='artifact-specifications'?{product:{schemaModules:[]}}:{})};
 };
 await assert.rejects(runProgram(f.input,{...f.options,inquire:derive}),
  error=>error.code==='AOE_DESIGN_REVISION_REQUIRED');
 await assert.rejects(runProgram(f.input,{...f.options,inquire:derive}),/already refuted/u);
 assert.equal(finals,2,'only separately invoked attempts may inquire; there is no internal retry');
 assert.equal(readFileSync(join(f.root,'shape.mjs'),'utf8'),'export const ItemSchema={type:"object"};');
});
test('an addressed captured schema reaches both generated carriers without inferential retranscription',async t=>{
 const f=fixture(t);
 const schema={type:'object',properties:{id:{type:'string',pattern:'^(?![\\s\\S]*bad)[A-Za-z]+$'}},required:['id'],
  'x-codegen':{exportName:'ItemSchema',typeName:'Item'}};
 writeFileSync(join(f.root,'requirement.schema.json'),JSON.stringify(schema));
 writeFileSync(join(f.root,'consumer.mjs'),'import assert from "node:assert/strict";import {readFileSync} from "node:fs";import {ItemSchema} from "./shape.mjs";const required=JSON.parse(readFileSync("requirement.schema.json"));assert.deepEqual(ItemSchema,required);assert.deepEqual(JSON.parse(readFileSync("received.schema.json")),required);');
 f.input.writablePaths.push('received.schema.json');f.options.receiver.writablePaths.push('received.schema.json');f.input.readablePaths.push('requirement.schema.json');
 const result=await runProgram(f.input,{...f.options,inquire:async(request,ports)=>{
  await ports.handlers.read_product({limit:16384});
  if(request.role!=='artifact-specifications')return {role:request.role,text:'Derived '+request.role,unresolved:[]};
  const source=await ports.handlers.read_source({path:'requirement.schema.json'});
  return {role:request.role,text:'Project the admitted requirement bytes',unresolved:[],product:{schemaModules:[{
   path:'shape.mjs',specificationPath:'received.schema.json',format:'javascript',entries:[{schemaSource:{path:'requirement.schema.json',content:source.content}}]}]}};
 }});
 assert.equal(result.outcome.verified,true);
 assert.deepEqual(JSON.parse(readFileSync(join(f.root,'received.schema.json'))),schema);
 assert.equal(result.engineeringDesign.stages.at(-1).product.schemaModules[0].entries[0].schema.properties.id.pattern,schema.properties.id.pattern);
 const final=readDevelopmentProducts(f.options.dataRoot,result.engineeringDesign.question).find(product=>product.id===result.engineeringDesign.stages.at(-1).artifactId);
 assert.ok(final.value.readings.some(reading=>reading.kind==='source-view'));
});
test('a substituted schema address is refuted before any receiving mutation',async t=>{
 const f=fixture(t);writeFileSync(join(f.root,'requirement.schema.json'),JSON.stringify({type:'object','x-codegen':{exportName:'ItemSchema',typeName:'Item'}}));
 f.input.readablePaths.push('requirement.schema.json');let finals=0;
 await assert.rejects(runProgram(f.input,{...f.options,inquire:async(request,ports)=>{
  await ports.handlers.read_product({limit:16384});
  if(request.role!=='artifact-specifications')return {role:request.role,text:'Derived '+request.role,unresolved:[]};
  finals++;await ports.handlers.read_source({path:'requirement.schema.json'});
  return {role:request.role,text:'Substituted source address',unresolved:[],product:{schemaModules:[{path:'shape.mjs',format:'javascript',entries:[{
   schemaSource:{path:'requirement.schema.json',content:'ni:///sha-256;'+'A'.repeat(43)}}]}]}};
 }}),error=>error.code==='AOE_DESIGN_REVISION_REQUIRED');
 assert.equal(finals,1);assert.equal(readFileSync(join(f.root,'shape.mjs'),'utf8'),'export const ItemSchema={type:"object"};');
});
test('a consumer contradiction stops the run and refuses a second identical design across sessions',async t=>{
 const f=fixture(t),roles=[];let finals=0;
 const inquire=async(request,ports)=>{
  roles.push(request.role);await ports.handlers.read_product({limit:16384});
  if(request.role!=='artifact-specifications')return {role:request.role,text:'Derived '+request.role,unresolved:[]};
  const product=structuredClone(valid);product.schemaModules[0].entries[0].schema.properties.id.minLength=++finals===1?0:1;
  return {role:request.role,text:'Derive a consumer-admitted schema',unresolved:[],product};
 };
 let refusal;
 await assert.rejects(runProgram(f.input,{...f.options,inquire}),error=>{
  assert.equal(error.code,'AOE_RECEIVING_DESIGN_REVIEW_REQUIRED');
  assert.match(error.developmentObligation,/^ni:\/\/\/sha-256;/);
  refusal=error;
  return true;
 });
 assert.equal(finals,1,'consumer failure cannot silently hire a patch author');
 assert.deepEqual(roles,DEVELOPMENT_STAGES);
 assert.equal(readFileSync(join(f.root,'shape.mjs'),'utf8'),'export const ItemSchema={type:"object"};');
 await assert.rejects(runProgram(f.input,{...f.options,inquire}),error=>{
  assert.equal(error.code,'AOE_RECEIVING_DESIGN_REVIEW_REQUIRED');
  assert.equal(error.developmentObligation,refusal.developmentObligation);
  return true;
 });
 assert.equal(finals,1,'rejected source identity must be held before a second model call');
 const reviewed=await runProgram({...f.input,artifacts:{'artifact-specifications':{
  role:'artifact-specifications',text:'Reviewed consumer-compatible schema',
  unresolved:[],product:valid}}},{...f.options,inquire:async(request,ports)=>{
  await ports.handlers.read_product({limit:16384});
  return {role:request.role,text:'Derive '+request.role,unresolved:[]};
 }});
 assert.equal(reviewed.outcome.verified,true);
 const history=readDevelopmentProducts(f.options.dataRoot,reviewed.engineeringDesign.question);
 assert.equal(history.some(p=>p.kind==='software-development.receiving-refusal'),false,
  'new contract has a new content-addressed question, not a rewritten old refusal');
});

