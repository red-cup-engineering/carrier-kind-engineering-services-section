#!/usr/bin/env node
/**
 * Stop-gate hook adapter for 561 Group Operations Manifold.
 *
 * Reads no arguments. Runs on the harness Stop / SubagentStop hook. When the
 * manifold has stop-gated read-work that is not yet settled, it emits the
 * Claude-Code-correct blocking form on exit 0:
 *
 *   {"decision":"block","reason":"<unfinished work + how to settle it>"}
 *
 * Per the hooks reference, JSON is parsed only on exit 0, and a Stop `decision:
 * block` continues the turn with the reason as actionable feedback rather than
 * surfacing an error. When nothing blocks, it emits nothing and exits 0 so the
 * stop proceeds. Any failure degrades to a clean exit so the gate can never wedge
 * the turn.
 */
import { isMainModule, repoRootFromModule } from "../src/runtime.mts";
import { codexHookPayloadFromText, codexHookSessionId } from "../src/codex-hook.mts";
import { readStdin } from "../src/script-stdio.mts";
import { workStopGate } from "../src/work-management.mts";

async function checkStopGate(metaUrl) {
  const repoRoot = repoRootFromModule(metaUrl);
  // The Stop payload carries the session id; gate this session on its own
  // read-work, not the whole manifold's open backlog.
  const session = codexHookSessionId(codexHookPayloadFromText(await readStdin()));
  const params = session === "unknown-session" ? {} : { session };
  try {
    await workStopGate(repoRoot, params);
    return false; // nothing this session owns blocks the stop
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stdout.write(`${JSON.stringify({ decision: "block", reason })}\n`);
    return true;
  }
}

if (isMainModule(import.meta.url)) {
  checkStopGate(import.meta.url)
    .then(() => process.exit(0)) // exit 0 so a JSON decision is parsed, not treated as an error
    .catch(() => process.exit(0)); // degrade to allow-stop — the gate must never wedge the turn
}
