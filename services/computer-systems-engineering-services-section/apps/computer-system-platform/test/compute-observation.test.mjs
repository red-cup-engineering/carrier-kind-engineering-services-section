import './support/deny-external-ports.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createCausalResourceHead} from '@red-cup-engineering/semiotic-eavt-services-section/causal-resource-head';
import {get} from '@red-cup-engineering/semiotic-eavt-services-section/store';
import {refreshComputeResourceObservation,validateComputeObservationPolicy,computeObservationScope} from '../src/compute-observation.mjs';
import policy from './fixtures/compute-policy.json' with {type:'json'};
const time='2026-10-14T20:00:00Z';
const observation={googleCloud:{cloudRunRegion:'fixture-region'},oracleCloud:{}},environment={};
const reading=()=>({observedAt:time,credentials:[],googleCloud:{status:'observed',projects:[{
  projectId:'fixture',billing:{status:'observed',enabled:false},enabledComputeServices:[]} ]},
  oracleCloud:{status:'unavailable'},cloudflare:{status:'credential-unavailable'}});
const head=createCausalResourceHead({recordType:policy.resourceRecordType,witnessType:policy.witnessType,event:policy.event});
async function fixture(run){const dataRoot=await mkdtemp(join(tmpdir(),'compute-refresh-'));try{await run(dataRoot);}finally{await rm(dataRoot,{recursive:true,force:true});}}

test('fresh cached records receive their native witness and head without recollection',()=>fixture(async dataRoot=>{
  const record={...reading(),kind:policy.recordKind,observationScope:computeObservationScope(observation,environment)};const path=join(dataRoot,policy.recordFile);
  await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(record));
  const result=await refreshComputeResourceObservation({dataRoot,policy,observation,environment,now:()=>time,
    observe:()=>{throw new Error('fresh observation must not call providers');}});
  assert.equal(result.refreshed,false);assert.equal(result.accepted[0].status,'received');
  assert.deepEqual(get(dataRoot,policy.witnessType,result.facts.observationWitness),result.facts.witnessRecord);
  assert.equal(head.read(dataRoot,result.facts.resourceSubjects[0]).state,'one-observation');
  const again=await refreshComputeResourceObservation({dataRoot,policy,observation,environment,now:()=>time,
    observe:()=>{throw new Error('cached observation must not recollect');}});
  assert.equal(again.accepted[0].status,'already-received');
}));
test('native default observer receives absence and caches without any provider credential',()=>fixture(async dataRoot=>{
  const requested={googleCloud:{cloudRunRegion:'us-central1'},oracleCloud:{},machines:[],
    coverage:'source-qualified missing credentials',placementRule:'observation only'};
  const environment={HOME:dataRoot,PATH:'/no-provider-binaries'};
  const first=await refreshComputeResourceObservation({dataRoot,policy,observation:requested,environment,now:()=>time});
  assert.equal(first.refreshed,true);
  assert.equal(first.record.googleCloud.status,'unavailable');
  assert.equal(first.record.oracleCloud.status,'credential-unavailable');
  assert.equal(first.record.cloudflare.status,'credential-unavailable');
  assert.deepEqual(first.facts.rows,[]);
  assert.deepEqual(JSON.parse(await readFile(join(dataRoot,policy.recordFile),'utf8')),first.record);
  const second=await refreshComputeResourceObservation({dataRoot,policy,observation:requested,environment,now:()=>time,
    observe:()=>{throw Error('cached native provider evidence must not recollect');}});
  assert.equal(second.refreshed,false);
}));

test('missing observations use explicit provider configuration, then publish admitted bytes',()=>fixture(async dataRoot=>{
  const observation={fixture:true},environment={FIXTURE_ONLY:'yes'};let calls=0;
  const result=await refreshComputeResourceObservation({dataRoot,policy,observation,environment,now:()=>time,
    observe:async (config,seams)=>{calls++;assert.equal(config,observation);assert.equal(seams.environment,environment);assert.equal(seams.clock(),time);return reading();}});
  assert.equal(calls,1);assert.equal(result.refreshed,true);assert.equal(result.record.kind,policy.recordKind);
  assert.deepEqual(JSON.parse(await readFile(join(dataRoot,policy.recordFile),'utf8')),result.record);
}));
test('invalid provider evidence cannot replace the published observation',()=>fixture(async dataRoot=>{
  const path=join(dataRoot,policy.recordFile);await mkdir(dirname(path),{recursive:true});
  const before=JSON.stringify({...reading(),kind:policy.recordKind,observedAt:'2026-10-12T20:00:00Z'});
  await writeFile(path,before);
  await assert.rejects(refreshComputeResourceObservation({dataRoot,policy,observation,environment,now:()=>time,
    observe:async()=>({...reading(),observedAt:'2026-02-30T12:00:00Z'})}),/native observation envelope/);
  assert.equal(await readFile(path,'utf8'),before);
}));
test('record paths and freshness are explicit instance policy, never implicit host defaults',()=>{
  assert.throws(()=>validateComputeObservationPolicy({...policy,recordFile:'../escape'}),/confined/);
  assert.throws(()=>validateComputeObservationPolicy({...policy,freshnessMs:0}),/freshnessMs/);
});

