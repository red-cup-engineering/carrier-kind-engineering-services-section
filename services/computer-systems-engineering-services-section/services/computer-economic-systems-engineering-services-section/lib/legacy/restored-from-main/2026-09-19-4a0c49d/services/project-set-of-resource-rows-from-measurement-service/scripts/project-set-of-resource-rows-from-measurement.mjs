#!/usr/bin/env node
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

/**
 * Builds one catalog resource's declarative match rule into a predicate
 * over one measurement row, reading the row through the catalog's field
 * mapping so the same rule works whatever field names an economy's
 * measurement rows use.
 * @param {{type: "regex", pattern: string, flags?: string} | {type: "arena-prefix", prefix: string} | {type: "requires-identity-present"}} matchSpec One catalog resource's match rule.
 * @param {{text: string[], arena: string, requiresIdentity: string, identityAbsenceValues: string[]}} fieldMapping The catalog's field-name mapping onto measurement rows.
 * @returns {(row: object) => boolean} A predicate over one measurement row.
 * @throws {TypeError} When matchSpec.type is not one of the three known kinds.
 */
function buildMatcher(matchSpec, fieldMapping) {
  if (matchSpec.type === "regex") {
    const pattern = new RegExp(matchSpec.pattern, matchSpec.flags ?? "");
    return (row) => pattern.test(textOf(row, fieldMapping.text));
  }
  if (matchSpec.type === "arena-prefix") {
    return (row) => typeof row[fieldMapping.arena] === "string" && row[fieldMapping.arena].startsWith(matchSpec.prefix);
  }
  if (matchSpec.type === "requires-identity-present") {
    return (row) => {
      const value = row[fieldMapping.requiresIdentity];
      return typeof value === "string" && !fieldMapping.identityAbsenceValues.includes(value);
    };
  }
  throw new TypeError(`unknown match type: ${matchSpec.type}`);
}

/**
 * @param {object} row One measurement row.
 * @param {string[]} textFields The catalog field-mapping's text field names.
 * @returns {string} The row's searchable text: every named field that is a string, or every string item of a named field that is an array, joined.
 */
function textOf(row, textFields) {
  const parts = [];
  for (const field of textFields) {
    const value = row[field];
    if (typeof value === "string") parts.push(value);
    else if (Array.isArray(value)) parts.push(...value.filter((item) => typeof item === "string"));
  }
  return parts.join(" \n ");
}

/**
 * @param {object[]} rows Every row from both measurement records.
 * @param {(row: object) => boolean} match A resource's match predicate.
 * @param {string} productField The catalog field-mapping's product field name.
 * @returns {object[]} Up to two rows from distinct products that match, earliest-encountered first.
 */
function findWitnessRows(rows, match, productField) {
  const matched = rows.filter(match);
  const distinct = [];
  const seenProducts = new Set();
  for (const row of matched) {
    const key = row[productField] ?? "unknown";
    if (seenProducts.has(key)) continue;
    seenProducts.add(key);
    distinct.push(row);
    if (distinct.length === 2) break;
  }
  return distinct;
}

/** @param {string} text Combined text of the resource's witness rows. @returns {"custodial"|"self"|"platform-bound"|"unknown"} */
function deriveCustody(text) {
  if (/self-custod|non-custodial|self custody/i.test(text)) return "self";
  if (/custodial|custodian/i.test(text)) return "custodial";
  if (/cannot (be withdrawn|leave)|platform-bound|no withdrawal/i.test(text)) return "platform-bound";
  return "unknown";
}

/** @param {string} text Combined text of the resource's witness rows. @returns {string} A semicolon-joined description of yield-bearing mechanisms found, or "unknown". */
function deriveYieldForm(text) {
  const found = [];
  if (/curation|\bvote\b|voting/i.test(text)) found.push("curation/voting rewards");
  if (/referral/i.test(text)) found.push("referral payouts");
  if (/\bstak(e|ing)\b/i.test(text)) found.push("staking rewards");
  if (/savings|interest/i.test(text)) found.push("savings interest");
  if (/cashback/i.test(text)) found.push("purchase cashback");
  return found.length > 0 ? found.join("; ") : "unknown";
}

