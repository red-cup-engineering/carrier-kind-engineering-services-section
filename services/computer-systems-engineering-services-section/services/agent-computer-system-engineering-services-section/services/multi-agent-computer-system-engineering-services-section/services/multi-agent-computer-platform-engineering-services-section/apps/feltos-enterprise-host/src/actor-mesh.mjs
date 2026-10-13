import {setTimeout as pause} from 'node:timers/promises';
import {semanticId} from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import {authorizationFromStanding} from '@red-cup-engineering/computer-system-engine/rpc/dispatch';
import {enterpriseOf,enterpriseRootOf,enterpriseStore,enterpriseWorkSettingsOf,settingValues} from '@red-cup-engineering/organizing/enterprise';
import {createActorClient} from '@red-cup-engineering/computer-system-engine/rpc/actor-client';
import {agencyAt,providersOfAccount,officesOfAccount,publicVerbs} from '@red-cup-engineering/metroplat/offices';
import {activityPubActorsAtHost,enterpriseActorIdentifier,characterActorIdentifier} from './activitypub-node.mjs';
import {enterpriseOfficeKeys,seatedEnterprises} from '@red-cup-engineering/feltos/work/enterprise-loop';
import {officeReading,resolve} from '@red-cup-engineering/organizing/agency';

import {schemaFrom} from '@red-cup-engineering/json-schema-services-section/contracts';
import serviceSchema from '../specifications/enterprise-actor-service.schema.json' with {type:'json'};
const serviceContract=schemaFrom(serviceSchema);

/** A network face is the current published face of this host's authored character.
 * Foreign URLs, removed/reseated characters and claimed payload principals do not bind. */
export function actorSubjectAtHost(config,subject){
 if(!config.activityPub?.nodeHost||typeof subject!=='string')return undefined;
 let url;try{url=new URL(subject);}catch{return undefined;}
 if(url.origin!==new URL(config.activityPub.origin).origin||url.search||url.hash)return undefined;
 const match=/^\/actors\/([a-z0-9][a-z0-9._-]*)$/u.exec(url.pathname);
 if(!match)return undefined;
 const found=[...agencyAt(config.agencyRoot).characters.values()].filter(record=>characterActorIdentifier(record,config.activityPub.nodeHost)===match[1]);
 if(found.length>1)throw new TypeError('a network face names competing characters');
 return found[0]?.id;
}
export function operationsOfEnterprise(agency,enterprise,operations,options={}){
 const offered=new Set(servicesOfEnterprise(agency,enterprise,operations,options).map(service=>service.operation));
 const liberties=new Set(publicVerbs());
 return operations.filter(operation=>offered.has(operation)||liberties.has(operation.verb));
}

/** An office's skill is its competence. A callable service is an explicit
 * offering: receiver, request admission and input boundary, over that skill. */
export function servicesOfEnterprise(agency,enterprise,operations,options={}){
 const services=[];
 for(const key of enterpriseOfficeKeys(agency,enterprise)){
  const office=officeReading(agency,key);
  for(const offering of office.serviceOfferings??[]){
   const policy=offering.invocation;
   if(policy===undefined)continue;
   serviceContract.assert(offering,'callable office service');
   const selected=operations.filter(operation=>operation.verb===policy.verb
     &&(policy.operation===undefined||operation.ref===policy.operation));
   if(selected.length!==1||!office.verbs.includes(policy.verb))
    throw new TypeError('a callable office service must resolve one installed method of its office');
   services.push(Object.freeze({id:offering.id,office,policy,operation:selected[0]}));
  }
 }
 // The enterprise's declared turns and measurements are its own control,
 // not an office appointment or an externally callable service grant.
 const own=enterpriseOf(enterprise);
 const declarations=[...own.turns.map(verb=>({verb,kind:'turn'})),...own.derives.filter(source=>source.operation).map(source=>({verb:source.operation,kind:'measurement'}))];
 if(declarations.length){
  const {config,binding,settlementsRoot}=options;
  if(!config?.activityPub?.origin||!binding)throw new TypeError('enterprise-owned services need their current host binding');
  const root=enterpriseRootOf(enterprise,{settlementsRoot,repositoryRoot:config.repositoryRoot});
  const records=enterpriseStore(binding,{roots:{ids:()=>[enterprise.id],rootOf:()=>root}});
  const calibrated=enterpriseWorkSettingsOf(own,settingValues(own,records.read('setting',{enterprise:enterprise.id})));
  const recipient=new URL('/actors/'+enterpriseActorIdentifier(enterprise),config.activityPub.origin).href;
  for(const declaration of declarations){
   const selected=operations.filter(operation=>operation.verb===declaration.verb);
   if(selected.length!==1)throw new TypeError('an enterprise-owned service must resolve one installed method');
   const input=declaration.kind==='turn'?{...calibrated}:{poster:enterprise.id};
   if(selected[0].domain) schemaFrom(selected[0].domain.schema).assert(input,'enterprise-owned service input');
   const policy={verb:declaration.verb,executor:enterprise.id,requesters:[recipient],input:{const:input}};
   const id=semanticId({kind:'enterprise-owned-service',enterprise:own,root,host:config.activityPub.nodeHost,operation:selected[0].ref,input});
   services.push(Object.freeze({id,kind:'enterprise-owned',policy,operation:selected[0]}));
  }
 }
 return Object.freeze(services);
}

