import assert from 'node:assert/strict';
import test from 'node:test';
import {defaultFilesystemBinding} from '@red-cup-engineering/computer-system-engine/rpc/binding';
import {operationDescriptor,lazyOperation} from '@red-cup-engineering/computer-system-engine/rpc/operation';
import {loadOperationFamily} from '../src/operation-family-loaders.mjs';

test('the actual work-coordination family generates closed source descriptors without operational effects',async()=>{
 const native=defaultFilesystemBinding('/declaration-only/data',{claudeSessionRoot:'/declaration-only/claude',codexSessionRoot:'/declaration-only/codex',codexMemoryRoot:'/declaration-only/memory',packageRoot:'/declaration-only/package'});
 const binding=Object.freeze({...Object.fromEntries(Object.entries(native).map(([key,value])=>[key,typeof value==='function'?()=>{throw Error('declaration attempted operational port '+key);}:value])),agencyRoot:'/declaration-only/agency'});
 const family=await loadOperationFamily('@red-cup-engineering/metroplat/work-coordination',binding,{operationSource:()=>[],sourceSet:()=>[],environment:Object.freeze(Object.create(null))});
 const descriptors=family.map(value=>operationDescriptor(lazyOperation(operationDescriptor(value),()=>family)));
 const delegated=descriptors.find(value=>value.verb==='agency-work-delegated');
 assert.ok(delegated.codomain.references.some(reference=>reference.id==='metroplat/git/source-closure'));
 assert.ok(descriptors.some(value=>value.verb==='agency-work-allocation-candidates'));
 assert.ok(descriptors.some(value=>value.verb==='agency-work-propose'));
 assert.equal(descriptors.length,family.length);
});
