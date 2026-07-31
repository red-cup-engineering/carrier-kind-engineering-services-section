/**
 * operations/messages — a one-shot Anthropic Messages completion, as an operation.
 *
 * Reuses the platform's witnessed inference source
 * (`anthropicMessagesInferenceSource`) and provider-neutral call model
 * (`inference.inferenceCall`) — no wire client, codec, or key handling is
 * re-implemented here. Requires ANTHROPIC_API_KEY in the environment to run;
 * without it the source terminates in a `configuration` obstruction, which this
 * operation reports rather than throwing.
 */
import { operation, type Operation } from "@red-cup-engineering/metroplat/operations";
import { anthropicMessagesInferenceSource } from "@red-cup-engineering/metroplat/integrations/anthropic";
import { inference } from "@red-cup-engineering/metroplat/agents";
import type { FilesystemBinding } from "@red-cup-engineering/metroplat/integrations/filesystem";

function str(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}
function num(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

const DEFAULT_MODEL = "claude-opus-4-8";

export function claudeMessagesOperations(_binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "claude-complete",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Run one Anthropic Messages completion over the platform's witnessed inference source.",
      description: "Options: --prompt (required), --system, --model, --max-output-tokens, --temperature. Needs ANTHROPIC_API_KEY.",
      options: Object.freeze(["prompt", "system", "model", "max-output-tokens", "temperature"]),
      run: async (input: unknown, args: Record<string, unknown>): Promise<unknown> => {
        const record = { ...(input !== null && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {}), ...args };
        const prompt = str(record, "prompt");
        if (prompt === undefined) return Object.freeze({ ok: false, error: "claude-complete: --prompt is required" });
        const system = str(record, "system");
        const now = new Date().toISOString();
        const call = inference.inferenceCall({
          request: `claude-infotics:${now}`,
          subject: "claude-infotics.complete",
          model: str(record, "model") ?? DEFAULT_MODEL,
          messages: [
            ...(system === undefined ? [] : [inference.inferenceMessage({ role: "system", content: system })]),
            inference.inferenceMessage({ role: "user", content: prompt }),
          ],
          generation: {
            maxOutputTokens: num(record, "max-output-tokens") ?? 1024,
            ...(num(record, "temperature") === undefined ? {} : { temperature: num(record, "temperature")! }),
          },
          observedAt: now,
        });
        const source = anthropicMessagesInferenceSource();
        for await (const event of source(call)) {
          if (event.kind !== "metroplat.inference.source-terminal") continue;
          const outcome = event.outcome;
          if (outcome.kind === "metroplat.inference.obstruction") {
            return Object.freeze({ ok: false, condition: outcome.condition, reasons: outcome.reasons });
          }
          return Object.freeze({
            ok: true,
            text: outcome.message?.content ?? "",
            stop: outcome.stop,
            usage: outcome.usage,
          });
        }
        return Object.freeze({ ok: false, error: "inference stream ended without a terminal outcome" });
      },
    }),
  ]);
}
