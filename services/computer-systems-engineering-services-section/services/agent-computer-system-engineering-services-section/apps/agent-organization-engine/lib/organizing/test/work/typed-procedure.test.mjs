import test from 'node:test';
import assert from 'node:assert/strict';
import { operation } from '@red-cup-engineering/computer-system-engine/rpc/operation';
import { javascriptProgram } from '@red-cup-engineering/javascript-node-services-section/module-closure';
import { schemaFrom, schemaFromGraph } from '@red-cup-engineering/json-schema-services-section/contracts';
import { semanticId } from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import { validateDeterministicExecution, admitTypedWorkOperation, acceptTypedWorkOperationResult,
  workProcedureIdentity, typedWorkOperationSignature, typedResultOf, workResultFromSkillResult } from '../../src/work/schema.mjs';
import { skillSuccess } from '@red-cup-engineering/animating/becoming/doing/working/governing/skill';
const schema = {$id:'urn:test:typed-procedure:count',type:'object',required:['count'],properties:{count:{type:'integer'}},additionalProperties:false};
const type = schemaFromGraph({root:schema.$id,schemas:[{id:schema.$id,schema}]});
const effects = {class:'pure',replay:'safe',coordination:'coordination-free',deterministic:true,totality:'schema-bounded'};
const make = (extra={}) => operation({verb:'fixture-count',domain:type,codomain:type,effects,
  program:javascriptProgram(new URL('./fixtures/typed-procedure.mjs',import.meta.url),'count'),...extra});
const allocation = {skill:'fixture-count',closureKind:'procedure',method:'Return the admitted count',requiresCapabilities:['fixture-count']};
function bind(op=make()) { return {kind:'typed-operation',operation:op.ref,signature:typedWorkOperationSignature(op),procedure:workProcedureIdentity(allocation),request:{count:3},acceptance:{kind:'result-schema',schema:{type:'object',required:['count'],properties:{count:{const:3}}}}}; }

test('R1/R2: exact procedure and captured operation executes without inference, with raw typed result',async()=>{
  const op=make(),binding=validateDeterministicExecution(bind(op));
  assert.equal(admitTypedWorkOperation(binding,op,allocation),op);
  const result=await op.execute(binding.request);
  assert.deepEqual(result,{count:3});
  assert.equal(acceptTypedWorkOperationResult(binding,op,result),true);
  const proposal=workResultFromSkillResult(skillSuccess({returned:result,signature:binding.signature}));
  assert.equal(typedResultOf({type:'object',required:['count'],properties:{count:{type:'integer'}}},proposal).kind,'skill-result');
});
test('R3: changed operation, method, input and effect are rejected before invocation',()=>{
  const op=make(),binding=bind(op);
  assert.throws(()=>admitTypedWorkOperation({...binding,operation:semanticId('other')},op,allocation),/signature changed/);
  assert.throws(()=>admitTypedWorkOperation({...binding,signature:semanticId('other')},op,allocation),/signature changed/);
  assert.throws(()=>admitTypedWorkOperation(binding,op,{...allocation,method:'Changed purpose'}),/procedure changed/);
  assert.throws(()=>admitTypedWorkOperation({...binding,request:{count:'bad'}},op,allocation));
  const effectful=make({effects:{...effects,class:'host-read'}});
  assert.throws(()=>admitTypedWorkOperation(bind(effectful),effectful,allocation),/pure safe/);
  const host=operation({verb:'fixture-count',domain:type,codomain:type,effects,run:input=>input});
  assert.throws(()=>admitTypedWorkOperation(bind(host),host,allocation),/addressed implementation/);
});
test('R4: output typing and acceptance are distinct boolean checks',()=>{
  const op=make(),binding=bind(op);
  assert.throws(()=>acceptTypedWorkOperationResult(binding,op,{count:'bad'}));
  assert.equal(acceptTypedWorkOperationResult(binding,op,{count:2}),false);
  assert.equal(acceptTypedWorkOperationResult(binding,op,{count:3}),true);
});
test('R5: schema graph bytes matter even when the declared schema id is unchanged',()=>{
  const op=make(),binding=bind(op);
  const changed={...schema,properties:{count:{type:'string'}}};
  const changedType=schemaFromGraph({root:changed.$id,schemas:[{id:changed.$id,schema:changed}]});
  const replacement=make({domain:changedType});
  assert.equal(replacement.ref,op.ref);
  assert.notEqual(typedWorkOperationSignature(replacement),binding.signature);
  assert.throws(()=>admitTypedWorkOperation(binding,replacement,allocation),/signature changed/);
  schemaFrom(changed); // A previous registry writer cannot alter the held closed graph.
  assert.equal(admitTypedWorkOperation(binding,op,allocation),op);
});
test('R6: admitted binding is an immutable copy of complete JSON input',()=>{
  const original=bind(),admitted=validateDeterministicExecution(original);
  original.request.count=4;original.acceptance.schema.properties.count.const=4;
  assert.equal(admitted.request.count,3);
  assert.equal(admitted.acceptance.schema.properties.count.const,3);
  assert.ok(Object.isFrozen(admitted.request));
  assert.throws(()=>validateDeterministicExecution({...bind(),extra:true}));
  assert.throws(()=>workProcedureIdentity({...allocation,method:undefined}));
});

test('R1/R6: obligation serialization and replay preserve the complete typed binding',async()=>{
  const {obsticulationObservationsOfObligations}=await import('../../src/work/obligations.mjs');
  const {claimSessionStatementRows}=await import('@red-cup-engineering/relating/running/session');
  const {workLedgerObligationOfRow}=await import('../../src/work/observations.mjs');
  const execution=bind();
  const [observation]=obsticulationObservationsOfObligations([{cell:'work-item:typed',item:'work-item:typed',text:'Plan the admitted order',work:'plan-modules',skill:allocation.skill,evidence:[],deterministicExecution:execution}],{source:'structured-work-intent:typed',settlementToken:'fixture',subject:'fixture:typed'});
  assert.deepEqual(observation.boundary.deterministicExecution,execution);
  const rows=claimSessionStatementRows(observation);
  const decoded=rows.map(row=>workLedgerObligationOfRow(row,'fixture:typed')).find(Boolean);
  assert.ok(decoded);
  assert.deepEqual(decoded.deterministicExecution,execution);
  assert.equal(decoded.deterministicExecution.kind,'typed-operation');
  assert.ok(Object.isFrozen(decoded.deterministicExecution.request));
});

test('R7: legacy command binding and exact result gates retain their meaning',async()=>{
  const {evaluateDeterministicAcceptance}=await import('../../src/work/schema.mjs');
  const request={type:'JavascriptNodeCommandExecutionRequest',version:1,command:process.execPath,arguments:[],directory:'/tmp',environment:null,input:null};
  const binding={operation:'fixture-command',request,acceptance:{kind:'exact-stdout',stdout:'ready'}};
  assert.equal(validateDeterministicExecution(binding),binding);
  assert.equal(evaluateDeterministicAcceptance(binding.acceptance,{result:{status:0,stdout:'ready'}}).accepted,true);
  assert.equal(evaluateDeterministicAcceptance(binding.acceptance,{result:{status:1,stdout:'ready'}}).accepted,false);
  assert.equal(evaluateDeterministicAcceptance({kind:'command-exit-status',status:0},{result:{status:0}}).accepted,true);
});
