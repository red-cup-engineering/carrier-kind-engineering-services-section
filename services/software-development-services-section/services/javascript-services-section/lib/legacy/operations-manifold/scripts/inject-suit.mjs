#!/usr/bin/env node
/**
 * Inject-suit hook adapter for 561 Group Operations Manifold.
 *
 * A harness (Claude Code / Codex) supplies one hook payload on stdin at
 * SessionStart / UserPromptSubmit. This adapter projects 561 Group Operations Manifold's project-context-suit
 * grounding (src/suit-injection.mts) and writes it to stdout, which the harness
 * injects into the model's context — so the agent starts the turn suited, not
 * blind. Like ingest-hook.mjs this is a hook adapter, not a JSON
 * package-bin: it emits injectable text, and any failure degrades to silence so
 * grounding can never break the turn.
 */
import { isMainModule, repoRootFromModule } from "../src/runtime.mts";
import { codexHookEventName, codexHookParams, codexHookPayloadFromText } from "../src/codex-hook.mts";
import { readStdin } from "../src/script-stdio.mts";
import { suitInjectionText } from "../src/suit-injection.mts";

if (isMainModule(import.meta.url)) {
  try {
    const repoRoot = repoRootFromModule(import.meta.url);
    const payload = codexHookPayloadFromText(await readStdin());
    const text = await suitInjectionText(repoRoot, codexHookParams(payload));
    // The harness-correct injection form (Claude Code hooks reference): emit JSON
    // on exit 0 with hookSpecificOutput.additionalContext for the firing event.
    // Claude Code injects additionalContext for SessionStart and UserPromptSubmit;
    // the JSON envelope is portable where bare stdout is not.
    const out = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: codexHookEventName(payload),
        additionalContext: text,
      },
    });
    process.stdout.write(`${out}\n`);
    process.exit(0);
  } catch {
    process.exit(0); // degrade to silence — grounding must never break the turn
  }
}
