#!/usr/bin/env node
import { leanOperationRecord, recordHookEvent } from "../src/operating/recording/operations/ledgering/library/operation-ledger.mts";
import { leanWorkHookEvent, recordHookWorkEvent } from "../src/work-management.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => {
  const hookParams = {
    event: params["event"],
    hook_event_name: params["hook_event_name"],
    session_id: params["session_id"],
    transcript_path: params["transcript_path"],
    cwd: params["cwd"],
    payload: params["payload"],
    stdin: params["stdin"],
    harness: params["harness"],
    source: "operations-manifold.script",
  };
  return Promise.all([
    recordHookEvent(repoRoot, hookParams),
    recordHookWorkEvent(repoRoot, hookParams),
  ]).then(([operation, work]) => Object.freeze({ kind: "operations-manifold.record-hook-event", operation: leanOperationRecord(operation), work: leanWorkHookEvent(work) }));
};

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "record-hook-event", "operations-manifold record-hook-event result", morphism);
}
