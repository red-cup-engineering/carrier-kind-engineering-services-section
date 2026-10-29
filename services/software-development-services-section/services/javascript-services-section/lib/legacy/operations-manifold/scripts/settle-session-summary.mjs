#!/usr/bin/env node
/**
 * settle-session-summary — package-bin and SessionEnd hook adapter.
 *
 * As a package-bin it folds a session's durable manifold evidence into the
 * claude-mem-shaped {request, investigated, learned, completed, next_steps}
 * summary and files it as an append-only EAVT finding. As a SessionEnd hook it
 * receives the harness payload (session_id, transcript_path) on stdin and does
 * the same, so each session's distillation outlives the chat.
 */
import { settleSessionSummary } from "../src/session-summary.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => settleSessionSummary(repoRoot, {
  session: params["session"] ?? params["session_id"],
  session_id: params["session_id"],
  harness: params["harness"],
  trace: params["trace"],
  transcript: params["transcript"],
  transcript_path: params["transcript_path"],
});

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "settle-session-summary", "operations-manifold session summary", morphism);
}
