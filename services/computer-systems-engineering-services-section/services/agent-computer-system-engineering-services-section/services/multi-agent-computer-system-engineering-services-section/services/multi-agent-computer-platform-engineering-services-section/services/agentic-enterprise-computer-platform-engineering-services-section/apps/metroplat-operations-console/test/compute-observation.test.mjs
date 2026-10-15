import './support/deny-external-ports.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {computeObservationView as groupOperations,currentComputeRecord} from '@red-cup-engineering/metroplat-operations-console/compute-observation';
import instance from './fixtures/compute-instance.json' with {type:'json'};
const policy=instance.configuration.policy;
const COMPUTE_OBJECT_KIND=policy.objectKind;
const currentGroupComputeRecord=args=>currentComputeRecord({...args,policy});
import {computeResourceOperations} from '@red-cup-engineering/metroplat/compute-resource-operation';
const groupComputeResourceOperation=options=>computeResourceOperations(undefined,{...options,configuration:instance.configuration})[0];
import {appendArrivalAtRoot} from '@red-cup-engineering/computer-system-engine/rpc/arrival-store';
import {projectSignStuffEvidenceActivity,extractSignStuffEvidenceActivity,senActivityObjectBytes} from '@red-cup-engineering/activitypub-services-section/sen-activity';
import {projectCloudResourceClaims as project} from '@red-cup-engineering/computer-system-platform/cloud-resource-claims';
const projectCloudResourceClaims=record=>project(record,policy);

const authorActor='https://author.example/actors/metroplat';
const operator={principal:{subject:'actor:fixture-operator'}};
function fixture(fn){
 const root=mkdtempSync(join(tmpdir(),'group-compute-public-'));
 try {
  const config={publicBaseUrl:'https://author.example',dataDir:join(root,'data'),stateDir:join(root,'state'),metroplatDataRoot:join(root,'metroplat'),activityPub:{instanceActor:{identifier:'metroplat'}}};
  mkdirSync(config.dataDir,{recursive:true});mkdirSync(config.stateDir,{recursive:true});
  return fn({root,config,configuration:{...instance.application,computeAuthorActor:authorActor,label:'Fixture Group',policy}});
 }finally{rmSync(root,{recursive:true,force:true});}
}
function record(){return {kind:'compute-resource-observation',observedAt:'2026-10-14T20:00:00.000Z',credentials:[],
 googleCloud:{status:'observed',projects:[{projectId:'fixture-project',billing:{status:'observed',enabled:false},
 enabledComputeServices:['storage.googleapis.com'],storageBuckets:{status:'observed',buckets:[{name:'fixture-bucket',location:'US',storageClass:'STANDARD'}]}}]},
 oracleCloud:{status:'unavailable'},cloudflare:{status:'credential-unavailable'}};}
function writeRecord(config,value){mkdirSync(join(config.dataDir,'records'),{recursive:true});writeFileSync(join(config.dataDir,'records/compute-resources.json'),typeof value==='string'?value:JSON.stringify(value));}
function paths(root){return readdirSync(root,{recursive:true}).sort();}

test('public factories import inertly and retain the external observation descriptor',()=>fixture(({config,configuration})=>{
 const before=paths(config.dataDir);
 const app=groupOperations({config,configuration});
 assert.deepEqual(app.tools.map(x=>x.name),['compute_resources','compute_resource']);
 const operation=groupComputeResourceOperation({environment:{},now:()=> '2026-10-14T20:00:00Z'});
 assert.equal(operation.verb,'group-compute-resource-observation-produce');
 assert.equal(operation.effects.class,'external');
 assert.equal(operation.effects.replay,'coordinated');
 assert.deepEqual(paths(config.dataDir),before);
}));

test('MCP observation tools preserve operator visibility and explicit invocation checks',()=>fixture(({config,configuration})=>{
 const app=groupOperations({config,configuration});
 for(const tool of app.tools){
  assert.equal(tool.visible({}),false);
  assert.equal(tool.visible(operator),true);
  assert.throws(()=>tool.handler({subject:'invalid'},{}),/operator/);
  assert.equal(tool.annotations.readOnlyHint,true);
 }
}));

test('local observation reads expose exact projections and distinguish missing and malformed input',()=>fixture(({config,configuration})=>{
 const app=groupOperations({config,configuration});const resource=app.applications[0].resources.find(x=>x.match==='/compute');
 const context={locals:{principal:{provider:'bearer',subjectHash:'actor:fixture-operator'}}};
 assert.equal(resource.handler(context).status,503);
 writeRecord(config,'not JSON');assert.equal(resource.handler(context).status,502);
 const value=record();writeRecord(config,value);
 const result=app.tools[0].handler({},operator);
 assert.deepEqual(result.resourcePredications,projectCloudResourceClaims(value));
 assert.deepEqual(currentGroupComputeRecord({config,authorActor}),value);
 assert.throws(()=>app.tools[1].handler({subject:'https://mutable.example/resource'},operator),/exact SCA/);
 const subject=projectCloudResourceClaims(value).resourceSubjects[0];
 const before=paths(config.dataDir);
 assert.equal(app.tools[1].handler({subject},operator).state,'unobserved-in-native-store');
 assert.deepEqual(paths(config.dataDir),before,'read-only tool does not install unreceived projections');
}));

test('remote observation uses addressed producer evidence without creating a local native resource head',()=>fixture(({config,configuration})=>{
 config.publicBaseUrl='https://receiver.example';
 const app=groupOperations({config,configuration});const value=record();
 assert.equal(currentGroupComputeRecord({config,authorActor}),null);
 const activity=projectSignStuffEvidenceActivity({origin:'https://author.example',identifier:'metroplat',recipient:'https://receiver.example/actors/metroplat',eventTime:value.observedAt,
 objectBytes:senActivityObjectBytes({objectKind:COMPUTE_OBJECT_KIND,value:{type:'GroupComputeResourceObservation',asOf:value.observedAt,record:value}})});
 const event=extractSignStuffEvidenceActivity(activity,{expectedActor:authorActor,expectedRecipient:'https://receiver.example/actors/metroplat'}).cloudEvent;
 assert.equal(appendArrivalAtRoot(config.metroplatDataRoot,event).ok,true);
 assert.deepEqual(currentGroupComputeRecord({config,authorActor}),value);
 const subject=projectCloudResourceClaims(value).resourceSubjects[0];const before=paths(config.dataDir);
 const reading=app.tools[1].handler({subject},operator);
 assert.equal(reading.state,'signed-peer-projection-not-locally-stored');
 assert.equal(reading.asOf,value.observedAt);assert.equal(reading.subject,subject);
 assert.deepEqual(paths(config.dataDir),before);
}));

test('view sources do not commit claims and retain real operator admission',()=>{
 const source=readFileSync(new URL('../src/compute-observation.mjs',import.meta.url),'utf8');
 assert.match(source,/name: "compute_resource"/);
 assert.match(source,/visible: mayReadCompute/);
 assert.match(source,/signed-peer-projection-not-locally-stored/);
 assert.doesNotMatch(source,/writeHead\(|put\(|append\(/);
});