test('fresh cache is invalidated when region, explicit principal or account scope changes',()=>fixture(async dataRoot=>{
 let calls=0;const observe=async()=>{calls++;return {...reading(),observedAt:new Date(Date.parse(time)+calls*1000).toISOString()};};
 const options={dataRoot,policy,observation,environment,now:()=> '2026-10-14T21:00:00Z',observe};
 await refreshComputeResourceObservation(options);
 await refreshComputeResourceObservation(options);assert.equal(calls,1);
 await refreshComputeResourceObservation({...options,observation:{...observation,googleCloud:{cloudRunRegion:'other-region'}}});
 assert.equal(calls,2);
 await refreshComputeResourceObservation({...options,environment:{OCI_PROFILE:'different-principal'}});assert.equal(calls,3);
 const cf={...observation,cloudflare:{accountIdEnvironmentVariable:'CF_ACCOUNT'}};
 await refreshComputeResourceObservation({...options,observation:cf,environment:{CF_ACCOUNT:'first-account'}});
 await refreshComputeResourceObservation({...options,observation:cf,environment:{CF_ACCOUNT:'second-account'}});assert.equal(calls,5);
 assert.equal(computeObservationScope(cf,{CF_ACCOUNT:'second-account',TOKEN:'one'}),computeObservationScope(cf,{CF_ACCOUNT:'second-account',TOKEN:'two'}),'secret values never enter the scope identity');
}));


test('effective OCI config locator invalidates freshness and explicit configuration takes precedence',()=>fixture(async dataRoot=>{
 let calls=0;const observe=async()=>{calls++;return {...reading(),observedAt:new Date(Date.parse(time)+calls*1000).toISOString()};};
 const options={dataRoot,policy,observation,now:()=> '2026-10-14T21:00:00Z',observe};
 await refreshComputeResourceObservation({...options,environment:{HOME:'/fixture',OCI_CONFIG_FILE:'/principal-a/config'}});
 const next=await refreshComputeResourceObservation({...options,environment:{HOME:'/fixture',OCI_CONFIG_FILE:'/principal-b/config'}});
 assert.equal(next.refreshed,true);assert.equal(calls,2);
 const explicit={...observation,oracleCloud:{configFile:'/fixed/config'}};
 assert.equal(computeObservationScope(explicit,{OCI_CONFIG_FILE:'/ignored-a'}),computeObservationScope(explicit,{OCI_CONFIG_FILE:'/ignored-b'}));
}));


test('explicit Google configuration, account and credential locators invalidate fresh scope',()=>fixture(async dataRoot=>{
 let calls=0;const observe=async()=>{calls++;return {...reading(),observedAt:new Date(Date.parse(time)+calls*1000).toISOString()};};
 const options={dataRoot,policy,observation,now:()=> '2026-10-14T21:00:00Z',observe};
 await refreshComputeResourceObservation({...options,environment:{HOME:'/fixture'}});
 for(const key of ['CLOUDSDK_CONFIG','CLOUDSDK_ACTIVE_CONFIG_NAME','CLOUDSDK_CORE_ACCOUNT',
  'CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT','CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE','CLOUDSDK_AUTH_ACCESS_TOKEN_FILE']){
  const next=await refreshComputeResourceObservation({...options,environment:{HOME:'/fixture',[key]:'fixture-selector'}});
  assert.equal(next.refreshed,true,key);
 }
 assert.equal(calls,7);
 assert.equal(computeObservationScope(observation,{CLOUDSDK_AUTH_ACCESS_TOKEN:'DUMMY_A'}),computeObservationScope(observation,{CLOUDSDK_AUTH_ACCESS_TOKEN:'DUMMY_B'}),'raw access-token values never enter scope');
}));
