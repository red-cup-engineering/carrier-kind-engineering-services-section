
import {
  httpSseTransportObservationContract,
} from "./schema.mts";
import type * as HttpSchema from "./schema.mts";

export {
  type SseSink,
  type TopicEvent,
  writeSseEvent,
  writeSseComment,
  createProjectedEventHub,
} from "@red-cup-engineering/computer-web-server/events";

export type SseWriter = {
  send(event: string, data: unknown, id?: string): void;
  comment(text: string): void;
  close(): void;
};

export type ObservedSseWriter = SseWriter & HttpSchema.HttpSseTransportObservation;

/** The SSE transport observation: the declared framing, no ceremony. */
export function observeSseTransport(boundary: unknown): { readonly kind: "metroplat.http.sse-transport-observation"; readonly operation: "write-sse-frames" } {
  void boundary;
  return Object.freeze({ kind: "metroplat.http.sse-transport-observation" as const, operation: "write-sse-frames" as const });
}
