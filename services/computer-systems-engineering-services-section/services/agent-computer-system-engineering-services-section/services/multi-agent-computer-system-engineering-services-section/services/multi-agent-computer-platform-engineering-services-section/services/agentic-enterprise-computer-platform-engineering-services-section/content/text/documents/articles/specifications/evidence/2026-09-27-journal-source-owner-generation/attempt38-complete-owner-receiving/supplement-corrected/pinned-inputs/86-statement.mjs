import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * @packageDocumentation
 * statement - EAVT statement identity and source-row law.
 *
 * This stratum owns the pure EAVT statement shape. It does not
 * know JSONL, files, hashes, SSE, or HTTP. Those are codec, store, projection,
 * or service realizations of this law.
 *
 * Generic over EAVT, not RWIL-specific: `ArtifactTier` and
 * `artifactInformationChain` name the four-tier `log -> state -> record ->
 * content` projection, which carries any EAVT row — `a` is typed as
 * the general `StatementValue`, not SEN's `Tm`. RWIL proper is the subtype of
 * EAVT row whose `a` is specifically an SEN term (e and v are entity/value paths, t
 * is time); this module does not check or require that, and nothing exported
 * here is named "Rwil" — see AGENTS.md's RWIL entry for the narrower term.
 *
 * @metroplatSubject records
 */

const artifactTierTable = Object.freeze({
  log: Object.freeze({
    kind: "witness.tier",
    name: "log",
    role: "source",
    rank: 3,
    pathSegment: "data/journals",
    queryClass: "all admitted statement rows, including coordinates and duplicate attempts",
    preserves: Object.freeze(["E", "A", "V", "T", "contract exposure", "append order", "content identity"]),
    mayForget: Object.freeze([]),
  }),
  state: Object.freeze({
    kind: "witness.tier",
    name: "state",
    role: "sufficient-statistic",
    rank: 2,
    pathSegment: "data/state",
    queryClass: "current value of declared functional/accumulating cells",
    preserves: Object.freeze(["current functional facts", "accumulated non-functional evidence", "cell identity"]),
    mayForget: Object.freeze(["superseded statement history", "append attempt duplicates"]),
  }),
  record: Object.freeze({
    kind: "witness.tier",
    name: "record",
    role: "rate-distortion-code",
    rank: 1,
    pathSegment: "data/records",
    queryClass: "settled datom invariants and kept live-log rows",
    preserves: Object.freeze(["settled datoms", "reading slot", "kept source rows"]),
    mayForget: Object.freeze(["rows made redundant by a settled reading", "projection-local ordering detail"]),
  }),
  content: Object.freeze({
    kind: "witness.tier",
    name: "content",
    role: "lossy-cut",
    rank: 0,
    pathSegment: "content",
    queryClass: "browsable term-addressed document cuts",
    preserves: Object.freeze(["entity address", "selected presentation fields", "document content"]),
    mayForget: Object.freeze(["unselected cells", "statement coordinate", "record compaction proof", "raw row identity"]),
  }),
});

export const artifactTiers = Object.freeze([
  artifactTierTable.log,
  artifactTierTable.state,
  artifactTierTable.record,
  artifactTierTable.content,
]);

export function artifactTier(name) {
  return artifactTierTable[name];
}

/** The EAVT coordinate recording where a statement occurs in its source order. */

export function artifactProjectionStep(from, to) {
  const source = artifactTier(from);
  const target = artifactTier(to);
  if (source.rank < target.rank) throw new TypeError(`artifactProjectionStep: ${from} cannot project upward to ${to}`);
  return Object.freeze({
    kind: "witness.projection-step",
    from,
    to,
    law: "deterministic-projection",
    information: "non-increasing",
    preserves: Object.freeze(target.preserves.filter((entry) => source.preserves.includes(entry) || entry === "current functional facts" || entry === "settled datoms" || entry === "entity address")),
    mayForget: Object.freeze([...new Set([...source.mayForget, ...target.mayForget])]),
  });
}

