import {parentPort} from 'node:worker_threads';
import {defaultFilesystemBinding} from '@red-cup-engineering/computer-system-engine/rpc/binding';
import {metroplexOperations} from '@red-cup-engineering/metroplat/metroplex';
import {agentCoordinationOperations} from '@red-cup-engineering/computer-code-development-engine/agent/service';
import {readStanding,publicVerbs} from '@red-cup-engineering/metroplat/offices';
import {filesystemOperations,withFilesystemBinding} from '@red-cup-engineering/metroplat/resources/read-write-verbs';
import {executeAgencyWorkProvider} from '@red-cup-engineering/feltos/work/agency-work-provider';
import {inferenceMessage,inferenceResult,inferenceToolMove} from '@red-cup-engineering/computer-inference-engine/dispatch/inference-model';
import {inferenceSourceTerminal} from '@red-cup-engineering/computer-inference-engine/dispatch/inference-source-kind';
import {inferenceProviderOperation,witnessedInferenceEncounterPort} from '@red-cup-engineering/feltos/agents/inference/rpc';
import {capabilityWitnessesForOperations} from '@red-cup-engineering/feltos/agents/capability-witnesses';
import {encounterExecutionControl} from '@red-cup-engineering/feltos/encounter/control';
import {journalEncounterStore} from '@red-cup-engineering/feltos/encounter/store';
import {journalRpcWitness} from '@red-cup-engineering/computer-system-engine/rpc/journal-witness';
import {readCapabilityWitnesses} from '@red-cup-engineering/computer-system-engine/rpc/capability-claims';
import {projectSurface} from '@red-cup-engineering/metroplat/presentation/surface';
import {authorizationFromStanding} from '@red-cup-engineering/computer-system-engine/rpc/dispatch';
const pending=new Map();
parentPort.on('message',async message=>{
 if(message.kind==='execute-world-result'){
  const job=pending.get(message.id);pending.delete(message.id);
  if(message.ok)job.resolve(message.value);else job.reject(new Error(message.error.message));
  return;
 }
 if(message.kind!=='execute')return;
 try{
  const {root,hostRoot,agencyRoot,receiverRoot,item,subject,session,at,moves}=message.input;
  const own=defaultFilesystemBinding(root,{now:()=>at});
  const binding={...defaultFilesystemBinding(hostRoot,{agencyRoot,now:()=>at}),workBindings:()=>[own]};
  const namespace='infograph',calls=[];
  let operations;
  const executeWorld=move=>new Promise((resolve,reject)=>{
   const id=message.id+':'+pending.size+':'+calls.length;pending.set(id,{resolve,reject});
   parentPort.postMessage({kind:'execute-world',id,executionId:message.id,move});
  });
  operations=[...metroplexOperations(binding,()=>operations,{title:'Shared host'},undefined,{executeWorld}),...agentCoordinationOperations(binding),
   ...withFilesystemBinding(filesystemOperations,defaultFilesystemBinding(receiverRoot))];
  const surface=projectSurface(readCapabilityWitnesses(capabilityWitnessesForOperations(operations)),{
   packageName:namespace,capabilityAssertions:(subject,invocation,operation)=>readStanding(binding,subject,{operation,input:invocation?.input}),
  });
  const source=call=>({async *[Symbol.asyncIterator](){
   const step=call.messages.filter(message=>message.role==='tool').length,move=moves[step];
   calls.push({tools:call.tools.map(tool=>tool.name),messages:call.messages});
   const toolMoves=move?[inferenceToolMove({request:message.id+':move:'+step,...move})]:[];
   yield inferenceSourceTerminal(inferenceResult({call:call.id,model:call.model,stop:move?'tool-moves':'completed',
    message:inferenceMessage({role:'assistant',content:move?null:JSON.stringify(call.messages.filter(message=>message.role==='tool').map(message=>JSON.parse(message.content))),toolMoves}),
    toolMoves,observedAt:at,causes:[call.id]}));
  }});
  const encounters=journalEncounterStore(root,{namespace,pollIntervalMs:10});
  const provider=inferenceProviderOperation('controlled-world-inference',source,encounters,encounterExecutionControl());
  const inference=witnessedInferenceEncounterPort({operation:provider,encounters,witness:journalRpcWitness(root,{namespace}),
   authorize:authorizationFromStanding(new Map([[provider.ref,'held']])),now:()=>at});
  const outcome=await executeAgencyWorkProvider({...item,text:item.text+'\n'+JSON.stringify(moves)},{
   surface,dataRoot:root,rootName:namespace,workerId:subject,enterprise:message.input.enterprise,
   session,provider:'controlled-world-inference',model:'fixture-model',inference,now:()=>at,maxTurns:moves.length+1,
   standingFor:(subject,action)=>readStanding(binding,subject,action),
   worldOnly:true,worldLiberties:publicVerbs().filter(verb=>verb.startsWith('metroplex-')),
  });
  parentPort.postMessage({kind:'result',id:message.id,value:{outcome,calls}});
 }catch(error){parentPort.postMessage({kind:'error',id:message.id,error:{name:error.name,message:error.message}});}
});
parentPort.postMessage({kind:'ready'});
