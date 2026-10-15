import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {activityPubRequestIdentity} from '@red-cup-engineering/activitypub-services-section/journal-custody';
import {operation} from '../src/rpc/operation.mjs';
import {defaultFilesystemBinding} from '../src/rpc/binding.mjs';
import {authorizationFromStanding} from '../src/rpc/dispatch.mjs';
import {processAdmittedActorRequest,createActorResultProjection} from '../src/rpc/actor-processing.mjs';
import {readActorMessage} from '../src/rpc/actor-client.mjs';
import {createActorOutcomeCustody} from '../src/rpc/actor-outcomes.mjs';
import {appendArrivalAtRoot} from '../src/rpc/arrival-store.mjs';
import {projectSenActivity,senActivityObjectBytes} from '@red-cup-engineering/activitypub-services-section/sen-activity';
import {userSenMessage,agentSenMessage} from '@red-cup-engineering/a2a-services-section/sen-part';
import {semanticId} from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import {sha256Hex} from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';

export const issuer='https://entrance.example/actors/world',sender='https://worker.example/actors/group';
export const at='2026-10-15T03:00:00Z';
export const output=(state,sequence,text='')=>state==='executing'?{state,sequence}:({state,...(sequence===undefined?{}:{sequence}),code:state==='processed'?0:state==='obstructed'?1:75,
 stdout:state==='processed'?text:'',stderr:state==='processed'?'':text,stdoutBytes:state==='processed'?Buffer.byteLength(text):0,stderrBytes:state==='processed'?0:Buffer.byteLength(text),
 stdoutSha256:sha256Hex(state==='processed'?text:''),stderrSha256:sha256Hex(state==='processed'?'':text)});

export async function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'received-outcomes-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 let effects=0;
 const op=operation({verb:'fixture-outcome',run:(_input,_args,context)=>{const value=context.projectResult({ok:true});effects++;return value;}});
 const call={verb:op.verb,operation:op.ref,input:{}};
 const said={kind:'feltos.world.gateway-admission',binding:semanticId('binding'),world:'group-world',state:semanticId('state'),issuer,recipient:sender,catalogue:semanticId('catalogue'),subject:'account:alice',session:'harness:alice',call:semanticId(call),nonce:'fixture',at,until:'2026-10-15T03:01:00Z'};
 const statement={...said,id:semanticId(said)},service={kind:'world-gateway',binding:said.binding,world:said.world,state:said.state,session:said.session,bearer:'alice'};
 const bytes=senActivityObjectBytes({objectKind:'metroplat.dispatch.arrival-material',value:{kind:'metroplat.dispatch.arrival-material',argv:[op.verb],operation:op.ref,stdin:'{}'}});
 const original=projectSenActivity({type:'Create',origin:'https://entrance.example',identifier:'world',recipient:sender,objectBytes:bytes,
  a2aMessage:{...userSenMessage(bytes),metadata:{'metroplat.subject-binding':statement}},a2aRole:'ROLE_USER',agentCard:issuer+'/card',eventTime:at});
 const admitted=readActorMessage(original,issuer,sender),event=admitted.projection.cloudEvent,request=admitted.id;
 const authorize=authorizationFromStanding(new Map([[op.ref,'held']]));
 const result=await processAdmittedActorRequest({event,admission:appendArrivalAtRoot(root+'/executor',event),authenticatedActor:issuer,recipient:sender,
  operations:[op],binding:defaultFilesystemBinding(root+'/executor',{now:()=>at}),authorize,
  execution:()=>({subject:statement.subject,hand:'session:alice',subjectBinding:statement.id,once:true,service,authorize}),projectReply:value=>value});
 const requestNi=activityPubRequestIdentity(original),coordinates={request,sender,recipient:issuer},outcomes=createActorOutcomeCustody(root);
 const wire=(value,time=at)=>{const projection=createActorResultProjection({origin:'https://worker.example',identifier:'group',recipient:issuer,request,requestNi,agentCard:sender+'/card',eventTime:time});return projection.activity(projection.project(value));};
 const bodyWire=value=>{const bytes=senActivityObjectBytes({objectKind:'metroplat.dispatch.result',value});return projectSenActivity({type:'Accept',origin:'https://worker.example',identifier:'group',recipient:issuer,objectBytes:bytes,a2aMessage:agentSenMessage(bytes),agentCard:sender+'/card',eventTime:at});};
 const admission=activity=>appendArrivalAtRoot(root,readActorMessage(activity,sender,issuer).projection.cloudEvent);
 const retain=activity=>{const held=admission(activity);outcomes.retain({admission:held,authenticatedActor:sender,recipient:issuer,request,original});return held;};
 const read=()=>outcomes.read({...coordinates,original});
 return {root,coordinates,original,requestNi,result,statement,outcomes,wire,bodyWire,admission,retain,read,effects:()=>effects};
}
