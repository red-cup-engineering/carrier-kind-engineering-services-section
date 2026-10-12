
import type { HttpResourceMatch, MiddlewareResult } from "./app-surface.mts";
import {
  httpMiddlewareExecutionObservationContract,
  httpResourceMatchObservationContract,
} from "./schema.mts";
import type * as HttpSchema from "./schema.mts";

export type HttpResourceMatchObservation = Omit<HttpSchema.HttpResourceMatchObservation, "match"> & {
  readonly match: HttpResourceMatch;
};

export type HttpMiddlewareExecutionDecision = "continue" | "append-trace" | "respond" | "stop";

export function httpMiddlewareDecision(result: MiddlewareResult): HttpMiddlewareExecutionDecision {
  if (Array.isArray(result)) return "append-trace";
  if (result === false) return "stop";
  if (result === true || result === undefined || result === null) return "continue";
  return "respond";
}

export function observeHttpResourceMatch(match: HttpResourceMatch): HttpSchema.HttpResourceMatchObservation {
  return httpResourceMatchObservationContract.assert(Object.freeze({
    kind: "metroplat.http.resource-match-observation" as const,
    operation: "match-http-resource" as const,
    match,
  }), "http resource match observation") as HttpSchema.HttpResourceMatchObservation;
}

export function observeHttpMiddlewareExecution(
  decision: HttpMiddlewareExecutionDecision,
): HttpSchema.HttpMiddlewareExecutionObservation {
  return httpMiddlewareExecutionObservationContract.assert(Object.freeze({
    kind: "metroplat.http.middleware-execution-observation" as const,
    operation: "execute-resource-middleware" as const,
    decision,
  }), "http middleware execution observation") as HttpSchema.HttpMiddlewareExecutionObservation;
}