/** The installed receiver chooses its executor. Request contents never select
 * a principal or convey the office's execution authority to the requester. */
export function enterpriseServiceExecution({config,binding,enterprise,operations,authorize,settlementsRoot}){
 return async({claim,requester,recipient})=>{
  const agency=agencyAt(config.agencyRoot);
  const matches=servicesOfEnterprise(agency,enterprise,operations,{config,binding,settlementsRoot}).filter(service=>
   service.operation.verb===claim.argv[0]
   &&(claim.operation===undefined||service.operation.ref===claim.operation));
  if(matches.length===0){
   if(publicVerbs().includes(claim.argv[0]))return {subject:requester,authorize};
   return {subject:recipient,authorize:()=>{throw new TypeError('the receiving enterprise offers no callable service for this method');}};
  }
  if(matches.length!==1)return {subject:recipient,authorize:()=>{throw new TypeError('the receiving enterprise has competing service contracts for this method');}};
  const selected=matches[0],executor=selected.policy.executor;
  if(selected.kind==='enterprise-owned'){
   const admitted=authorizationFromStanding(new Map([[selected.operation.ref,'held']]),selected.id);
   return Object.freeze({subject:executor,service:Object.freeze({id:selected.id,kind:selected.kind,recipient}),
    authorize:(invocation,operation,at)=>{
     const now=agencyAt(config.agencyRoot);
     const owners=seatedEnterprises(now,config.activityPub.nodeHost).filter(record=>record.id===enterprise.id);
     if(owners.length!==1)throw new TypeError('the enterprise-owned service is no longer uniquely seated here');
     const current=servicesOfEnterprise(now,owners[0],operations,{config,binding,settlementsRoot}).find(service=>service.id===selected.id);
     if(!current||current.operation.ref!==operation.ref)throw new TypeError('the enterprise-owned service changed before its effect');
     if(requester!==current.policy.requesters[0]||recipient!==requester||invocation.subject!==executor)
      throw new TypeError('an enterprise-owned service admits only its current signed actor');
     schemaFrom(current.policy.input).assert(invocation.input,'enterprise-owned service input');
     return admitted(invocation,operation,at);
    }});
  }

  const current=(invocation,operation,at)=>{
   const now=agencyAt(config.agencyRoot);
   const service=servicesOfEnterprise(now,enterprise,operations,{config,binding,settlementsRoot}).find(candidate=>
    candidate.id===selected.id&&candidate.office.office===selected.office.office
    &&candidate.office.revision===selected.office.revision);
   if(service===undefined||service.policy.executor!==executor||service.operation.ref!==operation.ref)
    throw new TypeError('the receiving service changed before its effect');
   if(!service.policy.requesters.includes('*')&&!service.policy.requesters.includes(requester))
    throw new TypeError('the receiving service does not admit this requester');
   const character=resolve(now,'characters',executor);
   if(character?.host!==config.activityPub.nodeHost
       ||!officesOfAccount(binding,executor,now).some(held=>held.office===service.office.office))
    throw new TypeError('the receiving service has no current local executor holding its office');
   schemaFrom(service.policy.input).assert(invocation.input,'service request input');
   return authorize(invocation,operation,at);
  };
  return Object.freeze({subject:executor,authorize:current,
   service:Object.freeze({id:selected.id,office:selected.office.office,revision:selected.office.revision,
    recipient:new URL('/actors/'+enterpriseActorIdentifier(enterprise),config.activityPub.origin).href})});
 };
}

