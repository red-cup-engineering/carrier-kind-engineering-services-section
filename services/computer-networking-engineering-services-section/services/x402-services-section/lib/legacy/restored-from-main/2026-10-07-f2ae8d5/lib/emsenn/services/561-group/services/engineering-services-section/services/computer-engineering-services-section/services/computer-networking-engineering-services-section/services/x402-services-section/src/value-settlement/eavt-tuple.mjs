// eavt-tuple — this package's EAVT statement-row spelling: a 4-element tuple
// `[entity, attribute, value, time]`, the shape its own JSON Schema (an exact
// 4-item array) already commits statement rows to.
//
// Content identity composes the canonical row identity
// `@red-cup-engineering/eavt` already owns: canonical JSON of the normalized
// `{e,a,v,t}` row. This file converts tuple spelling to the engine's row carrier.
import { identify } from "@red-cup-engineering/eavt";

/** The IANA-style media type for an EAVT JSONL document. */
export const EAVT_JSONL = "application/eavt+jsonl; charset=utf-8";

/**
 * Read a tuple or `{e,a,v,t}` object spelling through named fields.
 * @param {readonly [unknown, unknown, unknown, unknown] | {e: unknown, a: unknown, v: unknown, t: unknown}} row
 * @returns {{e: unknown, a: unknown, v: unknown, t: unknown}}
 */
export function eavtObject(row) {
  if (Array.isArray(row)) {
    const [e, a, v, t] = row;
    return Object.freeze({ e, a, v, t });
  }
  const { e, a, v, t } = row;
  return Object.freeze({ e, a, v, t });
}

/**
 * Normalize a row into the EAVT tuple spelling.
 * @returns {readonly [unknown, unknown, unknown, unknown]}
 */
export function toEavt(row) {
  const { e, a, v, t } = eavtObject(row);
  return Object.freeze([e, a, v, t]);
}

/** The content identity of a statement row: `@red-cup-engineering/eavt`'s row identity. */
export function eavtId(row) {
  return identify(eavtObject(row));
}
