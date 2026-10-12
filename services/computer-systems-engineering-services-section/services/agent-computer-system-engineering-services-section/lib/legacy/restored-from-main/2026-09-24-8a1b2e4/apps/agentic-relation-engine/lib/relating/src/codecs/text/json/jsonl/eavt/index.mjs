/**
 * writing/eavt — the atomic witness row, the shape of the LOG (never the wire).
 *
 * An EAVT `[entity, attribute, value, time]` is a witness: at `time`, the cell
 * (entity, attribute, value) was observed. It carries no polarity and no
 * operation — the closure is monotone, finality is derived by settling, never
 * claimed. You ASSERT EAVT and RECEIVE Datoms: a `Datom` is an EAVT plus the
 * reading a script computed about that cell — `[entity, attribute, value, time,
 * reading]`, five parts, the fifth where the settled judgement goes.
 *
 * For the invocation ledger the mapping is exact: E = caller, A = morphism and
 * its arguments, V = the return value, T = the timestamp.
 */
import { canonical, isJsonValue, requireJsonValue } from "@red-cup-engineering/json-services-section";
import { restrict,                } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { jsonlProjector } from "../projector.mjs";
import { parseLines } from "@red-cup-engineering/jsonl-services-section/parse-jsonl";
import { serializeLines } from "@red-cup-engineering/jsonl-services-section/serialize-jsonl";
import { mark } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { witnessedPotential } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { canonicalCborToNiUri, encodeCanonical } from "@red-cup-engineering/cbor-services-section";

/** A subject-predicate-object cell — the triple an EAVT witnesses. */

/** A cell paired with its charge over the bilattice. */

/** The SPO triple projected from an EAVT row. */

/** The IANA-style media type for an EAVT JSONL carrier. */
export const EAVT_JSONL = "application/eavt+jsonl; charset=utf-8";

/** An EAVT tuple: `[entity, attribute, value, time]` — the asserted form. */

/** The object spelling of EAVT used by JSON bodies and human-authored documents. */

/** A Datom: an EAVT plus the reading computed about that cell — the received form. */

/** Whether a JSON value is shaped like an EAVT tuple. */
export function isEavtShape(value           )          {
  return Array.isArray(value) && value.length === 4 && value.every(isJsonValue);
}

/** Normalize a tuple or object row into the canonical `{e,a,v,t}` record. */
export function eavtRecord(row                   )             {
  if (Array.isArray(row)) {
    const [e, a, v, t] = row;
    return Object.freeze({ e, a, v, t });
  }
  const record = row              ;
  return Object.freeze({ e: record.e, a: record.a, v: record.v, t: record.t });
}

/** The content identity of a witness row: the canonical `@red-cup-engineering/eavt`
 *  row identity (RFC 6920 `ni:` URI over RFC 8949 canonical CBOR) of its normalized
 *  record. An unchanged cell re-witnesses to a byte-identical id and dedupes to zero
 *  cost. */
export function eavtId(row                   )         {
  const r = eavtRecord(row);
  return canonicalCborToNiUri(encodeCanonical(r));
}

/** Read an EAVT JSONL document into normalized records (malformed lines skipped). */
export function parse(content        )               {
  const out               = [];
  for (const value of parseLines(content)) {
    if (isEavtShape(value)) out.push(eavtRecord(value                   ));
    else if (typeof value === "object" && value !== null && !Array.isArray(value) && "e" in value && "a" in value && "v" in value && "t" in value) {
      out.push(eavtRecord(value                         ));
    }
  }
  return out;
}

/** Serialize witness records as canonical EAVT JSONL (object spelling). */
export function serialize(rows                                )         {
  return serializeLines(rows.map((row) => eavtRecord(row)                        ));
}

/** Serialize Datoms as canonical JSONL (tuple spelling, five parts). */
export function serializeDatoms(datoms                  )         {
  return serializeLines(datoms.map((datom) => [...datom]                        ));
}

