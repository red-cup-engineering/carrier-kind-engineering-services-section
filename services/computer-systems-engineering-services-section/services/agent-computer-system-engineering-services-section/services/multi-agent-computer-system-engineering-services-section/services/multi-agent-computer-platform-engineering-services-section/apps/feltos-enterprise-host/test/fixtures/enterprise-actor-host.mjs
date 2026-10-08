import {processArrivalLogPath} from '@red-cup-engineering/metroplat/arrival-processing';
import {arrivalLogPathForDate} from '@red-cup-engineering/computer-system-engine/rpc/arrival-store';
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
const operations=withFilesystemBinding(filesystemOperations,binding);
const authorize=authorizationFromCapabilityAssertions(authorizationFromStanding(new Map(operations.map(o=>[o.ref,'held']))),
 (subject,invocation,operation)=>readStanding(binding,subject,{operation,input:invocation.input}));
const local=await activityPubProvider(config,{...process.env,ACTIVITYPUB_ALLOW_PRIVATE_ADDRESS:'true'},
 {operationSurface:async()=>({operations,apex:{authorize}})});
const mesh=createEnterpriseActorMesh({config,binding,provider:()=>local.provider,inbox:()=>local.inbox});
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
  else if(request.kind==='bulk-process')value=await processArrivalLogPath(operations,arrivalLogPathForDate(config.metroplatDataRoot,binding.now().slice(0,10)),{...binding,at:binding.now(),authorize,bindPrincipal:claim=>({kind:'metroplat.arrival.local-principal-binding',state:'bound',subject:claim.source,evidence:['fixture:signed-actor'],reasons:[]})});
  else if(request.kind==='read')value=await mesh.read(request.account);
  else if(request.kind==='face')value={bearers:providersOfAccount(binding,request.subject),standing:readStanding(binding,request.subject)};
  else if(request.kind==='withdraw-office'){rmSync(join(config.agencyRoot,'engineering/lib/agency/incumbencies/worker-seat.json'));agencyMoved(config.agencyRoot);value=true;}
  else if(request.kind==='withdraw-character'){rmSync(join(config.agencyRoot,'engineering/lib/agency/characters/worker.json'));agencyMoved(config.agencyRoot);value=true;}
  else if(request.kind==='withdraw-enterprise'){rmSync(join(config.agencyRoot,'engineering/lib/agency/enterprises/foundry.json'));agencyMoved(config.agencyRoot);value=true;}
  else throw Error('unknown fixture control');
  process.send({id:request.id,value});
 }catch(error){process.send({id:request.id,error:error.message});}
});
let stopping=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(stopping)return;stopping=true;await new Promise(resolve=>server.close(resolve));abort.abort();await queue;await local.close();releaseAgency(config.agencyRoot);process.exit(0);});
