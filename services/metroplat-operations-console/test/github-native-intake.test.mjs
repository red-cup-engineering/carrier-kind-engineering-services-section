import test from 'node:test';
import assert from 'node:assert/strict';
import {syncGitHubIssues} from '../src/github-issues.mjs';
import {readGitHubSourceDocument,gitHubSourceDocument} from '@red-cup-engineering/github-semioverse-settler-service/native-work-receiving';
const media='data:application/json;base64,';
const repo={id:7,full_name:'owner/public',private:false};
const binding={repositoryId:7,visibility:'public',scope:['section:services/engineering'],receiver:'engineering'};
const issue=()=>({id:9,node_id:'I9',number:2,title:'The reported condition',body:'Original full text '.repeat(400),state:'open',updated_at:'2026-10-08T12:00:00Z',html_url:'https://github.com/owner/public/issues/2',user:{id:3,login:'reporter'},labels:[],comments:1});
function fixture(){
 const f={repo:{...repo},issue:issue(),comments:[{node_id:'C1',id:1,body:'Complete comment',user:{id:4,login:'commenter'},updated_at:'2026-10-08T12:00:01Z',html_url:'https://github.com/owner/public/issues/2#issuecomment-1'}],threads:[],effects:0,calls:[],lose:false};
 f.fetchImpl=async url=>{const path=new URL(url).pathname;f.calls.push(path);let value;
  if(path==='/repos/owner/public')value=f.repo;
  else if(path.endsWith('/issues/2'))value=f.issue;
  else if(path.endsWith('/issues/2/comments'))value=f.comments;
  else if(path.endsWith('/pulls/2'))value=f.pull;
  else if(path.endsWith('/pulls/2/reviews'))value=[];
  else if(path.endsWith('/pulls/2/comments'))value=[];
  else throw Error(path);
  return {ok:true,json:async()=>structuredClone(value)};};
 f.runAs=async (producer,verb,input)=>{
  assert.equal(producer,'person:reader');
  if(verb==='work-board')return {position:'position-'+f.effects,threads:f.threads.filter(t=>input.thread?t.id===input.thread:t.opening.sources.some(s=>s.locator===input.source)),matched:f.threads.length};
  f.effects++;
  if(verb==='work-open'){
   let thread=f.threads.find(t=>t.opening.law===input.law&&t.opening.subject===input.subject);
   if(thread){thread.restatements.push({player:producer,observation:input.observation,evidence:[...new Set(input.evidence)].sort()});thread.standing='open';}
   else{thread={id:'thread-'+f.threads.length,home:'engineering',standing:'open',opening:{...structuredClone(input),by:producer,evidence:[...new Set(input.evidence)].sort()},restatements:[],corroborations:[]};f.threads.push(thread);}
   if(f.lose){f.lose=false;throw Error('acknowledgement lost');}return {thread:thread.id};
  }
  assert.equal(verb,'work-move');assert.equal(input.move,'resolve');const thread=f.threads.find(t=>t.id===input.thread);thread.standing='resolved';thread.resolution={player:producer,evidence:input.evidence};
  if(f.lose){f.lose=false;throw Error('acknowledgement lost');}return {thread:thread.id,move:'resolve'};
 };
 f.sync=()=>syncGitHubIssues({repository:'owner/public',producer:'person:reader',receivingBinding:binding,issueNumbers:[2],fetchImpl:f.fetchImpl,runAs:f.runAs});return f;
}
function documentAt(locator){const envelope=JSON.parse(Buffer.from(locator.slice(media.length),'base64'));return readGitHubSourceDocument(gitHubSourceDocument(envelope));}
test('actual console selection retains full public issue/comment material and retries without new report',async()=>{
 const f=fixture();const result=await f.sync();assert.equal(result.items[0].state,'NATIVE_RECEIVED');assert.equal(result.played,1);const opening=f.threads[0].opening;
 assert.equal(readGitHubSourceDocument(opening.sources.find(s=>s.kind==='github-source-document')).material.body,f.issue.body);
 assert.ok(opening.evidence.filter(s=>s.startsWith(media)).map(documentAt).some(d=>d.source.objectType==='issue_comment'&&d.material.body==='Complete comment'&&d.source.author==='commenter'));
 const again=await f.sync();assert.equal(again.played,0);assert.equal(f.effects,1);
});
test('edited source with lost acknowledgement reconciles retained restatement without repeating effect',async()=>{
 const f=fixture();await f.sync();f.issue.body='Revised complete body';f.issue.updated_at='2026-10-08T12:02:00Z';f.comments[0].body='Revised comment';f.lose=true;
 await assert.rejects(f.sync(),/acknowledgement lost/);assert.equal(f.effects,2);const receipt=await f.sync();assert.equal(receipt.items[0].replay,true);assert.equal(f.effects,2);assert.equal(f.threads.length,1);
 assert.ok(f.threads[0].restatements[0].evidence.filter(s=>s.startsWith(media)).map(documentAt).some(d=>d.material.body==='Revised complete body'));
});
test('selected pull request retains exact head and keeps issue comments distinct',async()=>{
 const f=fixture();f.issue.pull_request={url:'https://api.github.com/repos/owner/public/pulls/2'};f.pull={...f.issue,html_url:'https://github.com/owner/public/pull/2',head:{sha:'a'.repeat(40)}};
 await f.sync();const opening=f.threads[0].opening;const d=readGitHubSourceDocument(opening.sources.find(s=>s.kind==='github-source-document'));
 assert.equal(d.source.objectType,'pull_request');assert.equal(d.source.revision,'a'.repeat(40));assert.equal(opening.law,'github-pull-request-open');
 assert.ok(opening.evidence.filter(s=>s.startsWith(media)).map(documentAt).some(d=>d.source.objectType==='issue_comment'));
});
test('private/unknown audience or changed repository identity refuses before fetching material or board calls',async()=>{
 for(const change of [{private:true},{private:undefined},{id:8}]){const f=fixture();Object.assign(f.repo,change);await assert.rejects(f.sync(),/verified matching public repository audience/);assert.deepEqual(f.calls,['/repos/owner/public']);assert.equal(f.effects,0);}
});
test('source closure resolves report with exact evidence and acknowledgement retry never accepts work',async()=>{
 const f=fixture();await f.sync();f.issue.state='closed';f.issue.updated_at='2026-10-08T12:03:00Z';f.lose=true;await assert.rejects(f.sync(),/acknowledgement lost/);
 const r=await f.sync();assert.equal(r.items[0].state,'NATIVE_REPORT_RESOLVED');assert.equal(r.items[0].stages.accepted,false);assert.equal(r.items[0].replay,true);assert.equal(f.effects,2);
});
test('oversize public source refuses before any board effect',async()=>{const f=fixture();f.issue.body='x'.repeat(256*1024);await assert.rejects(f.sync(),/exceeds 256 KiB/);assert.equal(f.effects,0);});
test('missing or corrupt source state cannot resolve an existing report',async()=>{
 for(const state of [undefined,'corrupt']){const f=fixture();await f.sync();f.issue.state=state;await assert.rejects(f.sync(),/state must be open or closed/);assert.equal(f.effects,1);assert.equal(f.threads[0].standing,'open');}
});
test('configured office is preserved for both opening and source resolution',async()=>{
 const f=fixture(),moves=[];const runAs=async(p,v,i)=>{if(v!=='work-board')moves.push(i.as);return f.runAs(p,v,i);};
 const sync=()=>syncGitHubIssues({repository:'owner/public',producer:'person:reader',receivingBinding:{...binding,as:'office:configured'},issueNumbers:[2],fetchImpl:f.fetchImpl,runAs});
 await sync();f.issue.state='closed';await sync();assert.deepEqual(moves,['office:configured','office:configured']);
});
test('unrelated JSON evidence on native report does not become GitHub evidence',async()=>{
 const f=fixture();await f.sync();f.threads[0].restatements.push({player:'other',evidence:[media+Buffer.from(JSON.stringify({kind:'other-proof'})).toString('base64')]});
 assert.equal((await f.sync()).items[0].replay,true);assert.equal(f.effects,1);
});
test('related document property-order retry preserves the first actual carrier',async()=>{
 const f=fixture();await f.sync();f.comments[0]=Object.fromEntries(Object.entries(f.comments[0]).reverse());const receipt=await f.sync();assert.equal(receipt.items[0].replay,true);assert.equal(f.effects,1);assert.equal(receipt.items[0].relatedSources[0].offeredSourceRetained,false);
});
function replaceCarrier(values,predicate){const locator=values.find(value=>value.startsWith(media)&&predicate(documentAt(value)));const envelope=JSON.parse(Buffer.from(locator.slice(media.length),'base64'));const prior=gitHubSourceDocument(envelope);const altered=gitHubSourceDocument(Object.fromEntries(Object.entries(envelope).reverse()));return values.map(value=>value===prior.locator?altered.locator:value===prior.commitment?altered.commitment:value);}
test('related replay refuses substitution after selected carrier read',async()=>{
 const f=fixture();await f.sync();const original=f.runAs;f.runAs=async(p,v,i)=>{if(v==='work-board'&&i.thread)f.threads[0].opening.evidence=replaceCarrier(f.threads[0].opening.evidence,d=>d.source.objectType==='issue_comment');return original(p,v,i);};
 await assert.rejects(f.sync(),/exact selected evidence carriers|substituted a selected source carrier/);assert.equal(f.effects,1);
});
test('fresh closure refuses semantically equivalent replacement of offered exact carrier',async()=>{
 const f=fixture();await f.sync();f.issue.state='closed';const original=f.runAs;f.runAs=async(p,v,i)=>{const result=await original(p,v,i);if(v==='work-move')f.threads[0].resolution.evidence=replaceCarrier(f.threads[0].resolution.evidence,d=>d.source.objectType==='issue');return result;};
 await assert.rejects(f.sync(),/substituted exact selected evidence carriers/);assert.equal(f.effects,2);
});
test('unrecognized malformed JSON evidence remains an opaque locator',async()=>{
 const f=fixture();await f.sync();f.threads[0].restatements.push({player:'other',evidence:[media+Buffer.from('{bad').toString('base64')]});assert.equal((await f.sync()).items[0].replay,true);assert.equal(f.effects,1);
});
test('consumer final readback cannot replace the primary carrier verified by its helper',async()=>{
 const f=fixture();f.comments=[];f.issue.comments=0;let reads=0;const original=f.runAs;
 f.runAs=async(p,v,i)=>{if(v==='work-board'&&i.thread&&++reads===2){const opening=f.threads[0].opening;opening.evidence=replaceCarrier(opening.evidence,d=>d.source.objectType==='issue');opening.sources=opening.sources.map(source=>{if(source.kind!=='github-source-document')return source;const envelope=readGitHubSourceDocument(source);return gitHubSourceDocument(Object.fromEntries(Object.entries(envelope).reverse()));});}return original(p,v,i);};
 await assert.rejects(f.sync(),/substituted a selected source carrier/);assert.equal(f.effects,1);
});

