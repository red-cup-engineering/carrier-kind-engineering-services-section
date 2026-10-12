import { canonicalJson, isJsonValue, requireJsonValue } from "@red-cup-engineering/json-services-section";
import { parseLines, serializeLines } from "@red-cup-engineering/jsonl-services-section";
import { jsonlProjector } from "@red-cup-engineering/jsonl-services-section/jsonl-projector";
import { restrict } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { identify } from "../scripts/identify-row.mjs";
import { identifyContentAddressedRow } from "../scripts/identify-content-addressed-row.mjs";

export { eavtRow } from "../scripts/admit-row.mjs";
export { normalizeEavtRow } from "../scripts/normalize-row.mjs";
export { sameEavtRows } from "../scripts/same-eavt-rows.mjs";
export { isEavtRow } from "../scripts/is-eavt-row.mjs";

// The row codec: tuple and record spellings, identities, JSONL documents,
// JSON unfolding, and the typed-resource projector for EAVT JSONL.

/** The media type of an EAVT JSONL document. */
export const EAVT_JSONL = "application/eavt+jsonl; charset=utf-8";

/** Whether a JSON value is shaped like an EAVT tuple `[e, a, v, t]`. */
export function isEavtShape(value) {
  return Array.isArray(value) && value.length === 4 && value.every(isJsonValue);
}

/** A tuple or object row as the `{e, a, v, t}` record. */
export function eavtRecord(row) {
  if (Array.isArray(row)) {
    const [e, a, v, t] = row;
    return Object.freeze({ e, a, v, t });
  }
  return Object.freeze({ e: row.e, a: row.a, v: row.v, t: row.t });
}

/** A tuple or object row as the `[e, a, v, t]` tuple. */
export function toEavt(value) {
  const r = eavtRecord(value);
  return Object.freeze([r.e, r.a, r.v, r.t]);
}

/** A row's content address: the ni URI of its record's canonical CBOR. An
 *  unchanged cell re-witnesses to the same id. */
export function eavtId(row) {
  return identifyContentAddressedRow({ row: eavtRecord(row) }).identity;
}

/** A row's reversible equality key: its record's canonical JSON text. */
export function eavtKey(row) {
  return identify(eavtRecord(row));
}

/** An EAVT JSONL document as records; lines of neither spelling are skipped. */
export function parse(content) {
  const out = [];
  for (const value of parseLines(content)) {
    if (isEavtShape(value)) out.push(eavtRecord(value));
    else if (typeof value === "object" && value !== null && !Array.isArray(value) && "e" in value && "a" in value && "v" in value && "t" in value) {
      out.push(eavtRecord(value));
    }
  }
  return out;
}

/** Rows as canonical EAVT JSONL in the record spelling. */
export function serialize(rows) {
  return serializeLines(rows.map((row) => eavtRecord(row)));
}

/** Datoms as canonical JSONL in the five-part tuple spelling. */
export function serializeDatoms(datoms) {
  return serializeLines(datoms.map((datom) => [...datom]));
}

/** The monotone union of row logs by content address, sorted by address. */
export function mergeEavtLogs(...logs) {
  const byId = new Map();
  for (const value of logs.flat()) {
    const row = toEavt(value);
    const id = eavtId(row);
    if (!byId.has(id)) byId.set(id, row);
  }
  return [...byId.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, row]) => row);
}

const escapePointer = (part) => part.replace(/~/g, "~0").replace(/\//g, "~1");
const isContainer = (value) => value !== null && typeof value === "object";

/** Unfold a JSON object or array into record rows keyed by JSON Pointer. */
export function unfoldJson(value, opts) {
  const rows = [];
  const walk = (node, pointer) => {
    if (!isContainer(node)) return;
    const e = `${opts.base ?? ""}#${pointer}`;
    const entries = Array.isArray(node) ? node.map((item, index) => [String(index), item]) : Object.entries(node);
    for (const [key, item] of entries) {
      if (key.length === 0) throw new TypeError("unfoldJson: object keys must be non-empty");
      const v = Array.isArray(item) ? [] : isContainer(item) ? {} : item;
      rows.push(eavtRecord({ e, a: key, v, t: opts.t }));
      if (isContainer(item)) walk(item, `${pointer}/${escapePointer(key)}`);
    }
  };
  walk(value, "");
  return rows;
}

/** Fold rows produced by unfoldJson back into the JSON value. */
export function foldJson(rows) {
  const pointerOf = (e) => {
    if (typeof e !== "string") throw new TypeError("foldJson: EAVT entity must be a JSON Pointer string");
    const hash = e.indexOf("#");
    return hash < 0 ? e : e.slice(hash + 1);
  };
  const depth = (pointer) => (pointer === "" ? 0 : pointer.split("/").length - 1);
  const nodes = new Map([["", {}]]);
  const sorted = rows.map(eavtRecord).sort((left, right) => depth(pointerOf(left.e)) - depth(pointerOf(right.e)));
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
    else parent[row.a] = materialized;
  }
  return requireJsonValue(nodes.get("") ?? {}, "folded JSON");
}

/** The subject-predicate-object triple a row states (time dropped). */
export function eavtTriple(row) {
  const r = eavtRecord(row);
  return Object.freeze({ s: r.e, p: r.a, o: r.v });
}

/** The E-A-V-T order: canonical JSON of each component in turn. */
export function eavtOrder(x, y) {
  const left = toEavt(x);
  const right = toEavt(y);
  for (let i = 0; i < 4; i++) {
    const xk = canonicalJson(left[i]);
    const yk = canonicalJson(right[i]);
    if (xk < yk) return -1;
    if (xk > yk) return 1;
  }
  return 0;
}

/** The EAVT projector: JSONL whose every row has the tuple shape. Its read is
 *  the identity rung; the monotone merge to a settled fixpoint is settling's. */
export const eavtProjector = restrict(jsonlProjector, {
  type: "eavt",
  corner: "assertion",
  recognize: (resource) => {
    try {
      return parseLines(resource.content).every(isEavtShape);
    } catch {
      return false;
    }
  },
});
