import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {put,each} from '@red-cup-engineering/semiotic-eavt-services-section/store';
import {createActivityPubJournalCustody} from '../src/journal-custody.mjs';

const actor={identifier:'fixture',actorId:'https://follower.example/actor',inboxId:'https://follower.example/inbox'};
const at='2026-10-01T00:00:00.000Z';
function fixture(t){const stateDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'ap-follower-order-'));t.after(()=>fs.rmSync(stateDirectory,{recursive:true,force:true}));return {stateDirectory,root:path.join(stateDirectory,'journal'),custody:createActivityPubJournalCustody({stateDirectory,now:()=>at})};}
const write=(f,record)=>put(f.root,'activitypub-follower',{...actor,at,...record});

test('received equal-time Follow Undo Follow is folded in preserved append order',async t=>{
 const f=fixture(t);for(const sourceOrder of [2,0,1])write(f,{following:sourceOrder!==1,sourceOrder,inboxId:actor.inboxId+'/'+sourceOrder});
 const {items}=await f.custody.followers.list(actor);assert.equal(items.length,1);assert.equal(items[0].inboxId,actor.inboxId+'/2');
});
test('source order only breaks equal instants, never changes chronological order',async t=>{
 const f=fixture(t);write(f,{following:true,sourceOrder:100});write(f,{following:false,sourceOrder:0,at:'2026-10-02T00:00:00.000Z'});
 assert.equal(await f.custody.followers.count(actor),0);
});
test('a subsequent unsequenced native Undo follows received history at the same instant',async t=>{
 const f=fixture(t);write(f,{following:true,sourceOrder:0});await f.custody.followers.remove(actor);assert.equal(await f.custody.followers.count(actor),0);
 assert.equal([...each(f.root,'activitypub-follower')].length,2);
});
test('unsequenced native equal-time records keep their existing bucket traversal order',async t=>{
 const f=fixture(t);for(const suffix of ['z','a','m'])await f.custody.followers.add({...actor,actorId:actor.actorId+'/'+suffix});
 const expected=[...each(f.root,'activitypub-follower')].map(x=>x.record.actorId).reverse();
 assert.deepEqual((await f.custody.followers.list(actor)).items.map(x=>x.actorId),expected);
});
test('separate recipient histories may independently use the same source ordinal',async t=>{
 const f=fixture(t);write(f,{following:true,sourceOrder:0});write(f,{identifier:'other',following:false,sourceOrder:0});
 assert.equal(await f.custody.followers.count(actor),1);assert.equal(await f.custody.followers.count({identifier:'other'}),0);
});
for(const sourceOrder of [-1,0.5,Number.MAX_SAFE_INTEGER+1,'0',null])test(`invalid source ordinal ${JSON.stringify(sourceOrder)} refuses follower reading`,async t=>{
 const f=fixture(t);write(f,{following:true,sourceOrder});await assert.rejects(f.custody.followers.count(actor),/source order/);
});
test('conflicting ordinals within one same-time recipient history refuse the reading',async t=>{
 const f=fixture(t);write(f,{following:true,sourceOrder:0});write(f,{following:false,sourceOrder:0});
 await assert.rejects(f.custody.followers.count(actor),/conflicting history/);
});
test('the maximum safe integer remains a lawful source ordinal',async t=>{
 const f=fixture(t);write(f,{following:true,sourceOrder:Number.MAX_SAFE_INTEGER});assert.equal(await f.custody.followers.count(actor),1);
});
