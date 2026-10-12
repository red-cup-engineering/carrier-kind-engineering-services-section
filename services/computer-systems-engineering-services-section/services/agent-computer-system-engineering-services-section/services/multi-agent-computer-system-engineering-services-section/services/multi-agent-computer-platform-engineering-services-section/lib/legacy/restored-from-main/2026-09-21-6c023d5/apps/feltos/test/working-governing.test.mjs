import test from 'node:test';
import assert from 'node:assert/strict';
import { runWorkingGoverning, workingGoverningCapability } from '../src/working-governing.mjs';
import { composeCapabilities } from '../src/capabilities.mjs';
import { createEngine, join, step, submit } from '../src/engine.mjs';
import { defineGame } from '../src/game.mjs';
const identity={absurd:'absurd',potential:'potential',active:'active',stable:'stable'};

test('agents and queued engine commands use the same shared working/governing library',()=>{
 const request={operation:'classify-work',determination:{operation:'settled',inputsAndPath:'settled'}};
 const game=defineGame({id:'working',name:'Work',start:'office',capabilities:['working-governing'],rooms:{office:{name:'Office',description:'A working office.',exits:{}}},things:{}});
 const engine=submit(join(createEngine(game),'worker'),{actor:'worker',command:`work ${JSON.stringify(request)}`});
 const result=step(engine,{runtime:composeCapabilities([workingGoverningCapability])});
 assert.deepEqual(JSON.parse(result.receipt.events[0].text),runWorkingGoverning(request));
 assert.equal(runWorkingGoverning(request).value,'process');
 assert.deepEqual(result.receipt.capabilities,['working-governing']);
});
test('directed evidence reaches the receiver without inventing reciprocal authority',()=>{
 const result=runWorkingGoverning({operation:'settle-directed-evidence',complex:{vertices:['office','staff'],edges:[{src:'office',tgt:'staff',restrict:identity}]},seed:{office:'potential'}});
 assert.equal(result.kind,'completed'); assert.equal(result.value.compatible,true);
 assert.deepEqual(result.value.section.values,{office:'potential',staff:'potential'});
 const unsupported=runWorkingGoverning({operation:'read-governance-act',evidence:{attribution:'potential',binding:'potential',becoming:'absurd'}});
 assert.equal(unsupported.value.operativity,'absurd');
});
test('invalid open-world inputs are refusals and cannot become library results',()=>{
 assert.equal(runWorkingGoverning({operation:'classify-work',determination:{operation:'unknown',inputsAndPath:'settled'}}).kind,'refused');
 assert.equal(runWorkingGoverning({operation:'settle-directed-evidence',complex:{vertices:['a'],edges:[]},seed:{b:'potential'}}).reason,'invalid-seed');
 assert.equal(runWorkingGoverning({operation:'read-jural-relations',relations:[{kind:'power',active:'a',passive:'b',scope:'x',standing:'contested'}]}).kind,'refused');
});

test('engine transport preserves the payload inside a serialized carrier',()=>{
 const request={operation:'read-jural-relations',relations:[{kind:'duty',active:'a  b',passive:'c',scope:'task:two  spaces',standing:'potential'}]};
 const game=defineGame({id:'carrier',name:'Carrier',start:'office',capabilities:['working-governing'],rooms:{office:{name:'Office',description:'A working office.',exits:{}}},things:{}});
 const engine=submit(join(createEngine(game),'worker'),{actor:'worker',command:`work ${JSON.stringify(request)}`});
 const result=step(engine,{runtime:composeCapabilities([workingGoverningCapability])});
 assert.deepEqual(JSON.parse(result.receipt.events[0].text),runWorkingGoverning(request));
});

test('malformed authority requests are refused by the shared evaluator',()=>{
 const result=runWorkingGoverning({operation:'evaluate-authority',request:{actorId:'worker'}});
 assert.equal(result.kind,'completed');
 assert.equal(result.value.allowed,false);
 assert.equal(result.value.reason,'invalid-request');
});


test('queued closure accepts vertex names that also exist on the JavaScript object prototype',()=>{
 const vertices=['toString','constructor','__proto__'];
 const request={operation:'settle-directed-evidence',complex:{vertices,edges:[]},seed:{}};
 const game=defineGame({id:'record-keys',name:'Record keys',start:'office',capabilities:['working-governing'],rooms:{office:{name:'Office',description:'A working office.',exits:{}}},things:{}});
 const engine=submit(join(createEngine(game),'worker'),{actor:'worker',command:`work ${JSON.stringify(request)}`});
 const result=step(engine,{runtime:composeCapabilities([workingGoverningCapability])});
 const reading=JSON.parse(result.receipt.events[0].text);
 assert.equal(reading.kind,'completed');
 assert.equal(reading.value.compatible,true);
 assert.deepEqual(reading.value.section.values,Object.fromEntries(vertices.map(vertex=>[vertex,'absurd'])));
});
