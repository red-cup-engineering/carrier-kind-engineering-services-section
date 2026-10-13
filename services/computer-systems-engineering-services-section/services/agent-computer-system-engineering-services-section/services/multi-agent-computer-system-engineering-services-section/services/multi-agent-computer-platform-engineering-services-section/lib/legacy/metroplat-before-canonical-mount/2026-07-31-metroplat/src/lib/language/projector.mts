/**
 * RMN projection adapter.
 *
 * The formal core owns both RMN admission and the pure projector lattice.
 */
import { parse as parseJson, jsonProjector, type JsonValue } from "../codecs/json/core.mts";
import { canonicalBytes } from "../identity/index.mts";
import { isRelationalTerm } from "./reader/index.mts";
import { restrict, type Projector } from "../codecs/projector/index.mts";

export const rmnProjector: Projector<JsonValue> = restrict(jsonProjector, {
  type: "rmn",
  corner: "assertion",
  rung: "scott",
  recognize: (resource) => {
    try {
      return isRelationalTerm(JSON.parse(resource.content));
    } catch {
      return false;
    }
  },
  read: (resource) => [parseJson(resource.content)],
  write: (items) => items.map((item) => canonicalBytes(item)).join("\n"),
});
