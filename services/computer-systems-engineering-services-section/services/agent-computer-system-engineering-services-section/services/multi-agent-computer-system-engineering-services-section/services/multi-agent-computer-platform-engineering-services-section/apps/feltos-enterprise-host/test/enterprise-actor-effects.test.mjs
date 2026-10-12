import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fork,execFileSync} from 'node:child_process';
import {createServer} from 'node:https';
import {request} from 'node:http';
import {fileURLToPath} from 'node:url';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(read,accept){for(let i=0;i<100;i++){const value=await read();if(accept(value))return value;await pause(50);}throw Error('enterprise effect did not arrive');}

test('enterprise commands send signed addressed requests; native office standing, provider offers and private correlated replies survive the mesh',async()=>{
 const root=mkdtempSync(join(tmpdir(),'enterprise-actor-effects-')),key=join(root,'tls.key'),cert=join(root,'tls.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],{stdio:'ignore'});
 let backend,child,stopped;const received=[],pending=new Map();let next=0,diagnostic='';
 const proxy=createServer({key:readFileSync(key),cert:readFileSync(cert)},(req,res)=>{
  if(!backend){res.writeHead(503).end();return;}
  const outbound=request(new URL(req.url,backend),{method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
  const chunks=[];req.on('data',chunk=>chunks.push(chunk));req.on('end',()=>{if(req.method==='POST'&&req.url.endsWith('/inbox'))received.push({url:req.url,headers:req.headers,bytes:Buffer.concat(chunks)});});
  outbound.on('error',()=>res.writeHead(502).end());req.pipe(outbound);
 });
 await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 const origin='https://localhost:'+proxy.address().port,agencyRoot=join(root,'agency'),section=join(agencyRoot,'engineering/lib/agency'),dataRoot=join(root,'resources');mkdirSync(dataRoot);
 for(const pool of ['characters','offices','skills','incumbencies','enterprises'])mkdirSync(join(section,pool),{recursive:true});
 const record=(pool,id,value)=>writeFileSync(join(section,pool,id+'.json'),JSON.stringify({id,name:id,...value}));
 record('characters','worker',{id:'actor:worker',kind:'human',host:'fixture-host',activityPub:{identifier:'worker'}});
 record('characters','other',{id:'actor:other',kind:'harness',host:'fixture-host',harness:'other'});
 record('offices','engineer',{kind:'office','normative-structure':'Preserve the requested resource transformation','deontic-profile':{},'provides-skill':['resources'],'service-offerings':['read','write'].map(verb=>({id:verb,invocation:{verb,executor:'actor:worker',requesters:['*'],input:{type:'object',required:['path'],properties:{path:{type:'string',pattern:'^'+dataRoot+'/'}},additionalProperties:true}}}))});
 record('skills','resources',{'closure-kind':'process','requires-capabilities':['read','write'],method:'Use the current provider actor to read and write its resources'});
 record('incumbencies','worker-seat',{office:'engineer',holder:'actor:worker',recognition:'t',induction:'t'});
 record('enterprises','foundry',{kind:'node',entity:'fixture',host:'fixture-host',faces:'Provide resource transformation',offices:['engineer']});
 const config={stateDir:root,agencyRoot,metroplatDataRoot:dataRoot,instance:{name:'fixture-host'},activityPub:{origin,nodeHost:'fixture-host',stateDirectory:join(root,'federation.state'),keysDirectory:join(root,'keys'),instanceActor:{identifier:'fixture-host',actorName:'Fixture Host',summary:'Offers the installed native transformations'}}};
 const configuration=join(root,'host.json');writeFileSync(configuration,JSON.stringify(config));
 const boot=async()=>{
  backend=undefined;diagnostic='';child=fork(fileURLToPath(new URL('./fixtures/enterprise-actor-host.mjs',import.meta.url)),[configuration],{env:{...process.env,NODE_EXTRA_CA_CERTS:cert},stdio:['ignore','ignore','pipe','ipc']});
  stopped=new Promise(resolve=>child.once('exit',(code,signal)=>{for(const entry of pending.values())entry.reject(Error(diagnostic||String(signal||code)));pending.clear();resolve(code);}));
  child.stderr.on('data',chunk=>diagnostic=(diagnostic+chunk).slice(-8192));
  child.on('message',message=>{if(message.ready){backend=message.ready;return;}const entry=pending.get(message.id);if(entry){pending.delete(message.id);message.error?entry.reject(Error(message.error)):entry.resolve(message.value);}});
  for(let i=0;i<600;i++){if(backend)return;if(child.exitCode!==null)throw Error(diagnostic);await pause(50);}throw Error('enterprise host did not start: '+diagnostic);
 };
 const stop=async()=>{if(child?.exitCode===null)child.kill('SIGTERM');if(stopped){const code=await stopped;if(backend!==undefined)assert.equal(code,0,diagnostic);}backend=undefined;};
 const call=body=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});child.send({id,...body});});
 const command=(line,account='actor:worker')=>call({kind:'command',account,line});
 const read=(account='actor:worker')=>call({kind:'read',account});
 const get=async path=>{const response=await fetch(new URL(path,backend),{headers:{accept:'application/activity+json'}});return {status:response.status,value:response.ok?await response.json():null};};
 try{
  await boot();
  const declared=await get('/actors/enterprise-foundry/programs.json');assert.equal(declared.status,200);assert.deepEqual(declared.value.operations.map(o=>o.verb).sort(),['read','write']);
  const card=await get('/actors/enterprise-foundry/agent-card.json');assert.equal(card.status,200);assert.equal(card.value.supportedInterfaces[0].url,origin+'/actors/enterprise-foundry/inbox');
  assert.equal((await get('/actors/worker/agent-card.json')).status,200);
  assert.equal((await get('/actors/worker/programs.json')).status,404,'a character inbox is not falsely advertised as an installed actuator');
  const write=declared.value.operations.find(o=>o.verb==='write'),path=join(dataRoot,'actual.json');
  const turn=await command('write '+JSON.stringify({path,claim:{enterprise:true}}));
  assert.equal(turn.results[0]?.submitted,true,JSON.stringify(turn));assert.equal(turn.results[0].recipient,origin+'/actors/enterprise-foundry');
  const result=await until(()=>read(),page=>page.items.some(entry=>entry.value?.request===turn.results[0].request));
  assert.equal(result.items.find(entry=>entry.value?.request===turn.results[0].request).value.result.code,0,JSON.stringify(result));
  assert.equal(JSON.parse(readFileSync(path,'utf8')).enterprise,true);
  assert.equal((await read('actor:other')).items.length,0,'another actor cannot read the reply');
  const face=await call({kind:'face',subject:origin+'/actors/worker'});assert(face.bearers.includes('actor:worker'));
  const foreign=await call({kind:'face',subject:'https://other.invalid/actors/worker'});assert(!foreign.bearers.includes('actor:worker'),'a foreign lookalike handle is not the character');
  const enterprise=await command('@foundry write '+JSON.stringify({path,claim:{foundry:true}}));assert.equal(enterprise.results[0]?.recipient,origin+'/actors/enterprise-foundry',JSON.stringify(enterprise));
  await until(()=>read(),page=>page.items.some(entry=>entry.value?.request===enterprise.results[0].request));assert.equal(JSON.parse(readFileSync(path,'utf8')).foundry,true);
  const menu=await command('messages');assert(menu.packages.find(entry=>entry.name==='Comm.Inbox').data.items.some(entry=>entry.value?.request===enterprise.results[0].request));
  const consultation=await command('message enterprise-foundry@'+new URL(origin).host+' '+JSON.stringify({verb:'read',operation:declared.value.operations.find(o=>o.verb==='read').ref,input:{path}}));
  assert(consultation.packages,JSON.stringify(consultation));
  const submitted=consultation.packages.find(entry=>entry.name==='Comm.Submission').data;
  const consulted=await until(()=>read(),page=>page.items.some(entry=>entry.value?.request===submitted.request));
  assert(consulted.items.find(entry=>entry.value?.request===submitted.request).value.result.stdout.includes('foundry'));
  const signed=received.find(entry=>entry.url==='/actors/enterprise-foundry/inbox');assert(signed,'the first actual signed request was observed');
  await new Promise((resolve,reject)=>{const replay=request(new URL(signed.url,backend),{method:'POST',headers:signed.headers},response=>{response.resume();response.on('end',()=>{assert(response.statusCode<300);resolve();});});replay.on('error',reject);replay.end(signed.bytes);});
  assert.equal(JSON.parse(readFileSync(path,'utf8')).foundry,true,'the first signed request never overwrites the later effect on replay');
  const priorKey=readFileSync(join(root,'keys/worker.json'),'utf8');await stop();await boot();assert.equal(readFileSync(join(root,'keys/worker.json'),'utf8'),priorKey);
  assert((await read()).items.some(entry=>entry.value?.request===submitted.request&&entry.value.result.stdout.includes('foundry')),'the full correlated reply survives restart');
  await call({kind:'withdraw-office'});
  const withheld=await command('write '+JSON.stringify({path,claim:{bad:true}}));assert(withheld.messages.some(line=>line.includes('not currently available')));assert.equal(JSON.parse(readFileSync(path,'utf8')).foundry,true);
  const raw=await command('message enterprise-foundry@'+new URL(origin).host+' '+JSON.stringify({verb:'write',operation:write.ref,input:{path,claim:{bad:true}}}));
  const rawRequest=raw.packages.find(entry=>entry.name==='Comm.Submission').data.request;
  const refused=await until(()=>read(),page=>page.items.some(entry=>entry.value?.request===rawRequest));assert.notEqual(refused.items.find(entry=>entry.value?.request===rawRequest).value.result.code,0,'current native receiver office authority refuses manual requests too');
  assert.equal(JSON.parse(readFileSync(path,'utf8')).foundry,true);
  await call({kind:'withdraw-character'});
  assert(!(await call({kind:'face',subject:origin+'/actors/worker'})).bearers.includes('actor:worker'));
  await assert.rejects(read(),/no unique current actor/);
  await call({kind:'withdraw-enterprise'});assert.equal((await get('/actors/enterprise-foundry/programs.json')).status,404);
 }finally{try{await stop();}finally{await new Promise(resolve=>proxy.close(resolve));rmSync(root,{recursive:true,force:true});}}
});
