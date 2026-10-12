import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,chmodSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fork,execFileSync} from 'node:child_process';
import {createServer} from 'node:https';
import {request} from 'node:http';
import {fileURLToPath} from 'node:url';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(read,accept){for(let i=0;i<100;i++){const value=await read();if(accept(value))return value;await pause(50);}throw Error('enterprise effect did not arrive');}

test('enterprise clocks activate the native owned Codex queue through signed self requests, retain cyclic work, and refuse foreign or withdrawn control',async()=>{
 const root=mkdtempSync(join(tmpdir(),'enterprise-actor-effects-')),key=join(root,'tls.key'),cert=join(root,'tls.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],{stdio:'ignore'});
 let backend,child,stopped;const received=[],pending=new Map();let next=0,diagnostic='',played;
 const proxy=createServer({key:readFileSync(key),cert:readFileSync(cert)},(req,res)=>{
  if(!backend){res.writeHead(503).end();return;}
  const outbound=request(new URL(req.url,backend),{method:req.method,headers:req.headers},response=>{if(req.method==='POST')diagnostic+='; response '+req.url+' '+response.statusCode;res.writeHead(response.statusCode,response.headers);response.pipe(res);});
  const chunks=[];req.on('data',chunk=>chunks.push(chunk));req.on('end',()=>{if(req.method==='POST'&&req.url.endsWith('/inbox'))received.push({url:req.url,headers:req.headers,bytes:Buffer.concat(chunks)});});
  outbound.on('error',()=>res.writeHead(502).end());req.pipe(outbound);
 });
 await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 const origin='https://localhost:'+proxy.address().port,agencyRoot=join(root,'agency'),section=join(agencyRoot,'engineering/lib/agency'),dataRoot=join(root,'resources');mkdirSync(dataRoot);
 for(const pool of ['characters','offices','skills','incumbencies','enterprises'])mkdirSync(join(section,pool),{recursive:true});
 const record=(pool,id,value)=>writeFileSync(join(section,pool,id+'.json'),JSON.stringify({id,name:id,...value}));
 record('characters','worker',{id:'actor:worker',kind:'harness',host:'fixture-host',harness:'worker'});
 record('characters','other',{id:'actor:other',kind:'harness',host:'fixture-host',harness:'other'});
 const inputBoundary={type:'object',required:['path'],properties:{path:{type:'string',pattern:'^'+dataRoot.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&')+'/'}},additionalProperties:true};
 record('offices','engineer',{kind:'office','normative-structure':'Preserve the requested resource transformation','deontic-profile':{},'provides-skill':['resources'],
  'service-offerings':['read','write'].map(verb=>({id:verb,invocation:{verb,executor:'actor:worker',requesters:['*'],input:inputBoundary}}))});
 record('skills','resources',{'closure-kind':'process','requires-capabilities':['read','write'],method:'Use the current provider actor to read and write its resources'});
 record('incumbencies','worker-seat',{office:'engineer',holder:'actor:worker',recognition:'t',induction:'t'});
 record('enterprises','foundry',{kind:'node',entity:'fixture',host:'fixture-host',faces:'Provide resource transformation',offices:['engineer']});
 const config={agencyRoot,metroplatDataRoot:dataRoot,stateDir:join(root,'host-state'),instance:{name:'fixture-host'},activityPub:{origin,nodeHost:'fixture-host',stateDirectory:join(root,'federation.state'),keysDirectory:join(root,'keys'),instanceActor:{identifier:'fixture-host',actorName:'Fixture Host',summary:'Offers the installed native transformations'}}};
 config.ownServiceNode=true;config.settlementsRoot=join(root,'settlements');config.repositoryRoot=root;config.workspace=join(root,'workspace');mkdirSync(config.workspace);
 const git=(directory,...args)=>execFileSync('git',args,{cwd:directory,stdio:'ignore'});
 const originRepo=join(root,'origin.git');git(root,'init','--bare','--initial-branch=main',originRepo);git(config.workspace,'init','--initial-branch=main');git(config.workspace,'config','user.name','Fixture');git(config.workspace,'config','user.email','fixture@example.invalid');writeFileSync(join(config.workspace,'base.txt'),'base\n');git(config.workspace,'add','.');git(config.workspace,'commit','-m','base');git(config.workspace,'remote','add','origin',originRepo);git(config.workspace,'push','-u','origin','main');
 record('enterprises','codex-node',{kind:'node',host:'fixture-host',offices:[],turns:['codex-node-turn'],derives:[{operation:'allowance-supplies'}]});
 const fixtureBin=join(root,'bin');mkdirSync(fixtureBin);
 const ghFixture=join(fixtureBin,'gh');writeFileSync(ghFixture,`#!${process.execPath}
const a=process.argv.slice(2);
if(a[0]==='repo'&&a[1]==='view')console.log(JSON.stringify({nameWithOwner:'fixture/owned-queue',defaultBranchRef:{name:'main'}}));
else if(a[0]==='pr'&&a[1]==='list')console.log('[]');
else if(a[0]==='pr'&&a[1]==='create')console.log('https://fixture.invalid/owned-queue/pull/1');
else process.exit(1);
`);chmodSync(ghFixture,0o755);
 const configuration=join(root,'host.json');writeFileSync(configuration,JSON.stringify(config));
 const boot=async()=>{
  backend=undefined;diagnostic='';child=fork(fileURLToPath(new URL('./fixtures/enterprise-actor-host.mjs',import.meta.url)),[configuration],{env:{...process.env,NODE_EXTRA_CA_CERTS:cert,PATH:fixtureBin+':'+process.env.PATH},stdio:['ignore','ignore','pipe','ipc']});
  stopped=new Promise(resolve=>child.once('exit',(code,signal)=>{for(const entry of pending.values())entry.reject(Error(diagnostic||String(signal||code)));pending.clear();resolve(code);}));
  child.stderr.on('data',chunk=>diagnostic=(diagnostic+chunk).slice(-8192));
  child.on('message',message=>{if(message.ready){backend=message.ready;return;}const entry=pending.get(message.id);if(entry){pending.delete(message.id);message.error?entry.reject(Error(message.error)):entry.resolve(message.value);}});
  for(let i=0;i<600;i++){if(backend)return;if(child.exitCode!==null)throw Error(diagnostic);await pause(50);}throw Error('enterprise host did not start: '+diagnostic);
 };
 const stop=async()=>{if(child?.exitCode===null)child.kill('SIGTERM');if(stopped){const done=await Promise.race([stopped,pause(5000).then(()=>null)]);if(done===null&&child.exitCode===null)child.kill('SIGKILL');const code=done??await stopped;if(backend!==undefined&&code!==null)assert.equal(code,0,diagnostic);}backend=undefined;};
 const call=body=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});child.send({id,...body});});
 const command=(line,account='actor:worker')=>call({kind:'command',account,line});
 const read=(account='actor:worker')=>call({kind:'read',account});
 const get=async path=>{const response=await fetch(new URL(path,backend),{headers:{accept:'application/activity+json'}});return {status:response.status,value:response.ok?await response.json():{error:await response.text()}};};
 try{
  await boot();
  const offered=await get('/actors/enterprise-codex-node/programs.json');assert.equal(offered.status,200,JSON.stringify(offered));const programs=offered.value;
  const turn=programs.operations.find(o=>o.verb==='codex-node-turn');assert(turn);
  const service=programs.services.find(s=>s.operation===turn.ref);assert.deepEqual(service.requesters,[origin+'/actors/enterprise-codex-node']);
  const assignment={responsibility:'produce one owned artifact',instruction:'Write the authorized artifact.',receivingCheck:'The file produced.txt exists in the retained task trace.',effects:'repository-write',owner:'fixture'};
  const first=await call({kind:'node-queue',assignment});
  played=await call({kind:'own-turn',clock:1});assert(played.executed.service['codex-node-turn']);
  const completed=await until(()=>call({kind:'node-state'}),state=>state.tasks.some(task=>task.id===first.id&&task.state==='done'));
  assert.equal(completed.root,join(config.settlementsRoot,'codex-node'));assert.equal(completed.tasks.find(t=>t.id===first.id).session.message,'durable final message');
  const task=completed.tasks.find(t=>t.id===first.id);assert.equal(task.integration.queued,true);assert.match(execFileSync('git',['show',task.commit+':produced.txt'],{cwd:config.workspace,encoding:'utf8'}),/produce one owned artifact/);
  assert.equal(existsSync(join(config.workspace,'produced.txt')),false,'the reviewed task trace leaves the shared workspace unchanged');
  assert(received.some(r=>r.url==='/actors/enterprise-codex-node/inbox'),'own control crossed the actual inbox');
  await assert.rejects(read('codex-node'),/no unique current actor/,'an ordinary account cannot borrow an enterprise’s keys');
  const second=await call({kind:'node-queue',assignment:{...assignment,responsibility:'produce a second artifact'}});await call({kind:'own-turn',clock:2});
  await until(()=>call({kind:'node-state'}),state=>state.tasks.some(t=>t.id===second.id&&t.state==='done'));
  const measure=programs.operations.find(o=>o.verb==='allowance-supplies');assert(measure);
  const capacity=await call({kind:'own-control',account:'codex-node',request:{enterprise:'codex-node',verb:'allowance-supplies',operation:measure.ref,input:{poster:'codex-node'}},requestKey:'measurement'});
  assert.equal(capacity.poster,'codex-node');assert.equal(capacity.openings[0].opening.amount,10);
  await assert.rejects(call({kind:'own-control',account:'codex-node',request:{enterprise:'codex-node',verb:'allowance-supplies',operation:measure.ref,input:{poster:'other'}},requestKey:'wrong-poster'}),/refused/);
  const ownInputs=service.input.const;
  const foreign=await call({kind:'own-request',account:'actor:other',request:{enterprise:'codex-node',verb:'codex-node-turn',operation:turn.ref,input:ownInputs},requestKey:'foreign'});
  const refused=await until(()=>read('actor:other'),page=>page.items.some(e=>e.value?.request===foreign.request));assert.notEqual(refused.items.find(e=>e.value?.request===foreign.request).value.result.code,0);
  await assert.rejects(call({kind:'own-control',account:'codex-node',request:{enterprise:'codex-node',verb:'codex-node-turn',operation:turn.ref,input:{orderChannels:999}},requestKey:'tampered'}),/refused/);
  await call({kind:'withdraw-own-turn'});
  await assert.rejects(call({kind:'own-control',account:'codex-node',request:{enterprise:'codex-node',verb:'codex-node-turn',operation:turn.ref,input:ownInputs},requestKey:'withdrawn'}),/refused/);
 }catch(error){error.message+='; deliveries='+JSON.stringify(received.map(r=>({url:r.url,type:JSON.parse(r.bytes).type,summary:JSON.parse(r.bytes).summary})))+'; tasks='+JSON.stringify(child?.connected&&child.exitCode===null?(await call({kind:'node-state'})).tasks.map(t=>({state:t.state,session:t.session,trace:t.trace})):[])+'; played='+JSON.stringify(played)+'; host='+diagnostic;process.stderr.write(error.message+'\n');throw error;}finally{try{await stop();}finally{await new Promise(resolve=>proxy.close(resolve));rmSync(root,{recursive:true,force:true});}}
});