/** Normalize a row into the EAVT tuple spelling. */
export function toEavt(value                   )       {
  const r = eavtRecord(value);
  return [r.e, r.a, r.v, r.t];
}

/** Merge witness logs by content identity, sorted by id — the monotone union. */
export function mergeEavtLogs(...logs                                             )         {
  const seen = new Set        ();
  const rows         = [];
  for (const value of logs.flat()) {
    const row = toEavt(eavtRecord(value));
    const id = eavtId(row);
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push(row);
  }
  return rows.sort((left, right) => eavtId(left).localeCompare(eavtId(right)));
}

const escapePointer = (part        )         => part.replace(/~/g, "~0").replace(/\//g, "~1");
const isContainer = (value           )                                                                        =>
  value !== null && typeof value === "object";

/** Unfold a JSON object/array into object-spelled EAVT rows keyed by JSON Pointer. */
export function unfoldJson(value           , opts                                                   )               {
  const rows               = [];
  const walk = (node           , pointer        )       => {
    if (!isContainer(node)) return;
    const e = `${opts.base ?? ""}#${pointer}`;
    const entries = Array.isArray(node)
      ? node.map((item, index) => [String(index), item]         )
      : Object.entries(node);
    for (const [key, item] of entries) {
      if (key.length === 0) throw new TypeError("unfoldJson: object keys must be non-empty");
      const v            = Array.isArray(item) ? [] : isContainer(item) ? {} : item;
      rows.push(eavtRecord({ e, a: key, v, t: opts.t }));
      if (isContainer(item)) walk(item, `${pointer}/${escapePointer(key)}`);
    }
  };
  walk(value, "");
  return rows;
}

/** Fold object-spelled EAVT rows produced by unfoldJson back into a JSON object. */
export function foldJson(rows                                )            {
  const pointerOf = (e           )         => {
    if (typeof e !== "string") throw new TypeError("foldJson: EAVT entity must be a JSON Pointer string");
    const hash = e.indexOf("#");
    return hash < 0 ? e : e.slice(hash + 1);
  };
  const depth = (pointer        )         => pointer === "" ? 0 : pointer.split("/").length - 1;
  const nodes = new Map                   ([["", {}]]);
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
    else (parent                             )[row.a] = materialized;
  }
  return requireJsonValue(nodes.get("") ?? {}, "folded JSON");
}

/** The SPO triple witnessed by an EAVT row (drops time). */
export function eavtTriple(row                   )             {
  const r = eavtRecord(row);
  return Object.freeze({ s: r.e, p: r.a, o: r.v });
}

/** An EAVT → the cell it witnesses, charged with its witnessed potential. The
 *  value is derived from present-side evidence; nothing negative is admitted. */
export function eavtToCell(e      )              {
  const [entity, attribute, value, time] = e;
  return { cell: { subject: entity, predicate: attribute, object: value }, charge: witnessedPotential(mark(time)) };
}

/** A charged cell → its EAVTs: one per present-side witness. The absent side is
 *  never an EAVT — you do not witness an absence; falsity is derived, not claimed. */
export function cellToEavt(charged             )         {
  const { subject: e, predicate: a, object: v } = charged.cell;
  return charged.charge.evidence[0].map((t)       => [e, a, v, requireJsonValue(t.value, "time witness")]);
}

/** The E-A-V-T order: compare canonical-json keys component by component. */
export function eavtOrder(x      , y      )         {
  for (let i = 0; i < 4; i++) {
    const xk = canonical(x[i] );
    const yk = canonical(y[i] );
    if (xk < yk) return -1;
    if (xk > yk) return 1;
  }
  return 0;
}

/** The EAVT projector: a restriction of JSONL recognizing rows of EAVT shape. */
export const eavtProjector                       = restrict(jsonlProjector, {
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

export * as datom from "@red-cup-engineering/datom";
export * as lean from "./lean/index.mjs";
export * as triple from "./triple/index.mjs";
