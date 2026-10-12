import {allowanceSuppliesOperations} from '@red-cup-engineering/computer-inference-engine/media/allowance-supplies';
import {recordAllowanceEvidence} from '@red-cup-engineering/computer-inference-engine/media/allowance-ledger';
import {processArrivals} from '@red-cup-engineering/metroplat/arrival-processing';
import {readActorMessage} from '@red-cup-engineering/computer-system-engine/rpc/actor-client';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {dirname} from 'node:path';
import {enterpriseLoopOperations} from '../../src/enterprise-loops.mjs';
import {codexTaskOperations,codexNodeOptions,readLatestCodexTasks} from '@red-cup-engineering/agent-harness-computer-system-engineering-services-section/codex/operations';
import {readFileSync,rmSync} from 'node:fs';
import {createServer} from 'node:http';
import {join} from 'node:path';
import {matchesActivityPubRequest} from '@red-cup-engineering/activitypub-services-section/app';
import {activityPubProvider} from '../../src/serve-instance.mjs';
import {createEnterpriseActorMesh,actorSubjectAtHost} from '../../src/actor-mesh.mjs';
import {agencyAt,agencyMoved,releaseAgency} from '@red-cup-engineering/organizing/agency/held';
import {readStanding,providersOfAccount} from '@red-cup-engineering/metroplat/offices';
import {createMetroplatWorld} from '@red-cup-engineering/metroplat/world';
import {filesystemOperations,withFilesystemBinding} from '@red-cup-engineering/metroplat/resources/read-write-verbs';
import {defaultFilesystemBinding} from '@red-cup-engineering/computer-system-engine/rpc/binding';
import {authorizationFromStanding,authorizationFromCapabilityAssertions} from '@red-cup-engineering/computer-system-engine/rpc/dispatch';
const config=JSON.parse(readFileSync(process.argv[2],'utf8'));
const binding=defaultFilesystemBinding(config.metroplatDataRoot,{agencyRoot:config.agencyRoot,resolveActorSubject:subject=>actorSubjectAtHost(config,subject)});
const operations=[...withFilesystemBinding(filesystemOperations,binding)];
let node;
if(config.ownServiceNode){
 const req=createRequire(import.meta.url),owner=dirname(req.resolve('@red-cup-engineering/agent-harness-computer-system-engineering-services-section/codex/operations'));
 const environment={...process.env,METROPLAT_SETTLEMENTS_ROOT:config.settlementsRoot,METROPLAT_REPOSITORY_ROOT:config.repositoryRoot,METROPLAT_CODEX_WORKTREES:join(config.stateDir,'worktrees'),XDG_STATE_HOME:join(config.stateDir,'provider-state'),PATH:dirname(process.execPath)+':'+process.env.PATH,FAKE_CODEX_WRITE_PATH:'produced.txt'};
 const runners=new Map();
 node={...codexNodeOptions(binding,{environment,workspace:config.workspace}),codex:join(owner,'../test/fixtures/fake-codex'),timeoutMs:5000,pollIntervalMs:5,
  systemRunner:async(command,args,options)=>{
   if(command!=='systemd-run'){
    const unit=args.find(a=>a.endsWith('.service')),runner=runners.get(unit),active=runner?.exitCode===null;
    if(args.includes('show'))return {exitCode:0,stdout:runner?'LoadState=loaded\nActiveState='+ (active?'active':'inactive')+'\n':'LoadState=not-found\nActiveState=inactive\n'};
    if(args.includes('is-active'))return {exitCode:active?0:3,stdout:''};
    return {exitCode:0,stdout:[...runners].filter(([,r])=>r.exitCode===null).map(([u])=>u+' loaded active running').join('\n')};
   }
   const separator=args.indexOf('--'),runner=spawn(args[separator+1],args.slice(separator+2),{cwd:options.cwd,env:environment,stdio:'ignore'});
   runners.set(args.find(a=>a.startsWith('--unit=')).slice(7)+'.service',runner);return {exitCode:0};
  },
  commandRunner:request=>{
   if(request.command.endsWith('/pnpm')||request.command==='pnpm')return {result:{status:0,stdout:'',stderr:'',error:''}};
   const r=spawnSync(request.command,request.arguments,{cwd:request.directory,env:request.environment??environment,encoding:'utf8',input:request.input??undefined});return {result:{status:r.status,stdout:r.stdout??'',stderr:r.stderr??'',error:r.error?.message??''}};
  }};
 const allowancePath=join(config.stateDir,'allowances.sqlite');
 recordAllowanceEvidence({id:'fixture-capacity',account:'fixture',product:'controlled-runner',unit:'turns',because:'bounded effect fixture',meters:[{id:'daily',law:'period',every:'day',anchor:'2026-01-01T00:00:00Z',budget:10}],costs:{work:1}},[],{storePath:allowancePath});
 operations.push(...codexTaskOperations(node),...allowanceSuppliesOperations({storePath:allowancePath}));
}

