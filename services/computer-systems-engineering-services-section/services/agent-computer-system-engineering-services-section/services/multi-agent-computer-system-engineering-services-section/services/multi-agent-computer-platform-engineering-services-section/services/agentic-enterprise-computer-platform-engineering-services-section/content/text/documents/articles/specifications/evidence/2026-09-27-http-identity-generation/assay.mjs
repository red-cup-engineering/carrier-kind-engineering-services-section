import fs from 'node:fs';
import vm from 'node:vm';
import { EventEmitter, once } from 'node:events';
import { timingSafeEqual } from 'node:crypto';
const files=JSON.parse(fs.readFileSync('/input/source-map.json','utf8'));
const checks=[];
const check=async(name,f)=>{try {await f();checks.push({name,ok:true});} catch(e){checks.push({name,ok:false,error:String(e.message)});}};
const assert=(v,m='observation differed')=>{if(!v)throw Error(m)};
const eq=(a,b)=>assert(JSON.stringify(a)===JSON.stringify(b));
let calls=[], currentServer, journalCalls=[];
const hit=(name,value)=>{calls.push({name,value});return value};
const response=()=>({status:200,type:'application/json',body:'{}'});
const env=vm.createContext({Buffer,URL,Response,AbortController,console,process:{},setTimeout,clearTimeout});
const stubs={
 createHttpServer:({handle})=>{const server=new EventEmitter();server.handle=handle;currentServer=server;return server},
 once, projectSurface:()=>hit('projection',{}),
 routeRequest:async(i,r,o)=>{hit('route',o);return response()},
 routeSchemaNamespace:async(m,r,o)=>{hit('route',o);return response()},
 bindHttpServerLifecycle:()=>{},
 httpResources:o=>o.resources??[],
 routeHttpResource:async(resources,req,res,o)=>{hit('resource',o);return req.url==='/private-artifact'?response():undefined},
 servedRequest:async req=>{hit('body',req.url);return {path:req.url,method:req.method,body:req.body}},
 routeOpenAIChatGuest:async(req,o,g)=>{hit('inference',{options:o,guest:g});return response()},
 isJsonRecord:v=>v!==null&&typeof v==='object'&&!Array.isArray(v),
 timingSafeStringEqual:(x,y)=>typeof x==='string'&&typeof y==='string'&&Buffer.byteLength(x)===Buffer.byteLength(y)&&timingSafeEqual(Buffer.from(x),Buffer.from(y)),
 processEnvValue:(k,e)=>e?.[k],processIsoNow:()=> '2026-09-27T19:00:00.000Z',
 processRandomUuid:()=>hit('session-id','session-fixture'),
 acceptKey:()=>hit('accept-key','accepted'),
 FrameDecoder:class{push(chunk){return [{opcode:1,payload:chunk}]}},
 CLAIM_SESSION_FAMILY:'claim-fixture',claim:(s,c,r)=>({c,r}),
 claimSessionFeed:{name:'fixture-feed'}, claimSessionStatementRows:x=>[x],
 openSession:()=>hit('session-open',{}),judgementFrame:x=>Buffer.from(JSON.stringify(x)),
 judgementReply:()=>({ok:true}),parseClaimMessage:JSON.parse,
 websocketClaimSessionObservation:x=>x,
 openJournal:()=>({appendRows:(...args)=>{journalCalls.push(args);return {ok:true}}}),
 serviceLifecycleEvent:x=>x,
};
const imports=new Map(), modules=new Map();
for(const [id,path]of Object.entries(files)){
 const text=fs.readFileSync(path,'utf8');modules.set(id,new vm.SourceTextModule(text,{context:env,identifier:id}));
 for(const m of text.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["']/g)){
  const names=imports.get(m[2])??new Set();
  for(const n of m[1].split(',').map(s=>s.trim()).filter(Boolean))names.add(n.split(/\s+as\s+/)[0]);imports.set(m[2],names);
 }
}
const actual={'@red-cup-engineering/metroplat/http-options':'src/http-options.mjs','@red-cup-engineering/metroplat/http/ws-session':'src/http/ws-session.mjs'};
const ext=new Map();
const linker=async(spec,ref)=>{
 const id=actual[spec]??(spec.startsWith('.')?new URL(spec,'file:///'+ref.identifier).pathname.slice(1):undefined);
 if(id&&modules.has(id))return modules.get(id);
 if(!ext.has(spec)){
  const names=[...(imports.get(spec)??[])];
  ext.set(spec,new vm.SyntheticModule(names,function(){for(const n of names)this.setExport(n,stubs[n]??(()=>{throw Error('undeclared port '+n)}))},{context:env,identifier:spec}));
 }
 return ext.get(spec);
};
const serverModule=modules.get('src/http/server.mjs');await serverModule.link(linker);await serverModule.evaluate();
const h=modules.get('src/http-options.mjs').namespace,w=modules.get('src/http/ws-session.mjs').namespace;
const resolve=h.resolveHttpRequestIdentity;
const token='fixture-private-gateway-token';
const hdr={ 'x-metroplat-gateway-token':token,'x-metroplat-subject':'person:river'};
await check('closed identity states and frozen outputs',()=>{
 for(const [headers,config,expected]of [[{},undefined,{kind:'process'}],[hdr,{gatewayToken:token},{kind:'gateway',subject:'person:river'}],[{},{gatewayToken:token},{kind:'refused'}],[hdr,{}, {kind:'refused'}]]){
  const result=resolve(headers,config);eq(result,expected);assert(Object.isFrozen(result));
 }
});
for(const [name,headers,config]of [
 ['wrong token',{...hdr,'x-metroplat-gateway-token':'wrong'},{gatewayToken:token}],
 ['missing token',{'x-metroplat-subject':'person:river'},{gatewayToken:token}],
 ['array token',{...hdr,'x-metroplat-gateway-token':[token]},{gatewayToken:token}],
 ['array subject',{...hdr,'x-metroplat-subject':['person:river']},{gatewayToken:token}],
 ['normalized subject',{...hdr,'x-metroplat-subject':' person:river'},{gatewayToken:token}],
 ['oversized subject',{...hdr,'x-metroplat-subject':'a'.repeat(513)},{gatewayToken:token}],
 ['empty configured token',{}, {gatewayToken:''}],['nonstring configured token',{}, {gatewayToken:9}],
 ['malformed headers',null,{gatewayToken:token}],['unconfigured assertion',{'x-metroplat-subject':'person:river'},{}]
])await check('identity refuses '+name,()=>eq(resolve(headers,config),{kind:'refused'}));
function options(gateway=true){return {subject:'service:host',caller:{transport:'old',retained:'caller'},gatewaySubjects:true,httpConfig:gateway?{gatewayToken:token,subject:'service:host'}:{subject:'service:host'},now:stubs.processIsoNow,resources:[{}],openAIChat:{},claimSession:{dataRoot:'/fixture',rootName:'fixture'},lifecycle:e=>hit('lifecycle',e)}};
async function request(server,path,headers={}){
 const req=new EventEmitter();Object.assign(req,{url:path,method:'POST',headers,body:JSON.stringify({params:{_meta:{'metroplat/subject':'person:intruder'}}})});
 req[Symbol.asyncIterator]=async function*(){hit('raw-body',path);yield Buffer.from('{}')};
 const res=new EventEmitter();let finish;const done=new Promise(r=>finish=r);let timer;
 res.writeHead=(status,headers)=>{res.status=status;res.headers=headers};res.end=body=>{res.body=body;clearTimeout(timer);finish(res)};res.write=()=>true;
 timer=setTimeout(()=>finish({status:-1}),500);server.handle(req,res);return done;
}
for(const constructor of ['serve','serveSchemaNamespace']){
 for(const path of ['/private-artifact','/v1/chat/completions','/mcp','/feed']){
  await check(constructor+' refuses before application ports '+path,async()=>{
   const o=options();const srv=serverModule.namespace[constructor]([],o);calls=[];const res=await request(srv,path);
   eq(res.status,401);eq(res.body,'{"error":"authentication-required"}');eq(res.headers['cache-control'],'no-store');eq(calls,[]);
  });
  await check(constructor+' carries one authenticated principal '+path,async()=>{
   const o=options();const srv=serverModule.namespace[constructor]([],o);calls=[];const res=await request(srv,path,hdr);eq(res.status,200);
   const dispatched=calls.filter(x=>['resource','route','inference'].includes(x.name));assert(dispatched.length>0);
   for(const d of dispatched){const value=d.name==='inference'?d.value.options:d.value;eq(value.subject,'person:river');eq(value.gatewaySubjects,false);assert(value.caller.asserted===true);eq(value.caller.transport,'http');}
   eq(o.subject,'service:host');eq(o.caller,{transport:'old',retained:'caller'});
  });
 }
 await check(constructor+' preserves process mode without payload elevation',async()=>{
  const srv=serverModule.namespace[constructor]([],options(false));calls=[];eq((await request(srv,'/mcp')).status,200);
  const route=calls.find(x=>x.name==='route').value;eq(route.subject,'service:host');eq(route.gatewaySubjects,false);
 });
 await check(constructor+' equal principal is still gateway-authenticated',async()=>{
  const o=options();o.subject='person:river';const srv=serverModule.namespace[constructor]([],o);calls=[];await request(srv,'/mcp',hdr);
  assert(calls.find(x=>x.name==='route').value.caller.asserted===true);
 });
 await check(constructor+' refuses unconfigured assertion',async()=>{
  const srv=serverModule.namespace[constructor]([],options(false));calls=[];eq((await request(srv,'/mcp',hdr)).status,401);eq(calls,[]);
 });
 await check(constructor+' upgrade refuses before session or persistence',()=>{
  const srv=serverModule.namespace[constructor]([],options());calls=[];journalCalls=[];const socket=new EventEmitter();let end='';socket.end=x=>end=x;socket.write=x=>{hit('socket-write',x);return true};socket.destroy=()=>hit('destroy');
  srv.emit('upgrade',{headers:{'sec-websocket-key':'valid'}},socket);assert(end.startsWith('HTTP/1.1 401'));eq(calls,[]);eq(journalCalls,[]);
 });
 await check(constructor+' admitted upgrade retains authenticated attribution',()=>{
  const srv=serverModule.namespace[constructor]([],options());calls=[];journalCalls=[];const socket=new EventEmitter();socket.end=()=>{};socket.write=()=>true;socket.destroy=()=>{};
  srv.emit('upgrade',{headers:{...hdr,'sec-websocket-key':'valid'}},socket);socket.emit('data',Buffer.from('{"cell":"example","reading":"yes","authenticatedSubject":"person:intruder"}'));
  eq(journalCalls.length,1);eq(journalCalls[0][2].subject,'session-fixture');eq(journalCalls[0][2].caller.authenticatedSubject,'person:river');assert(!JSON.stringify(journalCalls).includes(token));
 });
}
await check('configured peer exchange retains separate verifier before read',async()=>{
 const o=options();o.settlementExchange={verify:async()=>{hit('peer-verify');return {ok:true,keyId:'peer:fixture'}},holdings:()=>hit('holdings',{}),merge:()=>hit('merge',{})};
 const srv=serverModule.namespace.serveSchemaNamespace([],o);calls=[];eq((await request(srv,'/settlement/holdings')).status,200);eq(calls.map(x=>x.name),['raw-body','peer-verify','holdings']);
});
await check('invalid peer signature cannot reach holdings',async()=>{
 const o=options();o.settlementExchange={verify:async()=>({ok:false,reason:'bad'}),holdings:()=>hit('holdings',{})};
 const srv=serverModule.namespace.serveSchemaNamespace([],o);calls=[];eq((await request(srv,'/settlement/holdings')).status,401);assert(!calls.some(x=>x.name==='holdings'));
});
for(const resolver of [()=>{throw Error('secret')},()=>Promise.resolve({subject:'x'})])await check('upgrade rejects non-synchronous identity '+String(resolver),()=>{
 const srv=new EventEmitter();w.attachClaimSession(srv,{resolveRequestIdentity:resolver});calls=[];const socket=new EventEmitter();let end='';socket.end=x=>end=x;socket.write=()=>hit('write');socket.destroy=()=>{};
 srv.emit('upgrade',{headers:{'sec-websocket-key':'key'}},socket);assert(end.startsWith('HTTP/1.1 401'));eq(calls,[]);
});
await check('legacy direct frame retains existing caller metadata',()=>{
 journalCalls=[];w.admitClaimSessionFrame('/fixture','fixture',{sessionId:'legacy-session',at:stubs.processIsoNow(),message:{},reply:{},session:{}});
 eq(journalCalls[0][2].caller,{transport:'websocket-session',session:'legacy-session'});
});
const result={method:'Actual source modules evaluated in VM with named controlled external ports, in a network-denied mount namespace',checks,passed:checks.filter(x=>x.ok).length,total:checks.length,limits:['Port-isolated boundary observations, not live HTTP deployment, personal context permission, real journal durability or assistant completion.','Cryptographic equality port uses Node timingSafeEqual; provider generation cannot see assessor inputs.']};
console.log(JSON.stringify(result,null,2));process.exitCode=result.passed===result.total?0:1;
