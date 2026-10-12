/**
 * Pure admission algebra: the four Obsmetrologia Lean censuses turned into
 * one {e,a,v,t} eavt trace, one entity per theorem (org-layering.md's EAVT
 * custody: a vocabulary of attributes, never an object format). No I/O:
 * callers read the carriers' text/bytes and pass them in here.
 * @module census-admission
 */
import { constituteContentAddressedEntity, relateEavtRows } from "@red-cup-engineering/eavt-services-section";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { moduleOf, parseCensusRows as parseAxiomRows, profileOf } from "./theorem-census.mjs";
import { parseSiteRows } from "./identification-site-census.mjs";
import { modeOf, parseCensusRows as parseRegimeRows } from "./regime-instantiation-census.mjs";

/** The `kind` every theorem entity is constituted under (constituteEntity's `<kind>:<digest>` address rule). */
export const THEOREM_KIND = "obsmetrologia-theorem";

/** A genesis row's predicate, per eavt's own constituteEntity contract. */
export const GENESIS_PREDICATE = "constituted";

/**
 * The RFC 6920 sha-256 `ni:` URI naming one census carrier's exact bytes --
 * the identity a "cites" row's `v` carries and a record-leaf row's `e` is
 * set to, so eavt's citationsOf/resolveProofTree walk resolves it. Composes
 * ni-services-section's makeNiUri directly (a plain-bytes digest, not
 * eavt's CBOR-row rowId) since a census carrier is not itself an eavt row.
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function digestCarrier(bytes) {
  return makeNiUri(bytes);
}

/**
 * One record-leaf row per census carrier: `e` IS the carrier's own content
 * digest (an ni: URI used directly as an address, not the `<kind>:<digest>`
 * genesis form), so any row citing that digest in its `v` resolves against
 * a real node in the trace.
 *
 * @param {{axiom: object, site: object, regime: object, strata: object}} carriers
 *   Each carrier is `{text, bytes, date, path}` (`bytes` the carrier file's exact on-disk
 *   bytes, `date` its dated filename stamp used as `t`, `path` its basename).
 * @returns {object[]} Four rows, one per carrier, in axiom/site/regime/strata order.
 */
export function recordLeafRows({ axiom, site, regime, strata }) {
  return [
    { e: digestCarrier(axiom.bytes), a: "census-record", v: axiom.path, t: axiom.date },
    { e: digestCarrier(site.bytes), a: "census-record", v: site.path, t: site.date },
    { e: digestCarrier(regime.bytes), a: "census-record", v: regime.path, t: regime.date },
    { e: digestCarrier(strata.bytes), a: "census-record", v: strata.path, t: strata.date },
  ];
}

/**
 * Build the whole {e,a,v,t} trace for every theorem the theorem-axiom
 * census names, joining in identification-site, regime-instantiation
 * (where present), and module-strata facts by theorem/module name.
 * Deterministic: no Date.now/Math.random -- `t` is each carrier's own
 * dated filename stamp, and theorems are visited lexicographically sorted.
 *
 * @param {{axiom: object, site: object, regime: object, strata: object}} carriers
 *   Each of axiom/site/regime is `{text, bytes, date, path}`; strata additionally
 *   carries `json` (the parsed module-strata-census record).
 * @returns {{rows: object[], theorems: string[], addressOf: Record<string, string>}}
 *   `addressOf` maps each theorem name to its constituted entity address.
 */
