/**
 * Service binding for scripted invocation witnesses.
 *
 * `src/running` owns the pure boundary event: a successful dispatch can report
 * an Invocation. This service owns the filesystem realization of `RELATING_DATA`.
 */
import path from "node:path";

import { invocationFeed, } from "../../src/running/invocation.mjs";
import { appendWitnesses, readWitnessLog, } from "../filesystem-store/index.mjs";
import { projectStateView, } from "../../src/ledger/state.mjs";

/** The UTC date (YYYY-MM-DD) named by a witness timestamp; safe fallback otherwise. */
function dateOf(at) {
  const text = String(at);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "0000-00-00";
}

/** A filesystem-safe leaf slug for a namespace term (drops a leading scope `@`). */
function slug(namespace) {
  return namespace.replace(/^@/, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "relating";
}

/** The dated, term-addressed witness store and feed name for a namespace's log. */
export function invocationStore(root, namespace, at) {
  const date = dateOf(at);
  const [year, month, day] = date.split("-");
  return {
    store: Object.freeze({
      logDir: path.join(root, "data", "log", year ?? "0000", month ?? "00", day ?? "00"),
      stateDir: path.join(root, "data", "state", year ?? "0000", month ?? "00", day ?? "00"),
      recordDir: path.join(root, "data", "record", year ?? "0000", month ?? "00", day ?? "00"),
    }),
    feed: `${date}-${slug(namespace)}-log`,
  };
}

/** Witness one invocation, best-effort. Never throws: a witness failure must not
 * change the action's output. Returns how many rows were genuinely new. */
export function witnessInvocation(
  dataRoot,
  namespace,
  invocation,
) {
  try {
    const { store, feed } = invocationStore(dataRoot, namespace, invocation.at);
    return appendWitnesses(store, feed, invocationFeed.cellize(invocation, invocation.at));
  } catch {
    return { appended: 0 };
  }
}

/** Build the dispatch hook that persists invocations under a data root. */
export function filesystemInvocationWitness(dataRoot, namespace) {
  return (invocation) => {
    witnessInvocation(dataRoot, namespace, invocation);
  };
}

/** Project the current view of an invocation log. */
export function projectInvocations(store, feed) {
  return projectStateView(readWitnessLog(store, feed), new Set());
}

/** Build the live feed reader for today's invocation log. */
export function filesystemInvocationLogReader(
  dataRoot,
  namespace,
  now = () => new Date().toISOString(),
) {
  return () => {
    try {
      const { store, feed } = invocationStore(dataRoot, namespace, now());
      return readWitnessLog(store, feed);
    } catch {
      return [];
    }
  };
}
