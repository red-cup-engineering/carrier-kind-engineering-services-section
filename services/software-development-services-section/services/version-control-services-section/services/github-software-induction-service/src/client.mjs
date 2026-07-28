import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { ACTOR, operationBytes, operationFromBytes, record } from "./a2a-executor.mjs";

export async function induceGithubSoftwareProposal(input, {
  agentCardUrl = process.env.GITHUB_SOFTWARE_INDUCTION_AGENT_CARD_URL,
  send = sendRmnTask,
  signal,
} = {}) {
  if (typeof agentCardUrl !== "string" || agentCardUrl === "") {
    throw new Error("GITHUB_SOFTWARE_INDUCTION_AGENT_CARD_URL is required");
  }
  const request = record({ type: "GithubSoftwareInductionRequest", provider: ACTOR, input });
  const message = Message.toJSON({
    messageId: randomUUID(), contextId: input.run ?? "", taskId: "", role: Role.ROLE_USER,
    parts: [rmnPart(operationBytes(request))], metadata: {}, extensions: [], referenceTaskIds: [],
  });
  const exchange = await send({ agentUrl: agentCardUrl, message, requireSignature: true, signal });
  const response = operationFromBytes(extractRmnPart(a2aResultParts(exchange.result)).bytes);
  if (response?.type !== "GithubSoftwareInductionResult" || response.provider !== ACTOR || response.request !== request.id) {
    throw new Error("GitHub induction provider returned a foreign result");
  }
  return Object.freeze({
    ...response.result,
    provider: ACTOR,
    providerReceipt: { inputNi: exchange.inputNi, outputNi: exchange.outputNi, agentCard: exchange.agentCard },
  });
}
