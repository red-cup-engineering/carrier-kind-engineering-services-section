/** Received bound outcomes name original immutable arrivals. AP arrival order is unchanged. */
import {readHead,writeHead,threadName} from '@red-cup-engineering/semiotic-eavt-services-section/store';
import {semanticId} from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import {canonicalJson} from '@red-cup-engineering/json-services-section';
import {sha256Hex} from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';
import {makeNiUri} from '@red-cup-engineering/uri-services-section/ni-uri';
import {extractSenPart,parseA2aMessage} from '@red-cup-engineering/a2a-services-section/sen-part';
import {admitNormalizedSemanticContent} from '@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime';
import {termToJson} from '@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec';
import {ARRIVAL_FEED,admitCloudEventArrival,arrivalDispatchClaimFromCloudEvent} from './arrival.mjs';
import {readArrivalAtRoot} from './arrival-store.mjs';
import {activityPubRequestIdentity} from '@red-cup-engineering/activitypub-services-section/journal-custody';
import {readActorMessage} from './actor-client.mjs';

const NI=/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const ni=(v,name)=>{if(typeof v!=='string'||!NI.test(v))throw new TypeError(name+' must be an exact native address');return v;};
const actor=v=>{const u=new URL(v);if(u.href!==v||!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw new TypeError('outcome actor must be an exact audience');return v;};
export const actorOutcomeHead=({request,sender,recipient})=>threadName(semanticId({kind:'metroplat.received-bound-outcome',request:ni(request,'request'),sender:actor(sender),recipient:actor(recipient)}));
const payload=value=>{const {replayed:_replayed,...rest}=value;return canonicalJson(rest);};
const authority=r=>canonicalJson(Object.fromEntries(['cloudEventIdentity','packetDigest','requestMaterial','subjectBinding','requester','executor','hand','operation','verb','service'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]])));
const terminal=r=>r.state==='processed'||r.state==='obstructed';
function resultContract(r){
 if(r?.kind!=='metroplat.arrival.processing-entry'||r.payment!==undefined||!['indeterminate','executing','processed','obstructed'].includes(r.state))throw new TypeError('received bound outcome is not an unpaid processing result');
 if(!Array.isArray(r.obstructions)||r.obstructions.some(reason=>typeof reason!=='string')||r.state==='executing'&&r.obstructions.length!==0)throw new TypeError('received outcome lacks its exact obstruction state');
 for(const k of ['requestMaterial','subjectBinding'])ni(r[k],k);
 if(typeof r.cloudEventIdentity!=='string'||!r.cloudEventIdentity||Buffer.byteLength(r.cloudEventIdentity)>8192)throw new TypeError('received outcome lacks its CloudEvents source and id');
 if(!/^[a-f0-9]{64}$/u.test(r.packetDigest??'')||typeof r.requester!=='string'||typeof r.executor!=='string'||typeof r.hand!=='string'||r.service?.kind!=='world-gateway'||typeof r.service?.bearer!=='string'||!r.service.bearer)throw new TypeError('received outcome lacks its exact request authority');
 if(r.sequence===undefined){if(r.state!=='indeterminate')throw new TypeError('only uncommitted uncertainty may omit native sequence');}
 else if(r.state==='indeterminate'||![1,2].includes(r.sequence)||r.state==='processed'&&r.sequence!==2||!terminal(r)&&r.sequence!==1)throw new TypeError('received outcome has an impossible native sequence');
 if(r.state==='executing'&&['code','stdout','stderr','stdoutBytes','stderrBytes','stdoutSha256','stderrSha256'].some(key=>r[key]!==undefined))throw new TypeError('executing evidence cannot invent a result payload');
 if(terminal(r)){
  if(!Number.isSafeInteger(r.code)||r.code<0||(r.state==='processed')!==(r.code===0))throw new TypeError('received terminal status is inconsistent');
  for(const k of ['stdout','stderr'])if(typeof r[k]!=='string'||r[k+'Bytes']!==Buffer.byteLength(r[k])||r[k+'Sha256']!==sha256Hex(r[k]))throw new TypeError('received terminal output differs from its exact bytes');
 }
 return r;
}
function fromArrival(root,address,coordinates){
 const {event,receipt}=readArrivalAtRoot(root,address);
 if(event.source!==coordinates.sender||event.subject!==coordinates.recipient)throw new TypeError('outcome arrival names another actor or audience');
 const part=extractSenPart(parseA2aMessage(event.data?.message).parts),semantic=admitNormalizedSemanticContent(part.bytes,part.ni);
 if(semantic.envelope.objectKind!=='metroplat.dispatch.result')throw new TypeError('outcome arrival is not a native dispatch result');
 const value=termToJson(semantic.envelope.settledBody);
 if(Object.keys(value).sort().join(',')!=='request,requestNi,result')throw new TypeError('bound result envelope requires exactly request, requestNi and result');
 if(value.request!==coordinates.request)throw new TypeError('outcome arrival names another original request');
 const result=resultContract(value.result),requestNi=ni(value.requestNi,'bound result request identity');
 return {address,event,receipt,result,requestNi,reply:makeNiUri(Buffer.from(canonicalJson(event)))};
}
function read(root,coordinates){
 const head=readHead(root,ARRIVAL_FEED,actorOutcomeHead(coordinates));
 if(head===undefined)return {head};
 if(head.closed===true||!Array.isArray(head.frontier)||head.frontier.length<1||head.frontier.length>2)throw new TypeError('received outcome head is malformed');
 const rows=head.frontier.map(address=>fromArrival(root,address,coordinates));
 if(rows.length!==1)throw new TypeError('received outcome has conflicting immutable evidence');
 return {head,row:rows[0]};
}
function compare(prior,next){
 const a=prior.result,b=next.result;
 if(authority(a)!==authority(b))return 'conflict';
 if(a.sequence!==undefined&&a.sequence===b.sequence&&payload(a)!==payload(b))return 'conflict';
 if(terminal(a)&&terminal(b)&&payload(a)!==payload(b))return 'conflict';
 if(terminal(a))return 'keep';
 if(terminal(b))return 'next';
 return (b.sequence??0)>(a.sequence??0)?'next':'keep';
}

