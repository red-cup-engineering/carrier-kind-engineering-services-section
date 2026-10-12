import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchWithPolicy} from '../src/fetch-policy.mjs';

function reply(status, location, onCancel = () => {}) {
  return {status, headers:new Headers(location === undefined ? {} : {location}), body:{cancel:async()=>onCancel()}};
}
test('authorizes every hop and cancels only intermediate responses',async()=>{
  const seen=[],cancelled=[],requests=[];
  const signal=new AbortController().signal;
  const result=await fetchWithPolicy('https://example.org/a',{signal},'test',{
    authorize:(url,context)=>seen.push([url.href,context]),
    fetchImpl:async(url,init)=>{requests.push(init);return requests.length===1?reply(308,'/b',()=>cancelled.push('a')):reply(200,undefined,()=>cancelled.push('b'));},
  });
  assert.equal(result.status,200);assert.deepEqual(cancelled,['a']);
  assert.deepEqual(seen.map(x=>x[0]),['https://example.org/a','https://example.org/b']);
  assert.deepEqual(seen.map(x=>x[1]),[{purpose:'test',redirect:0},{purpose:'test',redirect:1}]);
  assert.ok(requests.every(x=>x.redirect==='manual'&&x.signal===signal));
});
test('refused redirect releases its body before authorization and never fetches destination',async()=>{
  let calls=0,cancelled=false;
  await assert.rejects(fetchWithPolicy('https://example.org/a',{},'test',{
    authorize:(_url,{redirect})=>{if(redirect){assert.ok(cancelled);throw new Error('refused');}},
    fetchImpl:async()=>{calls++;return reply(302,'https://other.example/',()=>{cancelled=true;});},
  }),/refused/);assert.equal(calls,1);assert.ok(cancelled);
});
test('missing Location preserves terminal response body ownership for its caller',async()=>{
  let cancelled=0;const terminal=reply(308,undefined,()=>cancelled++);
  const value=await fetchWithPolicy('https://example.org/a',{},'test',{authorize:()=>{},fetchImpl:async()=>terminal});
  assert.equal(value,terminal);assert.equal(cancelled,0);
  await value.body.cancel();assert.equal(cancelled,1);
});
for(const [label,location,limit,message] of [['invalid','http://[',5,/Invalid URL/],['bounded','/b',0,/exceeded 0 redirects/]]){
  test(`${label} redirect releases body and fails closed`,async()=>{
    let cancelled=false;
    await assert.rejects(fetchWithPolicy('https://example.org/a',{},'test',{authorize:()=>{},maxRedirects:limit,fetchImpl:async()=>reply(308,location,()=>{cancelled=true;})}),message);
    assert.ok(cancelled);
  });
}
test('loop is refused before fetching a previously requested URL again',async()=>{
  let calls=0,cancels=0;
  await assert.rejects(fetchWithPolicy('https://example.org/a',{},'test',{authorize:()=>{},fetchImpl:async()=>{calls++;return reply(308,calls===1?'/b':'/a',()=>cancels++);}}),/redirect loop/);
  assert.equal(calls,2);assert.equal(cancels,2);
});
test('POST to GET redirect on the same URL remains valid',async()=>{
  const methods=[];
  const result=await fetchWithPolicy('https://example.org/a',{method:'POST',body:'form'},'test',{
    authorize:()=>{},fetchImpl:async(_url,init)=>{methods.push([init.method,init.body]);return methods.length===1?reply(303,'/a'):reply(200);},
  });assert.equal(result.status,200);assert.deepEqual(methods,[['POST','form'],['GET',undefined]]);
});
test('one total signal is honored before a later hop',async()=>{
  const controller=new AbortController();let calls=0;
  await assert.rejects(fetchWithPolicy('https://example.org/a',{signal:controller.signal},'test',{
    authorize:()=>{},fetchImpl:async(_url,init)=>{assert.equal(init.signal,controller.signal);calls++;return reply(308,'/b',()=>controller.abort());},
  }),{name:'AbortError'});assert.equal(calls,1);
});
test('default public authorization still refuses private redirect addresses',async()=>{
  let calls=0,cancelled=false;
  await assert.rejects(fetchWithPolicy('https://example.org/a',{},'test',{
    resolveHost:async()=>['93.184.216.34'],fetchImpl:async()=>{calls++;return reply(308,'http://127.0.0.1/private',()=>{cancelled=true;});},
  }),/private or special-use/);assert.equal(calls,1);assert.ok(cancelled);
});
