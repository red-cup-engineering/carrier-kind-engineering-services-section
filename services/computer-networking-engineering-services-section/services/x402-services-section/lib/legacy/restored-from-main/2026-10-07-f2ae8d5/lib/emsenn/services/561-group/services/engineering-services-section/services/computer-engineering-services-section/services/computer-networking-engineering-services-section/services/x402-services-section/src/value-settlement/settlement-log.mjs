/**
 * value-settlement/settlement-log — WebSub publication face and
 * the durable settlement-log reading over EAVT statement rows.
 */
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { linkHeader } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/link";
import { pricedNerve } from "@red-cup-engineering/signgraph/cohomology";
import { EAVT_JSONL, eavtId, eavtObject, toEavt } from "./eavt-tuple.mjs";
import { admitX402Receipt, webSubPublicationContract, valueSettlementLogContract } from "./codec.mjs";

const REQUIRED_FACES = Object.freeze(["websub", "ap2", "filtration"]);

function nonempty(value, label) {
  const clean = typeof value === "string" ? value.trim() : "";
  if (clean.length === 0) throw new TypeError(`${label}: expected non-empty string`);
  return clean;
}

/**
 * Real cross-writer disagreement: rows sharing the same attribute (A — the
 * fact being asserted; this package's own EAVT doctrine reads `E = caller,
 * A = morphism, V = return value`) but reporting different values from
 * different callers (E). Grouping by `(entity, attribute, time)` could never
 * surface this: two independent callers naturally carry two different E's,
 * so they always landed in different groups and never collided. Grouping by
 * A alone is what a genuine multi-writer conflict actually looks like. Time
 * is not part of the key: a settlement reconciles everything admitted
 * together.
 */
function conflicts(rows) {
  const groups = new Map();
  for (const row of rows) {
    const { e, a, v } = eavtObject(row);
    const key = canonicalJson(a);
    const group = groups.get(key) ?? { attribute: a, bySourceValue: new Map() };
    group.bySourceValue.set(canonicalJson([e, v]), { source: e, value: v });
    groups.set(key, group);
  }
  const conflicting = [];
  for (const group of groups.values()) {
    const entries = [...group.bySourceValue.values()];
    const distinctValues = new Set(entries.map((entry) => canonicalJson(entry.value)));
    if (distinctValues.size < 2) continue;
    conflicting.push(Object.freeze({
      attribute: group.attribute,
      sources: Object.freeze(entries.map((entry) => entry.source)),
      values: Object.freeze(entries.map((entry) => entry.value)),
    }));
  }
  return Object.freeze(conflicting);
}

/**
 * Every row read as one federated-cover statement — source (E), cell (A),
 * stance (V) — the same shape cross-session cohomology already reads real
 * disagreement through (SignCraft's settling
 * module). Feeding every row (not only the ones `conflicts` already
 * flagged) prices the whole cover: each attribute is a register, each
 * caller's value a local section, and SignGraph's priced nerve reads the
 * merge's held-⊤ values and contradiction mass from them.
 */
function federatedStatements(rows) {
  return Object.freeze(rows.map((row) => {
    const { e, a, v } = eavtObject(row);
    return Object.freeze({ source: canonicalJson(e), cell: canonicalJson(a), stance: canonicalJson(v) });
  }));
}

function duplicateIds(rowIds) {
  const seen = new Set();
  const duplicates = new Set();
  for (const id of rowIds) {
    if (seen.has(id)) duplicates.add(id);
    else seen.add(id);
  }
  return Object.freeze([...duplicates]);
}

function uniqueInOrder(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return Object.freeze(out);
}

/** Project durable EAVT settlement rows into a WebSub-style publication face. */
export function webSubPublication(input) {
  const updates = Object.freeze(input.updates.map(toEavt));
  return webSubPublicationContract.assert(Object.freeze({
    kind: "websub.publication",
    topic: nonempty(input.topic, "WebSub topic"),
    hub: nonempty(input.hub, "WebSub hub"),
    self: nonempty(input.self, "WebSub self"),
    contentType: EAVT_JSONL,
    updates,
    eventIds: Object.freeze(updates.map(eavtId)),
  }), "WebSub publication");
}

