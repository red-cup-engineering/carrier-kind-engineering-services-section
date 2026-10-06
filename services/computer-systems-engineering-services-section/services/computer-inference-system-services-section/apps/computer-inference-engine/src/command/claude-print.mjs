/**
 * Claude Code in print mode (`claude -p`) as an inference provider: pure text
 * completion with no tools, MCP servers or project settings, the prompt on
 * stdin, optional provider-validated JSON output, settling one exchange record.
 */
import { exchangeRecorder, promptOfMessages, resolveExecutable, runBounded } from "./exchange.mjs";

export const NO_TOOLS_PREAMBLE = "This invocation is pure text completion: you have NO tools, NO filesystem access, NO ability to read, list, or search files, and no command execution. Any file content you need is already quoted in the prompt; anything not quoted there is unknown to you. Never narrate tool calls, file reads, or their results — describing a read, an empty result, or quoting a file you were not given is fabrication and grounds for the exchange to be refused.";

// A tool-less completion can never truthfully report its own file reads; one that
// does is fabricated procedure (observed 2026-07-24) and settles as a refusal.
const CONFABULATED_TOOL_NARRATIVE = [
  /filesystem reads? (?:are|is|were|was)[^.\n]{0,40}(?:empty|fail|block|unavailable)/i,
  /\bI (?:cannot|can't|could not|couldn't) read (?:the |any )?(?:source )?files?\b/i,
  /\b(?:all |my )(?:file|filesystem) reads?\b[^.\n]{0,40}(?:empty|fail|return)/i,
];

/** The claude -p argument list for one packet. */
export function claudePrintArguments({ model, system = [], outputSchema }) {
  if (typeof model !== "string" || !model) throw new TypeError("Claude print invocation requires an explicit model");
  const args = ["-p", "--model", model, "--output-format", outputSchema === undefined ? "text" : "json", "--tools", "", "--strict-mcp-config", "--setting-sources", ""];
  if (outputSchema !== undefined) {
    if (!outputSchema || typeof outputSchema !== "object" || Array.isArray(outputSchema)) throw new TypeError("Claude print JSON schema must be an object");
    args.push("--json-schema", JSON.stringify(outputSchema));
  }
  args.push("--append-system-prompt", [NO_TOOLS_PREAMBLE, ...system].join("\n\n"));
  return args;
}

/**
 * Run one chat packet ({model, messages, params?: {outputSchema?}}) through claude -p.
 * @param {{executable?: string, env?: object, timeoutMs?: number}} [options]
 */
export async function runClaudePrintExchange(packet, { executable = process.env.CLAUDE_CODE_BIN ?? "claude", env = process.env, timeoutMs = null } = {}) {
  const record = exchangeRecorder(packet, "claude-code-cli-invocations");
  const binary = resolveExecutable(executable, env);
  if (!binary) return record.refusal(`the \`${executable}\` binary was not found; no subprocess was spawned`, ["claude-binary-absent"], 0);
  const outputSchema = packet.params?.outputSchema;
  const { system, prompt } = promptOfMessages(packet.messages);
  const result = await runBounded(binary, claudePrintArguments({ model: packet.model, system, outputSchema }), { input: prompt, env, timeoutMs });
  if (result.error) return record.refusal(`the claude subprocess could not run: ${result.error.message}`, ["subprocess-spawn-error"], 0);
  if (result.timedOut) return record.refusal(`the claude subprocess exceeded ${timeoutMs}ms`, ["subprocess-timeout"]);
  if (result.signal) return record.refusal(`the claude subprocess was killed (signal ${result.signal})`, ["subprocess-signaled"]);
  if (result.status !== 0) return record.refusal(`the claude subprocess exited ${result.status}: ${(result.stderr || result.stdout).slice(0, 500)}`, [`subprocess-exit:${result.status}`]);
  let parsed = { result: result.stdout, stop_reason: "unknown" };
  if (outputSchema !== undefined) {
    try { parsed = JSON.parse(result.stdout); } catch (error) { return record.refusal(`the structured Claude response is not JSON: ${error.message}`, ["unparseable-structured-response-body"]); }
  }
  if (parsed?.is_error === true || (parsed?.subtype !== undefined && parsed.subtype !== "success") || parsed?.stop_reason === "refusal") {
    return record.refusal(`the claude CLI returned an in-band error or refusal (subtype ${parsed?.subtype ?? "unknown"}): ${String(parsed?.result ?? "").slice(0, 500)}`, ["claude-cli-in-band-refusal"]);
  }
  if (outputSchema !== undefined && (typeof parsed?.structured_output !== "object" || parsed.structured_output === null || Array.isArray(parsed.structured_output))) {
    return record.refusal("the claude CLI completed without the validated structured_output the packet requires", ["missing-validated-structured-output"]);
  }
  if (typeof parsed?.result !== "string" || !parsed.result) return record.refusal("the claude CLI response carried no result text", ["missing-completion-content"]);
  if (CONFABULATED_TOOL_NARRATIVE.some((pattern) => pattern.test(parsed.result))) {
    return record.refusal(`the completion narrates file reads a tool-less invocation cannot perform: ${parsed.result.slice(0, 300)}`, ["confabulated-tool-narrative"]);
  }
  return record.completion({ model: packet.model, text: outputSchema !== undefined ? JSON.stringify(parsed.structured_output) : parsed.result, finishReason: parsed.stop_reason ?? "unknown", raw: parsed, usagePrefix: "claude-code" });
}
