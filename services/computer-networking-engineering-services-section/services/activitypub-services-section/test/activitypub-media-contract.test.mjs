import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {canonicalJson} from '@red-cup-engineering/json-services-section';
import {makeNiUri} from '@red-cup-engineering/uri-services-section/ni-uri';
import {immutableContentKey} from '@red-cup-engineering/immutable-content-custody-service';
import {createFileStoreSync} from '@red-cup-engineering/immutable-content-custody-service/file-store';
import {each} from '@red-cup-engineering/semiotic-eavt-services-section/store';
import {fixture,reply,arrival,inboxRow,replyRow,requestWire,requestIdentity,rowAt,activityHead,INBOX_TYPE,OUTBOX_TYPE,activityPubRequestHead} from './activitypub-correlation.fixture.mjs';

for(const mode of ['inbox','request'])test('genuine AP '+mode+' refuses incompatible immutable media before any native record/head',async t=>{
 const f=fixture(t),wire=mode==='inbox'?reply('incompatible-media'):requestWire();
 const body=Buffer.from(canonicalJson(wire)),key=immutableContentKey(makeNiUri(body));
 const store=createFileStoreSync(path.join(f.root,'custody'));
 assert.deepEqual(store.putIfAbsent(key,{body,mediaType:'text/plain'}),{conflict:false});
 // The supplier preserves its original conflict-shaped contract. The AP owner
 // must inspect the retained representation before admitting its own record.
 assert.deepEqual(store.putIfAbsent(key,{body,mediaType:'application/json'}),{conflict:true});
 const file=path.join(f.root,'custody','objects',key),sidecar=file+'.media-type';
 const bodyBefore=fs.readFileSync(file),mediaBefore=fs.readFileSync(sidecar),bodyStat=fs.statSync(file),mediaStat=fs.statSync(sidecar);
 const c=f.custody(),retain=()=>mode==='inbox'?c.inbox.retain(arrival(wire)):c.outbox.retainRequest(wire);
 for(let attempt=0;attempt<2;attempt++){
  await assert.rejects(retain(),/ActivityPub body failed immutable custody readback/);
  assert.equal([...each(f.root,INBOX_TYPE)].length,0);
  assert.equal([...each(f.root,OUTBOX_TYPE)].length,0);
  if(mode==='inbox'){assert.equal(inboxRow(f,wire),undefined);assert.equal(replyRow(f),undefined);}
  else{assert.equal(rowAt(f,OUTBOX_TYPE,activityPubRequestHead(requestIdentity(wire))),undefined);assert.equal(rowAt(f,OUTBOX_TYPE,activityHead(wire)),undefined);}
 }
 assert.deepEqual(fs.readFileSync(file),bodyBefore);assert.deepEqual(fs.readFileSync(sidecar),mediaBefore);
 assert.equal(fs.statSync(file).ino,bodyStat.ino);assert.equal(fs.statSync(file).mtimeMs,bodyStat.mtimeMs);
 assert.equal(fs.statSync(sidecar).ino,mediaStat.ino);assert.equal(fs.statSync(sidecar).mtimeMs,mediaStat.mtimeMs);
});