/**
 * The WebSub discovery `Link` header for a publication's hub/self, derived
 * from the same {@link webSubPublication} record — a feed response
 * advertises this header rather than a caller re-deriving hub/self facts of
 * its own.
 */
export function webSubLinkHeader(publication) {
  return linkHeader([
    { href: publication.hub, rel: "hub" },
    { href: publication.self, rel: "self" },
  ]);
}

/** Read durable settlement evidence as one value-settlement log. */
export function valueSettlementLog(input) {
  const receipts = Object.freeze((input.receipts ?? []).map((receipt) => admitX402Receipt(receipt, "recorded settlement receipt")));
  const receiptRows = receipts.flatMap((receipt) => [...(receipt.statementLog ?? []).map(toEavt)]);
  const publication = input.publication === undefined ? undefined : webSubPublicationContract.assert(input.publication, "recorded settlement WebSub publication");
  const publicationRows = publication === undefined ? [] : publication.updates.map(toEavt);
  const rows = Object.freeze([
    ...input.rows.map(toEavt),
    ...receiptRows,
    ...publicationRows,
  ]);
  const rowIds = Object.freeze(rows.map(eavtId));
  const foundConflicts = conflicts(rows);
  const duplicates = duplicateIds(rowIds);
  const ap2Receipts = Object.freeze(receipts.filter((receipt) => receipt.rail === "ap2").map((receipt) => receipt.id));
  const valueConserved = receipts.every((receipt) => receipt.valueConserved === true);
  // The priced nerve over every row's (source, attribute, value) grounds both
  // the reconciliation's degree-1 reading and the thermodynamic Landauer
  // reading below from one reading: the merge is coordination-free exactly
  // when it holds no ⊤ (the callers agree), and what reconciling costs is its
  // contradiction mass.
  const priced = pricedNerve(federatedStatements(rows));
  const coordinationCost = priced.mass;
  const coordinationFree = priced.top === 0;
  const reconciliation = Object.freeze({
    source: "eavt",
    stages: uniqueInOrder(rowIds),
    duplicates,
    conflicts: foundConflicts,
    coordinationCost,
    cohomology: Object.freeze({
      degree: 1,
      top: priced.top,
      mass: priced.mass,
      rank: priced.rank,
      vanishes: coordinationFree,
    }),
    orderRecorded: rows.length > 0,
    valueConserved,
  });
  const thermodynamics = Object.freeze({
    source: "coordinationCohomology.landauerEntropy",
    landauerBits: coordinationCost,
    coordinationCost,
    landauerFree: coordinationCost === 0,
    receiptDischarge: receipts.filter((receipt) => receipt.valueConserved === true).length,
    balanced: valueConserved && coordinationCost === reconciliation.coordinationCost,
    physicalScaleBoundary: "exact bit count only; kT-ln2 thermodynamic scaling remains an interpretation boundary",
  });
  const required = input.requiredFaces ?? REQUIRED_FACES;
  const missing = Object.freeze(required.flatMap((face) => {
    if (face === "websub" && publication === undefined) return ["WebSub publication face"];
    if (face === "ap2" && ap2Receipts.length === 0) return ["AP2 rail receipt"];
    if (face === "filtration" && rows.length === 0) return ["EAVT settlement-filtration rows"];
    return [];
  }));

  return valueSettlementLogContract.assert(Object.freeze({
    kind: "metroplat.witnessed-settlement-log",
    rows,
    rowIds,
    ...(publication === undefined ? {} : { publication }),
    receipts,
    ap2Receipts,
    settlement: reconciliation,
    thermodynamics,
    missing,
    ok: missing.length === 0 && foundConflicts.length === 0 && valueConserved && thermodynamics.balanced,
  }), "value-settlement log");
}
