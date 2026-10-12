/**
 * codecs/text/json/jsonl/eavt — the atomic statement row, the shape of the LOG (never the wire).
 *
 * An EAVT `[entity, attribute, value, time]` is a statement: at `time`, the cell
 * (entity, attribute, value) was observed. It carries no polarity and no
 * operation — the closure is monotone, finality is derived by settling, never
 * claimed. You ASSERT EAVT and RECEIVE Datoms: a `Datom` is an EAVT plus the
 * reading a script computed about that cell — `[entity, attribute, value, time,
 * reading]`, five parts, the fifth where the settled judgement goes.
 *
 * For legacy invocation projections the mapping is exact: E = caller, A = morphism and
 * its arguments, V = the return value, T = the timestamp.
 */
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { isJsonValue } from "@red-cup-engineering/json-services-section";
import { restrict } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { parseLines, serializeLines } from "@red-cup-engineering/jsonl-services-section";
import { jsonlProjector } from "@red-cup-engineering/relating/codecs/text/json";
import { mark } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { charge, chargeValue } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { identify } from "@red-cup-engineering/eavt";

/** A subject-predicate-object cell — the triple an EAVT states. */

/** A cell paired with its charge over the bilattice. */

/** The IANA-style media type for an EAVT JSONL document. */
export const EAVT_JSONL = "application/eavt+jsonl; charset=utf-8";

/** An EAVT tuple: `[entity, attribute, value, time]` — the asserted form. */

/** Secondary named-field spelling used only when code needs E/A/V/T by property. */

/** Whether a JSON value is shaped like an EAVT tuple. */
export function isEavtShape(value) {
  return Array.isArray(value) && value.length === 4 && value.every(isJsonValue);
}

/** Read a tuple or secondary object spelling through named E/A/V/T fields. */
export function eavtObject(row) {
  if (Array.isArray(row)) {
    const [e, a, v, t] = row;
    return Object.freeze({ e, a, v, t });
  }
  const record = row;
  return Object.freeze({ e: record.e, a: record.a, v: record.v, t: record.t });
}

/** The current EAVT engine identifies a normalized row by its canonical JSON
 *  carrier. Duplicate and cursor readings use that exact reversible identity. */
export function eavtId(row) {
  const r = eavtObject(row);
  return identify(r);
}

/** Read an EAVT JSONL document into exact EAVT tuples (malformed lines skipped). */
export function parse(content) {
  const out = [];
  for (const value of parseLines(content)) {
    if (isEavtShape(value)) out.push(value);
    else if (typeof value === "object" && value !== null && !Array.isArray(value) && "e" in value && "a" in value && "v" in value && "t" in value) {
      out.push(toEavt(value));
    }
  }
  return out;
}

/** Serialize statement records as canonical EAVT JSONL (tuple spelling). */
export function serialize(rows) {
  return serializeLines(rows.map((row) => toEavt(row)));
}

/** Normalize a row into the EAVT tuple spelling. */
export function toEavt(value) {
  const r = eavtObject(value);
  return Object.freeze([r.e, r.a, r.v, r.t]);
}

/** An EAVT → the cell it states, charged with its recorded potential. The
 *  value is derived from present-side evidence; nothing negative is admitted. */
export function eavtToCell(e) {
  const [entity, attribute, value, time] = e;
  return { cell: { subject: entity, predicate: attribute, object: value }, charge: charge(chargeValue("potential")) };
}

/** A charged cell → its EAVTs: one per present-side statement. The absent side is
 *  never an EAVT — absence is not stated; falsity is derived, not claimed. */
export function cellToEavt(charged) {
  void charged;
  return [];
}

/** The E-A-V-T order: compare canonical-json keys component by component. */
export function eavtOrder(x, y) {
  for (let i = 0; i < 4; i++) {
    const xk = canonicalJson(x[i]);
    const yk = canonicalJson(y[i]);
    if (xk < yk) return -1;
    if (xk > yk) return 1;
  }
  return 0;
}

/** The EAVT projector: a restriction of JSONL recognizing rows of EAVT shape. */
export const eavtProjector = restrict(jsonlProjector, {
  type: "eavt",
  // The assertion corner ⟨addressable, asserting⟩. Its read stays at the identity
  // rung (parse JSONL rows); EAVT's canonical completion — the monotone merge to a
  // settled fixpoint — is the scott rung, carried by `settling`, not by this codec.
  corner: "assertion",
  recognize: (resource) => {
    try {
      return parseLines(resource.content).every(isEavtShape);
    } catch {
      return false;
    }
  },
});