test('host resolver sees frozen repository identity before any body or board call on every invocation', async () => {
  const f = fixture();
  let resolutions = 0;
  const resolveReceivingBinding = async (input) => { resolutions++; assert.deepEqual(input.repositoryRecord, repo); assert.ok(Object.isFrozen(input.repositoryRecord)); assert.equal(input.producer, 'person:reader'); assert.equal(input.office, 'office:actual'); assert.equal(f.calls.at(-1), '/repos/owner/public'); return { ...binding, as: 'office:actual' }; };
  const sync = () => syncGitHubIssues({ repository: 'owner/public', producer: 'person:reader', office: 'office:actual', resolveReceivingBinding, issueNumbers: [2], fetchImpl: f.fetchImpl, runAs: f.runAs });
  await sync();
  await sync();
  assert.equal(resolutions, 2);
  assert.equal(f.effects, 1);
});
test('a configured resolver refusal or missing binding never falls back to incumbent intake', async () => {
  for (const resolveReceivingBinding of [async () => { throw Error('institutional source relation unresolved'); }, async () => undefined, async () => null, async () => ({ ...binding, receiver: '' }), async () => ({ ...binding, scope: [] })]) {
    const f = fixture();
    await assert.rejects(syncGitHubIssues({ repository: 'owner/public', producer: 'person:reader', resolveReceivingBinding, issueNumbers: [2], fetchImpl: f.fetchImpl, runAs: f.runAs }), /institutional/);
    assert.deepEqual(f.calls, ['/repos/owner/public']);
    assert.equal(f.effects, 0);
  }
});
test('changed repository identity and private visibility refuse before a resolver or source material runs', async () => {
  for (const change of [{ full_name: 'other/public' }, { private: true }, { private: undefined }, { id: undefined }]) {
    const f = fixture();
    Object.assign(f.repo, change);
    let resolved = false;
    await assert.rejects(syncGitHubIssues({ repository: 'owner/public', producer: 'person:reader', resolveReceivingBinding: () => { resolved = true; return binding; }, issueNumbers: [2], fetchImpl: f.fetchImpl, runAs: f.runAs }), /verified matching public repository audience/);
    assert.equal(resolved, false);
    assert.deepEqual(f.calls, ['/repos/owner/public']);
    assert.equal(f.effects, 0);
  }
  const f = fixture();
  f.repo.id = 8;
  await assert.rejects(syncGitHubIssues({ repository: 'owner/public', producer: 'person:reader', resolveReceivingBinding: () => binding, issueNumbers: [2], fetchImpl: f.fetchImpl, runAs: f.runAs }), /verified matching public repository audience/);
  assert.deepEqual(f.calls, ['/repos/owner/public']);
  assert.equal(f.effects, 0);
});
test('repository metadata failure cannot run a resolver or fetch a source body', async () => {
  const f = fixture();
  let resolved = false;
  const calls = [];
  await assert.rejects(syncGitHubIssues({ repository: 'owner/public', producer: 'person:reader', resolveReceivingBinding: () => { resolved = true; return binding; }, issueNumbers: [2], fetchImpl: async (url) => { calls.push(new URL(url).pathname); throw Error('metadata unavailable'); }, runAs: f.runAs }), /metadata unavailable/);
  assert.equal(resolved, false);
  assert.deepEqual(calls, ['/repos/owner/public']);
  assert.equal(f.effects, 0);
});
