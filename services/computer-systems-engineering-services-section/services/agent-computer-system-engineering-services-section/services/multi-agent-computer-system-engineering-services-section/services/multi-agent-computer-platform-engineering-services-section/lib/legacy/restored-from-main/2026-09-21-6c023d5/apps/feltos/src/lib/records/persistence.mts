/**
 * @packageDocumentation
 * persistence - statement identity and source-row law.
 *
 * This stratum owns the pure EAVT statement shape. It does not
 * know JSONL, files, hashes, SSE, or HTTP. Those are codec, store, projection,
 * or service realizations of this law.
 *
 * Generic over EAVT, not RWIL-specific: `ArtifactTier` and
 * `artifactInformationChain` name the four-tier `log -> state -> record ->
 * content` projection, which carries any EAVT row — `a` is typed as
 * the general `StatementValue`, not RMN's `Tm`. RWIL proper is the subtype of
 * EAVT row whose `a` is specifically an RMN term (e and v are entity/value paths, t
 * is time); this module does not check or require that, and nothing exported
 * here is named "Rwil" — see AGENTS.md's RWIL entry for the narrower term.
 *
 * @metroplatSubject records
 */
import { chargeValueName, chargeValueAt, chargeSide, type ChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";

export type ArtifactTierName = "log" | "state" | "record" | "content";
export type ArtifactTierRole = "source" | "sufficient-statistic" | "rate-distortion-code" | "lossy-cut";

export interface ArtifactTier {
  readonly kind: "witness.tier";
  readonly name: ArtifactTierName;
  readonly role: ArtifactTierRole;
  readonly rank: number;
  readonly pathSegment: string;
  readonly queryClass: string;
  readonly preserves: readonly string[];
  readonly mayForget: readonly string[];
}

const artifactTierTable: Readonly<Record<ArtifactTierName, ArtifactTier>> = Object.freeze({
  log: Object.freeze({
    kind: "witness.tier" as const,
    name: "log" as const,
    role: "source" as const,
    rank: 3,
    pathSegment: "data/journals",
    queryClass: "all admitted statement rows, including coordinates and duplicate attempts",
    preserves: Object.freeze(["E", "A", "V", "T", "contract exposure", "append order", "content identity"]),
    mayForget: Object.freeze([]),
  }),
  state: Object.freeze({
    kind: "witness.tier" as const,
    name: "state" as const,
    role: "sufficient-statistic" as const,
    rank: 2,
    pathSegment: "data/state",
    queryClass: "current value of declared functional/accumulating cells",
    preserves: Object.freeze(["current functional facts", "accumulated non-functional evidence", "cell identity"]),
    mayForget: Object.freeze(["superseded statement history", "append attempt duplicates"]),
  }),
  record: Object.freeze({
    kind: "witness.tier" as const,
    name: "record" as const,
    role: "rate-distortion-code" as const,
    rank: 1,
    pathSegment: "data/records",
    queryClass: "settled datom invariants and kept live-log rows",
    preserves: Object.freeze(["settled datoms", "reading slot", "kept source rows"]),
    mayForget: Object.freeze(["rows made redundant by a settled reading", "projection-local ordering detail"]),
  }),
  content: Object.freeze({
    kind: "witness.tier" as const,
    name: "content" as const,
    role: "lossy-cut" as const,
    rank: 0,
    pathSegment: "content",
    queryClass: "browsable term-addressed document cuts",
    preserves: Object.freeze(["entity address", "selected presentation fields", "document content"]),
    mayForget: Object.freeze(["unselected cells", "statement coordinate", "record compaction proof", "raw row identity"]),
  }),
});

export const artifactTiers: readonly ArtifactTier[] = Object.freeze([
  artifactTierTable.log,
  artifactTierTable.state,
  artifactTierTable.record,
  artifactTierTable.content,
]);

export function artifactTier(name: ArtifactTierName): ArtifactTier {
  return artifactTierTable[name];
}

export type StatementValue =
  | null
  | boolean
  | number
  | string
  | readonly StatementValue[]
  | { readonly [key: string]: StatementValue };

/** The EAVT coordinate recording where a statement occurs in its source order. */
export type StatementCoordinate = StatementValue;

export interface StatementRow {
  readonly e: StatementValue;
  readonly a: StatementValue;
  readonly v: StatementValue;
  readonly t: StatementCoordinate;
}

export type StatementTuple = readonly [
  entity: StatementValue,
  attribute: StatementValue,
  value: StatementValue,
  time: StatementCoordinate,
];

export interface ArtifactProjectionStep {
  /** Frozen legacy wire tag; the source concept is an artifact projection. */
  readonly kind: "witness.projection-step";
  readonly from: ArtifactTierName;
  readonly to: ArtifactTierName;
  readonly law: "deterministic-projection";
  readonly information: "non-increasing";
  readonly preserves: readonly string[];
  readonly mayForget: readonly string[];
}

export interface ArtifactInformationChain {
  /** Frozen legacy wire tag; the source concept is an artifact information chain. */
  readonly kind: "witness.information-chain";
  readonly tiers: readonly ArtifactTier[];
  readonly projections: readonly ArtifactProjectionStep[];
  readonly source: ArtifactTierName;
  readonly terminal: ArtifactTierName;
  /** Frozen legacy wire value. */
  readonly dataProcessing: "witness";
  readonly ok: boolean;
  readonly violations: readonly string[];
}

export interface StatementLogInformation {
  /** Frozen legacy wire tag. */
  readonly kind: "witness.log-information";
  readonly rows: number;
  readonly uniqueStatements: number;
  readonly duplicateStatements: number;
  readonly entropyUnits: number;
  readonly duplicateSurprisal: 0;
  readonly identities: readonly string[];
}

export function artifactProjectionStep(from: ArtifactTierName, to: ArtifactTierName): ArtifactProjectionStep {
  const source = artifactTier(from);
  const target = artifactTier(to);
  if (source.rank < target.rank) throw new TypeError(`artifactProjectionStep: ${from} cannot project upward to ${to}`);
  return Object.freeze({
    kind: "witness.projection-step" as const,
    from,
    to,
    law: "deterministic-projection" as const,
    information: "non-increasing" as const,
    preserves: Object.freeze(target.preserves.filter((entry) => source.preserves.includes(entry) || entry === "current functional facts" || entry === "settled datoms" || entry === "entity address")),
    mayForget: Object.freeze([...new Set([...source.mayForget, ...target.mayForget])]),
  });
}

export function artifactInformationChain(tiers: readonly ArtifactTier[] = artifactTiers): ArtifactInformationChain {
  const violations: string[] = [];
  for (let i = 1; i < tiers.length; i += 1) {
    if (tiers[i - 1]!.rank < tiers[i]!.rank) {
      violations.push(`${tiers[i - 1]!.name}->${tiers[i]!.name} increases information rank`);
    }
  }
  if (tiers[0]?.name !== "log") violations.push("log source is not first");
  if (tiers[tiers.length - 1]?.name !== "content") violations.push("content lossy cut is not terminal");
  const projections = tiers.slice(1).map((tier, index) => artifactProjectionStep(tiers[index]!.name, tier.name));
  return Object.freeze({
    kind: "witness.information-chain" as const,
    tiers: Object.freeze([...tiers]),
    projections: Object.freeze(projections),
    source: "log" as const,
    terminal: "content" as const,
    dataProcessing: "witness" as const,
    ok: violations.length === 0,
    violations: Object.freeze(violations),
  });
}

export function isStatementValue(value: unknown): value is StatementValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isStatementValue);
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value as Record<string, unknown>).every(isStatementValue);
  }
  return false;
}

