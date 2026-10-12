import {
  eavtCodec as upstreamEavtCodec,
  wireByMediaType as upstreamWireByMediaType,
  wireCodec as upstreamWireCodec,
  type WireCodec,
} from "@red-cup-engineering/agentic-relation-engine/codecs/boundary/wire";
import type { JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { parse, serialize, type EAVT } from "../json/jsonl/eavt/index.mts";

export * from "@red-cup-engineering/agentic-relation-engine/codecs/boundary/wire";

/** MetroPlat's tuple EAVT carrier preserves its established wire representation. */
export const eavtCodec: WireCodec = Object.freeze({
  ...upstreamEavtCodec,
  decode: (document: string): JsonValue => parse(document) as unknown as JsonValue,
  encode: (value: JsonValue): string =>
    serialize((Array.isArray(value) ? value : [value]) as unknown as readonly EAVT[]),
});

/** Resolve a MetroPlat wire while retaining its EAVT tuple carrier. */
export function wireCodec(name: string): WireCodec {
  return name === "eavt" ? eavtCodec : upstreamWireCodec(name);
}

/** Resolve a MetroPlat wire from a media type while retaining EAVT tuples. */
export function wireByMediaType(mediaType: string): WireCodec | undefined {
  return upstreamWireByMediaType(mediaType) === upstreamEavtCodec ? eavtCodec : upstreamWireByMediaType(mediaType);
}
