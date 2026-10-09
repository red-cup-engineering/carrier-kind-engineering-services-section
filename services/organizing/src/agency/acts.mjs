/**
 * Governing acts on the agency, kept as settled state beside the authored records.
 *
 * A released node reads its agency from the tree it was installed from. An office that governs
 * the agency at run time (agency-record-admit) does not write into that tree, nor into anyone's
 * working tree: each act is one line of an append-only log, naming the record's source, the
 * revision it replaced (`before`), the revision it makes (`after`) and the complete text.
 *
 * A source's text is the head of its revision chain, rooted at the authored bytes. Acts are
 * applied in log order while each one's `before` is the current revision. When a commit
 * codifies an act, the authored bytes are that act's `after`, so the chain resumes from there
 * and the earlier acts fall away with no one clearing them. An authored edit off the chain wins:
 * acts that no longer follow from the authored bytes are reported as stale, never applied.
 */
import { appendFileSync, closeSync, fsyncSync, mkdirSync, openSync, readFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

/** The act log a process governs and reads its agency through, when one is configured. */
export const agencyActsLog = (environment = process.env) => environment.AGENCY_ACTS_LOG?.trim() || undefined;

export const revisionOf = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Every act in a log, in order. An absent log holds no acts. */
export function readAgencyActs(log) {
  if (log === undefined) return [];
  let text;
  try { text = readFileSync(log, "utf8"); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
  return text.split("\n").filter((line) => line.trim() !== "").map((line) => JSON.parse(line));
}

/**
 * The head text of every source the acts reach, given how to read a source's authored bytes.
 * @param {object[]} acts
 * @param {(source: string) => Buffer | undefined} authored
 * @returns {{ heads: Map<string, { text: string, revision: string, act: object }>, stale: object[] }}
 */
export function foldAgencyActs(acts, authored) {
  const bySource = new Map();
  for (const act of acts) bySource.set(act.source, [...(bySource.get(act.source) ?? []), act]);
  const heads = new Map();
  const stale = [];
  for (const [source, chain] of bySource) {
    const bytes = authored(source);
    let current = bytes === undefined ? null : revisionOf(bytes);
    // The authored bytes may already carry a later act; the chain resumes after the last such act.
    const codified = chain.findLastIndex((act) => act.after === current);
    let head;
    for (const act of chain.slice(codified + 1)) {
      if (act.before === current) { current = act.after; head = act; } else stale.push(act);
    }
    if (head !== undefined) heads.set(source, Object.freeze({ text: head.text, revision: head.after, act: head }));
  }
  return Object.freeze({ heads, stale: Object.freeze(stale) });
}

/** Append one act (or the acts of one governing act, as an array) under the log's lock. A concurrent
 *  act is an obstruction, never an overwrite. */
export function appendAgencyAct(log, enact) {
  mkdirSync(path.dirname(log), { recursive: true, mode: 0o700 });
  const lock = `${log}.enacting`;
  mkdirSync(lock);
  try {
    const act = enact();
    appendFileSync(log, (Array.isArray(act) ? act : [act]).map((each) => `${JSON.stringify(each)}\n`).join(""), { mode: 0o600 });
    const handle = openSync(log, "r");
    try { fsyncSync(handle); } finally { closeSync(handle); }
    return act;
  } finally { rmSync(lock, { recursive: true }); }
}
