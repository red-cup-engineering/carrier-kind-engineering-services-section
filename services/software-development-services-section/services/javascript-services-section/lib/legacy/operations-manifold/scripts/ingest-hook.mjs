#!/usr/bin/env node
/**
 * Ingest hook adapter for 561 Group Operations Manifold.
 *
 * This is not a CLI and not a package-bin morphism. A harness (Claude Code,
 * OpenAI Codex, or another agent runner) supplies one hook payload on stdin;
 * this adapter records that payload into 561 Group Operations Manifold's durable
 * operation / read-work / message ledgers. The package-bin morphism remains the
 * EAVT surface. The harness identity (src/harness.mts) namespaces the channel,
 * trace, speaker, and subject so a Claude session is recorded as claude and a
 * Codex session as codex without forking the ledgers.
 */
import { runOperationsManifoldDocumentScript } from "../src/document-scripts.mts";
import { recordMessage } from "../src/operating/messaging/channels/channel-message.mts";
import { recordHookEvent } from "../src/operating/recording/operations/ledgering/library/operation-ledger.mts";
import { isMainModule, repoRootFromModule } from "../src/runtime.mts";
import { codexHookEventName, codexHookPayloadFromText, codexHookPromptText, codexHookSessionId } from "../src/codex-hook.mts";
import { harnessChannel, harnessIdentity, harnessTrace } from "../src/harness.mts";
import { readStdin } from "../src/script-stdio.mts";
import { recordHookWorkEvent } from "../src/work-management.mts";

async function recordHookMessage(repoRoot, payload, identity) {
  if (codexHookEventName(payload) !== "UserPromptSubmit") return null;
  const text = codexHookPromptText(payload);
  if (text === null) return null;
  const session = codexHookSessionId(payload);
  return recordMessage(repoRoot, {
    channel: harnessChannel(identity, session),
    role: "user",
    speaker: "user",
    text,
    trace: `${harnessTrace(identity, session)}:UserPromptSubmit`,
    session,
    procedure: "ingest-hook",
    evidence: [
      `${identity.harness}-hook:UserPromptSubmit`,
      "scripts/ingest-hook.mjs",
      "scripts/record-message.mjs",
    ],
  });
}

function eavtLine(subject, attribute, value, identity) {
  return `${JSON.stringify([subject, attribute, value, [identity.harness, "hook"]])}\n`;
}

function hookDocument(payload, identity) {
  const subject = `${harnessTrace(identity, codexHookSessionId(payload))}:${codexHookEventName(payload)}`;
  return [
    eavtLine(subject, "operations-manifold.script.action", "scripts.record-hook-document", identity),
    eavtLine(subject, "operations-manifold.hook.event", codexHookEventName(payload), identity),
    eavtLine(subject, "operations-manifold.hook.harness", identity.harness, identity),
    eavtLine(subject, `${identity.harness}.hook_event_name`, codexHookEventName(payload), identity),
    eavtLine(subject, `${identity.harness}.session_id`, codexHookSessionId(payload), identity),
  ].join("");
}

export async function ingestHook(metaUrl) {
  const repoRoot = repoRootFromModule(metaUrl);
  const stdin = await readStdin();
  const payload = codexHookPayloadFromText(stdin);
  const identity = harnessIdentity({ payload });
  const morphism = await runOperationsManifoldDocumentScript("record-hook-document", hookDocument(payload, identity));
  const [operation, work, message] = await Promise.all([
    recordHookEvent(repoRoot, { stdin, source: `${identity.harness}.hook.ingest`, harness: identity.harness }),
    recordHookWorkEvent(repoRoot, { stdin, source: `${identity.harness}.hook.ingest`, harness: identity.harness }),
    recordHookMessage(repoRoot, payload, identity),
  ]);
  return Object.freeze({
    kind: "operations-manifold.ingest-hook",
    harness: identity.harness,
    operation,
    work,
    message,
    morphism,
  });
}

if (isMainModule(import.meta.url)) {
  ingestHook(import.meta.url)
    .then(() => process.exit(0))
    .catch((error) => {
      process.stderr.write(`ingest-hook: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
