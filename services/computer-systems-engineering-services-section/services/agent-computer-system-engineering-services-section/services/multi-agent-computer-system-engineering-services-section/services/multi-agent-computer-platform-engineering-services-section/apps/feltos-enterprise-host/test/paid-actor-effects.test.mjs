import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fork,execFileSync} from 'node:child_process';
import {createServer} from 'node:https';
import {request,createServer as createHttpServer} from 'node:http';
import {createRequire} from 'node:module';
const ownedSdk=createRequire(new URL('../package.json',import.meta.url));
const {x402Client}=ownedSdk('@x402/core/client');
const {ExactEvmScheme}=ownedSdk('@x402/evm/exact/client');
const signingSdk=createRequire(ownedSdk.resolve('@x402/evm/exact/client'));
const {privateKeyToAccount}=signingSdk('viem/accounts');
const {verifyTypedData}=signingSdk('viem');
import {fileURLToPath} from 'node:url';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(read,accept){for(let i=0;i<100;i++){const value=await read();if(accept(value))return value;await pause(50);}throw Error('enterprise effect did not arrive');}

test('signed enterprise compute uses native x402 task payments, governed execution and durable addressed SEN outcomes',async()=>{
 const root=mkdtempSync(join(tmpdir(),'enterprise-actor-effects-')),key=join(root,'tls.key'),cert=join(root,'tls.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],{stdio:'ignore'});
 let backend,child,stopped;const receiverErrors=[],received=[],pending=new Map();let next=0,diagnostic='';
 const proxy=createServer({key:readFileSync(key),cert:readFileSync(cert)},(req,res)=>{
  if(!backend){res.writeHead(503).end();return;}
  const outbound=request(new URL(req.url,backend),{method:req.method,headers:req.headers},response=>{if(response.statusCode>=300){const errorChunks=[];response.on('data',chunk=>errorChunks.push(chunk));response.on('end',()=>receiverErrors.push({url:req.url,status:response.statusCode,body:Buffer.concat(errorChunks).toString().slice(0,2000)}));}res.writeHead(response.statusCode,response.headers);response.pipe(res);});
  const chunks=[];req.on('data',chunk=>chunks.push(chunk));req.on('end',()=>{if(req.method==='POST'&&req.url.endsWith('/inbox'))received.push({url:req.url,headers:req.headers,bytes:Buffer.concat(chunks)});});
  outbound.on('error',()=>res.writeHead(502).end());req.pipe(outbound);
 });
 await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 const origin='https://localhost:'+proxy.address().port,agencyRoot=join(root,'agency'),section=join(agencyRoot,'engineering/lib/agency'),dataRoot=join(root,'resources');mkdirSync(dataRoot);
 for(const pool of ['characters','offices','skills','incumbencies','enterprises'])mkdirSync(join(section,pool),{recursive:true});
 const record=(pool,id,value)=>writeFileSync(join(section,pool,id+'.json'),JSON.stringify({id,name:id,...value}));
 record('characters','worker',{id:'actor:worker',kind:'harness',host:'fixture-host',harness:'worker'});
 record('characters','other',{id:'actor:other',kind:'harness',host:'fixture-host',harness:'other'});
 record('offices','engineer',{kind:'office','normative-structure':'Preserve the requested resource transformation','deontic-profile':{},'provides-skill':['resources']});
 record('skills','resources',{'closure-kind':'process','requires-capabilities':['read','write'],method:'Use the current provider actor to read and write its resources'});
 record('incumbencies','worker-seat',{office:'engineer',holder:'actor:worker',recognition:'t',induction:'t'});
 // Protocol fixtures only: public key, test asset, reported settlements; no live chain funds.
 const network='eip155:5615611',asset='0x'+'22'.repeat(20),payTo='0x'+'33'.repeat(20);
 const signer=privateKeyToAccount('0x'+'1'.padStart(64,'0'));
 let supportedReads=0,verifies=0,settles=0,settlementMode='success';
 const used=new Set();
 const verify=async (payload,requirements)=>{
  assert.equal(payload.accepted.amount,requirements.amount);
  assert.equal(requirements.network,network);assert.equal(requirements.asset.toLowerCase(),asset);
  return verifyTypedData({address:signer.address,signature:payload.payload.signature,
   domain:{name:'House Compute Test Credit',version:'1',chainId:5615611,verifyingContract:asset},
   types:{TransferWithAuthorization:[{name:'from',type:'address'},{name:'to',type:'address'},{name:'value',type:'uint256'},
    {name:'validAfter',type:'uint256'},{name:'validBefore',type:'uint256'},{name:'nonce',type:'bytes32'}]},
   primaryType:'TransferWithAuthorization',message:payload.payload.authorization});
 };
 const facilitator=createHttpServer(async(req,res)=>{
  try{
   if(req.url==='/supported'){supportedReads++;res.setHeader('content-type','application/json');res.end(JSON.stringify({kinds:[{x402Version:2,scheme:'exact',network}],extensions:[],signers:{}}));return;}
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const {paymentPayload:payload,paymentRequirements:requirements}=JSON.parse(Buffer.concat(chunks));
   const valid=await verify(payload,requirements);res.setHeader('content-type','application/json');
   if(req.url==='/verify'){verifies++;res.end(JSON.stringify({isValid:valid&&!used.has(payload.payload.authorization.nonce),payer:signer.address}));return;}
   assert.equal(req.url,'/settle');settles++;assert(valid);
   if(settlementMode==='disconnect'){res.destroy();return;}
   const success=settlementMode!=='refuse';if(success)used.add(payload.payload.authorization.nonce);
   res.end(JSON.stringify({success,network,payer:signer.address,transaction:success?'0x'+'a'.repeat(64):'',...(success?{}:{errorReason:'fixture-settlement-refusal'})}));
  }catch(error){res.writeHead(500).end(error.stack);}
 });
 await new Promise(resolve=>facilitator.listen(0,'127.0.0.1',resolve));
 const x402={price:{amountAtomic:'7',asset:network+'/erc20:'+asset},payTo,assetExtra:{name:'House Compute Test Credit',version:'1'},
  facilitatorUrl:'http://127.0.0.1:'+facilitator.address().port,maxTimeoutSeconds:300,
  requestPricing:{mode:'canonical-json-byte-bands',includedBytes:1,additionalUnitBytes:1,additionalUnitAtomic:'1',maximumAtomic:'11'}};
 record('enterprises','foundry',{kind:'node',entity:'fixture',host:'fixture-host',faces:'Provide resource transformation',offices:['engineer'],x402});
 const config={stateDir:root,agencyRoot,metroplatDataRoot:dataRoot,instance:{name:'fixture-host'},activityPub:{origin,nodeHost:'fixture-host',statePath:join(root,'federation.sqlite'),keysDirectory:join(root,'keys'),instanceActor:{identifier:'fixture-host',actorName:'Fixture Host',summary:'Offers the installed native transformations'}}};
 const configuration=join(root,'host.json');writeFileSync(configuration,JSON.stringify(config));
 const boot=async()=>{
  backend=undefined;diagnostic='';child=fork(fileURLToPath(new URL('./fixtures/enterprise-actor-host.mjs',import.meta.url)),[configuration],{env:{...process.env,NODE_EXTRA_CA_CERTS:cert},stdio:['ignore','ignore','pipe','ipc']});
  stopped=new Promise(resolve=>child.once('exit',(code,signal)=>{for(const entry of pending.values())entry.reject(Error(diagnostic||String(signal||code)));pending.clear();resolve(code);}));
  child.stderr.on('data',chunk=>diagnostic=(diagnostic+chunk).slice(-8192));
  child.on('message',message=>{if(message.ready){backend=message.ready;return;}const entry=pending.get(message.id);if(entry){pending.delete(message.id);message.error?entry.reject(Error(message.error)):entry.resolve(message.value);}});
  for(let i=0;i<150;i++){if(backend)return;if(child.exitCode!==null)throw Error(diagnostic);await pause(50);}throw Error('enterprise host did not start: '+diagnostic);
 };
 const stop=async()=>{if(child?.exitCode===null)child.kill('SIGTERM');if(stopped)assert.equal(await stopped,0,diagnostic);backend=undefined;};
 const call=body=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});child.send({id,...body});});
 const command=(line,account='actor:worker')=>call({kind:'command',account,line});
 const read=(account='actor:worker')=>call({kind:'read',account});
 const get=async path=>{const response=await fetch(new URL(path,backend),{headers:{accept:'application/activity+json'}});return {status:response.status,value:response.ok?await response.json():null};};
 try{
  await boot();
  const declared=await get('/actors/enterprise-foundry/programs.json');assert.equal(declared.status,200);
  assert.deepEqual(declared.value.operations.map(o=>o.verb).sort(),['read','write']);
  assert.deepEqual(declared.value.payment.price,x402.price);
  assert.equal(declared.value.payment.owner.enterprise,'foundry');
  const instance=await get('/actors/fixture-host/programs.json');assert.deepEqual(instance.value.operations,[],'instance cannot offer unpriced copies of enterprise compute');
  const write=declared.value.operations.find(o=>o.verb==='write');
  assert.equal(write.body.kind,'jsnode','the offered native programme is a real declared closure');
  const codePath='/.well-known/ni/sha-256/'+write.body.closure.split(';')[1];
  const programme=await fetch(new URL(codePath,backend));assert.equal(programme.status,200,'an external caller can retrieve the advertised programme through the actual ingress');
  const programmeBytes=Buffer.from(await programme.arrayBuffer());
  assert.equal('ni:///sha-256;'+(await import('node:crypto')).createHash('sha256').update(programmeBytes).digest('base64url'),write.body.closure,'served bytes are exactly the advertised native programme');
  const path=join(dataRoot,'paid.json');
  const input={path,claim:{paidNative:true}};
  const invoke=async (operationInput,options)=>call({kind:'submit',account:'actor:worker',request:{verb:'write',operation:write.ref,input:operationInput},options});
  const response=async submission=>{
   const matches=entry=>entry.value?.request===submission.request||entry.value?.type==='Reject'&&entry.value?.object?.id===submission.id;
   const page=await until(()=>read(),page=>page.items.some(matches));const entry=page.items.find(matches);
   if(entry.value?.type==='Reject')throw Error('native receiver refused: '+entry.value.summary);
   return entry;
  };
  const first=await invoke(input);assert.equal(first.recipient,origin+'/actors/enterprise-foundry');
  const quote=await response(first);assert(!existsSync(path),'a quoted operation did not execute');
  assert.equal(quote.value.result.state,'payment-required');assert.equal(quote.metadata['x402.payment.status'],'payment-required');
  const required=quote.metadata['x402.payment.required'];assert.equal(required.x402Version,2);assert.equal(required.accepts[0].amount,'11');assert.equal(quote.value.result.payment.offer.pricing.capped,true,'the native owner tariff changes the real SDK quote and obeys its cap');assert.equal(required.accepts[0].network,network);
  assert.equal(verifies,0);assert.equal(settles,0);assert(quote.taskId);
  const swept=await call({kind:'bulk-process'});assert.equal(swept.processed,0);assert(swept.entries.some(row=>row.reason==='actor-inbox-dispatch'));assert(!existsSync(path),'the old collector cannot execute a quoted task for free');
  const buyer=new x402Client().register(network,new ExactEvmScheme(signer));
  const payload=await buyer.createPaymentPayload(required);
  const human=await command('message enterprise-foundry@'+new URL(origin).host+' '+JSON.stringify({
   verb:'write',operation:write.ref,input,taskId:quote.taskId,paymentPayload:payload}));
  const paid=human.packages.find(row=>row.name==='Comm.Submission').data;
  const outcome=await response(paid);assert.equal(outcome.value.result.code,0,JSON.stringify(outcome));
  assert.equal(outcome.taskId,quote.taskId);assert.equal(outcome.metadata['x402.payment.status'],'payment-completed');
  assert.equal(outcome.metadata['x402.payment.receipts'].length,1);assert.equal(outcome.value.result.payment.independentlyVerifiedTransfer,false);
  assert.equal(outcome.value.result.payment.requesterAccepted,null);assert.equal(JSON.parse(readFileSync(path,'utf8')).paidNative,true);
  assert.equal(verifies,1);assert.equal(settles,1);assert.equal((await read('actor:other')).items.length,0);
  const signed=received.filter(entry=>entry.url==='/actors/enterprise-foundry/inbox').find(entry=>JSON.parse(entry.bytes).object?.cloudEvent?.data?.message?.metadata?.['x402.payment.payload']);
  // Compact JSON-LD retains a canonical projection; find the paid message without relying on provider expansion.
  const paidWire=signed??received.filter(entry=>entry.url==='/actors/enterprise-foundry/inbox').at(-1);
  assert(paidWire.headers.signature,'the compute request used the actual signed ActivityPub provider');
  const replay=async()=>new Promise((resolve,reject)=>{const req=request(new URL(paidWire.url,backend),{method:'POST',headers:paidWire.headers},res=>{res.resume();res.on('end',()=>res.statusCode<300?resolve():reject(Error('replay '+res.statusCode)));});req.on('error',reject);req.end(paidWire.bytes);});
  await replay();assert.equal(verifies,1);assert.equal(settles,1);
  await stop();await boot();await replay();
  const nativeReplay=await response(await invoke(input,{taskId:quote.taskId,paymentPayload:payload}));
  assert.equal(nativeReplay.value.result.replayed,true,'a fresh signed envelope reuses the native task journal, beyond transport deduplication');
  assert.equal(verifies,1);assert.equal(settles,1,'restart/replay never repays');
  assert.equal(supportedReads,1,'held results do not need facilitator availability after restart');
  assert.equal(JSON.parse(readFileSync(path,'utf8')).paidNative,true);
  // A completed task cannot be paid for a substituted input, even by its original sender.
  const changed=await invoke({path:join(dataRoot,'substituted.json'),claim:{bad:true}},{taskId:quote.taskId,paymentPayload:payload});
  await pause(300);assert(!existsSync(join(dataRoot,'substituted.json')));assert.equal(settles,1);
  // Failure reports survive the original addressed reply and cause no execution.
  settlementMode='refuse';const refusedPath=join(dataRoot,'refused.json');const refuseInput={path:refusedPath,claim:{bad:true}};
  const refusalQuote=await response(await invoke(refuseInput));const refusedPayload=await buyer.createPaymentPayload(refusalQuote.metadata['x402.payment.required']);
  const refusal=await response(await invoke(refuseInput,{taskId:refusalQuote.taskId,paymentPayload:refusedPayload}));
  assert.notEqual(refusal.value.result.code,0);assert.equal(refusal.metadata['x402.payment.status'],'payment-failed');assert.equal(refusal.metadata['x402.payment.receipts'][0].success,false);assert(!existsSync(refusedPath));
  // A charge remains reported when the actual native resource write fails.
  settlementMode='success';const blockedPath=join(dataRoot,'blocked.json');mkdirSync(blockedPath);
  const blockedInput={path:blockedPath,claim:{blocked:true}};const blockedQuote=await response(await invoke(blockedInput));
  const blockedPayload=await buyer.createPaymentPayload(blockedQuote.metadata['x402.payment.required']);
  const blocked=await response(await invoke(blockedInput,{taskId:blockedQuote.taskId,paymentPayload:blockedPayload}));
  assert.notEqual(blocked.value.result.code,0);assert.equal(blocked.metadata['x402.payment.status'],'payment-completed');assert.equal(blocked.metadata['x402.payment.receipts'][0].success,true);
  const count=settles;await response(await invoke(blockedInput,{taskId:blockedQuote.taskId,paymentPayload:blockedPayload}));assert.equal(settles,count,'failed execution does not charge again');
  settlementMode='disconnect';const unknownInput={path:join(dataRoot,'unknown.json'),claim:{unknown:true}};
  const unknownQuote=await response(await invoke(unknownInput));const unknownPayload=await buyer.createPaymentPayload(unknownQuote.metadata['x402.payment.required']);
  const unknown=await response(await invoke(unknownInput,{taskId:unknownQuote.taskId,paymentPayload:unknownPayload}));
  assert.equal(unknown.value.result.payment.settlementOutcome,'unknown');assert.equal(unknown.metadata['x402.payment.receipts'].length,0);assert(!existsSync(unknownInput.path));
  await call({kind:'bulk-process'});assert(!existsSync(unknownInput.path),'the old collector cannot execute an uncertain paid task');
  const beforeReplay=settles;await response(await invoke(unknownInput,{taskId:unknownQuote.taskId,paymentPayload:unknownPayload}));assert.equal(settles,beforeReplay,'unknown settlement does not auto-repay');
  await call({kind:'withdraw-office'});
  const authorityInput={path:join(dataRoot,'unauthorized.json'),claim:{bad:true}};
  const authority=await response(await invoke(authorityInput));assert.notEqual(authority.value.result.code,0);assert(!existsSync(authorityInput.path));assert.equal(settles,beforeReplay,'payment did not create operation authority');
 }catch(error){process.stderr.write('PRIMARY EFFECT FAILURE: '+error.stack+'\nCHILD: '+diagnostic+'\nRECEIVER: '+JSON.stringify(receiverErrors)+'\nDELIVERIES: '+JSON.stringify(received.map(x=>({url:x.url,type:JSON.parse(x.bytes).type,bytes:x.bytes.length})))+'\nINBOX: '+JSON.stringify((await read()).items.map(entry=>({kind:entry.kind,summary:entry.value?.summary,taskId:entry.taskId,state:entry.value?.result?.state,stderr:entry.value?.result?.stderr}))).slice(0,3000)+'\n');throw error;}finally{try{await stop();}finally{await new Promise(resolve=>proxy.close(resolve));await new Promise(resolve=>facilitator.close(resolve));rmSync(root,{recursive:true,force:true});}}
});
