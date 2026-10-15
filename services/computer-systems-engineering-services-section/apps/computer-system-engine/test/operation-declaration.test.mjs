import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {schemaFrom} from '@red-cup-engineering/json-schema-services-section/contracts';
import {javascriptProgram} from '@red-cup-engineering/javascript-node-services-section/module-closure';
import {operation,operationFromDescriptor,lazyOperation} from '../src/rpc/operation.mjs';
import {operationDeclaration,operationDescriptor,admitOperationDescriptor} from '../src/rpc/operation-declaration.mjs';

const string = Object.freeze({kind:'string'});
const identity = Object.freeze(['lam',Object.freeze(['var',0])]);

test('declaration and executable share the exact host projection without invoking its body',()=>{
 let calls=0;const spec={verb:'declared-host',run:value=>{calls++;return value},locus:'path',reads:['source'],options:['path'],summary:'summary',description:'description'};
 const declaration=operationDeclaration(spec),runtime=operation(spec);
 assert.equal(calls,0);assert.equal(Object.hasOwn(declaration,'execute'),false);
 assert.deepEqual(operationDescriptor(declaration),operationDescriptor(runtime));
 assert.equal(runtime.execute('original input'),'original input');assert.equal(calls,1);
});

test('SEN declaration admission follows the exact nullish executor selection',()=>{
 const cases=[
  [{verb:'paired',run:null,runTerm:identity,inputDescriptor:string},/inputDescriptor and outputDescriptor are a pair/],
  [{verb:'arrow',run:null,runTerm:['star'],inputDescriptor:string,outputDescriptor:string},/does not check against its declared SEN arrow/],
  [{verb:'absent',run:null,inputDescriptor:string,outputDescriptor:string},/tagged SEN sequence/],
 ];
 for(const [spec,message] of cases)for(const construct of [operationDeclaration,operation])assert.throws(()=>construct(spec),message);
 const spec={verb:'sen-identity',run:null,runTerm:identity,inputDescriptor:string,outputDescriptor:string};
 assert.deepEqual(operationDescriptor(operationDeclaration(spec)),operationDescriptor(operation(spec)));
 assert.equal(operation(spec).execute('accepted'),'accepted');
 // An actually supplied host body keeps its existing body-selection semantics.
 const hosted={...spec,verb:'host-selected',run:()=> 'host',runTerm:['star']};
 assert.doesNotThrow(()=>operationDeclaration(hosted));assert.equal(operation(hosted).execute('value'),'host');
});

test('original invalid body and format refusals remain construction-time gates',()=>{
 for(const construct of [operationDeclaration,operation]){
  assert.throws(()=>construct({verb:'absent'}),/run or runTerm is required/);
  assert.throws(()=>construct({verb:'invalid-wire',run:()=>null,inputFormat:'absent-wire'}));
  assert.throws(()=>construct({verb:'old-schema',run:()=>null,domainSchema:'legacy'}),/schema refs are projected/);
  assert.throws(()=>construct({verb:'mixed',program:{kind:'jsnode',closure:'address',module:'source',export:'run'},run:()=>null}),/cannot substitute/);
 }
});

test('descriptor admission retains the original explicit closed graph judgment',()=>{
 const leaf={$id:'declaration-test/leaf',type:'string'};
 const root={$id:'declaration-test/root',type:'object',required:['value'],properties:{value:{$ref:leaf.$id}},additionalProperties:false};
 const descriptor={ref:'test-descriptor',verb:'test',body:{kind:'host',declaration:'test'},inputFormat:'json',outputFormat:'json',reads:[],writes:[],options:[],effects:{class:'host-read',replay:'safe',coordination:'coordination-free',deterministic:'unmeasured',totality:'unmeasured'},domain:{id:root.$id,schema:root,references:[]}};
 assert.throws(()=>admitOperationDescriptor(descriptor));
 schemaFrom(leaf); // Ambient state may not complete this descriptor's missing graph.
 assert.throws(()=>admitOperationDescriptor(descriptor));
 const complete={...descriptor,domain:{...descriptor.domain,references:[{id:leaf.$id,schema:leaf,references:[]}]}};
 const admitted=admitOperationDescriptor(complete);assert.deepEqual(admitted.descriptor,complete);admitted.domain.assert({value:'closed'});assert.throws(()=>admitted.domain.assert({value:1}));
 assert.deepEqual(operationDescriptor(lazyOperation(complete,()=>[])),admitted.descriptor);
 const conflict={...complete,domain:{...complete.domain,references:[...complete.domain.references,{id:leaf.$id,schema:{...leaf,type:'number'},references:[]}]}};
 assert.throws(()=>admitOperationDescriptor(conflict),/conflicting schema address/);
});

test('native addressed programme uses the same declaration and real executor',async t=>{
 const root=mkdtempSync(join(tmpdir(),'declaration-native-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 writeFileSync(join(root,'package.json'),JSON.stringify({name:'declaration-native-fixture',version:'1.0.0',type:'module'}));
 const file=join(root,'body.mjs');writeFileSync(file,'export function move(value){return {retained:value}}\n');
 const program=javascriptProgram(pathToFileURL(file),'move');const spec={verb:'native',program};
 const descriptor=admitOperationDescriptor(operationDescriptor(operationDeclaration(spec))).descriptor;
 assert.deepEqual(descriptor,operationDescriptor(operation(spec)));
 rmSync(file);assert.deepEqual(await operationFromDescriptor(descriptor).execute('input'),{retained:'input'});
});
