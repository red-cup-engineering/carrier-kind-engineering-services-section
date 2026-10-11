import {
  eavtCodec as upstreamEavtCodec,
  wireByMediaType as upstreamWireByMediaType,
  wireCodec as upstreamWireCodec,

} from "@red-cup-engineering/computer-system-engine/wire";

import { parse, toEavt } from "@red-cup-engineering/eavt-services-section/row";
import { serializeLines } from "@red-cup-engineering/jsonl-services-section";

export * from "@red-cup-engineering/computer-system-engine/wire";

/** MetroPlat's tuple EAVT carrier preserves its established wire representation. */
export const eavtCodec = Object.freeze({
  ...upstreamEavtCodec,
  decode: (document) => parse(document).map(toEavt),
  encode: (value) => serializeLines((Array.isArray(value) ? value : [value]).map(toEavt)),
});

/** Resolve a MetroPlat wire while retaining its EAVT tuple carrier. */
export function wireCodec(name) {
  return name === "eavt" ? eavtCodec : upstreamWireCodec(name);
}

/** Resolve a MetroPlat wire from a media type while retaining EAVT tuples. */
export function wireByMediaType(mediaType) {
  return upstreamWireByMediaType(mediaType) === upstreamEavtCodec ? eavtCodec : upstreamWireByMediaType(mediaType);
}
