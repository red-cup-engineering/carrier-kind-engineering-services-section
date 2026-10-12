/**
 * ledger — playing's own filesystem realization of scripted invocation witnessing.
 *
 * relating's `dispatch`/`serve` accept an `onInvocation`/`now` hook pair but
 * deliberately leave filesystem persistence to the service boundary ("Filesystem
 * persistence is deliberately outside this module" — relating's
 * `running/invocation`). This module is that boundary for playing: every
 * successfully dispatched play is cellized through relating's own
 * `invocationFeed` (E = caller, A = { verb, args, action? }, V = the returned
 * value, T = now) and appended as EAVT JSONL under a data root, in a file keyed
 * to playing's own package name — playing's OWN ledger, not a shared one.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { invocationFeed, type Invocation } from "@red-cup-engineering/relating";
import { serialize as serializeEavt } from "@red-cup-engineering/relating/codecs/text/json/jsonl/eavt";

/** A filesystem-safe leaf slug for a namespace term (drops a leading scope `@`). */
function slug(namespace: string): string {
  return namespace.replace(/^@/, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "package";
}

/** The UTC date (YYYY-MM-DD) named by a witness timestamp; a malformed timestamp
 *  falls back to a stable placeholder date rather than throwing. */
function dateOf(at: unknown): string {
  const text = String(at);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "0000-00-00";
}

/** Append one invocation's EAVT witness row to the package's own dated ledger
 *  file under `dataRoot`. Best-effort and advisory: a persistence failure must
 *  never surface to the dispatching caller, matching relating's own witnessing
 *  contract ("a witness failure must not change the action's output"). */
export function witnessInvocation(dataRoot: string, namespace: string, invocation: Invocation): void {
  try {
    const date = dateOf(invocation.at);
    const [year, month, day] = date.split("-");
    const logDir = path.join(dataRoot, "data", "log", year ?? "0000", month ?? "00", day ?? "00");
    const file = path.join(logDir, `${date}-${slug(namespace)}-log.jsonl`);
    const rows = invocationFeed.cellize(invocation, invocation.at);
    mkdirSync(logDir, { recursive: true });
    appendFileSync(file, serializeEavt(rows), "utf8");
  } catch {
    // witnessing is advisory: never let a persistence failure change dispatch output.
  }
}

/** Build the `onInvocation` hook `dispatch`/`serve` call on every successful play,
 *  persisting it into playing's own EAVT ledger under `dataRoot`. */
export function filesystemInvocationWitness(dataRoot: string, namespace: string): (invocation: Invocation) => void {
  return (invocation: Invocation): void => witnessInvocation(dataRoot, namespace, invocation);
}
