import { submitRmnTask, resumeRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { userRmnMessage } from "@red-cup-engineering/a2a-rmn-part-service";

/** Submit once, persist that opaque task ID through the supplied store, then
 * observe with an unexpired signal.  This module intentionally never calls
 * sendRmnTask and never chooses a timeout. */
export async function submitAndObserve({ agentUrl, message, persist, observe, requireSignature=true }) {
  const submitted = await submitRmnTask({ agentUrl, message, requireSignature, signal: new AbortController().signal });
  await persist({ state: "child-requested", taskId: submitted.taskId, inputNi: submitted.inputNi });
  try {
    const result = await resumeRmnTask({ agentUrl, taskId: submitted.taskId, inputNi: submitted.inputNi, requireSignature, signal: new AbortController().signal });
    await observe({ state: "child-observed", taskId: submitted.taskId, result });
    return result;
  } catch (error) {
    await observe({ state: "observation-interrupted", taskId: submitted.taskId });
    throw error;
  }
}

export async function invokeCarrierTask({agentUrl,bytes,metadata={},persist=async()=>{},observe=async()=>{},requireSignature=true}){
  const message=userRmnMessage(bytes);message.metadata={...message.metadata,...metadata};
  return submitAndObserve({agentUrl,message,persist,observe,requireSignature});
}

export async function resumeCarrierTask({agentUrl,taskId,inputNi,observe=async()=>{},requireSignature=true}){
  try {
    const result=await resumeRmnTask({agentUrl,taskId,inputNi,requireSignature,signal:new AbortController().signal});
    await observe({state:"child-observed",taskId,result});
    return result;
  } catch (error) {
    await observe({state:"observation-interrupted",taskId});
    throw error;
  }
}
