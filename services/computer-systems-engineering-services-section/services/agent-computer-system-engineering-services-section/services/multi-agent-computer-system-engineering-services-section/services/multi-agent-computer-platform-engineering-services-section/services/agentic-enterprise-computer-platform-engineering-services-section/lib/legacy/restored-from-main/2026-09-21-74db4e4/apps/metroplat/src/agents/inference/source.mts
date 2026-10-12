import { assertNonemptyString as nonempty } from "../../lib/strings.mts";
/** Provider-neutral incremental source contract for inference-domain contributions. */
import { requireJsonValue, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { InferenceCall, InferenceOutcome } from "./model.mts";

export interface InferenceStreamMove {
  readonly kind: "metroplat.inference.stream-move";
  readonly type: string;
  readonly channel: string;
  readonly sequence: number;
  readonly body: JsonValue;
  readonly observedAt: string;
}

export type InferenceSourceEvent =
  | Readonly<{ kind: "metroplat.inference.source-move"; move: InferenceStreamMove }>
  | Readonly<{ kind: "metroplat.inference.source-terminal"; outcome: InferenceOutcome }>;

export interface InferenceSourceOptions {
  readonly signal?: AbortSignal;
  readonly idempotencyKey?: string;
}

export type InferenceSource = (
  call: InferenceCall,
  options?: InferenceSourceOptions,
) => AsyncIterable<InferenceSourceEvent>;


export function inferenceStreamMove(input: Omit<InferenceStreamMove, "kind">): InferenceStreamMove {
  if (!Number.isSafeInteger(input.sequence) || input.sequence < 0) {
    throw new RangeError("inference stream sequence: expected a non-negative safe integer");
  }
  return Object.freeze({
    kind: "metroplat.inference.stream-move" as const,
    type: nonempty(input.type, "inference stream move type"),
    channel: nonempty(input.channel, "inference stream move channel"),
    sequence: input.sequence,
    body: requireJsonValue(input.body, "inference stream move body"),
    observedAt: nonempty(input.observedAt, "inference stream move observedAt"),
  });
}

export function inferenceSourceMove(move: InferenceStreamMove): InferenceSourceEvent {
  return Object.freeze({ kind: "metroplat.inference.source-move" as const, move: inferenceStreamMove(move) });
}

export function inferenceSourceTerminal(outcome: InferenceOutcome): InferenceSourceEvent {
  return Object.freeze({ kind: "metroplat.inference.source-terminal" as const, outcome });
}