/** Caller supplies the actual signature-admitted native arrival, never payload authority. */
export function retainActorOutcome(root,{admission,authenticatedActor,recipient,request,original}){
 const coordinates={request,sender:authenticatedActor,recipient};
 if(admission?.admission?.type!==ARRIVAL_FEED)throw new TypeError('outcome requires its native arrival custody');
 const address=admission.admission.address,next=fromArrival(root,address,coordinates);
 const contract=originalContract(coordinates,original,next.requestNi);exactResult(next,contract);
 if(next.receipt.cloudEventIdentity!==admission.cloudEventIdentity||next.receipt.packetDigest!==admission.packetDigest)throw new TypeError('outcome differs from its exact signature-admitted arrival');
 for(let attempt=0;attempt<4;attempt++){
  const prior=read(root,coordinates);
  if(prior.row!==undefined){if(prior.row.requestNi!==next.requestNi)throw new TypeError('received outcome has inconsistent request identity');exactResult(prior.row,contract);}
  const choice=prior.row===undefined?'next':compare(prior.row,next);
  if(choice==='keep')return;
  const frontier=choice==='conflict'?[prior.row.address,next.address]:[next.address];
  try{writeHead(root,ARRIVAL_FEED,actorOutcomeHead(coordinates),{frontier},{expect:prior.head?.frontier??null});if(choice==='conflict')throw new TypeError('received outcome has conflicting immutable evidence');return;}
  catch(error){if(error.code!=='head-conflict'||attempt===3)throw error;}
 }
}

/** Exact original request contract is checked before admitting response order. */
function originalContract({request,sender,recipient},original,requestNi){
 if(original===undefined||original===null||activityPubRequestIdentity(original,{actor:recipient,recipient:sender})!==requestNi)
  throw new TypeError('received outcome differs from the held native request identity');
 const source=readActorMessage(original,recipient,sender);
 if(source.kind!=='metroplat.dispatch.arrival-material'||source.id!==request)throw new TypeError('outcome observation differs from the original retained request');
 const event=source.projection.cloudEvent,receipt=admitCloudEventArrival(event),claim=arrivalDispatchClaimFromCloudEvent(event),statement=event.data?.message?.metadata?.['metroplat.subject-binding'];
 if(receipt.ok!==true||statement?.kind!=='feltos.world.gateway-admission'||statement.issuer!==recipient||statement.recipient!==sender)throw new TypeError('outcome requires its exact original bound request');
 const {id,...said}=statement;
 if(semanticId(said)!==id||!Array.isArray(claim?.argv)||claim.argv.length!==1||typeof claim.stdin!=='string'
  ||semanticId({verb:claim.argv[0],operation:claim.operation,input:JSON.parse(claim.stdin)})!==statement.call
  ||Object.keys(event.data.message.metadata).some(key=>key.startsWith('x402.payment.')))
  throw new TypeError('outcome original request has a changed admission or call');
 const hand=statement.session?.startsWith('harness:')?'session:'+statement.session.slice(8):statement.session?.startsWith('token:')?'mcp-'+statement.session:'mcp-session:'+statement.session;
 return {receipt,claim,statement,hand,material:semanticId({claim,authenticatedActor:recipient,recipient:sender,program:'infograph'})};
}
function exactResult(row,contract){
 const r=row.result,{receipt,claim,statement,hand,material}=contract;
 if(r.cloudEventIdentity!==receipt.cloudEventIdentity||r.packetDigest!==receipt.packetDigest||r.requestMaterial!==material||r.subjectBinding!==statement.id||r.requester!==statement.issuer||r.executor!==statement.subject||r.hand!==hand||r.verb!==claim.argv[0]||(r.operation!==undefined&&r.operation!==claim.operation)
  ||r.service.binding!==statement.binding||r.service.world!==statement.world||r.service.state!==statement.state||r.service.session!==statement.session)
  throw new TypeError('received outcome differs from its original request material or principal');
 return row;
}

/** Exact original request and signed result are both revalidated on every read. */
export function readActorOutcome(root,{request,sender,recipient,original}){
 const coordinates={request,sender,recipient},requestNi=activityPubRequestIdentity(original,{actor:recipient,recipient:sender});
 const contract=originalContract(coordinates,original,requestNi),{row}=read(root,coordinates);
 if(row===undefined)return undefined;
 if(row.requestNi!==requestNi)throw new TypeError('received outcome differs from the held native request identity');
 exactResult(row,contract);
 return Object.freeze({request,recipient:sender,reply:row.reply,result:row.result});
}

export const createActorOutcomeCustody=root=>Object.freeze({retain:entry=>retainActorOutcome(root,entry),read:entry=>readActorOutcome(root,entry)});