const authorize=authorizationFromCapabilityAssertions(authorizationFromStanding(new Map(operations.map(o=>[o.ref,'held']))),
 (subject,invocation,operation)=>readStanding(binding,subject,{operation,input:invocation.input}));
const local=await activityPubProvider(config,{...process.env,ACTIVITYPUB_ALLOW_PRIVATE_ADDRESS:'true',...(config.settlementsRoot?{METROPLAT_SETTLEMENTS_ROOT:config.settlementsRoot}:{})},
 {operationSurface:async()=>({operations,apex:{authorize}})});
const mesh=createEnterpriseActorMesh({config,binding,provider:()=>local.provider,inbox:()=>local.inbox});
let clock=0;
const loops=enterpriseLoopOperations({binding,host:config.activityPub.nodeHost,agencyRoot:config.agencyRoot,repositoryRoot:config.repositoryRoot,settlementsRoot:config.settlementsRoot,
 workOptions:()=>undefined,operations:()=>operations,requestOwnService:request=>mesh.request(request.enterprise,request,{requestKey:'clock:'+clock})});
if(config.ownServiceNode)operations.push(...loops);
const city=createMetroplatWorld({binding,operations:()=>operations,identity:{title:'Fixture enterprise'},actorMesh:mesh});
const server=createServer(async(req,res)=>{
 try{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  if(!matchesActivityPubRequest(req.url,local.provider)){res.writeHead(404).end();return;}
  const response=await local.provider.fetch(new Request(new URL(req.url,config.activityPub.origin),{method:req.method,headers:req.headers,
   ...(req.method==='GET'||req.method==='HEAD'?{}:{body:Buffer.concat(chunks)})}));
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){res.writeHead(500).end(error.message);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const abort=new AbortController();const queue=local.provider.federation.startQueue(undefined,{signal:abort.signal});
process.send({ready:'http://127.0.0.1:'+server.address().port});
process.on('message',async request=>{
 try{
  let value;
  if(request.kind==='command')value=await city.command(request.account,request.line);
  else if(request.kind==='submit')value=await mesh.submit(request.account,request.request,request.options);
  else if(request.kind==='bulk-process')value=await processArrivals(operations,config.metroplatDataRoot,binding.now().slice(0,10),{...binding,at:binding.now(),authorize,bindPrincipal:claim=>({kind:'metroplat.arrival.local-principal-binding',state:'bound',subject:claim.source,evidence:['fixture:signed-actor'],reasons:[]})});
  else if(request.kind==='read')value=await mesh.read(request.account);
  else if(request.kind==='node-queue')value=await operations.find(o=>o.verb==='codex-task').execute(request.assignment,{},{invocation:{subject:'fixture-customer'}});
  else if(request.kind==='own-turn'){clock=request.clock;value=await loops.find(o=>o.verb==='enterprise-work-run').execute({enterprise:'codex-node'},{},undefined);}
  else if(request.kind==='node-state')value={root:node.dataRoot,tasks:[...readLatestCodexTasks(node.dataRoot,node.formerRoots).values()]};
  else if(request.kind==='own-request')value=await mesh.submit(request.account,request.request,{requestKey:request.requestKey,reuse:true});
  else if(request.kind==='own-control')value=await mesh.request(request.account,request.request,{requestKey:request.requestKey});
  else if(request.kind==='own-inbox')value=(await local.inbox.list({identifier:'enterprise-codex-node'})).items.map(a=>{try{const e=readActorMessage(a,typeof a.actor==='string'?a.actor:a.actor.id,config.activityPub.origin+'/actors/enterprise-codex-node');return {kind:e.kind,value:e.value};}catch(e){return {type:a.type,error:e.message};}});
  else if(request.kind==='withdraw-own-turn'){const path=join(config.agencyRoot,'engineering/lib/agency/enterprises/codex-node.json');const record=JSON.parse(readFileSync(path,'utf8'));record.turns=[];(await import('node:fs')).writeFileSync(path,JSON.stringify(record));agencyMoved(config.agencyRoot);value=true;}
  else if(request.kind==='face')value={bearers:providersOfAccount(binding,request.subject),standing:readStanding(binding,request.subject)};
  else if(request.kind==='withdraw-office'){rmSync(join(config.agencyRoot,'engineering/lib/agency/incumbencies/worker-seat.json'));agencyMoved(config.agencyRoot);value=true;}
  else if(request.kind==='withdraw-character'){rmSync(join(config.agencyRoot,'engineering/lib/agency/characters/worker.json'));agencyMoved(config.agencyRoot);value=true;}
  else if(request.kind==='withdraw-enterprise'){rmSync(join(config.agencyRoot,'engineering/lib/agency/enterprises/foundry.json'));agencyMoved(config.agencyRoot);value=true;}
  else throw Error('unknown fixture control');
  process.send({id:request.id,value});
 }catch(error){process.send({id:request.id,error:error.message});}
});
let stopping=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(stopping)return;stopping=true;await new Promise(resolve=>server.close(resolve));abort.abort();await queue;await local.close();releaseAgency(config.agencyRoot);process.exit(0);});
