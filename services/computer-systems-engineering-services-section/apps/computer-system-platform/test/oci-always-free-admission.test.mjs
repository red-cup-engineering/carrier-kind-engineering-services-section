import test from 'node:test';
import assert from 'node:assert/strict';
import {
  requireAlwaysFreeRequest, requireAlwaysFreeHeadroom, providerAvailabilityAllows,
} from '../scripts/oci-always-free-admission.mjs';

const a1={shape:'VM.Standard.A1.Flex',ocpus:2,memoryGBs:12,bootGB:50};
const micro={shape:'VM.Standard.E2.1.Micro',bootGB:50};
const unused={instances:[],bootVolumes:[],blockVolumes:[],containerInstances:[]};
const read=(x={})=>({...unused,...x});
const boot=(id,gb=50,state='AVAILABLE')=>({id,'size-in-gbs':gb,'lifecycle-state':state});
const instance=(id,ocpus,memoryGBs,state='RUNNING')=>({id,
  shape:'VM.Standard.A1.Flex','shape-config':{ocpus,'memory-in-gbs':memoryGBs},'lifecycle-state':state});
const available={'standard-a1-core-count':2,'standard-a1-memory-count':12,'standard-e2-micro-core-count':2};

test('only conservative eligible shapes and complete integer resources are admitted',()=>{
  assert.equal(requireAlwaysFreeRequest(a1).ocpus,2);
  assert.equal(requireAlwaysFreeRequest(micro).memoryGBs,undefined);
  for(const request of [
    {...a1,shape:'VM.Standard.E4.Flex'}, {...a1,ocpus:4}, {...a1,ocpus:0},
    {...a1,ocpus:1.5}, {...a1,memoryGBs:13}, {...a1,memoryGBs:1},
    {...a1,bootGB:201}, {...a1,bootGB:49}, {...a1,bootGB:NaN},
    {...micro,memoryGBs:1}, {...micro,ocpus:1},
  ])assert.throws(()=>requireAlwaysFreeRequest(request),/Always Free|Micro/);
});

test('a truly empty native inventory permits at most the named free envelope',()=>{
  const a=requireAlwaysFreeHeadroom(a1,unused);
  assert.equal(a.remainingOcpus,0);
  assert.equal(a.remainingMemoryGBs,0);
  assert.equal(a.remainingBootAndBlockGB,150);
  assert.equal(a.billingVerified,false,'service entitlement is not independent billing evidence');
  assert.equal(requireAlwaysFreeHeadroom(micro,unused).remainingMicroInstances,1);
});

test('tenancy-wide A1 consumption is cumulative across all observed compartments',()=>{
  const partial=read({instances:[instance('a1-1',1,6)]});
  assert.throws(()=>requireAlwaysFreeHeadroom(a1,partial),/allocation would be exceeded/);
  const fitting=requireAlwaysFreeHeadroom({...a1,ocpus:1,memoryGBs:6},partial);
  assert.equal(fitting.remainingOcpus,0);
  assert.equal(fitting.remainingMemoryGBs,0);
});
test('micro instance count is separate from A1 allocation',()=>{
  const micros=[1,2].map(n=>({id:'m'+n,shape:micro.shape,'lifecycle-state':'STOPPED'}));
  assert.throws(()=>requireAlwaysFreeHeadroom(micro,read({instances:micros})),/allocation would be exceeded/);
  assert.equal(requireAlwaysFreeHeadroom(a1,read({instances:micros})).remainingMicroInstances,0);
});

test('boot and block volume consumption shares a 200GB accounting boundary',()=>{
  const used=read({bootVolumes:[boot('vmA',100)],blockVolumes:[boot('dataB',60)]});
  assert.throws(()=>requireAlwaysFreeHeadroom(a1,used),/allocation would be exceeded/);
  assert.equal(requireAlwaysFreeHeadroom({...a1,bootGB:50},read({
    bootVolumes:[boot('vmA',50)],blockVolumes:[boot('dataB',50)]
  })).remainingBootAndBlockGB,50);
});
test('volume and VM evidence must be complete and nonduplicated, not inferred zero',()=>{
  for(const incomplete of [
    {instances:undefined},{bootVolumes:null},{blockVolumes:undefined},{containerInstances:undefined}, 
    {instances:[{id:'x',shape:a1.shape,'lifecycle-state':'RUNNING'}]},
    {bootVolumes:[{id:'x','lifecycle-state':'AVAILABLE'}]},
    {bootVolumes:[boot('dup'),boot('dup')]},
    {bootVolumes:[boot('dup')],blockVolumes:[boot('dup')]},
    {instances:[instance('same',1,6),instance('same',1,6)]},
  ])assert.throws(()=>requireAlwaysFreeHeadroom(micro,read(incomplete)),/OCI|unavailable|duplicate|volume|instance/);
});

