#!/usr/bin/env node
/**
 * PreCompact handoff adapter.
 *
 * Compaction drops conversational context; this hook fires just before it and
 * writes a durable createCheckpoint so the session's projected JSON state is
 * witnessed at the compaction boundary and can be replayed afterward. Prior art:
 * Continuous-Claude's pre-compact-continuity handoff. Degrades to a clean exit so
 * the gate can never block compaction.
 */
import { createCheckpoint } from "../src/checkpoints.mts";
import { harnessIdentity } from "../src/harness.mts";
import { codexHookPayloadFromText, codexHookSessionId } from "../src/codex-hook.mts";
import { isMainModule, repoRootFromModule } from "../src/runtime.mts";
import { readStdin } from "../src/script-stdio.mts";
import { stringField } from "../src/records.mts";

async function handoff(metaUrl) {
  const repoRoot = repoRootFromModule(metaUrl);
  const payload = codexHookPayloadFromText(await readStdin());
  const identity = harnessIdentity({ payload });
  const session = codexHookSessionId(payload);
  const trigger = stringField(payload, "trigger") ?? "auto";
  return createCheckpoint(repoRoot, {
    label: `precompact-${identity.harness}-${session}`,
    reason: `PreCompact ${trigger} handoff for ${identity.label} session ${session}`,
    source: `${identity.harness}.precompact`,
  });
}

if (isMainModule(import.meta.url)) {
  handoff(import.meta.url)
    .then(() => process.exit(0))
    .catch(() => process.exit(0));
}
