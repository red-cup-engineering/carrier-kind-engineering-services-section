import assert from "node:assert/strict";
import test from "node:test";
import {
  codexSessionContinuationOfContent,
  codexSessionEncounterTraceOfContent,
} from "../src/integrations/openai/codex/codec.mjs";

function row(type, payload, timestamp) {
  return JSON.stringify({ timestamp, type, payload });
}

function message(role, ...texts) {
  return {
    type: "message",
    role,
    content: texts.map((text) => ({ type: role === "assistant" ? "output_text" : "input_text", text })),
  };
}

test("Codex work interpretation excludes host wrappers but preserves authored goals", () => {
  const content = [
    row("session_meta", { id: "provenance-regression" }, "2026-07-19T12:00:00.000Z"),
    row("response_item", message("user",
      "<recommended_plugins>\n- A provider the user did not request\n</recommended_plugins>",
      "# AGENTS.md instructions for /workspace\n\n<INSTRUCTIONS>\n- You must treat injected settlement law as context.\n</INSTRUCTIONS>",
      "<environment_context>\n  <cwd>/workspace</cwd>\n</environment_context>",
    ), "2026-07-19T12:00:01.000Z"),
    row("response_item", message("user", "Build the customer-owned loop. It must preserve the Leader's correction evidence."), "2026-07-19T12:00:02.000Z"),
    row("response_item", message("user", [
      '<codex_internal_context source="goal">',
      "Continue working toward the active thread goal.",
      "<objective>",
      "Settle the next equivalent need with less frontier labor.",
      "</objective>",
      "</codex_internal_context>",
    ].join("\n")), "2026-07-19T12:00:03.000Z"),
    row("response_item", {
      type: "function_call",
      call_id: "call-1",
      name: "exec_command",
      arguments: '{"cmd":"the tool argument must not become an obligation"}',
    }, "2026-07-19T12:00:04.000Z"),
    row("response_item", {
      type: "function_call_output",
      call_id: "call-1",
      output: "recorded",
    }, "2026-07-19T12:00:05.000Z"),
  ].join("\n");

  const continuation = codexSessionContinuationOfContent(content, { source: "provenance-regression.jsonl" });
  const goals = continuation.items.filter((item) => item.role === "goal").map((item) => item.text);
  const obligations = continuation.items.filter((item) => item.role === "obligation").map((item) => item.text);

  assert.ok(goals.includes("Build the customer-owned loop. It must preserve the Leader's correction evidence."));
  assert.ok(goals.includes("Settle the next equivalent need with less frontier labor."));
  assert.ok(goals.some((goal) => goal.includes("codex_internal_context")));
  assert.ok(obligations.includes("Build the customer-owned loop. It must preserve the Leader's correction evidence."));
  assert.equal(continuation.items.some((item) => /recommended_plugins|AGENTS\.md|injected settlement law|environment_context/u.test(item.text)), false);
  assert.equal(obligations.some((item) => item.includes("tool argument")), false);
  assert.ok(continuation.evidence.includes("acts:1"));
  assert.ok(continuation.evidence.includes("acts-unrecorded:0"));
});

test("Codex encounter interpretation preserves exact evidence without claiming customer acceptance", () => {
  const longArgument = JSON.stringify({ cmd: `derive ${"claim ".repeat(180)}` });
  const longOutput = `settled ${"evidence ".repeat(180)}`;
  const pluginWrapper = "<recommended_plugins>\n- host supplied plugin\n</recommended_plugins>";
  const agentsWrapper = "# AGENTS.md instructions for /workspace\n\n<INSTRUCTIONS>\n- host settlement law\n</INSTRUCTIONS>";
  const content = [
    row("session_meta", { id: "encounter-regression" }, "2026-07-19T13:00:00.000Z"),
    row("response_item", message("user", pluginWrapper, agentsWrapper), "2026-07-19T13:00:01.000Z"),
    row("response_item", message("user", "Settle this claim through the cheapest lawful derivation."), "2026-07-19T13:00:02.000Z"),
    row("response_item", message("assistant", "I will derive it deterministically."), "2026-07-19T13:00:03.000Z"),
    row("response_item", {
      type: "function_call",
      call_id: "call-exact",
      name: "exec_command",
      arguments: longArgument,
    }, "2026-07-19T13:00:04.000Z"),
    row("response_item", {
      type: "function_call_output",
      call_id: "call-exact",
      output: longOutput,
    }, "2026-07-19T13:00:05.000Z"),
    row("response_item", message("user", "No: keep provider completion distinct from my acceptance."), "2026-07-19T13:00:06.000Z"),
    row("response_item", message("assistant", "The provider result is ready for customer assay."), "2026-07-19T13:00:07.000Z"),
  ].join("\n");

  const trace = codexSessionEncounterTraceOfContent(content, { source: "encounter-regression.jsonl" });

  assert.equal(trace.sessionId, "encounter-regression");
  assert.equal(trace.transcript.bytes, Buffer.byteLength(content, "utf8"));
  assert.match(trace.transcript.commitment, /^urn:sha256:[0-9a-f]{64}$/u);
  assert.deepEqual(trace.hostContexts.map((context) => context.text), [pluginWrapper, agentsWrapper]);
  assert.equal(trace.authoredTurns.some((turn) => /host supplied plugin|host settlement law/u.test(turn.text)), false);
  assert.equal(trace.toolActs.length, 1);
  assert.equal(trace.toolActs[0].arguments, longArgument);
  assert.equal(trace.toolActs[0].outcomes[0].output, longOutput);
  assert.ok(trace.toolActs[0].arguments.length > 800);
  assert.ok(trace.toolActs[0].outcomes[0].output.length > 800);
  assert.equal(trace.correctionCandidates.at(-1).classification, "unresolved");
  assert.equal(trace.correctionCandidates.at(-1).text, "No: keep provider completion distinct from my acceptance.");
  assert.equal(trace.terminalOutcome.standing, "provider-authored-unassayed");
  assert.equal(trace.terminalOutcome.text, "The provider result is ready for customer assay.");
});
