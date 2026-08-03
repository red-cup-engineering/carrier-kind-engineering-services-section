import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { ACTOR, operationBytes, operationFromBytes } from "./a2a-executor.mjs";
import { OPERATION_KIND, identify } from "./semantic-content.mjs";
const id=(value)=>identify(value,OPERATION_KIND).id,record=(body)=>Object.freeze({id:id(body),...body});
export async function renderReportGraphic(packet,{agentCardUrl=process.env.DETERMINISTIC_REPORT_GRAPHIC_AGENT_CARD_URL,send=sendRmnTask,signal}={}){if(typeof agentCardUrl!=="string"||!agentCardUrl)throw new Error("DETERMINISTIC_REPORT_GRAPHIC_AGENT_CARD_URL is required");const request=record({type:"DeterministicReportGraphicOperation",provider:ACTOR,packet}),message=Message.toJSON({messageId:randomUUID(),contextId:"",taskId:"",role:Role.ROLE_USER,parts:[rmnPart(operationBytes(request))],metadata:{},extensions:[],referenceTaskIds:[]}),exchange=await send({agentUrl:agentCardUrl,message,requireSignature:true,signal}),parts=a2aResultParts(exchange.result),response=operationFromBytes(extractRmnPart(parts).bytes);if(response?.type!=="DeterministicReportGraphicOperationResult"||response.provider!==ACTOR||response.request!==request.id)throw new Error("graphic provider returned a foreign result");return Object.freeze({...response.artifact,renderingProvider:ACTOR,renderingReceipt:{inputNi:exchange.inputNi,outputNi:exchange.outputNi,agentCard:exchange.agentCard}});}