export function statementValue(value: unknown, context: string): StatementValue {
  if (!isStatementValue(value)) throw new TypeError(`${context}: not a statement value`);
  return value;
}

export function canonicalStatementValue(value: StatementValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStatementValue).join(",")}]`;
  const object = value as { readonly [key: string]: StatementValue };
  const keys = Object.keys(object).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStatementValue(object[key] as StatementValue)}`).join(",")}}`;
}

export function statementRow(row: StatementTuple | StatementRow): StatementRow {
  if (Array.isArray(row)) {
    const [e, a, v, t] = row as StatementTuple;
    return Object.freeze({ e, a, v, t });
  }
  const record = row as StatementRow;
  return Object.freeze({ e: record.e, a: record.a, v: record.v, t: record.t });
}

export function statementTuple(row: StatementTuple | StatementRow): StatementTuple {
  const normalized = statementRow(row);
  return Object.freeze([normalized.e, normalized.a, normalized.v, normalized.t] as const);
}

export function statementCell(entity: StatementValue, attribute: StatementValue, value: StatementValue, at: StatementCoordinate): StatementRow {
  return statementRow({ e: entity, a: attribute, v: value, t: at });
}

export function statementAttributes(
  entity: StatementValue,
  source: Readonly<Record<string, unknown>>,
  attributes: readonly string[],
  at: StatementCoordinate,
): StatementRow[] {
  const rows: StatementRow[] = [];
  for (const attribute of attributes) {
    const value = source[attribute];
    if (value === undefined || value === null) continue;
    rows.push(statementCell(entity, attribute, statementValue(value, `statement attribute ${attribute}`), at));
  }
  return rows;
}

export function sameStatement(left: StatementTuple | StatementRow, right: StatementTuple | StatementRow): boolean {
  return canonicalStatementValue(statementRow(left) as unknown as StatementValue) ===
    canonicalStatementValue(statementRow(right) as unknown as StatementValue);
}

export function statementIdentity(row: StatementTuple | StatementRow): string {
  return canonicalStatementValue(statementRow(row) as unknown as StatementValue);
}

export function statementLogInformation(log: readonly (StatementTuple | StatementRow)[]): StatementLogInformation {
  const identities = normalizeStatementLog(log).map(statementIdentity);
  const unique = [...new Set(identities)];
  return Object.freeze({
    kind: "witness.log-information" as const,
    rows: identities.length,
    uniqueStatements: unique.length,
    duplicateStatements: identities.length - unique.length,
    entropyUnits: unique.length,
    duplicateSurprisal: 0 as const,
    identities: Object.freeze(unique),
  });
}

/**
 * A feed's bytes-per-entropy-unit ratio charged through FOUR
 * (`chargeValueOfSides`): `held` at or under the bound — or when
 * `entropyUnits` is zero, since there is no ratio to obstruct and dividing by
 * zero would fabricate one — `denied` strictly over it. Never a bare boolean
 * field: the within-bound reading is the truth side, the over-bound reading
 * is the falsity side, and the bilattice corner names the charge.
 *
 * The ratio itself is a PROXY statistic standing in for the settled-section
 * conservation law (obsmetrologia `Cohomology`/`AntiLandauerEntropy`,
 * `index_balance: H⁰ − H¹ = χ`); see
 * `dev/content/notes/2026/07/03 obsticulation-mathematics`, conjectures C1–C2.
 */
export function feedEntropyCharge(bytesOnDisk: number, entropyUnits: number, bound: number): ChargeValueName {
  const overBound = entropyUnits > 0 && bytesOnDisk / entropyUnits > bound;
  return chargeValueName(chargeValueAt([chargeSide(overBound ? "absent" : "present"), chargeSide(overBound ? "present" : "absent")]));
}

export function normalizeStatementLog(log: readonly (StatementTuple | StatementRow)[]): readonly StatementRow[] {
  return Object.freeze(log.map(statementRow));
}

export function sameStatementLog(
  left: readonly (StatementTuple | StatementRow)[],
  right: readonly (StatementTuple | StatementRow)[],
): boolean {
  return canonicalStatementValue(normalizeStatementLog(left) as unknown as StatementValue) ===
    canonicalStatementValue(normalizeStatementLog(right) as unknown as StatementValue);
}
