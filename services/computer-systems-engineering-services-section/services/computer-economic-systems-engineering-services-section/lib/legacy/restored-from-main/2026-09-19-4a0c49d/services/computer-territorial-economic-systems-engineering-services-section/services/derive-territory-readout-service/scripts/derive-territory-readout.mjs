#!/usr/bin/env node
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";
const UNKNOWN_LEADING_PATTERN = /^unknown(?:[^a-zA-Z]|$)/u;

function nonEmptyString(value, context) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`derive-territory-readout: ${context} must be a nonempty string`);
  }
  return value;
}

function plainObject(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`derive-territory-readout: ${context} must be an object`);
  }
  return value;
}

function validateRequestTerritory(territory, context) {
  plainObject(territory, context);
  nonEmptyString(territory.path, `${context}.path`);
  nonEmptyString(territory.name, `${context}.name`);
  return territory;
}

function validateRowTerritory(territory, context) {
  plainObject(territory, context);
  nonEmptyString(territory.path, `${context}.path`);
  nonEmptyString(territory.plainName, `${context}.plainName`);
  return territory;
}

function validateMaterial(material, context) {
  plainObject(material, context);
  nonEmptyString(material.commonName, `${context}.commonName`);
  if (material.scientificName !== null) nonEmptyString(material.scientificName, `${context}.scientificName`);
  nonEmptyString(material.materialKind, `${context}.materialKind`);
  return material;
}

function validateCitation(citation, context) {
  plainObject(citation, context);
  nonEmptyString(citation.sourceUrl, `${context}.sourceUrl`);
  nonEmptyString(citation.sourceTitle, `${context}.sourceTitle`);
  nonEmptyString(citation.accessedOn, `${context}.accessedOn`);
  return citation;
}

function validateKnownProduct(entry, context) {
  plainObject(entry, context);
  nonEmptyString(entry.product, `${context}.product`);
  nonEmptyString(entry.use, `${context}.use`);
  validateCitation(entry.citation, `${context}.citation`);
  return entry;
}

function validateMarket(entry, context) {
  plainObject(entry, context);
  nonEmptyString(entry.buyer, `${context}.buyer`);
  nonEmptyString(entry.kind, `${context}.kind`);
  validateCitation(entry.citation, `${context}.citation`);
  return entry;
}

function validateChainPositionHeld(value, context) {
  if (value === "unknown") return value;
  plainObject(value, context);
  nonEmptyString(value.position, `${context}.position`);
  nonEmptyString(value.evidence, `${context}.evidence`);
  return value;
}

function validateRow(row, index) {
  const context = `rows[${index}]`;
  plainObject(row, context);
  validateRowTerritory(row.territory, `${context}.territory`);
  validateMaterial(row.material, `${context}.material`);
  if (!Array.isArray(row.knownProducts)) throw new TypeError(`derive-territory-readout: ${context}.knownProducts must be an array`);
  row.knownProducts.forEach((entry, entryIndex) => validateKnownProduct(entry, `${context}.knownProducts[${entryIndex}]`));
  if (!Array.isArray(row.markets)) throw new TypeError(`derive-territory-readout: ${context}.markets must be an array`);
  row.markets.forEach((entry, entryIndex) => validateMarket(entry, `${context}.markets[${entryIndex}]`));
  validateChainPositionHeld(row.chainPositionHeld, `${context}.chainPositionHeld`);
  if (row.benefitSharingRecord !== null) nonEmptyString(row.benefitSharingRecord, `${context}.benefitSharingRecord`);
  plainObject(row.identity, `${context}.identity`);
  nonEmptyString(row.identity.issuer, `${context}.identity.issuer`);
  return row;
}

function isTerritoryMatch(rowPath, requestPath) {
  return rowPath === requestPath || requestPath.startsWith(`${rowPath}/`);
}

function collectUnknownFieldPaths(value, prefix, found) {
  if (value === null || value === undefined) return found;
  if (typeof value === "string") {
    if (UNKNOWN_LEADING_PATTERN.test(value)) found.push(prefix);
    return found;
  }
  if (typeof value !== "object") return found;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUnknownFieldPaths(item, `${prefix}[${index}]`, found));
    return found;
  }
  for (const [key, sub] of Object.entries(value)) {
    collectUnknownFieldPaths(sub, prefix.length === 0 ? key : `${prefix}.${key}`, found);
  }
  return found;
}

