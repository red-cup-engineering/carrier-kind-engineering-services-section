import {
  codexExecTraceProjectionFromBody,
  codexExecTraceProjectionFromParams,
  type CodexExecTraceProjection,
} from "./codex-exec-trace.mts";

export type AgentRunTraceFormat = "codex-exec-jsonl";

export type AgentRunTraceProjection = Readonly<{
  kind: "operations-manifold.read-agent-run-trace";
  generatedAt: string;
  run: string;
  focus?: string;
  format: AgentRunTraceFormat;
  codec: "trace-codex-exec";
  source: CodexExecTraceProjection["source"];
  summary: CodexExecTraceProjection["summary"];
  trace: CodexExecTraceProjection["trace"];
  findings: CodexExecTraceProjection["findings"];
  work: CodexExecTraceProjection["work"];
  reports: CodexExecTraceProjection["reports"];
  costs: CodexExecTraceProjection["costs"];
  codecProjection: CodexExecTraceProjection;
}>;

export async function agentRunTraceProjectionFromParams(
  repoRoot: string,
  params: Readonly<Record<string, string | undefined>>,
): Promise<AgentRunTraceProjection> {
  assertSupportedFormat(params["format"]);
  return agentRunTraceProjection(await codexExecTraceProjectionFromParams(repoRoot, params));
}

export function agentRunTraceProjectionFromBody(
  body: string,
  params: Readonly<Record<string, string | undefined>>,
): AgentRunTraceProjection {
  assertSupportedFormat(params["format"]);
  return agentRunTraceProjection(codexExecTraceProjectionFromBody(body, params));
}

function agentRunTraceProjection(trace: CodexExecTraceProjection): AgentRunTraceProjection {
  return Object.freeze({
    kind: "operations-manifold.read-agent-run-trace" as const,
    generatedAt: trace.generatedAt,
    run: trace.run,
    ...(trace.focus === undefined ? {} : { focus: trace.focus }),
    format: "codex-exec-jsonl" as const,
    codec: "trace-codex-exec" as const,
    source: trace.source,
    summary: trace.summary,
    trace: trace.trace,
    findings: trace.findings,
    work: trace.work,
    reports: trace.reports,
    costs: trace.costs,
    codecProjection: trace,
  });
}

function assertSupportedFormat(format: string | undefined): asserts format is AgentRunTraceFormat | undefined {
  if (format === undefined || format === "" || format === "codex-exec-jsonl") return;
  throw new TypeError(`read-agent-run-trace does not support format: ${format}`);
}
