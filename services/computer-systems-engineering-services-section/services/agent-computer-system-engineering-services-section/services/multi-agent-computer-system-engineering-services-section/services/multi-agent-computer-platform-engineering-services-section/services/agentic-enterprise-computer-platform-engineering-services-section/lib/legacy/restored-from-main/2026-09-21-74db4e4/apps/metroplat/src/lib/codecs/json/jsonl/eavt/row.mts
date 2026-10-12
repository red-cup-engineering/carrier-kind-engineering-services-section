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
import { canonicalBytes } from "../../../../identity/index.mts";
import { isJsonValue, requireJsonValue, type JsonValue } from "../../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { restrict, type Projector } from "@red-cup-engineering/computer-data-engineering-services-section/typed-resource-classification";
import { jsonlProjector, parseLines, serializeLines } from "../../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/services/jsonl-services-section/src/index.mjs";
import { mark } from "@red-cup-engineering/computer-data-engine/utterance";
import { charge, chargeValue, type Charge } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import { identify } from "@red-cup-engineering/eavt";


/** A subject-predicate-object cell — the triple an EAVT states. */
export type Cell = { readonly subject: JsonValue; readonly predicate: JsonValue; readonly object: JsonValue };
/** A cell paired with its charge over the bilattice. */
export type ChargedCell = { readonly cell: Cell; readonly charge: Charge };
/** The IANA-style media type for an EAVT JSONL document. */
export const EAVT_JSONL = "application/eavt+jsonl; charset=utf-8";

/** An EAVT tuple: `[entity, attribute, value, time]` — the asserted form. */
export type EAVT = readonly [entity: JsonValue, attribute: JsonValue, value: JsonValue, time: JsonValue];

/** Secondary named-field spelling used only when code needs E/A/V/T by property. */
export type EAVTObject = {
  readonly e: JsonValue;
  readonly a: JsonValue;
  readonly v: JsonValue;
  readonly t: JsonValue;
};

/** Whether a JSON value is shaped like an EAVT tuple. */
export function isEavtShape(value: JsonValue): boolean {
  return Array.isArray(value) && value.length === 4 && value.every(isJsonValue);
}

/** Read a tuple or secondary object spelling through named E/A/V/T fields. */
export function eavtObject(row: EAVT | EAVTObject): EAVTObject {
  if (Array.isArray(row)) {
    const [e, a, v, t] = row;
    return Object.freeze({ e, a, v, t });
  }
  const record = row as EAVTObject;
  return Object.freeze({ e: record.e, a: record.a, v: record.v, t: record.t });
}

/** The current EAVT engine identifies a normalized row by its canonical JSON
 *  carrier. Duplicate and cursor readings use that exact reversible identity. */
export function eavtId(row: EAVT | EAVTObject): string {
  const r = eavtObject(row);
  return identify(r);
}

/** Read an EAVT JSONL document into exact EAVT tuples (malformed lines skipped). */
export function parse(content: string): EAVT[] {
  const out: EAVT[] = [];
  for (const value of parseLines(content)) {
    if (isEavtShape(value)) out.push(value as unknown as EAVT);
    else if (typeof value === "object" && value !== null && !Array.isArray(value) && "e" in value && "a" in value && "v" in value && "t" in value) {
      out.push(toEavt(value as unknown as EAVTObject));
    }
  }
  return out;
}

/** Serialize statement records as canonical EAVT JSONL (tuple spelling). */
export function serialize(rows: readonly (EAVT | EAVTObject)[]): string {
  return serializeLines(rows.map((row) => toEavt(row) as unknown as JsonValue));
}

/** Normalize a row into the EAVT tuple spelling. */
export function toEavt(value: EAVT | EAVTObject): EAVT {
  const r = eavtObject(value);
  return Object.freeze([r.e, r.a, r.v, r.t] as const);
}

/** Merge already-admitted statement logs by content identity, sorted by id — a
 *  derived monotone union, not the source-admission law. */