test('terminated capacity does not consume free envelope but unknown lifecycle is counted',()=>{
  const terminated=read({instances:[instance('gone',2,12,'TERMINATED')],bootVolumes:[boot('old',200,'TERMINATED')]});
  assert.equal(requireAlwaysFreeHeadroom(a1,terminated).remainingOcpus,0);
  assert.throws(()=>requireAlwaysFreeHeadroom(a1,read({instances:[instance('unknown',1,6,'UNKNOWN')]})),/allocation would be exceeded/);
});

test('OCI A1 container instances are shared-quota users, not unseen free OCPUs',()=>{
  assert.throws(()=>requireAlwaysFreeHeadroom(a1,read({containerInstances:[{
    id:'ci-a1',shape:'CI.Standard.A1.Flex','lifecycle-state':'ACTIVE'
  }]})),/shared-pool/);
  assert.equal(requireAlwaysFreeHeadroom(a1,read({containerInstances:[{
    id:'ci-non-arm',shape:'CI.Standard.E4.Flex','lifecycle-state':'ACTIVE'
  }]})).remainingOcpus,0);
  assert.throws(()=>requireAlwaysFreeHeadroom(a1,read({containerInstances:[{
    id:'ci-unknown','lifecycle-state':'ACTIVE'
  }]})),/unavailable/);
  assert.equal(requireAlwaysFreeHeadroom(a1,read({containerInstances:[{
    id:'ci-deleted',shape:'CI.Standard.A1.Flex','lifecycle-state':'DELETED'
  }]})).remainingOcpus,0);
});

test('native per-AD OCI limit readings are a necessary second admission gate',()=>{
  assert.equal(providerAvailabilityAllows(a1,available),true);
  assert.equal(providerAvailabilityAllows(micro,available),true);
  for(const bad of [null,{}, {'standard-a1-core-count':2},
    {...available,'standard-a1-core-count':1}, {...available,'standard-a1-memory-count':11},
    {...available,'standard-a1-memory-count':'12'}])
    assert.equal(providerAvailabilityAllows(a1,bad),false);
  assert.equal(providerAvailabilityAllows(micro,{...available,'standard-e2-micro-core-count':0}),false);
});

test('the provisioning launcher enforces native region, limits, complete tenancy and no free-cost declaration',async()=>{
  // Source-integrated contract: the production script actually hires the pure
  // admission rather than inventing an unrelated package-level validation.
  const {readFile}=await import('node:fs/promises');
  const code=await readFile(new URL('../scripts/launch-oracle-instance.mjs',import.meta.url),'utf8');
  for(const required of ['requireAlwaysFreeRequest(', 'requireAlwaysFreeHeadroom(',
    'providerAvailabilityAllows(', '"is-home-region"', '"--compartment-id-in-subtree"',
    '"container-instances", "container-instance", "list"',
    '"boot-volume", "list"', '"resource-availability", "get"'])
    assert.ok(code.includes(required),'missing deployed admission: '+required);
  assert.ok(code.indexOf('requireAlwaysFreeHeadroom(')<code.indexOf('"compute", "instance", "launch"'));
  assert.ok(code.includes('const OBSERVE_ONLY = process.argv.includes("--observe-only")'));
  assert.ok(code.includes('if (OBSERVE_ONLY) continue;'));
  assert.ok(code.includes('kind: "oci.always-free-native-preflight"'));
  assert.ok(code.includes('billingVerified: false'));
  assert.ok(code.includes('physicalHostCapacityVerified: false'));
  assert.ok(code.includes('launched: false'));
  assert.ok(code.indexOf('if (OBSERVE_ONLY) continue;') < code.indexOf('"compute", "instance", "launch"'));
});
