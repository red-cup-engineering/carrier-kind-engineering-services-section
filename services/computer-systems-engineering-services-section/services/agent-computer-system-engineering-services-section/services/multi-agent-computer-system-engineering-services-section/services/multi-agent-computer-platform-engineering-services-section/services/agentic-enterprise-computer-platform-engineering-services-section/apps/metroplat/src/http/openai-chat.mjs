/** Northbound OpenAI Chat Completions guest ABI over witnessed inference encounters. */
import { requireJsonValue } from "@red-cup-engineering/json-services-section";

import {
  inferenceCallFromOpenAIChat,
  inferenceResultToOpenAIChat,
  openAIChatChunkFromEncounterMove,
} from "@red-cup-engineering/computer-inference-engine/openai/chat-completions/inference";
import { openaiChatCompletionRequest } from "@red-cup-engineering/computer-inference-engine/openai/chat-completions/codec";
import {
  admitServedRequestArrival,

} from "@red-cup-engineering/metroplat/presentation/serving";
import { sseEventFrame, sseHeaders } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/server-sent-event";

function statusOf(condition) {
  if (condition === "unauthorized") return 401;
  if (condition === "rate-limited") return 429;
  if (condition === "timeout") return 504;
  if (condition === "configuration") return 503;
  if (condition === "cancelled") return 499;
  return condition === "malformed" || condition === "truncated-stream" ? 502 : 422;
}

function json(body, status = 200) {
  return Object.freeze({ status, type: "application/json; charset=utf-8", body: `${JSON.stringify(body)}\n` });
}

function error(status, message, type) {
  return json(Object.freeze({ error: Object.freeze({ message, type, code: type }) }), status);
}

function streamFrame(data, id) {
  return new TextEncoder().encode(sseEventFrame({ data: typeof data === "string" ? data : JSON.stringify(data), ...(id === undefined ? {} : { id }) }));
}

function streamBody(session, call) {
  return Object.freeze({
    async *[Symbol.asyncIterator]() {
      const context = {
        id: session.run.id,
        model: call.model,
        created: Math.max(0, Math.trunc(Date.parse(call.observedAt) / 1000)),
      };
      for await (const admission of session.admissions) {
        const material = admission.material

;
        if (material.kind !== "metroplat.encounter.contribution" || material.contribution === undefined) continue;
        const id = admission.eventIds.at(-1);
        if (material.contribution.kind === "metroplat.encounter.move") {
          const chunk = openAIChatChunkFromEncounterMove(material.contribution, context);
          if (chunk !== undefined) yield streamFrame(chunk, id);
          continue;
        }
        if (material.contribution.kind === "metroplat.encounter.terminal") {
          const outcome = material.contribution.value;
          if (outcome.kind === "metroplat.inference.obstruction") {
            yield streamFrame({
              error: {
                message: Array.isArray(outcome.reasons) ? outcome.reasons.join("; ") : "inference obstructed",
                type: typeof outcome.condition === "string" ? outcome.condition : "inference_obstruction",
                code: typeof outcome.condition === "string" ? outcome.condition : "inference_obstruction",
              },
            }, id);
          }
          yield streamFrame("[DONE]", id);
          return;
        }
      }
      // Authorization or admission can fail before an encounter terminal exists.
      const outcome = await session.settled;
      if (outcome.kind === "metroplat.inference.obstruction") {
        yield streamFrame({ error: { message: outcome.reasons.join("; "), type: outcome.condition, code: outcome.condition } });
      }
      yield streamFrame("[DONE]");
    },
  });
}

/** Decode foreign wire, call the already-witnessed port, and encode foreign wire. */
export async function routeOpenAIChatGuest(
  request,
  options,
  guest,
  routeContext = {},
) {
  if (request.method !== "POST") return error(405, "method not allowed", "method_not_allowed");
  const arrival = admitServedRequestArrival(request, options, "/v1/chat/completions");
  if (arrival === undefined) return error(500, "arrival was not admitted", "arrival_failure");
  if ("status" in arrival) return arrival;
  let wire;
  try {
    wire = openaiChatCompletionRequest(requireJsonValue(JSON.parse(request.body), "OpenAI guest request"));
  } catch (cause) {
    return error(400, cause instanceof Error ? cause.message : String(cause), "invalid_request_error");
  }
  const call = inferenceCallFromOpenAIChat(wire, {
    request: request.idempotencyKey ?? arrival.cloudEventIdentity,
    subject: guest.subject,
    observedAt: options.now(),
    caller: Object.freeze({ transport: "http", protocol: "openai.chat-completions", path: request.path }),
    causes: arrival.admission?.statements?.map((statement) => statement.id) ?? [],
  });
  const session = guest.inference(call, {
    ...(request.lastEventId === undefined ? {} : { after: Object.freeze([request.lastEventId]) }),
    ...(routeContext.subscriptionSignal === undefined ? {} : { subscriptionSignal: routeContext.subscriptionSignal }),
  });
  if (wire.stream === true) {
    return Object.freeze({
      status: 200,
      type: "text/event-stream; charset=utf-8",
      headers: sseHeaders(),
      body: streamBody(session, call),
    });
  }
  const outcome = await session.settled;
  if (outcome.kind === "metroplat.inference.obstruction") {
    return error(statusOf(outcome.condition), outcome.reasons.join("; "), outcome.condition);
  }
  return json(inferenceResultToOpenAIChat(outcome));
}