export function buildTheoremFacts({ axiom, site, regime, strata }) {
  const axiomRows = parseAxiomRows(axiom.text);
  const { rows: siteRows } = parseSiteRows(site.text);
  const { rows: regimeRows } = parseRegimeRows(regime.text);
  const strataJson = strata.json;

  const axiomByTheorem = new Map(axiomRows.map((row) => [row.name, row]));
  const siteByTheorem = new Map(siteRows.map((row) => [row.theorem, row]));
  const regimeByTheorem = new Map(regimeRows.map((row) => [row.theorem, row]));

  const carriers = { axiom, site, regime, strata };
  const digest = {
    axiom: digestCarrier(axiom.bytes),
    site: digestCarrier(site.bytes),
    regime: digestCarrier(regime.bytes),
    strata: digestCarrier(strata.bytes),
  };

  const theorems = [...axiomByTheorem.keys()].sort();
  const rows = recordLeafRows(carriers);
  const addressOf = {};

  for (const name of theorems) {
    const { address, genesisRow: genesis } = constituteContentAddressedEntity({ kind: THEOREM_KIND, attributes: { name }, t: axiom.date });
    addressOf[name] = address;
    rows.push(genesis);

    const axiomRow = axiomByTheorem.get(name);
    const profile = profileOf(axiomRow.axioms);
    rows.push({ e: address, a: "axiom-profile", v: profile, t: axiom.date });
    rows.push({ e: address, a: "cites", v: digest.axiom, t: axiom.date });

    const siteRow = siteByTheorem.get(name);
    const siteCount = siteRow ? siteRow.siteCount : 0;
    const sites = siteRow ? siteRow.sites : [];
    rows.push({ e: address, a: "identification-site-count", v: siteCount, t: site.date });
    for (const siteName of sites) {
      rows.push({ e: address, a: "identification-site", v: siteName, t: site.date });
    }
    rows.push({ e: address, a: "cites", v: digest.site, t: site.date });

    const moduleName = moduleOf(name);
    const moduleInfo = strataJson.modules?.[moduleName];
    const moduleStratum = moduleInfo?.stratum ?? "unstratified";
    const upwardCount = strataJson.upward?.byModule?.[moduleName]?.length ?? 0;
    rows.push({ e: address, a: "module", v: moduleName, t: strata.date });
    rows.push({ e: address, a: "module-stratum", v: moduleStratum, t: strata.date });
    rows.push({ e: address, a: "module-upward-import-count", v: upwardCount, t: strata.date });
    rows.push({ e: address, a: "cites", v: digest.strata, t: strata.date });

    const regimeRow = regimeByTheorem.get(name);
    if (regimeRow) {
      rows.push({ e: address, a: "regime-mode", v: modeOf(regimeRow), t: regime.date });
      rows.push({ e: address, a: "concludes-aperiodic", v: regimeRow.concludesAperiodic, t: regime.date });
      rows.push({ e: address, a: "cites", v: digest.regime, t: regime.date });
    }
  }

  return { rows, theorems, addressOf };
}

/**
 * A theorem entity's own name, read back off its genesis row via eavt's
 * relateFrom (the inverse relational read: "what does `address` stand in
 * 'constituted' to?").
 *
 * @param {object[]} rows
 * @param {string} address - A theorem entity address (constituteEntity's return value).
 * @returns {string|undefined} The theorem's full Lean name, or undefined if `address` never appears as a genesis subject.
 */
export function nameOfEntity(rows, address) {
  return rows.find((row) => row.e === address && row.a === GENESIS_PREDICATE)?.v.name;
}

/**
 * The demonstration join: theorems with regime-mode "hypothesized" AND an
 * axiom-profile containing Quot.sound (i.e. "Quot.sound" or
 * "propext+Quot.sound") AND module-upward-import-count > 0. Implemented
 * over eavt's own relate (exact-match relational reads) plus a direct scan
 * of the admitted rows for the one non-exact-match predicate (a numeric
 * ">0" test relate cannot express) -- never by re-reading the TSVs.
 *
 * @param {object[]} rows - The full admitted trace (or any rows array carrying these attributes).
 * @returns {string[]} Matching theorem entity addresses, sorted.
 */
export function buildJoinQuery(rows) {
  const hypothesized = new Set(relateEavtRows({ rows, predicate: "regime-mode", object: "hypothesized" }).subjects);
  const quotSound = new Set([
    ...relateEavtRows({ rows, predicate: "axiom-profile", object: "Quot.sound" }).subjects,
    ...relateEavtRows({ rows, predicate: "axiom-profile", object: "propext+Quot.sound" }).subjects,
  ]);
  const upwardPositive = new Set(
    rows.filter((row) => row.a === "module-upward-import-count" && typeof row.v === "number" && row.v > 0).map((row) => row.e),
  );
  const matches = [...hypothesized].filter((address) => quotSound.has(address) && upwardPositive.has(address));
  return matches.sort();
}
