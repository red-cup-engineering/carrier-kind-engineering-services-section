import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import test from "node:test";
import {defaultFilesystemBinding} from "@red-cup-engineering/computer-system-engine/rpc/binding";
import {operation} from "@red-cup-engineering/computer-system-engine/rpc/operation";
import {enterpriseOperationRuntime} from "../src/enterprise-runtime.mjs";

function fixture(t){
 const root=mkdtempSync(path.join(tmpdir(),"source-host-ports-"));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const installed={identity:{id:"fixture-host",title:"Fixture"},schedules:[],applications:[]};
 const config={instance:{name:"fixture-host"},agencyRoot:root,metroplatDataRoot:root,repositoryRoot:root,releaseRoot:root,stateDir:root};
 const capability=operation({verb:"fixture-source",locus:"duty",run:()=>null});
 const environment={METROPLAT_CLAUDE_WORKER:"fixture:provider",METROPLAT_CLAUDE_MODELS:"fixture-model",METROPLAT_REPOSITORY_ROOT:root};
 const options={identity:installed.identity,dataRoot:root,environment,processConfig:{},operationOf:ref=>ref===capability.ref?capability:undefined,operationSurface:()=>({operations:[capability]}),workBinding:defaultFilesystemBinding(root)};
 const item={sourceRepository:"https://github.com/fixture/source.git",requiresCapabilities:[capability.verb],delegation:{provider:"fixture:provider",operations:[capability.ref]},execution:{receipt:"fixture:original-started"}};
 return {installed,config,environment,options,item,capability};
}
const ports=prepareSourceBinding=>({prepareSourceBinding,sourceBindingOf:()=>{throw Error("unused retained resolver");},bindSourceGit:()=>{throw Error("unused Git port");},publishSourceCandidate:()=>{throw Error("unused publisher");}});

test("private source ports are lazy and selected after the actual installed method is checked",async t=>{
 const f=fixture(t);let preparations=0;
 const runtime=enterpriseOperationRuntime({...f,sourceWorkspaces:ports(async request=>{preparations++;assert.equal(request.item.execution.receipt,"fixture:original-started");assert.equal(request.sourceRepository,f.item.sourceRepository);throw Error("fixture preparation boundary");})});
 assert.equal(preparations,0);const work=runtime.createWorkOptions(f.options);assert.equal(preparations,0);
 await assert.rejects(work.executeAgencyWork({...f.item,delegation:{...f.item.delegation,operations:[]}}),/no longer installed/);assert.equal(preparations,0);
 await assert.rejects(work.executeAgencyWork(f.item),/fixture preparation boundary/);assert.equal(preparations,1);
});

test("work option data cannot supply or override the private source preparation port",async t=>{
 const f=fixture(t);let privateCalls=0,overrideCalls=0;
 const runtime=enterpriseOperationRuntime({...f,sourceWorkspaces:ports(async()=>{privateCalls++;throw Error("private preparation selected");})});
 const work=runtime.createWorkOptions({...f.options,prepareSourceBinding:()=>{overrideCalls++;throw Error("untrusted override");}});
 await assert.rejects(work.executeAgencyWork(f.item),/private preparation selected/);assert.equal(privateCalls,1);assert.equal(overrideCalls,0);
});

for(const malformed of [null,{}, {prepareSourceBinding:()=>{}}, {...ports(()=>{}),repository:"/untrusted"}])test("incomplete or request-shaped source service bags refuse at composition",t=>{
 const f=fixture(t);assert.throws(()=>enterpriseOperationRuntime({...f,sourceWorkspaces:malformed}),/complete private owner binding/);
});


test("native source reads retain the existing private context and execute admission", async t => {
 const f=fixture(t),execution={invocation:{subject:'fixture:invoking-session'}},original={id:'fixture:read-effect',actor:'fixture:provider',session:'fixture:session',office:'fixture:office',subject:'fixture:original-work'};
 let contexts=0,executions=0;
 const sourceReadResource={context:(verb,input,observed)=>{contexts++;assert.equal(verb,'workspace-file-slice');assert.deepEqual({...input},{duty:'fixture:scope',path:'package.json'});assert.equal(observed,execution);return original;},execute:async wire=>{executions++;assert.deepEqual(JSON.parse(wire),{...original,operation:'workspace-file-slice',input:{duty:'fixture:scope',path:'package.json'}});return {kind:'host-resource.received',id:original.id,receipt:{id:original.id,terminated:true,result:{kind:'fixture:received-source',original:original.id}}};}};
 const runtime=enterpriseOperationRuntime({...f,sourceReadResource});assert.equal(runtime.binding.sourceReadResource,sourceReadResource);
 const {workspaceReadOperations}=await import('@red-cup-engineering/computer-code-development-engine/workspace/readout');
 const read=workspaceReadOperations(runtime.binding).find(op=>op.verb==='workspace-file-slice');
 const result=await read.execute({duty:'fixture:scope',path:'package.json'},undefined,execution);
 assert.equal(result.original,original.id);assert.equal(contexts,1);assert.equal(executions,1);
});
test("source workspace ports cannot turn a missing native read admission into filesystem access",async t=>{
 const f=fixture(t),runtime=enterpriseOperationRuntime({...f,sourceWorkspaces:ports(()=>{})});
 const {workspaceReadOperations}=await import('@red-cup-engineering/computer-code-development-engine/workspace/readout');
 const read=workspaceReadOperations(runtime.binding).find(op=>op.verb==='workspace-file-slice');
 assert.equal((await read.execute({duty:'fixture:scope',path:'package.json'})).reason,'physical-host-source-resource-unavailable');
});
