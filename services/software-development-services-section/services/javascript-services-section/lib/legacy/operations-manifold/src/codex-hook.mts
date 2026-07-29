import type { JsonValue } from "@emsenn/relating/writing";

import { hookPayload, isString, stringField } from "./records.mts";

export type CodexHookPayload = Readonly<Record<string, JsonValue>>;

export type CodexHookParams = Readonly<{
  prompt?: string;
  session?: string;
  trace?: string;
  focus?: string;
  paths?: readonly string[];
}>;

export function codexHookPayloadFromText(text: string): CodexHookPayload {
  return hookPayload({ stdin: text });
}

export function codexHookEventName(payload: CodexHookPayload): string {
  return stringField(payload, "hook_event_name") ?? "HookEvent";
}

export function codexHookSessionId(payload: CodexHookPayload): string {
  return stringField(payload, "session_id") ?? stringField(payload, "session") ?? "unknown-session";
}

export function codexHookPromptText(payload: CodexHookPayload): string | null {
  for (const key of ["prompt", "user_prompt", "message", "text"]) {
    const text = stringField(payload, key);
    if (text !== null) return text;
  }
  return null;
}

export function codexHookParams(payload: CodexHookPayload): CodexHookParams {
  return Object.freeze({
    ...optionalParam("prompt", codexHookPromptText(payload)),
    ...optionalParam("session", stringField(payload, "session_id") ?? stringField(payload, "session")),
    ...optionalParam("trace", stringField(payload, "trace")),
    ...optionalParam("focus", stringField(payload, "cwd")),
    ...codexHookPaths(payload),
  });
}

function optionalParam(key: "prompt" | "session" | "trace" | "focus", value: string | null): Record<string, string> {
  return value === null ? {} : { [key]: value };
}

function codexHookPaths(payload: CodexHookPayload): { readonly paths?: readonly string[] } {
  const paths = payload["paths"];
  if (!Array.isArray(paths)) return {};
  const strings = paths.filter(isString).map((item) => item.trim()).filter((item) => item !== "");
  return strings.length === 0 ? {} : { paths: Object.freeze(strings) };
}