export function mergeEavtLogs(...logs: readonly (readonly (EAVT | EAVTObject)[])[]): EAVT[] {
  const seen = new Set<string>();
  const rows: EAVT[] = [];
  for (const value of logs.flat()) {
    const row = toEavt(eavtObject(value));
    const id = eavtId(row);
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push(row);
  }
  return rows.sort((left, right) => eavtId(left).localeCompare(eavtId(right)));
}

const escapePointer = (part: string): string => part.replace(/~/g, "~0").replace(/\//g, "~1");
const isContainer = (value: JsonValue): value is readonly JsonValue[] | { readonly [key: string]: JsonValue } =>
  value !== null && typeof value === "object";

/** Unfold a JSON object/array into EAVT tuples keyed by JSON Pointer. */
export function unfoldJson(value: JsonValue, opts: { readonly base?: string; readonly t: JsonValue }): EAVT[] {
  const rows: EAVT[] = [];
  const walk = (node: JsonValue, pointer: string): void => {
    if (!isContainer(node)) return;
    const e = `${opts.base ?? ""}#${pointer}`;
    const entries = Array.isArray(node)
      ? node.map((item, index) => [String(index), item] as const)
      : Object.entries(node);
    for (const [key, item] of entries) {
      if (key.length === 0) throw new TypeError("unfoldJson: object keys must be non-empty");
      const v: JsonValue = Array.isArray(item) ? [] : isContainer(item) ? {} : item;
      rows.push(toEavt({ e, a: key, v, t: opts.t }));
      if (isContainer(item)) walk(item, `${pointer}/${escapePointer(key)}`);
    }
  };
  walk(value, "");
  return rows;
}

/** Fold EAVT rows produced by unfoldJson back into a JSON object. */
export function foldJson(rows: readonly (EAVT | EAVTObject)[]): JsonValue {
  const pointerOf = (e: JsonValue): string => {
    if (typeof e !== "string") throw new TypeError("foldJson: EAVT entity must be a JSON Pointer string");
    const hash = e.indexOf("#");
    return hash < 0 ? e : e.slice(hash + 1);
  };
  const depth = (pointer: string): number => pointer === "" ? 0 : pointer.split("/").length - 1;
  const nodes = new Map<string, JsonValue>([["", {}]]);
  const sorted = rows.map(eavtObject).sort((left, right) => depth(pointerOf(left.e)) - depth(pointerOf(right.e)));
  for (const row of sorted) {
    if (typeof row.a !== "string") throw new TypeError("foldJson: EAVT attribute must be a string");
    const pointer = pointerOf(row.e);
    const parent = nodes.get(pointer);
    if (parent === undefined) throw new Error(`foldJson: no node at pointer ${JSON.stringify(pointer)}`);
    let materialized = row.v;
    if (isContainer(row.v)) {
      materialized = Array.isArray(row.v) ? [] : {};
      nodes.set(`${pointer}/${escapePointer(row.a)}`, materialized);
    }
    if (Array.isArray(parent)) parent[Number(row.a)] = materialized;
    else (parent as Record<string, JsonValue>)[row.a] = materialized;
  }
  return requireJsonValue(nodes.get("") ?? {}, "folded JSON");
}

/** An EAVT → the cell it states, charged with its recorded potential. The
 *  value is derived from present-side evidence; nothing negative is admitted. */
export function eavtToCell(e: EAVT): ChargedCell {
  const [entity, attribute, value, time] = e;
  return { cell: { subject: entity, predicate: attribute, object: value }, charge: charge(chargeValue("held")) };
}

/** A charged cell → its EAVTs: one per present-side statement. The absent side is
 *  never an EAVT — absence is not stated; falsity is derived, not claimed. */
export function cellToEavt(charged: ChargedCell): EAVT[] {
  void charged;
  return [];
}

/** The E-A-V-T order: compare canonical-json keys component by component. */
export function eavtOrder(x: EAVT, y: EAVT): number {
  for (let i = 0; i < 4; i++) {
    const xk = canonicalBytes(x[i]!);
    const yk = canonicalBytes(y[i]!);
    if (xk < yk) return -1;
    if (xk > yk) return 1;
  }
  return 0;
}

/** The EAVT projector: a restriction of JSONL recognizing rows of EAVT shape. */
export const eavtProjector: Projector<JsonValue> = restrict(jsonlProjector, {
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
