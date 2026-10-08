import {createActorClient} from '@red-cup-engineering/computer-system-engine/rpc/actor-client';
import {agencyAt,providersOfAccount} from '@red-cup-engineering/metroplat/offices';
import {activityPubActorsAtHost,enterpriseActorIdentifier,characterActorIdentifier} from './activitypub-node.mjs';
import {enterpriseOfficeKeys,seatedEnterprises} from '@red-cup-engineering/feltos/work/enterprise-loop';
import {officeReading} from '@red-cup-engineering/organizing/agency';

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
export function operationsOfEnterprise(agency,enterprise,operations){
 const verbs=new Set([...enterpriseOfficeKeys(agency,enterprise)].flatMap(key=>officeReading(agency,key).verbs??[]));
 return operations.filter(operation=>verbs.has(operation.verb));
}
/** The node offers only operations not already offered by a seated enterprise. */
export function operationsOfInstance(agency,host,operations){
 const owned=new Set(seatedEnterprises(agency,host).flatMap(enterprise=>operationsOfEnterprise(agency,enterprise,operations).map(operation=>operation.ref)));
 return operations.filter(operation=>!owned.has(operation.ref));
}
export function createEnterpriseActorMesh({config,binding,provider,inbox}){
 const currentActors=()=>activityPubActorsAtHost({agencyRoot:config.agencyRoot,host:config.activityPub.nodeHost,keysDirectory:config.activityPub.keysDirectory,instanceActor:config.activityPub.instanceActor,allowEmpty:true});
 async function sender(account){
  const actors=await currentActors();
  const bearer=providersOfAccount(binding,account)[1]??account;
  const own=actors.filter(actor=>actor.character?.id===bearer||account===config.instance.name&&actor.identifier===config.activityPub.instanceActor?.identifier);
  if(own.length!==1)throw new TypeError('this account has no unique current actor on this host');
  return own[0].identifier;
 }
 async function client(account){
  const identifier=await sender(account),installed=provider();
  if(!installed)throw new TypeError('the native actor provider is not running');
  return {identifier,port:createActorClient({provider:installed,inbox:inbox(),origin:config.activityPub.origin,
   admitSender:async candidate=>{if(candidate!==await sender(account))throw new TypeError('the account actor was withdrawn before the effect');}})};
 }
 return Object.freeze({
  async send(account,address,text){const {identifier,port}=await client(account);return port.send({identifier,address,text});},
  async read(account,cursor){const {identifier,port}=await client(account);return port.read({identifier,cursor});},
  async submit(account,request,{admit,taskId,paymentPayload}={}){
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
   return port.send({identifier,address:new URL('/actors/'+encodeURIComponent(target),config.activityPub.origin).href,
    text:JSON.stringify({verb:request.verb,operation:request.operation,input:request.input}),taskId,paymentPayload,
    admit:async()=>{await admit?.();if(recipient()!==target)throw new TypeError('the offering enterprise was withdrawn');}});
  },
 });
}
