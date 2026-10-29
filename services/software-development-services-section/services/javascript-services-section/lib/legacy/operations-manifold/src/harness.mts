/**
 * Harness identity — the agent-harness namespace primitive.
 *
 * 561 Group Operations Manifold sessions arrive from more than one harness:
 * Claude Code, OpenAI Codex, and other agent runners all speak the same hook
 * JSON shape (hook_event_name, session_id, transcript_path, cwd, prompt). The
 * manifold's session bindings, message channels, and operation/work traces used
 * to hardcode the literal "codex" for every namespace. That hardcode was the old
 * way; the principled way is one identity primitive that names the harness, so
 * a Claude session is recorded as claude and a Codex session as codex without
 * forking the ledgers.
 *
 * The identity is read once at the hook boundary (env first, then payload), then
 * threaded through channel/trace/agent naming. It is pure data, not a new core
 * model — the EAVT log surface is unchanged; only the subject/trace/agent
 * strings become harness-true instead of codex-shaped.
 */
import { stringField } from "./records.mts";
import type { JsonValue } from "@emsenn/relating/writing";

export type HarnessKind = "claude" | "codex" | "agent";

export type HarnessIdentity = Readonly<{
  /** Canonical harness kind. */
  harness: HarnessKind;
  /** Agent token used as work agent, operation agent, and message speaker suffix. */
  agent: string;
  /** Human-facing label rendered in the injected suit greeting. */
  label: string;
  /** Message-channel namespace, e.g. "claude" → channel `claude:<session>`. */
  channelPrefix: string;
  /** Operation/work trace namespace, e.g. "claude.hook" → trace `claude.hook:<session>`. */
  tracePrefix: string;
}>;

const IDENTITIES: Readonly<Record<HarnessKind, HarnessIdentity>> = Object.freeze({
  claude: Object.freeze({ harness: "claude", agent: "claude", label: "Claude Code", channelPrefix: "claude", tracePrefix: "claude.hook" }),
  codex: Object.freeze({ harness: "codex", agent: "codex", label: "OpenAI Codex", channelPrefix: "codex", tracePrefix: "codex.hook" }),
  agent: Object.freeze({ harness: "agent", agent: "agent", label: "Agent harness", channelPrefix: "agent", tracePrefix: "agent.hook" }),
});

export type HarnessSource = Readonly<{
  harness?: string | undefined;
  env?: Readonly<Record<string, string | undefined>> | undefined;
  payload?: Readonly<Record<string, JsonValue>> | undefined;
}>;

function harnessKind(value: string | null | undefined): HarnessKind | null {
  if (value === undefined || value === null) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "claude" || normalized === "claude-code" || normalized === "claudecode") return "claude";
  if (normalized === "codex" || normalized === "openai-codex" || normalized === "openai") return "codex";
  if (normalized === "agent") return "agent";
  return null;
}

/**
 * Resolve the harness identity. Priority: explicit value, then the
 * OPS_MANIFOLD_HARNESS env, then harness-specific env signals
 * (CLAUDE_PROJECT_DIR/CLAUDECODE → claude; CODEX_* → codex), then payload
 * hints, then the codex default so pre-existing codex wiring is unchanged.
 */
export function harnessIdentity(source: HarnessSource = {}): HarnessIdentity {
  const env = source.env ?? (typeof process === "undefined" ? {} : process.env);
  const explicit = harnessKind(source.harness) ?? harnessKind(env["OPS_MANIFOLD_HARNESS"]);
  if (explicit !== null) return IDENTITIES[explicit];
  if (env["CLAUDE_PROJECT_DIR"] !== undefined || env["CLAUDECODE"] !== undefined || env["CLAUDE_CODE"] !== undefined) return IDENTITIES.claude;
  if (env["CODEX_HOME"] !== undefined || env["CODEX_SANDBOX"] !== undefined) return IDENTITIES.codex;
  const payloadHint = harnessKind(stringField(source.payload ?? null, "harness"))
    ?? harnessKind(stringField(source.payload ?? null, "source"));
  if (payloadHint !== null) return IDENTITIES[payloadHint];
  return IDENTITIES.codex;
}

/** Message-channel id for a session under this harness, e.g. `claude:<session>`. */
export function harnessChannel(identity: HarnessIdentity, session: string): string {
  return `${identity.channelPrefix}:${session}`;
}

/** Operation/work trace for a session under this harness, e.g. `claude.hook:<session>`. */
export function harnessTrace(identity: HarnessIdentity, session: string): string {
  return `${identity.tracePrefix}:${session}`;
}
