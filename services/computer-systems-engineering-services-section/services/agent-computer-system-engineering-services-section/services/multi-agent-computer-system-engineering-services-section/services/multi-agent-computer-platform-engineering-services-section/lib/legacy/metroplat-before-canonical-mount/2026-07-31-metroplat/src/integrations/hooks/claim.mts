import { jsonToTerm } from "../../lib/language/reader/projecting/index.mts";
import type { Tm } from "../../lib/language/ast/index.mts";
import type { JsonValue } from "../../lib/codecs/json/core.mts";

export interface HookEventClaimInput {
  readonly harness: string;
  readonly hookEventName: string;
  readonly toolName?: string;
}

export function hookEventClaimTerm(input: HookEventClaimInput): Tm {
  return jsonToTerm(Object.freeze({
    kind: "metroplat.hook.claim",
    version: 1,
    harness: input.harness,
    hookEventName: input.hookEventName,
    ...(input.toolName === undefined ? {} : { toolName: input.toolName }),
  }) as JsonValue);
}
