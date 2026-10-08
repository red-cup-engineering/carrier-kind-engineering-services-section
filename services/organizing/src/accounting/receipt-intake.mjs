import { balances, isTransaction, makeRegistry } from "./ledger.mjs";
import { gradedToExactString } from "@red-cup-engineering/exact-number-data-service/graded";

const nonemptyText = (value) => typeof value === "string" && value.trim().length > 0;
const economicMetaFields = ["recognition", "economic_event", "contract_id", "invoice_id", "performance_id", "source_id", "evidence_ids", "venue", "account", "mandate_id", "witness_block", "witness_nodes", "witness_database_hash"];

function scalar(value) {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string") return `string:${value}`;
  if (typeof value === "number") return `number:${value}`;
  if (typeof value === "boolean") return `boolean:${value}`;
  return null;
}

function evidenceIds(value) {
  if (!nonemptyText(value)) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(nonemptyText) ? parsed : null;
  } catch { return null; }
}

function postingPayload(transaction) {
  const rows = [];
  for (const posting of transaction.postings) {
    const fields = economicMetaFields.map((field) => scalar(posting.meta[field]));
    if (fields.some((value) => value === null)) return null;
    rows.push([posting.account, posting.amount ? gradedToExactString(posting.amount) : null, posting.cost?.kind ?? null, posting.cost?.amount ? gradedToExactString(posting.cost.amount) : null, posting.cost?.date ?? null, posting.cost?.label ?? null, posting.price?.kind ?? null, posting.price?.amount ? gradedToExactString(posting.price.amount) : null, posting.balanceAssertion?.sole ?? false, posting.balanceAssertion?.amount ? gradedToExactString(posting.balanceAssertion.amount) : null, scalar(posting.meta.virtual), ...fields]);
  }
  return rows.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function economicPayload(candidate) {
  const postings = postingPayload(candidate.transaction);
  if (!postings) return null;
  const transactionMeta = economicMetaFields.map((field) => scalar(candidate.transaction.meta[field]));
  if (transactionMeta.some((value) => value === null)) return null;
  return JSON.stringify([candidate.transaction.date, candidate.transaction.time, candidate.transaction.flag, candidate.transaction.payee, candidate.transaction.narration, ...transactionMeta, postings]);
}

function admitted(candidate) {
  if (!candidate || typeof candidate !== "object") return false;
  const value = candidate;
  const evidence = value.evidence;
  const persistedEvidence = value.transaction !== undefined && isTransaction(value.transaction) ? evidenceIds(value.transaction.meta.evidence_ids) : null;
  return nonemptyText(value.sourceId) && Array.isArray(evidence) && evidence.length > 0 && evidence.every(nonemptyText) && value.transaction !== undefined && isTransaction(value.transaction) && value.transaction.meta.source_id === value.sourceId && persistedEvidence !== null && JSON.stringify([...persistedEvidence].sort()) === JSON.stringify([...evidence].sort());
}

function existingPayload(entry) {
  const sourceId = entry.meta.source_id;
  const evidence = evidenceIds(entry.meta.evidence_ids);
  return nonemptyText(sourceId) && evidence !== null ? economicPayload({ sourceId, evidence, transaction: entry }) : null;
}

/** Reconciles externally evidenced candidates without changing a book or inferring recognition.
 * @param {readonly Entry[]} existing Parsed retained entries.
 * @param {readonly unknown[]} candidates Proposed transactions with source identities and evidence.
 * @returns {ReceiptIntakeReport} Deterministic accepted, duplicate, conflict, and refusal worklists.
 */
export function reconcileReceiptCandidates(existing, candidates) {
  const existingBySource = new Map();
  for (const entry of existing) {
    if (!isTransaction(entry) || !nonemptyText(entry.meta.source_id)) continue;
    const payload = existingPayload(entry);
    existingBySource.set(entry.meta.source_id, [...(existingBySource.get(entry.meta.source_id) ?? []), payload]);
  }
  const refused = [];
  const groups = new Map();
  for (const raw of candidates) {
    if (!admitted(raw)) refused.push({ candidate: raw, reason: "candidate-identity-or-evidence-missing" });
    else {
      let balanced = false;
      try { balanced = balances(raw.transaction, makeRegistry()).balanced; } catch { refused.push({ candidate: raw, reason: "candidate-malformed" }); continue; }
      if (!balanced) { refused.push({ candidate: raw, reason: "candidate-unbalanced" }); continue; }
      if (!economicPayload(raw)) { refused.push({ candidate: raw, reason: "candidate-economic-metadata-not-scalar" }); continue; }
      groups.set(raw.sourceId, [...(groups.get(raw.sourceId) ?? []), raw]);
    }
  }
  const accepted = [], duplicates = [], conflicts = [];
  for (const [sourceId, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const payloads = new Set(group.map((candidate) => economicPayload(candidate)));
    if (payloads.size !== 1) conflicts.push(...group.map((candidate) => ({ candidate, reason: "incoming-source-identity-economic-payload-conflict" })));
    else {
      const payload = [...payloads][0], retained = existingBySource.get(sourceId) ?? [];
      if (retained.some((item) => item === null)) conflicts.push(...group.map((candidate) => ({ candidate, reason: "retained-source-identity-legacy-ambiguity" })));
      else if (retained.length > 1 || (retained.length === 1 && retained[0] !== payload)) conflicts.push(...group.map((candidate) => ({ candidate, reason: "retained-source-identity-economic-payload-conflict" })));
      else if (retained.length === 1) duplicates.push(...group);
      else { accepted.push(group[0]); duplicates.push(...group.slice(1)); }
    }
  }
  return Object.freeze({ type: "ReceiptIntakeReport", accepted: Object.freeze(accepted), duplicates: Object.freeze(duplicates), conflicts: Object.freeze(conflicts), refused: Object.freeze(refused) });
}
