import {agencyAt,officeServiceSession,publicVerbs} from '@red-cup-engineering/metroplat/offices';
import {resolve} from '@red-cup-engineering/organizing/agency';
import {readAgentWorkDispatchReadout} from '@red-cup-engineering/feltos/work/dispatch-readout';
import {DUTY_LOCUS} from '@red-cup-engineering/feltos/work/provider-delegation-authority';

/** The isolated worker inhabits the host's city; it does not own another world
 * snapshot or acquire a network principal from a claimed account. */
export function hostedWorkerWorldExecution({binding,config,realmOf,operations,authorize,worker}) {
 return async({enterprise,input,arguments:arguments_={},invocation,evidence=[]})=>{
  if(!worker||invocation?.subject!==worker.character
      ||invocation?.caller?.transport!=='agent-worker'
      ||invocation.caller.enterprise!==enterprise
      ||invocation.caller.hand!=='session:'+worker.session
      ||!['metroplex-connect','metroplex-command','metroplex-atlas','metroplex-pulse','metroplex-tellings','metroplex-journal'].includes(invocation.verb)
      ||JSON.stringify(input)!==JSON.stringify(invocation.input))
   throw new TypeError('world move is not from this hosted enterprise worker');
  const realm=realmOf(enterprise);
  const current=()=>{
   const own=realmOf(enterprise),agency=agencyAt(config.agencyRoot);
   if(own.binding.dataRoot!==realm.binding.dataRoot)throw new TypeError('world worker enterprise root changed');
   const installed=operations().filter(operation=>operation.ref===invocation.operation&&operation.verb===invocation.verb);
   if(installed.length!==1)throw new TypeError('world method changed before the move');
   const queue=readAgentWorkDispatchReadout(own.binding,own.binding.now().slice(0,10))?.queue??[];
   const matches=queue.filter(entry=>entry.scope===invocation.caller.cell
    &&entry.delegation?.provider===worker.character&&entry.state==='in-flight'
    &&entry.execution?.state==='started'&&entry.execution.session===worker.session
    &&typeof entry.execution.receipt==='string'&&entry.execution.receipt.length>0
    &&(entry.assignment===undefined||entry.assignment.state==='started'&&entry.assignment.workerThread===worker.session)
    &&(publicVerbs().includes(installed[0].verb)||entry.delegation.operations?.includes(installed[0].ref))
    &&own.officeKeys.has(resolve(agency,'offices',entry.office)?.key));
   if(matches.length!==1)throw new TypeError('world move has no unique current in-flight enterprise allocation');
   const entry=matches[0],carrier=officeServiceSession({...binding,agencyRoot:config.agencyRoot},worker.character,entry.office,worker.session);
   if(carrier.model!==worker.model||carrier.model!==entry.allocatedModel
      ||!publicVerbs().includes(invocation.verb)&&!carrier.verbs.includes(invocation.verb)||!Array.isArray(entry.requiresCapabilities)
      ||!entry.requiresCapabilities.every(verb=>carrier.capabilities?.includes(verb)))
    throw new TypeError('world worker no longer qualifies for its allocated office');
   return {entry,operation:installed[0]};
  };
  const {entry,operation}=current();
  const decision=await authorize(invocation,operation,binding.now());
  if(decision?.ok!==true||decision.invocation!==invocation.id||decision.operation!==operation.ref||decision.subject!==worker.character)
   throw new TypeError('world worker no longer has current host authority');
  operation.domain?.assert(input,'world move input');
  const admitPower=(power,powerInput)=>{
   const now=current();
   if(now.entry.allocation!==entry.allocation
      ||!now.entry.delegation.operations.includes(power.ref)
      ||!now.entry.delegation.effects.includes(power.effects.class)
      ||power.locus===DUTY_LOCUS&&powerInput?.[power.locus]!==now.entry.scope)
    throw new TypeError('world power request is outside this current allocated method');
   if(['agent-turn','agent-actuation','aoe-develop-software'].includes(power.verb)){
    const requirement=resolve(agencyAt(config.agencyRoot),'requirements',powerInput?.work);
    const contract=requirement?.authored.asks?.development;
    if(!contract||contract.scope!==now.entry.scope
        ||resolve(agencyAt(config.agencyRoot),'offices',contract.office)?.key!==resolve(agencyAt(config.agencyRoot),'offices',now.entry.office)?.key)
     throw new TypeError('world development request is outside its exact allocated requirement');
   }
  };
  return operation.execute(input,arguments_,{
   kind:'metroplat.rpc.execution-context',invocation,decision,operation,evidence,
   startedAt:binding.now(),admitWorldPower:admitPower,
  });
 };
}
