/**
 * codecs/text/json/jsonl/eavt/triple - plain SPO triples projected from EAVT/Datom rows.
 *
 * A codec leaf for the external `{s,p,o}` data shape (e.g. RDF-ish export),
 * projected from an EAVT statement or an object datom by dropping time/op.
 */
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

import { assertObjectDatom } from "@red-cup-engineering/datom";
import { eavtObject } from "../row.mjs";

/** A plain SPO triple. */

/** Admit a value as a `{s,p,o}` triple, or throw. */
export function assertTriple(value) {
  const json = requireJsonValue(value, "triple");
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new TypeError("triple must be a JSON object");
  const record = json;
  const keys = Object.keys(record).sort();
  if (keys.join(",") !== "o,p,s") throw new TypeError(`triple must be exactly {s,p,o}, got ${keys.join(",")}`);
  return Object.freeze({ s: record["s"], p: record["p"], o: record["o"] });
}

/** The content identity of a triple. */
export function tripleId(value) {
  return sha256Hex(canonicalJson(assertTriple(value)));
}

/** The triple projected from an EAVT row (drops time). */
export function tripleFromEavt(value) {
  const row = eavtObject(value);
  return Object.freeze({ s: row.e, p: row.a, o: row.v });
}

/** The triple projected from an object datom (drops tx/op). */
export function tripleFromDatom(value) {
  const d = assertObjectDatom(value);
  return Object.freeze({ s: d.e, p: d.a, o: d.v });
}
