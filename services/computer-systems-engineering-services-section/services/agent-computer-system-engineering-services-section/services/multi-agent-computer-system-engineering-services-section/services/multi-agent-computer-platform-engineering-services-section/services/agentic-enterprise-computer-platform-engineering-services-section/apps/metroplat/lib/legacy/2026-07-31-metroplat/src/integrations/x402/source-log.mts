import { type JsonValue } from "../../lib/codecs/json/core.mts";
import { canonicalBytes } from "../../lib/identity/index.mts";
import {
  EAVT_JSONL,
  eavtId,
  eavtObject,
  toEavt,
  type EAVT,
} from "../../lib/codecs/json/jsonl/eavt/index.mts";
import {
  admitX402Receipt,
  webSubPublicationContract,
  valueSettlementLogContract,
  type ValueConflict,
  type WebSubPublication,
  type ValueSettlementLog,
  type X402Receipt,
} from "./codec.mts";
import { monotonicityCertificateOfFederatedCover, type FederatedCoverStatement } from "../../lib/fixpoint/monotonicity-certificate.mts";
import { toCount } from "../../lib/math/rational/exact-number.mts";
import { linkHeader } from "../http/codec/link.mts";

export type ValueSettlementFace = "websub" | "ap2" | "filtration";

export interface WebSubPublicationInput {
  readonly topic: string;
  readonly hub: string;
  readonly self: string;
  readonly updates: readonly EAVT[];
}

export interface ValueSettlementLogInput {
  readonly rows: readonly EAVT[];
  readonly publication?: WebSubPublication;
  readonly receipts?: readonly X402Receipt[];
  readonly requiredFaces?: readonly ValueSettlementFace[];
}

const REQUIRED_FACES: readonly ValueSettlementFace[] = Object.freeze(["websub", "ap2", "filtration"]);

function nonempty(value: string, label: string): string {
  const clean = value.trim();
  if (clean.length === 0) throw new TypeError(`${label}: expected non-empty string`);
  return clean;
}

/**
 * Real cross-writer disagreement: rows sharing the same attribute (A — the
 * fact being asserted; this package's own EAVT doctrine, `codecs/text/json/
 * jsonl/eavt/index.mts`, reads `E = caller, A = morphism, V = return value`)
 * but reporting different values from different callers (E). Grouping by
 * `(entity, attribute, time)` — the prior shape here — could never surface
 * this: two independent callers naturally carry two different E's, so they
 * always landed in different groups and never collided. Grouping by A alone
 * is what a genuine multi-writer conflict actually looks like. Time is not
 * part of the key: a settlement reconciles everything admitted together, the
 * same way `glueClaimSessions` does.
 */
function conflicts(rows: readonly EAVT[]): readonly ValueConflict[] {
  const groups = new Map<string, { readonly attribute: JsonValue; readonly bySourceValue: Map<string, { readonly source: JsonValue; readonly value: JsonValue }> }>();
  for (const row of rows) {
    const { e, a, v } = eavtObject(row);
    const key = canonicalBytes(a);
    const group = groups.get(key) ?? { attribute: a, bySourceValue: new Map() };
    group.bySourceValue.set(canonicalBytes([e, v]), { source: e, value: v });
    groups.set(key, group);
  }
  const conflicting: ValueConflict[] = [];
  for (const group of groups.values()) {
    const entries = [...group.bySourceValue.values()];
    const distinctValues = new Set(entries.map((entry) => canonicalBytes(entry.value)));
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
 * stance (V) — the same shape `glueClaimSessions`' cross-session cohomology
 * already reads real disagreement through (`core/closure/monotonicity-
 * certificate.mjs`). Feeding every row (not only the ones `conflicts` already
 * flagged) lets the real cover-nerve H1 rank surface cyclic disagreement
 * `conflicts`'s pairwise grouping can't see on its own — consistent with how
 * claim-sessions never pre-filters before gluing.
 */
function federatedStatements(rows: readonly EAVT[]): readonly FederatedCoverStatement[] {
  return Object.freeze(rows.map((row) => {
    const { e, a, v } = eavtObject(row);
    return Object.freeze({ source: canonicalBytes(e), cell: canonicalBytes(a), stance: canonicalBytes(v) });
  }));
}

function duplicateIds(rowIds: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of rowIds) {
    if (seen.has(id)) duplicates.add(id);
    else seen.add(id);
  }
  return Object.freeze([...duplicates]);
}

function uniqueInOrder(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return Object.freeze(out);
}

/** Project durable EAVT settlement rows into a WebSub-style publication face. */
export function webSubPublication(input: WebSubPublicationInput): WebSubPublication {
  const updates = Object.freeze(input.updates.map(toEavt));
  return webSubPublicationContract.assert(Object.freeze({
    kind: "websub.publication" as const,
    topic: nonempty(input.topic, "WebSub topic"),
    hub: nonempty(input.hub, "WebSub hub"),
    self: nonempty(input.self, "WebSub self"),
    contentType: EAVT_JSONL,
    updates,
    eventIds: Object.freeze(updates.map(eavtId)),
  }), "WebSub publication") as WebSubPublication;
}

/**
 * The WebSub discovery `Link` header for a publication's hub/self, derived
 * from the same {@link WebSubPublication} record `webSubPublication`
 * builds — a feed response advertises this header rather than a caller
 * re-deriving hub/self facts of its own.
 */
export function webSubLinkHeader(publication: Pick<WebSubPublication, "hub" | "self">): string {
  return linkHeader([
    { href: publication.hub, rel: "hub" },
    { href: publication.self, rel: "self" },
  ]);
}

/** Read durable settlement evidence as one value-settlement log. */
export function valueSettlementLog(input: ValueSettlementLogInput): ValueSettlementLog {
  const receipts = Object.freeze((input.receipts ?? []).map((receipt) => admitX402Receipt(receipt, "recorded settlement receipt")));
  const receiptRows = receipts.flatMap((receipt) => [...(receipt.statementLog ?? []).map(toEavt)]);
  const publication = input.publication === undefined ? undefined : webSubPublicationContract.assert(input.publication, "recorded settlement WebSub publication") as WebSubPublication;
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
  // The real federated-cover cohomology over every row's (source, attribute,
  // value) — the same primitive claim-sessions' glueClaimSessions already
  // trusts — grounds both the reconciliation's degree-1 reading and the
  // thermodynamic Landauer reading below from one certificate, not two
  // independently hand-derived counts that could silently drift apart.
  const certificate = monotonicityCertificateOfFederatedCover(federatedStatements(rows));
  const coordinationCost = toCount(certificate.rank);
  const coordinationFree = certificate.vanishing.kind === "predication.cohomology.rankVanishing:witness";
  const reconciliation = Object.freeze({
    source: "eavt" as const,
    stages: uniqueInOrder(rowIds),
    duplicates,
    conflicts: foundConflicts,
    coordinationCost,
    cohomology: Object.freeze({
      degree: 1 as const,
      rank: coordinationCost,
      vanishes: coordinationFree,
    }),
    orderRecorded: rows.length > 0,
    valueConserved,
  });
  const thermodynamics = Object.freeze({
    source: "coordinationCohomology.landauerEntropy" as const,
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
    kind: "metroplat.witnessed-settlement-log" as const,
    rows,
    rowIds,
    ...(publication === undefined ? {} : { publication }),
    receipts,
    ap2Receipts,
    settlement: reconciliation,
    thermodynamics,
    missing,
    ok: missing.length === 0 && foundConflicts.length === 0 && valueConserved && thermodynamics.balanced,
  }), "value-settlement log") as ValueSettlementLog;
}
