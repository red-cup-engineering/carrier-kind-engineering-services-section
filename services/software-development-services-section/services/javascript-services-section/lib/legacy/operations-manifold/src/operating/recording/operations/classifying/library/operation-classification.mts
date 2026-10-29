import { nonNegativeNumber } from "../../metering/context/library/context-budget.mts";

export type OperationEventKind =
  | "tool-use"
  | "mcp-call"
  | "command"
  | "file-read"
  | "file-write"
  | "token-cost"
  | "http-call"
  | "record-hook-event"
  | "note";

export type OperationLayer = "asserted" | "saturated" | "stable";
export type OperationNucleus = "saturation" | "translation";

export function operationKind(value: string | undefined): OperationEventKind {
  if (value === "tool-use" || value === "mcp-call" || value === "command" || value === "file-read" || value === "file-write" || value === "token-cost" || value === "http-call" || value === "record-hook-event" || value === "note") return value;
  return "tool-use";
}

export function operationLayer(value: string | undefined): OperationLayer {
  if (value === "saturated" || value === "stable") return value;
  return "asserted";
}

export function operationNucleus(value: string | undefined): OperationNucleus {
  return value === "saturation" ? "saturation" : "translation";
}

export function predicateFor(kind: OperationEventKind): string {
  if (kind === "file-read") return "operations-manifold.operation.read-file";
  if (kind === "file-write") return "operations-manifold.operation.wrote-file";
  if (kind === "token-cost") return "operations-manifold.operation.spent-tokens";
  if (kind === "mcp-call") return "operations-manifold.operation.called-mcp";
  if (kind === "command") return "operations-manifold.operation.ran-command";
  if (kind === "http-call") return "operations-manifold.operation.called-http";
  if (kind === "record-hook-event") return "operations-manifold.operation.received-record-hook-event";
  if (kind === "note") return "operations-manifold.operation.noted";
  return "operations-manifold.operation.used-tool";
}

export function defaultTrace(kind: OperationEventKind): string {
  if (kind === "file-read" || kind === "file-write") return "execution:file-system";
  if (kind === "token-cost") return "execution:llm";
  if (kind === "mcp-call") return "execution:mcp";
  if (kind === "record-hook-event") return "execution:hook";
  return "execution:tool";
}

export function defaultSubject(kind: OperationEventKind, tool: string | null): string {
  if (tool !== null) return `tool:${tool}`;
  if (kind === "token-cost") return "agent:llm-session";
  if (kind === "record-hook-event") return "agent:codex-hook";
  return "agent:codex";
}

export function defaultObject(kind: OperationEventKind, tool: string | null, paths: readonly string[], tokens: string | number | undefined): string {
  if (kind === "token-cost") return `${nonNegativeNumber(tokens)} tokens`;
  if (paths.length > 0) return paths.join(", ");
  if (tool !== null) return tool;
  return kind;
}

export function classifyCommand(command: string): OperationEventKind {
  const trimmed = command.trim();
  if (/^(cat|sed|awk|grep|rg|find|ls|head|tail|nl|wc|git\s+(show|diff|status|log|ls-files)|node\s+--input-type=module\s+-e)/u.test(trimmed)) return "file-read";
  if (/\b(apply_patch|tee|sed\s+-i|git\s+(add|commit|push|mv|rm)|npm\s+(install|add)|pnpm\s+(install|add)|writeFile|appendFile)\b|>{1,2}/u.test(trimmed)) return "file-write";
  return "command";
}

export function commandTool(command: string): string {
  const parts = command.trim().split(/\s+/u).filter((part) => part.length > 0);
  if (parts[0] === "git" && parts[1] !== undefined) return `git ${parts[1]}`;
  if ((parts[0] === "node" || parts[0] === "npm" || parts[0] === "pnpm") && parts[1] !== undefined) return `${parts[0]} ${parts[1]}`;
  return parts[0] ?? "shell";
}

export function extractCommandPaths(command: string): readonly string[] {
  const matches = command.match(/(?:^|\s|["'`])((?:sites\/|lib\/|apps\/|services\/|dev\/|scripts\/|operations\/|\.gitmodules|AGENTS\.md|package\.json|pnpm-lock\.yaml)[A-Za-z0-9._~/%:@+-]*)/gu) ?? [];
  const paths = matches
    .map((match) => match.trim().replace(/^["'`]/u, "").replace(/["'`,;:]$/u, ""))
    .map((match) => match.replace(/^(\S*?)(sites\/|lib\/|apps\/|services\/|dev\/|scripts\/|operations\/|\.gitmodules|AGENTS\.md|package\.json|pnpm-lock\.yaml)/u, "$2"))
    .filter((match) => match !== "");
  return Object.freeze([...new Set(paths)].slice(0, 24));
}

export function affectsApiIndex(file: string): boolean {
  const normalized = file.split(/[/\\]+/u).join("/");
  if (normalized.endsWith("package.json")) return true;
  if (normalized.endsWith("tsconfig.json") || normalized.endsWith("tsconfig.build.json")) return true;
  if (!normalized.endsWith(".mts") && !normalized.endsWith(".ts") && !normalized.endsWith(".mjs") && !normalized.endsWith(".js")) return false;
  return /^(sites|lib|apps|services)\//u.test(normalized);
}

export function eventTime(event: Readonly<Record<string, unknown>>): string | null {
  const value = event["timestamp"] ?? event["created_at"] ?? event["createdAt"] ?? event["at"];
  return typeof value === "string" && value.length > 0 ? value : null;
}
