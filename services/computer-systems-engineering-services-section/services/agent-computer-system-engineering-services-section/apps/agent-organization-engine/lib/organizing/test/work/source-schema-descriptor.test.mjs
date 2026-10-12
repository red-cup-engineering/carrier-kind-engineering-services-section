import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {operation,operationDescriptor,lazyOperation} from '@red-cup-engineering/computer-system-engine/rpc/operation';
import {schemaFrom} from '@red-cup-engineering/json-schema-services-section/contracts';
import {agencyWorkDelegatedContract} from '../../src/work/schema.mjs';

const delegated=()=>operation({verb:'source-schema-delegated-control',codomain:agencyWorkDelegatedContract,run:value=>value});
const childScript=String.raw`
 import assert from 'node:assert/strict';
 import {readFileSync} from 'node:fs';
 import {lazyOperation} from '@red-cup-engineering/computer-system-engine/rpc/operation';
 import {schemaById} from '@red-cup-engineering/json-schema-services-section/contracts';
 const {descriptor,control}=JSON.parse(readFileSync(0,'utf8'));
 assert.equal(schemaById('metroplat/git/source-closure'),undefined,'cold receiving process must not import the declaring work module');
 assert.equal(schemaById('metroplat/work/agency-work-delegated'),undefined);
 assert.equal(lazyOperation(control,()=>[]).codomain.validate({ok:true}),true);
 const reconstructed=lazyOperation(descriptor,()=>[]);
 const copy={kind:'metroplat.git.source-working-copy',id:'fixture:copy',sourceRepository:'https://github.com/fixture/source.git',ref:'refs/heads/main',commit:'a'.repeat(40),repository:'/fixture/source',commonDirectory:'/fixture/source/.git',copyIdentity:{repository:{device:'1',inode:'2'},commonDirectory:{device:'1',inode:'3'}},custody:{id:'fixture:custody',revision:'1',evidence:['fixture:source'],sourceRepository:'https://github.com/fixture/source.git',ref:'refs/heads/main',commit:'a'.repeat(40),workspaceRoot:'/fixture'}};
 const leaf={kind:'metroplat.git.source-closure',id:'fixture:leaf',exactIdentity:'fixture:leaf-bytes',copy,composed:[]};
 const value={kind:'metroplat.work.agency-work-delegated',at:'2026-10-09',providers:['fixture:provider'],duties:[{scope:'work-item:fixture',holder:'fixture:holder',provider:'fixture:provider',intent:'fixture:intent',subject:'fixture:subject',work:'fixture:work',skill:'fixture:skill',method:'Read the original source',receiverCondition:'Inspect the result',operations:[],effects:[],execution:{state:'started',receipt:'fixture:execution',sourceBinding:{...leaf,id:'fixture:parent',composed:[{path:'child',source:leaf}]}}}]};
 assert.equal(reconstructed.codomain.validate(value),true);
 value.duties[0].execution.sourceBinding.composed[0].source={kind:'foreign'};
 assert.equal(reconstructed.codomain.validate(value),false,'recursive child remains checked');
 const unclosed={...descriptor,codomain:{...descriptor.codomain,references:[]}};
 assert.throws(()=>lazyOperation(unclosed,()=>[]),/Invalid schema graph/,'missing dependency must still refuse');
 assert.equal(schemaById('metroplat/git/source-closure'),undefined,'closed reconstruction must not register ambient schemas');
 console.log('cold descriptor reconstruction and refusal controls passed');
`.replace("'@red-cup-engineering/computer-system-engine/rpc/operation'", JSON.stringify(import.meta.resolve('@red-cup-engineering/computer-system-engine/rpc/operation')))
 .replace("'@red-cup-engineering/json-schema-services-section/contracts'", JSON.stringify(import.meta.resolve('@red-cup-engineering/json-schema-services-section/contracts')));

test('delegated work explicitly carries the recursive source contract at its descriptor boundary',()=>{
 const descriptor=operationDescriptor(delegated());
 assert.ok(descriptor.codomain.references.some(reference=>reference.id==='metroplat/git/source-closure'));
 assert.doesNotThrow(()=>lazyOperation(descriptor,()=>[]));
});

test('cold descriptor reconstruction needs no declaring module or ambient source registry',()=>{
 const descriptor=operationDescriptor(delegated());
 const control=operationDescriptor(operation({verb:'unrelated-schema-control',codomain:schemaFrom({$id:'fixture/unrelated-schema-control',type:'object',required:['ok'],properties:{ok:{type:'boolean'}},additionalProperties:false}),run:value=>value}));
 const inherited=process.execArgv.filter(arg=>!arg.startsWith('--test'));
 const result=spawnSync(process.execPath,[...inherited,'--input-type=module','--eval',childScript],{encoding:'utf8',input:JSON.stringify({descriptor,control}),timeout:30000});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/cold descriptor reconstruction/);
});
