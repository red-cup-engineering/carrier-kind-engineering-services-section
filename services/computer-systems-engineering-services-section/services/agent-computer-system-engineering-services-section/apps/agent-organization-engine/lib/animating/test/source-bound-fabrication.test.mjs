import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fabricationOperations} from '@red-cup-engineering/computer-code-development-engine/fabrication/operations';
import {proposeFabricatedSoftwareChange,digest} from '../src/becoming/doing/working/software-change/mission/agent-tools.mjs';
const source={"type": "MarkdownDocumentSource", "path": "urn:controlled:connected-module-order", "text": "# connected-finite-number-module-order\n## Requirements\n- `double-result`: doubleValue returns twice its finite numeric input.\n- `increment-result`: incrementValue returns twice its finite numeric input plus one by using the declared doubleValue export.\n## Prohibitions\n- `invalid-input`: doubleValue refuses nonnumeric and nonfinite input.\n## Laws\n- `doubling` | Arithmetic | integer multiplication | urn:example:integer-multiplication | Applies to the examples and receiver's independent integer cases. | Doubling n yields n + n.\n- `incrementing` | Arithmetic | integer addition | urn:example:successor-of-doubled-number | Applies to the increment examples and receiver's independent integer cases. | The successor of doubled n yields (n + n) + 1.\n## Standards\n- `node-esm` | Node.js | v24 | https://nodejs.org/api/esm.html | Applies to the module's consumer. | The consumer imports an ESM named export.\n## Open questions\nnone\n## Modules\n```json\n{\"operations\":[{\"name\":\"double-value\",\"module\":\"src/double.mjs\",\"exportName\":\"doubleValue\",\"description\":\"Double a finite number and refuse other inputs.\",\"inputSchema\":{\"anyOf\":[{\"type\":\"number\"},{\"type\":\"object\"}]},\"outputSchema\":{\"type\":\"number\"}},{\"name\":\"increment-value\",\"module\":\"src/increment.mjs\",\"exportName\":\"incrementValue\",\"description\":\"Return the successor of doubleValue using its declared module export.\",\"inputSchema\":{\"type\":\"number\"},\"outputSchema\":{\"type\":\"number\"}}],\"examples\":[{\"name\":\"doubles two\",\"operation\":\"double-value\",\"input\":2,\"output\":4},{\"name\":\"increments two\",\"operation\":\"increment-value\",\"input\":2,\"output\":5}],\"dependencies\":{}}\n```\n## Acceptance obligations\n```json\n[{\"id\":\"consumer-behavior\",\"kind\":\"assay\",\"statement\":\"A distinct receiver runs its existing consumer with independent integer cases and invalid inputs, observing the required values and refusals.\"}]\n```\n## Traceability\n- `double-result` -> projection `jsnode-modules`; acceptance `consumer-behavior`; constraints `doubling`, `node-esm`\n- `increment-result` -> projection `jsnode-modules`; acceptance `consumer-behavior`; constraints `incrementing`, `node-esm`\n- `invalid-input` -> projection `jsnode-modules`; acceptance `consumer-behavior`; constraints `doubling`, `node-esm`\n"};
const cases=[
 {operation:'double-value',name:'private-double-seven',clauses:['double-result'],input:7,output:14,throws:null},
 {operation:'increment-value',name:'private-connected-seven',clauses:['increment-result'],input:7,output:15,throws:null},
 {operation:'double-value',name:'private-invalid-overflow',clauses:['invalid-input'],input:{},output:null,throws:'TypeError'},
];
const valid={
 'src/double.mjs':'export function doubleValue(n){if(typeof n!=="number"||!Number.isFinite(n))throw new TypeError();return n+n;}',
 'src/increment.mjs':'import {doubleValue} from "./double.mjs"; export function incrementValue(n){return doubleValue(n)+1;}',
};

const root=mkdtempSync(join(tmpdir(),'source-bound-consumer-'));
try {
 mkdirSync(join(root,'src'));
 const before='original consumer bytes\n', concurrent='concurrent consumer bytes\n';
 writeFileSync(join(root,'src/double.mjs'),before);
 const calls=[];
 const operations=fabricationOperations(undefined,{root,infer:async request=>{
   calls.push(request);
   const module=JSON.parse(request.messages[1].content).selectedModule;
   return {text:JSON.stringify(module===undefined?{cases,question:null}:{source:valid[module],question:null}),lot:{id:'controlled:'+calls.length}};
 }});
 const order=await operations.find(op=>op.verb==='fabrication-translate-work-order').execute({source});
 const workOrder=order.artifactSpecificationCandidate;
 const derive=()=>operations.find(op=>op.verb==='fabrication-derive-jsnode-modules').execute({workOrder});
 const plan=await operations.find(op=>op.verb==='fabrication-plan-jsnode-modules').execute({workOrder});
 assert.equal(plan.type,'JsnodeModuleFabricationPlan');assert.equal(calls.length,0);
 const paths=plan.paths;
 const proposal=await proposeFabricatedSoftwareChange({root,writablePaths:paths,plan,fabricate:async()=>{
   writeFileSync(join(root,'src/double.mjs'),concurrent);
   return derive();
 }});
 assert.equal(proposal.type,'SoftwareMissionChangeProposal',JSON.stringify(proposal));
 assert.equal(proposal.changes.find(c=>c.path==='src/double.mjs').beforeDigest,'sha256:'+digest(Buffer.from(before)));
 assert.equal(readFileSync(join(root,'src/double.mjs'),'utf8'),concurrent);
 assert.deepEqual(proposal.artifactProposal.workOrderSpecification.source,workOrder.source);
 assert.equal(proposal.artifactProposal.derivation.derivations.filter(d=>d.module).length,2);
 assert.equal(proposal.customerMutation,false);assert.equal(calls.length,3);
 const blocked=await proposeFabricatedSoftwareChange({root,writablePaths:['src/double.mjs'],plan,fabricate:derive});
 assert.equal(blocked.phase,'source-plan-binding');assert.equal(calls.length,3);
 const refusal=await proposeFabricatedSoftwareChange({root,writablePaths:['src/double.mjs','src/increment.mjs'],fabricate:derive});
 assert.equal(refusal.type,'SoftwareMissionChangeProposalRefusal');assert.equal(refusal.phase,'source-change-projection');
 assert.equal(refusal.artifactProposal.derivation.derivations.filter(d=>d.module).length,2);
 assert.equal(refusal.sourceSnapshot.targets.length,2);assert.equal(calls.length,6);
 assert.equal(readFileSync(join(root,'src/double.mjs'),'utf8'),concurrent);
 console.log(JSON.stringify({controlled:true,nativeFabricationConsumed:true,outputPathsPlannedWithoutInference:true,outOfScopePlanRefusedBeforePurchase:true,sourceCapturedBeforeSupplier:true,concurrentBytesPreserved:true,originalOrderAndLotsRetained:true,projectionRefusalRetainsAllEvidence:true,sourceApplied:false,externalInferenceCalls:0}));
} finally {rmSync(root,{recursive:true,force:true});}
