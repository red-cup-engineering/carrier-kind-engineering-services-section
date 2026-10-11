import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createYouTube,readYouTubeAuthenticationState,revalidateYouTubeAuthentication} from '../src/youtube-api.mjs';

const channelId='UCabcdefghijklmnopqrstuv',otherChannel='UCzyxwvutsrqponmlkjihgfe';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status});
async function fixture(t) {
  const root=await mkdtemp(join(tmpdir(),'youtube-authentication-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const env={YOUTUBE_OAUTH_CLIENT_ID:'fake-client',YOUTUBE_OAUTH_CLIENT_SECRET:'fake-secret',CHANNEL_TOKEN:'fake-refresh',YOUTUBE_API_STATE_ROOT:root};
  const options={channelId,refreshTokenEnv:'CHANNEL_TOKEN',env,clock:()=>Date.parse('2026-10-07T10:00:00Z')};
  return {root,env,options,read:()=>readYouTubeAuthenticationState(options)};
}
test('missing and present-unobserved grants never claim live authentication',async t=>{
  const f=await fixture(t);
  assert.equal(f.read().status,'present-unobserved');assert.equal(f.read().refusedAt,null);
  assert.equal(readYouTubeAuthenticationState({...f.options,env:{...f.env,CHANNEL_TOKEN:undefined}}).status,'missing');
  assert.equal(readYouTubeAuthenticationState({...f.options,env:{...f.env,YOUTUBE_OAUTH_CLIENT_ID:undefined}}).reason,'client-configuration-missing');
  assert.equal(readYouTubeAuthenticationState({...f.options,env:{...f.env,YOUTUBE_API_STATE_ROOT:undefined}}).status,'unavailable');
});
test('the same retained refusal drives execution and nonsecret recovery readiness',async t=>{
  const f=await fixture(t);let calls=0;
  const client=createYouTube({...f.options,authorize:async()=>{},fetchImpl:async()=>{calls++;return json({error:'invalid_grant',error_description:'SECRET_SENTINEL'},400);}});
  await assert.rejects(client.verifyIdentity(),e=>e.code==='YOUTUBE_AUTHENTICATION_PENDING');
  f.options.clock=()=>Date.parse('2026-10-11T16:00:00Z');const observed=f.read();
  assert.equal(observed.status,'rejected');assert.equal(observed.reason,'grant-rejected');
  assert.equal(observed.observedAt,'2026-10-11T16:00:00.000Z');assert.equal(observed.refusedAt,'2026-10-07T10:00:00.000Z');
  assert.ok(!JSON.stringify(observed).includes('fake-'));assert.ok(!JSON.stringify(observed).includes('SECRET_SENTINEL'));
  await assert.rejects(client.verifyIdentity(),e=>e.code==='YOUTUBE_AUTHENTICATION_PENDING');assert.equal(calls,1);
});
test('shared-client refusal is distinct from channel consent refusal',async t=>{
  const f=await fixture(t);
  const client=createYouTube({...f.options,authorize:async()=>{},fetchImpl:async()=>json({error:'invalid_client'},400)});
  await assert.rejects(client.verifyIdentity(),e=>e.code==='YOUTUBE_AUTHENTICATION_PENDING');
  assert.equal(f.read().reason,'client-rejected');
});
test('rejected token state cannot cross channels and a repaired identity uses its own state',async t=>{
  const f=await fixture(t);let calls=0;
  await assert.rejects(createYouTube({...f.options,authorize:async()=>{},fetchImpl:async url=>{calls++;return url.includes('oauth2')?json({access_token:'fake-access'}):json({error:{}},401);}}).verifyIdentity(),e=>e.code==='YOUTUBE_AUTHENTICATION_PENDING');
  assert.equal(calls,4);assert.equal(f.read().reason,'access-token-rejected');
  assert.equal(readYouTubeAuthenticationState({...f.options,channelId:otherChannel}).status,'present-unobserved');
  const repaired={...f.options,env:{...f.env,CHANNEL_TOKEN:'fake-repaired'}};
  assert.equal(readYouTubeAuthenticationState(repaired).status,'present-unobserved');
  const client=createYouTube({...repaired,authorize:async()=>{},fetchImpl:async url=>url.includes('oauth2')?json({access_token:'fake-new-access'}):json({items:[{id:channelId}]})});
  assert.equal((await client.verifyIdentity()).id,channelId);
  assert.equal(f.read().status,'rejected'); // No old refusal was deleted or bypassed.
});
test('wrong-channel identity reopens only that configured channel and performs no upload',async t=>{
  const f=await fixture(t);let calls=0;
  await assert.rejects(createYouTube({...f.options,authorize:async()=>{},fetchImpl:async url=>{calls++;return url.includes('oauth2')?json({access_token:'fake-access'}):json({items:[{id:otherChannel}]});}}).verifyIdentity(),e=>e.code==='YOUTUBE_AUTHENTICATION_PENDING');
  assert.equal(f.read().reason,'channel-mismatch');assert.equal(calls,2);
});
test('unknown and malformed refusal observations are bounded and keep execution closed',async t=>{
  const f=await fixture(t),client=createYouTube({...f.options,authorize:async()=>{},fetchImpl:async()=>json({error:'invalid_grant'},400)});
  await assert.rejects(client.verifyIdentity());
  const path=join(f.root,'authentication',(await readdir(join(f.root,'authentication')))[0]);
  await writeFile(path,JSON.stringify({reason:'SECRET_SENTINEL',observedAt:'2099-01-01T00:00:00Z',token:'SECRET_SENTINEL'}));
  assert.equal(f.read().reason,'unclassified-refusal');assert.equal(f.read().refusedAt,null);
  assert.ok(!JSON.stringify(f.read()).includes('SECRET_SENTINEL'));
  await assert.rejects(client.verifyIdentity(),e=>e.code==='YOUTUBE_AUTHENTICATION_PENDING'&&!e.message.includes('SECRET_SENTINEL'));
  await writeFile(path,'not-json');assert.equal(f.read().status,'unavailable');
  await assert.rejects(client.verifyIdentity(),e=>e.code==='YOUTUBE_AUTHENTICATION_PENDING');
});
test('restarted readers preserve refusal bytes and use the producer HOME fallback',async t=>{
 const f=await fixture(t);const options={...f.options,env:{...f.env,YOUTUBE_API_STATE_ROOT:undefined,HOME:f.root}};
 await assert.rejects(createYouTube({...options,authorize:async()=>{},fetchImpl:async()=>json({error:'invalid_grant'},400)}).verifyIdentity());
 const dir=join(f.root,'.local/state/561-group/youtube/authentication'),path=join(dir,(await readdir(dir))[0]);
 const {readFile}=await import('node:fs/promises');const before=await readFile(path,'utf8');let calls=0;
 for(let i=0;i<3;i++) {
  assert.equal(readYouTubeAuthenticationState(options).status,'rejected');
  await assert.rejects(createYouTube({...options,authorize:async()=>{calls++;},fetchImpl:async()=>{calls++;throw Error('unexpected');}}).verifyIdentity(),e=>e.code==='YOUTUBE_AUTHENTICATION_PENDING');
 }
 assert.equal(calls,0);assert.equal(await readFile(path,'utf8'),before);
 for(const name of ['YOUTUBE_OAUTH_CLIENT_ID','YOUTUBE_OAUTH_CLIENT_SECRET','CHANNEL_TOKEN'])assert.equal(readYouTubeAuthenticationState({...options,env:{...options.env,[name]:'synthetic-other'}}).status,'present-unobserved');
});
test('unreadable and invalid retained records remain unavailable without leaking contents',async t=>{
 const f=await fixture(t);
 await assert.rejects(createYouTube({...f.options,authorize:async()=>{},fetchImpl:async()=>json({error:'invalid_grant'},400)}).verifyIdentity());
 const path=join(f.root,'authentication',(await readdir(join(f.root,'authentication')))[0]);
 for(const value of [null,[],{},false,{observedAt:'2026-10-07T10:00:00Z'},{reason:42}]){
  await writeFile(path,JSON.stringify(value));assert.equal(f.read().status,'unavailable');
 }
 const {mkdir}=await import('node:fs/promises');await rm(path);await mkdir(path); // EISDIR, no permission changes needed.
 assert.equal(f.read().reason,'retained-observation-unreadable');
 let calls=0;await assert.rejects(createYouTube({...f.options,authorize:async()=>{calls++;},fetchImpl:async()=>{calls++;}}).verifyIdentity(),e=>e.code==='YOUTUBE_AUTHENTICATION_PENDING');assert.equal(calls,0);
});
test('explicit successful revalidation supersedes the exact refusal and preserves its bytes',async t=>{
 const f=await fixture(t);let healthy=false,calls=0;
 const fetchImpl=async url=>{calls++;return url.includes('oauth2')?(healthy?json({access_token:'synthetic-access'}):json({error:'invalid_grant'},400)):json({items:[{id:channelId}]});};
 const client=createYouTube({...f.options,authorize:async()=>{},fetchImpl});await assert.rejects(client.verifyIdentity());
 const path=join(f.root,'authentication',(await readdir(join(f.root,'authentication')))[0]);const {readFile}=await import('node:fs/promises'),before=await readFile(path,'utf8');
 healthy=true;assert.equal(f.read().status,'rejected'); // Mere availability/storage changes cannot discharge it.
 await revalidateYouTubeAuthentication({...f.options,authorize:async()=>{},fetchImpl});
 assert.equal(f.read().status,'verified');assert.equal(f.read().verifiedAt,'2026-10-07T10:00:00.000Z');assert.equal(await readFile(path,'utf8'),before);
 assert.equal((await client.verifyIdentity()).id,channelId); // Also supersedes the client-local old refusal.
 const afterCalls=calls;f.read();f.read();assert.equal(calls,afterCalls);
 healthy=false;const next=createYouTube({...f.options,authorize:async()=>{},fetchImpl});await assert.rejects(next.verifyIdentity());
 assert.equal(f.read().status,'rejected');assert.notEqual(await readFile(path,'utf8'),before); // New refusal invalidates the witness even at identical clocks.
});
test('failed or wrong-channel revalidation cannot supersede retained refusal',async t=>{
 const f=await fixture(t);await assert.rejects(createYouTube({...f.options,authorize:async()=>{},fetchImpl:async()=>json({error:'invalid_grant'},400)}).verifyIdentity());
 const before=await readdir(join(f.root,'authentication'));
 for(const fetchImpl of [async()=>json({error:'invalid_grant'},400),async url=>url.includes('oauth2')?json({access_token:'synthetic-access'}):json({items:[{id:otherChannel}]})]){
  await assert.rejects(revalidateYouTubeAuthentication({...f.options,authorize:async()=>{},fetchImpl}));assert.equal(f.read().status,'rejected');
 }
 assert.deepEqual(await readdir(join(f.root,'authentication')),before);
});
test('revalidation does not overwrite a concurrent later refusal',async t=>{
 const f=await fixture(t);await assert.rejects(createYouTube({...f.options,authorize:async()=>{},fetchImpl:async()=>json({error:'invalid_grant'},400)}).verifyIdentity());
 const path=join(f.root,'authentication',(await readdir(join(f.root,'authentication')))[0]);
 await assert.rejects(revalidateYouTubeAuthentication({...f.options,authorize:async()=>{},fetchImpl:async url=>{
  if(url.includes('oauth2'))return json({access_token:'synthetic-access'});
  await writeFile(path,JSON.stringify({reason:'invalid_client',observedAt:'2026-10-07T10:00:00.000Z'}));return json({items:[{id:channelId}]});
 }}),/changed during revalidation/);
 assert.equal(f.read().reason,'client-rejected');assert.equal((await readdir(join(f.root,'authentication'))).length,1);
});
test('malformed superseding witnesses remain unavailable and cannot hide a refusal',async t=>{
 const f=await fixture(t);await assert.rejects(createYouTube({...f.options,authorize:async()=>{},fetchImpl:async()=>json({error:'invalid_grant'},400)}).verifyIdentity());
 const path=join(f.root,'authentication',(await readdir(join(f.root,'authentication')))[0])+'.verified.json';
 for(const body of ['not-json','null','false','{}',JSON.stringify({type:'YouTubeAuthenticationRevalidation',version:1,channelId,refusalSha256:'a'.repeat(64),verifiedAt:'2099-01-01T00:00:00Z'})]) {
  await writeFile(path,body);assert.equal(f.read().status,'unavailable');
  let calls=0;await assert.rejects(createYouTube({...f.options,authorize:async()=>{calls++;},fetchImpl:async()=>{calls++;}}).verifyIdentity(),e=>e.code==='YOUTUBE_AUTHENTICATION_PENDING');assert.equal(calls,0);
 }
});