export function artifactInformationChain(tiers = artifactTiers) {
  const violations = [];
  for (let i = 1; i < tiers.length; i += 1) {
    if (tiers[i - 1].rank < tiers[i].rank) {
      violations.push(`${tiers[i - 1].name}->${tiers[i].name} increases information rank`);
    }
  }
  if (tiers[0]?.name !== "log") violations.push("log source is not first");
  if (tiers[tiers.length - 1]?.name !== "content") violations.push("content lossy cut is not terminal");
  const projections = tiers.slice(1).map((tier, index) => artifactProjectionStep(tiers[index].name, tier.name));
  return Object.freeze({
    kind: "witness.information-chain",
    tiers: Object.freeze([...tiers]),
    projections: Object.freeze(projections),
    source: "log",
    terminal: "content",
    dataProcessing: "witness",
    ok: violations.length === 0,
    violations: Object.freeze(violations),
  });
}

export function isStatementValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isStatementValue);
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value).every(isStatementValue);
  }
  return false;
}

export function statementValue(value, context) {
  if (!isStatementValue(value)) throw new TypeError(`${context}: not a statement value`);
  return value;
}

export function canonicalStatementValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStatementValue).join(",")}]`;
  const object = value;
  const keys = Object.keys(object).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStatementValue(object[key])}`).join(",")}}`;
}

export function statementRow(row) {
  if (Array.isArray(row)) {
    const [e, a, v, t] = row;
    return Object.freeze({ e, a, v, t });
  }
  const record = row;
  return Object.freeze({ e: record.e, a: record.a, v: record.v, t: record.t });
}

export function statementTuple(row) {
  const normalized = statementRow(row);
  return Object.freeze([normalized.e, normalized.a, normalized.v, normalized.t]);
}

export function statementCell(entity, attribute, value, at) {
  return statementRow({ e: entity, a: attribute, v: value, t: at });
}

export function statementAttributes(
  entity,
  source,
  attributes,
  at,
) {
  const rows = [];
  for (const attribute of attributes) {
    const value = source[attribute];
    if (value === undefined || value === null) continue;
    rows.push(statementCell(entity, attribute, statementValue(value, `statement attribute ${attribute}`), at));
  }
  return rows;
}

export function sameStatement(left, right) {
  return canonicalStatementValue(statementRow(left)) ===
    canonicalStatementValue(statementRow(right));
}

export function statementIdentity(row) {
  return canonicalStatementValue(statementRow(row));
}

export function statementLogInformation(log) {
  const identities = normalizeStatementLog(log).map(statementIdentity);
  const unique = [...new Set(identities)];
  return Object.freeze({
    kind: "witness.log-information",
    rows: identities.length,
    uniqueStatements: unique.length,
    duplicateStatements: identities.length - unique.length,
    entropyUnits: unique.length,
    duplicateSurprisal: 0,
    identities: Object.freeze(unique),
  });
}

/**
 * A feed's bytes-per-entropy-unit ratio read through FOUR (extremal family):
 * `held` at or under the bound — or when
 * `entropyUnits` is zero, since there is no ratio to obstruct and dividing by
 * zero would fabricate one — `denied` strictly over it. Never a bare boolean
 * field: the within-bound reading is the truth side, the over-bound reading
 * is the falsity side, and the extremal reading names the point.
 *
 * The ratio itself is a PROXY statistic standing in for the settled-section
 * conservation law (obsmetrologia `Cohomology`/`AntiLandauerEntropy`,
 * `index_balance: H⁰ − H¹ = χ`); see
 * `dev/content/notes/2026/07/03 obsticulation-mathematics`, conjectures C1–C2.
 */
export function feedEntropyReading(bytesOnDisk, entropyUnits, bound) {
  const overBound = entropyUnits > 0 && bytesOnDisk / entropyUnits > bound;
  return readingOfSides("extremal", !overBound, overBound);
}

export function normalizeStatementLog(log) {
  return Object.freeze(log.map(statementRow));
}

export function sameStatementLog(
  left,
  right,
) {
  return canonicalStatementValue(normalizeStatementLog(left)) ===
    canonicalStatementValue(normalizeStatementLog(right));
}
