#!/usr/bin/env node
import { readBcp14Requirements } from "@red-cup-engineering/read-bcp-14-requirements-service";
import { constituteEntity } from "@red-cup-engineering/eavt";

const FORCE_MODALITY = {
  "MUST": "necessary",
  "SHALL": "necessary",
  "REQUIRED": "necessary",
  "MUST NOT": "determined",
  "SHALL NOT": "determined",
  "SHOULD": "possible",
  "RECOMMENDED": "possible",
  "SHOULD NOT": "possible",
  "NOT RECOMMENDED": "possible",
  "MAY": "impossible-now",
  "OPTIONAL": "impossible-now",
};

const MODALITY_HORIZON = {
  determined: "now",
  necessary: "soon",
  possible: "later",
  "impossible-now": "eventually",
};

/**
 * Reads one founder utterance into EAVT work rows: a genesis row and one row per BCP 14 requirement, each valued with force, subject, predicate, object, modality, horizon, line, and repetition count.
 * @param {object} request A record with utterance ({text, source, ts}), optional
 *   priorRows (previously produced rows, used to count repeated requirements), and t
 *   (the witness/provenance value stamped on every row).
 * @returns {object} An UtteranceWorkRows record: type, version, entity ({kind,
 *   address}), rows (the genesis row followed by one row per requirement),
 *   requirements (the requirement-row count), and refusals (from the BCP 14 read).
 * @throws {TypeError} When utterance.text is not a string.
 */
export function readUtteranceAsWorkRows(request) {
  const utterance = request?.utterance;
  if (typeof utterance?.text !== "string") throw new TypeError("utterance.text is required");
  const priorRows = Array.isArray(request.priorRows) ? request.priorRows : [];
  const t = request.t;
  const { address, genesisRow } = constituteEntity({
    kind: "utterance",
    attributes: { text: utterance.text, source: utterance.source ?? null, ts: utterance.ts ?? null },
    t,
  });
  const { requirements, refusals } = readBcp14Requirements({ text: utterance.text });
  const rows = [genesisRow];
  for (const requirement of requirements) {
    const { force, subject, predicate, object, line } = requirement;
    const modality = FORCE_MODALITY[force] ?? "impossible-now";
    const horizon = MODALITY_HORIZON[modality];
    const priorCount = priorRows.filter((row) =>
      row?.v?.subject === subject && row?.v?.predicate === predicate && row?.v?.object === object && row?.v?.force === force
    ).length;
    rows.push({ e: address, a: "requiring", v: { force, subject, predicate, object, modality, horizon, line, count: priorCount + 1 }, t });
  }
  return { type: "UtteranceWorkRows", version: 1, entity: { kind: "utterance", address }, rows, requirements: requirements.length, refusals };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("readUtteranceAsWorkRows — Reads one founder utterance into EAVT work rows: a genesis row and one row per BCP 14 requirement, each valued with force, subject, predicate, object, modality, horizon, line, and repetition count.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(readUtteranceAsWorkRows(JSON.parse(line)))}\n`);
    }
  }
}