function compareStrings(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Derives one place's territory readout from the Turtle Island taxonomy: every catalogued material
 * whose row belongs to that place or one of its ancestors, each with its known products and markets
 * (citations intact), its currently held chain position, a holder rendered as the literal "not named"
 * whenever the row carries no benefit-sharing record (never the row's own issuer in that case), and
 * a notFound listing of every field anywhere in that row the row itself marks unknown, sorted so the
 * listing never depends on the row's own JSON key order. Pure, no I/O, no clock. Entries are ordered
 * by material kind then common name, and notFound paths are sorted, by the ECMAScript string
 * relational comparison (never locale collation); rows outside the requested territory are excluded
 * and counted.
 * @param {{ type: "TerritoryReadoutRequest", version: 1, territory: { path: string, name: string },
 *   rows: readonly object[] }} input The place being read (its taxonomy path and plain name) and the
 *   territory catalog rows to read it against; each row is a territory-catalog-row record (this
 *   section's schema): `territory: {path, plainName}`, `material: {commonName, scientificName,
 *   materialKind}`, `knownProducts`, `markets`, `chainPositionHeld`, `benefitSharingRecord`,
 *   `identity: {issuer, ...}`, and any other resource-row field.
 * @returns {{ type: "TerritoryReadout", version: 1, territory: { path: string, name: string },
 *   entries: readonly { material: { commonName: string, scientificName: (string|null),
 *   materialKind: string }, knownProducts: readonly object[], markets: readonly object[],
 *   chainPosition: ("unknown" | { position: string, evidence: string }), holder: string,
 *   notFound: readonly string[] }[], excluded: number }} The requested territory, one entry per
 *   matching row (ordered by material kind then common name), and the count of rows excluded for
 *   lying outside that territory and its ancestors.
 * @throws {TypeError} When `input` is not a `TerritoryReadoutRequest`, or a territory or row field is
 *   malformed.
 */
export function deriveTerritoryReadout(input) {
  if (!input || typeof input !== "object" || input.type !== "TerritoryReadoutRequest" || input.version !== 1) {
    throw new TypeError("derive-territory-readout: input must be a TerritoryReadoutRequest@1 record");
  }
  const territory = validateRequestTerritory(input.territory, "input.territory");
  if (!Array.isArray(input.rows)) {
    throw new TypeError("derive-territory-readout: input.rows must be an array");
  }
  input.rows.forEach((row, index) => validateRow(row, index));

  let excluded = 0;
  const matchedRows = [];
  for (const row of input.rows) {
    if (isTerritoryMatch(row.territory.path, territory.path)) {
      matchedRows.push(row);
    } else {
      excluded += 1;
    }
  }

  const entries = matchedRows
    .map((row) => Object.freeze({
      material: Object.freeze({
        commonName: row.material.commonName,
        scientificName: row.material.scientificName,
        materialKind: row.material.materialKind,
      }),
      knownProducts: Object.freeze(row.knownProducts.map((entry) => Object.freeze({ product: entry.product, use: entry.use, citation: Object.freeze({ ...entry.citation }) }))),
      markets: Object.freeze(row.markets.map((entry) => Object.freeze({ buyer: entry.buyer, kind: entry.kind, citation: Object.freeze({ ...entry.citation }) }))),
      chainPosition: row.chainPositionHeld === "unknown" ? "unknown" : Object.freeze({ position: row.chainPositionHeld.position, evidence: row.chainPositionHeld.evidence }),
      holder: row.benefitSharingRecord === null ? "not named" : row.identity.issuer,
      notFound: Object.freeze(collectUnknownFieldPaths(row, "", []).sort(compareStrings)),
    }))
    .sort((a, b) => compareStrings(a.material.materialKind, b.material.materialKind) || compareStrings(a.material.commonName, b.material.commonName));

  return Object.freeze({
    type: "TerritoryReadout",
    version: 1,
    territory: Object.freeze({ path: territory.path, name: territory.name }),
    entries: Object.freeze(entries),
    excluded,
  });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "derive-territory-readout", description: "Derives one place's territory readout from the Turtle Island taxonomy: every catalogued material whose row belongs to that place or one of its ancestors, each with its known products and markets (citations intact), its currently held chain position, a holder rendered as the literal \"not named\" whenever the row carries no benefit-sharing record (never the row's own issuer in that case), and a notFound listing of every field anywhere in that row the row itself marks unknown, sorted so the listing never depends on the row's own JSON key order.", operation: deriveTerritoryReadout }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