/** @param {string} text Combined text of the resource's witness rows. @returns {string} A semicolon-joined description of labor forms found, or "unknown". */
function deriveLaborForm(text) {
  const found = [];
  if (/post(ing)? content|creator|publish/i.test(text)) found.push("posting content");
  if (/task|quest|bounty|complete/i.test(text)) found.push("completing tasks/quests/bounties");
  if (/view(ing)? ads|\bads\b/i.test(text)) found.push("viewing ads");
  if (/mining|compute|bandwidth|device/i.test(text)) found.push("providing device/compute/bandwidth");
  if (/annotat|label(l)?ing|training data/i.test(text)) found.push("AI training/annotation work");
  return found.length > 0 ? found.join("; ") : "unknown";
}

/** @param {string} text Combined text of the resource's witness rows. @returns {{exitPath: string, exitsToRow: string|null}} */
function deriveLiquidity(text) {
  if (/exchange listing|listed on|trade[sd]? on/i.test(text)) return { exitPath: "exchange listing", exitsToRow: null };
  if (/withdraw(al)?/i.test(text)) return { exitPath: "withdrawal to an external wallet or account", exitsToRow: null };
  if (/redeem|redemption/i.test(text)) return { exitPath: "redemption", exitsToRow: null };
  if (/convert(ed|s|ing)?/i.test(text)) return { exitPath: "conversion", exitsToRow: null };
  return { exitPath: "unknown", exitsToRow: null };
}

/** @param {string} text Combined text of the resource's witness rows. @returns {{cap: string, resetPeriod: string, antiBotRule: string}} */
function deriveExtractionCeiling(text) {
  const capMatch = text.match(/\b(\d[\d,.]*\s*[\w$%/]*\s*per\s*(day|hour|week|month))/i);
  const cap = capMatch ? capMatch[1].trim() : "unknown";
  let resetPeriod = "unknown";
  if (capMatch) resetPeriod = capMatch[2].toLowerCase();
  const antiBot = [];
  if (/captcha/i.test(text)) antiBot.push("captcha");
  if (/government-id|kyc/i.test(text)) antiBot.push("identity verification (KYC)");
  if (/phone (number|verification)/i.test(text)) antiBot.push("phone verification");
  if (/proof of humanity|proof-of-humanity/i.test(text)) antiBot.push("proof-of-humanity check");
  if (/rate limit/i.test(text)) antiBot.push("rate limiting");
  return { cap, resetPeriod, antiBotRule: antiBot.length > 0 ? antiBot.join("; ") : "unknown" };
}

/**
 * @param {object[]} witnessRows Up to two witness rows.
 * @param {{text: string[], requiresIdentity: string, identityNoneValues: string[]}} fieldMapping The catalog's field-name mapping.
 * @returns {{kycRequired: true|false|"unknown", perHumanSlot: true|false|"unknown", detail: string}}
 */
function deriveIdentityCost(witnessRows, fieldMapping) {
  const identities = witnessRows.map((row) => row[fieldMapping.requiresIdentity]).filter((value) => typeof value === "string");
  const kycRequired = identities.includes("government-id") ? true : identities.some((value) => fieldMapping.identityNoneValues.includes(value)) ? false : "unknown";
  const text = witnessRows.map((row) => textOf(row, fieldMapping.text)).join(" \n ");
  const perHumanSlot = /one account per (person|human)|per-person limit|per human\b/i.test(text) ? true : "unknown";
  return { kycRequired, perHumanSlot, detail: identities.length > 0 ? [...new Set(identities)].join("; ") : "unknown" };
}

/**
 * Projects one resource row for a catalog resource from its witness rows.
 * @param {{name: string, kind: string, rail: string, unit: string, match: object}} spec One catalog.resources entry.
 * @param {object[]} allRows Every row from both measurement records.
 * @param {object} fieldMapping The catalog's field-name mapping onto measurement rows.
 * @returns {object} A row conforming to resource-row.schema.json.
 */
