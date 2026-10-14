import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  requireAlwaysFreeRequest, requireAlwaysFreeHeadroom, providerAvailabilityAllows, selectOciProfile, receiveOciContainerCollection, classifyOciLaunchRefusal, projectOciAlwaysFreeCapacity,
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

test('OCI A1 container instances are included in the shared quota with exact native shape readings',()=>{
  const activeA1={id:'ci-a1',shape:'CI.Standard.A1.Flex','lifecycle-state':'ACTIVE',
    'shape-config':{ocpus:1,'memory-in-gbs':6}};
  assert.throws(()=>requireAlwaysFreeHeadroom(a1,read({containerInstances:[activeA1]})),/allocation would be exceeded/);
  const fits=requireAlwaysFreeHeadroom({...a1,ocpus:1,memoryGBs:6},read({containerInstances:[activeA1]}));
  assert.equal(fits.remainingOcpus,0);
  assert.equal(fits.remainingMemoryGBs,0);
  assert.equal(fits.observedUsage.a1ContainerOcpus,'1');
  assert.equal(fits.observedUsage.a1ContainerMemoryGBs,'6');
  assert.throws(()=>requireAlwaysFreeHeadroom(a1,read({containerInstances:[{
    ...activeA1,'shape-config':undefined
  }]})),/A1 container shape consumption is unavailable/);
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

test('OCI profile follows current native configured authority rather than stale default names',()=>{
  const config='[DEFAULT]\ntenancy = test-default\n[OWNED_API_KEY]\ntenancy = test-current\n';
  assert.equal(selectOciProfile(config),'OWNED_API_KEY');
  assert.equal(selectOciProfile(config,{OCI_PROFILE:'DEFAULT'}),'DEFAULT');
  assert.equal(selectOciProfile(config,{OCI_CLI_PROFILE:'OWNED_API_KEY'}),'OWNED_API_KEY');
  assert.throws(()=>selectOciProfile(config,{OCI_PROFILE:'BLUE_CORN_CREEK_API_KEY'}),/does not exist/);
  assert.throws(()=>selectOciProfile(config+'[OTHER_API_KEY]\ntenancy = test-other\n'),/more than one/);
  assert.throws(()=>selectOciProfile(''),/unavailable/);
  assert.throws(()=>selectOciProfile('[DEFAULT]\n[DEFAULT]\n'),/ambiguous/);
});


test('OCI native ContainerInstanceCollection carries items rather than a flat data array',()=>{
  const item={id:'oci-test-instance',shape:'CI.Standard.A1.Flex','lifecycle-state':'ACTIVE'};
  assert.deepEqual(receiveOciContainerCollection({data:{items:[item]}}),[item]);
  assert.deepEqual(receiveOciContainerCollection({data:{items:[]}}),[]);
  assert.deepEqual(receiveOciContainerCollection({data:[item]}),[item]);
  for(const incomplete of [{}, {data:null}, {data:{}}, {data:{items:null}}, {data:{items:{}}},
    {data:{items:[null]}}, {data:{items:['invalid']}}])
    assert.throws(()=>receiveOciContainerCollection(incomplete),/incomplete|invalid/);
});

test('OCI native provider refusal classifier does not return private exception text',()=>{
  const examples=[
    ['ServiceError: OutOfHostCapacity', 'host-capacity-unavailable'],
    ['out of host capacity', 'host-capacity-unavailable'],
    ['ServiceError: TooManyRequests', 'provider-rate-limited'],
    ['ServiceError: LimitExceeded', 'provider-limit-exceeded'],
    ['ServiceError: NotAuthorizedOrNotFound', 'provider-authorization-refused'],
    ['ServiceError: InvalidParameter', 'invalid-provisioning-request'],
    ['ServiceError: InternalServerError', 'provider-service-unavailable'],
    ['OCI says resource ocid1.test-private-data is weird', 'unclassified'],
  ];
  for(const [detail, expected] of examples){
    assert.equal(classifyOciLaunchRefusal(detail),expected);
    assert.equal(classifyOciLaunchRefusal(detail).includes('ocid1'),false);
  }
});

test('real OCI launcher never publishes full provider stderr on denial',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../scripts/launch-oracle-instance.mjs',import.meta.url),'utf8');
  assert.match(source,/classifyOciLaunchRefusal\(detail\)/);
  assert.match(source,/kind: "oci.native-launch-refusal"/);
  assert.equal(source.includes('process.stderr.write(detail)'),false);
  assert.equal(source.includes('process.stderr.write(error.stderr)'),false);
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

test('OCI provider inventory is both dimensioned and explicitly not a bill, saleable lot or independent receiving',()=>{
  const headroom=requireAlwaysFreeHeadroom({...a1,ocpus:1,memoryGBs:6},read({
    instances:[instance('existing',1,6)],
    bootVolumes:[boot('existing-boot',50)],
  }));
  const report=projectOciAlwaysFreeCapacity({...a1,ocpus:1,memoryGBs:6},headroom,{
    homeRegion:'us-ashburn-1',observedAt:'2026-10-14T04:00:00Z',
    qualifiedDomains:1,domainsObserved:2,
  });
  assert.equal(report.type,'OciAlwaysFreeCapacityObservation');
  assert.equal(report.provider,'oracle-cloud-infrastructure');
  assert.deepEqual(report.readings.map(x=>x.unit),['OCPU','GB','instance','GB']);
  assert.equal(report.readings[0].observedConsumption,'1');
  assert.equal(report.readings[0].proposedReservation,'1');
  assert.equal(report.readings[0].remainingAfterProposal,'0');
  assert.equal(report.readings[3].observedConsumption,'50');
  assert.equal(report.readings[3].remainingAfterProposal,'100');
  assert.ok(report.readings.every(x=>x.pricedCost===null&&x.availableForSale===false&&x.independentlyReceived===false));
  assert.equal(report.containedUsage.a1ContainerOcpus,'0');
  assert.equal(report.containedUsage.additiveToA1Totals,false);
  assert.equal(report.unknowns.actualBilling,null);
  assert.equal(report.unknowns.physicalHostCapacity,null);
  assert.throws(()=>projectOciAlwaysFreeCapacity(a1,headroom,{homeRegion:'us-ashburn-1',observedAt:'2026-10-14T04:00:00Z',qualifiedDomains:3,domainsObserved:2}),/complete source-qualified/);
});

test('duplicate native container instances refuse even when not A1',()=>{
  const container={id:'container-1',shape:'CI.Standard.E4.Flex','lifecycle-state':'ACTIVE'};
  assert.throws(()=>requireAlwaysFreeHeadroom(a1,read({containerInstances:[container,container]})),/duplicate OCI container instance/);
});

test('native OCI observe-only preflight requires no network, VM image or SSH key',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'oci-free-observer-'));
  const config=join(directory,'oci-config');
  const fakeCli=join(directory,'oci-mock.mjs');
  await writeFile(config,'[TEST_API_KEY]\ntenancy = ocid1.tenancy.oc1..fixture\nregion = us-ashburn-1\n');
  await writeFile(fakeCli,`#!/usr/bin/env node
const args=process.argv.slice(2);
const command=args.slice(0,3).join(' ');
let data;
if(args[0]==='iam'&&args[1]==='region-subscription'&&args[2]==='list')
  data=[{'is-home-region':true,'region-name':'us-ashburn-1'}];
else if(args[0]==='iam'&&args[1]==='compartment'&&args[2]==='list')data=[];
else if(args[0]==='container-instances'&&args[1]==='container-instance'&&args[2]==='list')
  data={items:process.env.SIMULATE_A1_CONTAINER?[{id:'ci-a1',shape:'CI.Standard.A1.Flex','lifecycle-state':'ACTIVE'}]:[]};
else if(args[0]==='container-instances'&&args[1]==='container-instance'&&args[2]==='get')
  data={id:'ci-a1',shape:'CI.Standard.A1.Flex','shape-config':{ocpus:1,'memory-in-gbs':6}};
else if(args[0]==='compute'&&args[1]==='instance'&&args[2]==='list')data=[];
else if(args[0]==='iam'&&args[1]==='availability-domain'&&args[2]==='list')data=[{name:'AD-1'}];
else if(args[0]==='bv'&&['volume','boot-volume'].includes(args[1]))data=[];
else if(args[0]==='limits'&&args[1]==='resource-availability'){
  const name=args[args.indexOf('--limit-name')+1];
  data={available:name==='standard-a1-memory-count'?12:2};
}else{
  process.stderr.write('forbidden provider operation in observe-only preflight: '+command);
  process.exit(93);
}
process.stdout.write(JSON.stringify({data}));
`);
  await chmod(fakeCli,0o755);
  const child=spawnSync(process.execPath,[
    new URL('../scripts/launch-oracle-instance.mjs',import.meta.url).pathname,
    '--observe-only','--name','probe-only','--shape','VM.Standard.A1.Flex',
    '--ocpus','2','--memory-gb','12','--boot-gb','50',
  ],{
    env:{...process.env,OCI_CLI:fakeCli,OCI_CONFIG_FILE:config,OCI_PROFILE:'TEST_API_KEY',
      SSH_PUBLIC_KEY_FILE:join(directory,'nonexistent-ssh-key')},
    encoding:'utf8',timeout:20000,
  });
  assert.equal(child.status,0,child.stderr);
  const received=JSON.parse(child.stdout);
  assert.equal(received.mode,'read-only');
  assert.equal(received.launched,false);
  assert.equal(received.billingVerified,false);
  assert.equal(received.physicalHostCapacityVerified,false);
  assert.equal(received.quotaQualifiedDomains,1);
  assert.equal(received.capacity.type,'OciAlwaysFreeCapacityObservation');
  assert.equal(received.capacity.readings[0].proposedReservation,'2');
  assert.equal(received.capacity.readings[0].remainingAfterProposal,'0');
  assert.equal(received.capacity.readings[2].remainingAfterProposal,'2');
  assert.equal(received.capacity.readings[3].remainingAfterProposal,'150');
  assert.equal(received.capacity.unknowns.competingAllocations,null);
  const mixed=spawnSync(process.execPath,[
    new URL('../scripts/launch-oracle-instance.mjs',import.meta.url).pathname,
    '--observe-only','--name','probe-mixed','--shape','VM.Standard.A1.Flex',
    '--ocpus','1','--memory-gb','6','--boot-gb','50',
  ],{
    env:{...process.env,OCI_CLI:fakeCli,OCI_CONFIG_FILE:config,OCI_PROFILE:'TEST_API_KEY',
      SSH_PUBLIC_KEY_FILE:join(directory,'nonexistent-ssh-key'),SIMULATE_A1_CONTAINER:'1'},
    encoding:'utf8',timeout:20000,
  });
  assert.equal(mixed.status,0,mixed.stderr);
  const mixture=JSON.parse(mixed.stdout);
  assert.equal(mixture.mode,'read-only');
  assert.equal(mixture.capacity.containedUsage.a1ContainerOcpus,'1');
  assert.equal(mixture.capacity.containedUsage.a1ContainerMemoryGBs,'6');
  assert.equal(mixture.capacity.readings[0].observedConsumption,'1');
  assert.equal(mixture.capacity.readings[0].remainingAfterProposal,'0');
  assert.equal(mixture.capacity.readings[1].remainingAfterProposal,'0');
});