/** Instance offers the installed transformations without a seated enterprise offering. */
export function operationsOfInstance(agency,host,operations,options={}){
 const owned=new Set(seatedEnterprises(agency,host).flatMap(enterprise=>operationsOfEnterprise(agency,enterprise,operations,options).map(operation=>operation.ref)));
 return operations.filter(operation=>!owned.has(operation.ref));
}
export function createEnterpriseActorMesh({config,binding,provider,inbox}){
 const currentActors=()=>activityPubActorsAtHost({agencyRoot:config.agencyRoot,host:config.activityPub.nodeHost,keysDirectory:config.activityPub.keysDirectory,instanceActor:config.activityPub.instanceActor,allowEmpty:true});
 async function sender(account,enterprise=false){
  const actors=await currentActors();
  const held=new Set(providersOfAccount({...binding,agencyRoot:config.agencyRoot},account));
  const own=enterprise?actors.filter(actor=>actor.enterprise!==undefined&&actor.enterprise.id===account):actors.filter(actor=>actor.character!==undefined&&held.has(actor.character.id)||account===config.instance.name&&actor.identifier===config.activityPub.instanceActor?.identifier);
  if(own.length!==1)throw new TypeError('this account has no unique current actor on this host');
  return own[0].identifier;
 }
 async function client(account,enterprise=false){
  const identifier=await sender(account,enterprise),installed=provider();
  if(!installed)throw new TypeError('the native actor provider is not running');
  return {identifier,port:createActorClient({provider:installed,inbox:inbox(),origin:config.activityPub.origin,
   admitSender:async candidate=>{if(candidate!==await sender(account,enterprise))throw new TypeError('the account actor was withdrawn before the effect');}})};
 }
 return Object.freeze({
  async send(account,address,text,{admit}={}){const {identifier,port}=await client(account);return port.send({identifier,address,text,admit});},
  async read(account,cursor){const {identifier,port}=await client(account);return port.read({identifier,cursor});},
  async request(account,request,{requestKey,timeoutMs=30000}={}){
   if(request.enterprise!==account)throw new TypeError('enterprise control must address its own actor');
   const owned=await client(account,true);
   const address=new URL('/actors/'+owned.identifier,config.activityPub.origin).href;
   const submission=await owned.port.send({identifier:owned.identifier,address,requestKey,reuse:true,
    text:JSON.stringify({verb:request.verb,operation:request.operation,input:request.input})});
   const deadline=Date.now()+timeoutMs;
   for(;;){
    const {identifier,port}=await client(account,true);
    const result=submission.result??(await port.result({identifier,submission}))?.result;
    if(result){
     if(result.code!==0)throw new Error(`Actor request ${submission.request} refused: ${result.stderr}`);
     return JSON.parse(result.stdout);
    }
    if(Date.now()>=deadline)throw new Error(`Actor request ${submission.request} remains pending at ${submission.recipient}`);
    await pause(50);
   }
  },
  async submit(account,request,{admit,requestKey,taskId,paymentPayload,reuse=false}={}){
   const {identifier,port}=await client(account);
   const recipient=()=>{
    if(request.enterprise===undefined){
     const agency=agencyAt(config.agencyRoot);
     const offers=seatedEnterprises(agency,config.activityPub.nodeHost).filter(enterprise=>
      [...enterpriseOfficeKeys(agency,enterprise)].some(key=>(officeReading(agency,key).verbs??[]).includes(request.verb)));
     if(offers.length>1)throw new TypeError('several enterprises offer this operation; choose its providing enterprise');
     if(offers.length===1)return enterpriseActorIdentifier(offers[0]);
     return config.activityPub.instanceActor?.identifier??config.activityPub.identifier;
    }
    const found=seatedEnterprises(agencyAt(config.agencyRoot),config.activityPub.nodeHost).filter(record=>record.id===request.enterprise);
    if(found.length!==1)throw new TypeError('the requested enterprise is not uniquely seated here');
    return enterpriseActorIdentifier(found[0]);
   };
   const target=recipient();if(!target)throw new TypeError('this host has no offering instance actor');
   const address=/@/u.test(target)||/^https?:\/\//u.test(target)?target:new URL('/actors/'+encodeURIComponent(target),config.activityPub.origin).href;
   return port.send({identifier,address,reuse,requestKey,taskId,paymentPayload,
    text:JSON.stringify({verb:request.verb,operation:request.operation,input:request.input}),
    admit:async()=>{await admit?.();if(recipient()!==target)throw new TypeError('the offering enterprise was withdrawn');}});
  },
 });
}