function projectResourceRow(spec, allRows, fieldMapping) {
  const match = buildMatcher(spec.match, fieldMapping);
  const witnessRows = findWitnessRows(allRows, match, fieldMapping.product);
  const text = witnessRows.map((row) => textOf(row, fieldMapping.text)).join(" \n ");
  const witnesses = witnessRows.map((row) => ({
    source: typeof row[fieldMapping.disclosureClass] === "string" ? row[fieldMapping.disclosureClass] : "first-party page",
    sourceUrl: typeof row[fieldMapping.sourceUrl] === "string" ? row[fieldMapping.sourceUrl] : "unknown",
    observedOn: typeof row[fieldMapping.observedAt] === "string" ? row[fieldMapping.observedAt] : "unknown",
  }));
  const evidenceStatus = witnesses.length >= 2 ? "measured" : witnesses.length === 1 ? "self-reported" : "unknown";
  const liquidity = deriveLiquidity(text);
  const extractionCeiling = deriveExtractionCeiling(text);
  return {
    identity: {
      name: spec.name,
      kind: spec.kind,
      issuer: witnessRows[0]?.[fieldMapping.product] ?? "unknown",
      rail: spec.rail,
    },
    denomination: { unit: spec.unit, witReading: null, emergyReading: null },
    custody: deriveCustody(text),
    yieldForm: deriveYieldForm(text),
    laborForm: deriveLaborForm(text),
    liquidity,
    extractionCeiling,
    identityCost: deriveIdentityCost(witnessRows, fieldMapping),
    witnesses,
    provenance: {
      sourceUrl: witnesses[0]?.sourceUrl ?? "unknown",
      observedOn: witnesses[0]?.observedOn ?? "unknown",
      evidenceStatus,
    },
  };
}

/**
 * Projects one resource row per catalog-named resource (currency, credit,
 * commodity, or scarce input) from the two measurement records, per the
 * resource-row schema. The request's catalog names which resources exist
 * for the economy under study, their static kind/rail/unit facts, the
 * declarative rule that finds each resource's evidence inside a
 * measurement row, and which measurement-row field names carry the
 * product/text/source/observed/disclosure/identity/arena facts -- so the
 * same operation reads any economy's differently shaped measurement rows,
 * instead of one economy's resource list being hardwired into the
 * operation. Every field the measurement does not evidence is written
 * "unknown" rather than guessed; a resource earns "measured" only when
 * two distinct products witness it, per Cistern's two-witness discipline.
 * @param {{broadSurfaceMeasurement: object, providerAndIncumbentMeasurement: object, catalog: {economy: string, fieldMapping: object, resources: object[]}}} request The two measurement records and the resource catalog naming this economy's resources and field mapping, per resource-catalog.schema.json.
 * @returns {{type: "ResourceRowProjection", rows: object[]}} One row per catalog resource, in catalog order.
 * @throws {TypeError} When either measurement record is missing a rows array, or request.catalog is missing its resources array or fieldMapping object.
 */
export function projectSetOfResourceRowsFromMeasurement(request) {
  const broadRows = request?.broadSurfaceMeasurement?.rows;
  const providerRows = request?.providerAndIncumbentMeasurement?.rows;
  if (!Array.isArray(broadRows) || !Array.isArray(providerRows)) throw new TypeError("both measurement records must carry a rows array");
  const catalog = request?.catalog;
  if (!catalog || !Array.isArray(catalog.resources) || catalog.resources.length === 0) throw new TypeError("request.catalog must carry a non-empty resources array");
  if (!catalog.fieldMapping || typeof catalog.fieldMapping !== "object") throw new TypeError("request.catalog must carry a fieldMapping object");
  const fieldMapping = { identityAbsenceValues: ["unknown", "none"], identityNoneValues: ["none"], ...catalog.fieldMapping };
  const allRows = [...broadRows, ...providerRows];
  return { type: "ResourceRowProjection", rows: catalog.resources.map((spec) => projectResourceRow(spec, allRows, fieldMapping)) };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "project-set-of-resource-rows-from-measurement", description: "Projects one resource row per catalog-named resource (currency, credit, commodity, or scarce input) from the two measurement records, per the resource-row schema.", operation: projectSetOfResourceRowsFromMeasurement }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
