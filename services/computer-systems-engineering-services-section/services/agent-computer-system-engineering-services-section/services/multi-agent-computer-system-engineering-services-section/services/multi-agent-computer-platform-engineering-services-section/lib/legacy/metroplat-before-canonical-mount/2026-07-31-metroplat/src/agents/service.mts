/** Agent operations application service. */
import path from "node:path";

import type {
  TokenUsageCostRateEntry,
  TokenUsageCostRateTable,
  TokenUsageCostRates,
} from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/core";
import { recurringVerbSequences } from "../lib/math/number/sequence-recurrence.mts";
import type { ChargeValueName } from "../lib/values/index.mts";
import { operation, type Operation } from "../rpc/index.mts";
import { rpcAdmittedStepCollector } from "../journal/reading/rpc-sequence.mts";
import type { JsonValue } from "../lib/codecs/json/core.mts";
import { eavtObject, type EAVT } from "../lib/codecs/json/jsonl/eavt/index.mts";
import { parse } from "../lib/codecs/json/core.mts";
import { dataDatePartition } from "../lib/addressing/index.mts";
import { pathExists, readFileHeadUtf8, readFileUtf8, statPathOrNull, walkFiles } from "../lib/filesystem/index.mts";
import type { FilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import { journal } from "../journal/index.mts";
import { readFeedProjection } from "../journal/feed-readout.mts";
import { sessionPresenceReadout } from "../integrations/filesystem/services/session-presence.mts";
import { readClaudeAgentFleetReadout } from "../integrations/anthropic/fleet/service.mts";
import { readAgentSessionTokenUsageReadout } from "../integrations/token-usage/service.mts";
import { readCodexLatestTranscriptStatus, readCodexSessionToolStudyCorpus } from "../integrations/openai/codex/service.mts";
import { readCodexMemoryPriorContext } from "../integrations/openai/codex/memory-substrate.mts";
import { readInferenceCostReadout } from "../integrations/openai/pricing/service.mts";
import { readAgentWorkDispatchReadout, readDutiesView, workCoordinationOperations } from "../work/index.mts";
import { createOperationCatalog, dispatch, invocation, authorizationFromStanding } from "../rpc/index.mts";
import { journalRpcWitness } from "../integrations/filesystem/services/rpc-witness.mts";
import { sourceCodePolicyOperations } from "../monitoring/operations.mts";
import { proofHealthOperations } from "../monitoring/proof-health.mts";
import {
  agentActuationDossier,
  agentActuationExecution,
  agentActuationPlan,
  MONITORING_MOVE_OPERATIONS,
  type AgentActuationExecution,
} from "./actuation.mts";
import { agentContextImage, agentContextPageMaterial, diagnoseAgentContext, type AgentContextImage } from "./context-image.mts";
import { agentDoctrineSuit, type AgentDoctrineMaterial } from "./doctrine.mts";
import { agentHeartbeatDossier } from "./heartbeat.mts";
import { agentOperationsDossier } from "./operations.mts";
import { agentOrientationReadout } from "./orientation.mts";
import { agentSkillProposalDossier } from "./skill-proposals.mts";
import { agentStrategyDossier } from "./strategy.mts";
import { agentTurnDossier } from "./turn.mts";

export interface AgentCoordinationActionInput {
  readonly date?: string;
  readonly id?: string;
  readonly query?: string;
  readonly observation?: JsonValue;
  readonly diagnosis?: JsonValue;
  readonly tokenCostRates?: TokenUsageCostRates;
  readonly tokenCostRateTable?: TokenUsageCostRateTable;
}

export interface AgentCoordinationInput {
  readonly date: string;
  readonly id?: string;
  readonly query?: string;
  readonly observation?: JsonValue;
  readonly diagnosis?: JsonValue;
  readonly tokenCostRates?: TokenUsageCostRates;
  readonly tokenCostRateTable?: TokenUsageCostRateTable;
}

type AgentCoordinationVerb =
  | "orientation"
  | "skill-candidates"
  | "skill-proposals"
  | "agent-diagnosis"
  | "agent-strategy"
  | "agent-heartbeat"
  | "agent-turn"
  | "agent-operations"
  | "agent-actuation"
  | "agent-context-image";

function todayIso(binding: FilesystemBinding): string {
  return (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
}

function tokenCostRate(value: JsonValue | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : undefined;
}

function tokenCostRatesOf(value: JsonValue | undefined): TokenUsageCostRates | undefined {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Readonly<Record<string, JsonValue>>;
  const total = tokenCostRate(record["totalMicrodollarsPerMillionTokens"]);
  const input = tokenCostRate(record["inputMicrodollarsPerMillionTokens"]);
  const output = tokenCostRate(record["outputMicrodollarsPerMillionTokens"]);
  if (total === undefined && (input === undefined || output === undefined)) return undefined;
  const cachedInput = tokenCostRate(record["cachedInputMicrodollarsPerMillionTokens"]);
  const cacheCreationInput = tokenCostRate(record["cacheCreationInputMicrodollarsPerMillionTokens"]);
  const cacheReadInput = tokenCostRate(record["cacheReadInputMicrodollarsPerMillionTokens"]);
  const reasoningOutput = tokenCostRate(record["reasoningOutputMicrodollarsPerMillionTokens"]);
  return Object.freeze({
    ...(total === undefined ? {} : { totalMicrodollarsPerMillionTokens: total }),
    ...(input === undefined ? {} : { inputMicrodollarsPerMillionTokens: input }),
    ...(output === undefined ? {} : { outputMicrodollarsPerMillionTokens: output }),
    ...(cachedInput === undefined ? {} : { cachedInputMicrodollarsPerMillionTokens: cachedInput }),
    ...(cacheCreationInput === undefined ? {} : { cacheCreationInputMicrodollarsPerMillionTokens: cacheCreationInput }),
    ...(cacheReadInput === undefined ? {} : { cacheReadInputMicrodollarsPerMillionTokens: cacheReadInput }),
    ...(reasoningOutput === undefined ? {} : { reasoningOutputMicrodollarsPerMillionTokens: reasoningOutput }),
  });
}

function tokenCostRateEntryOf(value: JsonValue | undefined): TokenUsageCostRateEntry | undefined {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Readonly<Record<string, JsonValue>>;
  const rates = tokenCostRatesOf(record["rates"]);
  if (rates === undefined) return undefined;
  const resourceKind = typeof record["resourceKind"] === "string" && record["resourceKind"].length > 0 ? record["resourceKind"] : undefined;
  const unit = typeof record["unit"] === "string" && record["unit"].length > 0 ? record["unit"] : undefined;
  const agentId = typeof record["agentId"] === "string" && record["agentId"].length > 0 ? record["agentId"] : undefined;
  const provider = typeof record["provider"] === "string" && record["provider"].length > 0 ? record["provider"] : undefined;
  const surface = typeof record["surface"] === "string" && record["surface"].length > 0 ? record["surface"] : undefined;
  const model = typeof record["model"] === "string" && record["model"].length > 0 ? record["model"] : undefined;
  const minInputTokens = tokenCostRate(record["minInputTokens"]);
  const maxInputTokens = tokenCostRate(record["maxInputTokens"]);
  const minTotalTokens = tokenCostRate(record["minTotalTokens"]);
  const maxTotalTokens = tokenCostRate(record["maxTotalTokens"]);
  const evidence = Array.isArray(record["evidence"])
    ? Object.freeze(record["evidence"].filter((item): item is string => typeof item === "string" && item.length > 0))
    : undefined;
  return Object.freeze({
    ...(resourceKind === undefined ? {} : { resourceKind }),
    ...(unit === undefined ? {} : { unit }),
    ...(agentId === undefined ? {} : { agentId }),
    ...(provider === undefined ? {} : { provider }),
    ...(surface === undefined ? {} : { surface }),
    ...(model === undefined ? {} : { model }),
    ...(minInputTokens === undefined ? {} : { minInputTokens }),
    ...(maxInputTokens === undefined ? {} : { maxInputTokens }),
    ...(minTotalTokens === undefined ? {} : { minTotalTokens }),
    ...(maxTotalTokens === undefined ? {} : { maxTotalTokens }),
    rates,
    ...(evidence === undefined ? {} : { evidence }),
  });
}

function tokenCostRateTableOf(value: JsonValue | undefined): TokenUsageCostRateTable | undefined {
  if (Array.isArray(value)) {
    const entries = Object.freeze(value.flatMap((item) => {
      const entry = tokenCostRateEntryOf(item);
      return entry === undefined ? [] : [entry];
    }));
    return entries.length === 0 ? undefined : Object.freeze({ entries });
  }
  if (value === null || value === undefined || typeof value !== "object") return undefined;
  const record = value as Readonly<Record<string, JsonValue>>;
  const entriesValue = record["entries"];
  if (!Array.isArray(entriesValue)) return undefined;
  const defaultRates = tokenCostRatesOf(record["defaultRates"]);
  const entries = Object.freeze(entriesValue.flatMap((item) => {
    const entry = tokenCostRateEntryOf(item);
    return entry === undefined ? [] : [entry];
  }));
  return defaultRates === undefined && entries.length === 0
    ? undefined
    : Object.freeze({
      ...(defaultRates === undefined ? {} : { defaultRates }),
      entries,
    });
}

function agentCoordinationInputOf(input: unknown, binding: FilesystemBinding): AgentCoordinationInput {
  const record = input !== null && typeof input === "object" && !Array.isArray(input)
    ? input as Readonly<Record<string, JsonValue>>
    : {};
  const date = typeof record["date"] === "string" ? record["date"] : todayIso(binding);
  const id = typeof record["id"] === "string" ? record["id"] : undefined;
  const query = typeof record["query"] === "string" ? record["query"] : undefined;
  const observation = record["observation"];
  const diagnosis = record["diagnosis"];
  const tokenCostRates = tokenCostRatesOf(record["tokenCostRates"]);
  const tokenCostRateTable = tokenCostRateTableOf(record["tokenCostRateTable"]);
  return Object.freeze({
    date,
    ...(id === undefined ? {} : { id }),
    ...(query === undefined ? {} : { query }),
    ...(observation === undefined ? {} : { observation }),
    ...(diagnosis === undefined ? {} : { diagnosis }),
    ...(tokenCostRates === undefined ? {} : { tokenCostRates }),
    ...(tokenCostRateTable === undefined ? {} : { tokenCostRateTable }),
  });
}

function artifactByToken(binding: FilesystemBinding, date: string, token: string): JsonValue | undefined {
  for (let back = 0; back < 2; back += 1) {
    const at = new Date(new Date(`${date}T00:00:00Z`).getTime() - back * 86_400_000).toISOString().slice(0, 10);
    const { year, month, day } = dataDatePartition(at);
    const artifactPath = path.join(binding.dataRoot, "data", "state", year, month, day, `${at}-settle-${token}.json`);
    if (!pathExists(artifactPath)) continue;
    const parsed = parse(readFileUtf8(artifactPath));
    if (parsed !== undefined) return parsed as JsonValue;
  }
  return undefined;
}

function record(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, JsonValue> : undefined;
}

function noteFailure(failures: string[], token: string): (reason: string) => void {
  return (reason: string): void => { failures.push(`${token}: ${reason}`); };
}

function inferenceCostOf(input: AgentCoordinationInput, binding: FilesystemBinding, onError: (reason: string) => void): JsonValue | undefined {
  try {
    return readInferenceCostReadout(binding, input.date);
  } catch (error) {
    onError(error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

function workDispatchOf(input: AgentCoordinationInput, binding: FilesystemBinding, onError: (reason: string) => void): JsonValue | undefined {
  try {
    return readAgentWorkDispatchReadout(binding, input.date, input.id);
  } catch (error) {
    onError(error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

function doctrineDateOf(head: string): string | undefined {
  const match = /^(date-created|date):\s*"?([^"\n]+)"?\s*$/mu.exec(head);
  return match?.[2]?.trim();
}

function doctrineChargeOf(head: string, sourceRoot: string): ChargeValueName | undefined {
  if (sourceRoot.endsWith("orientation")) return "denied";
  const match = /^status:\s*"?([^"\n]+)"?\s*$/imu.exec(head);
  const status = match?.[1]?.toLowerCase() ?? "";
  return status.includes("operating doctrine") ? "denied" : undefined;
}

function doctrineMaterialOfFile(filePath: string, sourceRoot: string, corpusRoot: string): AgentDoctrineMaterial | undefined {
  const stat = statPathOrNull(filePath);
  if (stat === null || stat.size === 0) return undefined;
  const text = readFileHeadUtf8(filePath, 4096);
  const relative = path.relative(corpusRoot, filePath).split(path.sep).join("/");
  const at = doctrineDateOf(text);
  const charge = doctrineChargeOf(text, sourceRoot);
  return Object.freeze({
    path: `${sourceRoot}/${relative.length === 0 ? path.basename(filePath) : relative}`,
    text,
    sourceRoot,
    bytes: stat.size,
    ...(at === undefined ? {} : { at }),
    ...(charge === undefined ? {} : { charge }),
  });
}

function doctrineMaterials(binding: FilesystemBinding): readonly AgentDoctrineMaterial[] {
  const materials: AgentDoctrineMaterial[] = [];
  const seen = new Set<string>();
  const addFile = (filePath: string, sourceRoot: string, corpusRoot: string): void => {
    const resolved = path.resolve(filePath);
    if (seen.has(resolved) || !pathExists(resolved)) return;
    seen.add(resolved);
    let material: AgentDoctrineMaterial | undefined;
    try {
      material = doctrineMaterialOfFile(resolved, sourceRoot, corpusRoot);
    } catch {
      return;
    }
    if (material !== undefined) materials.push(material);
  };
  const packageRoot = binding.packageRoot === undefined ? undefined : path.resolve(binding.packageRoot);
  for (const fileName of ["README.md", "AGENTS.md"]) {
    addFile(path.join(binding.dataRoot, fileName), "data-root-orientation", binding.dataRoot);
    if (packageRoot !== undefined) addFile(path.join(packageRoot, fileName), "package-orientation", packageRoot);
  }
  const addNotesRoot = (root: string, sourceRoot: string): void => {
    if (!pathExists(root)) return;
    for (const filePath of walkFiles(root, {
      includeFile: (name) => name.endsWith(".md"),
      skipSymbolicLinks: true,
    })) {
      addFile(filePath, sourceRoot, root);
    }
  };
  if (packageRoot !== undefined) {
    addNotesRoot(path.join(packageRoot, "dev", "content", "notes"), "metroplat-notes");
    addNotesRoot(path.resolve(packageRoot, "..", "..", "..", "services", "561-group", "services", "lenticule-science", "src", "dev", "content", "notes"), "obsmetrologia-notes");
  }
  addNotesRoot(path.join(binding.dataRoot, "dev", "content", "notes"), "data-root-notes");
  return Object.freeze(materials);
}

export function readAgentSkillCandidatesReadout(binding: FilesystemBinding, date: string): JsonValue | undefined {
  const logPath = journal.feed(binding.dataRoot, "rpc", date, { subject: "rpc" });
  if (!journal.sourceStatus(logPath).exists) return undefined;
  const collector = rpcAdmittedStepCollector();
  let rows = 0;
  try {
    const sourceRows: EAVT[] = [];
    const folded = journal.scan(logPath, undefined, (_accum, row) => {
      sourceRows.push(row);
      return undefined;
    });
    rows = folded.rows;
    for (const row of sourceRows.sort((left, right) => String(left[3]).localeCompare(String(right[3])))) {
      collector.push(row);
    }
  } catch {
    return undefined;
  }
  const steps = collector.read();
  const reading = recurringVerbSequences(steps);
  const actors = new Set(steps.map((step) => step.actor));
  return Object.freeze({
    kind: "metroplat.holography.skill-candidates-settlement",
    date,
    source: "rpc-journal",
    note: "Candidates are recurring verb chains derived from canonical RPC attempt/outcome evidence, not skills. Promotion to an executable procedure is a separate, operator-ruled step, never taken automatically here.",
    minLength: reading.minLength,
    maxLength: reading.maxLength,
    rowsConsidered: rows,
    actorsConsidered: actors.size,
    candidates: reading.candidates,
  }) as unknown as JsonValue;
}

export function readAgentSkillProposalsReadout(binding: FilesystemBinding, date: string): JsonValue | undefined {
  const logPath = journal.feed(binding.dataRoot, "rpc", date, { subject: "rpc" });
  if (!journal.sourceStatus(logPath).exists) return undefined;
  const collector = rpcAdmittedStepCollector();
  let rows = 0;
  try {
    const sourceRows: EAVT[] = [];
    const folded = journal.scan(logPath, undefined, (_accum, row) => {
      sourceRows.push(row);
      return undefined;
    });
    rows = folded.rows;
    for (const row of sourceRows.sort((left, right) => String(left[3]).localeCompare(String(right[3])))) {
      collector.push(row);
    }
  } catch {
    return undefined;
  }
  const steps = collector.read();
  const reading = recurringVerbSequences(steps);
  const actors = new Set(steps.map((step) => step.actor));
  return Object.freeze({
    ...agentSkillProposalDossier(reading, {
      date,
      source: "rpc-journal",
    }),
    rowsConsidered: rows,
    actorsConsidered: actors.size,
  }) as unknown as JsonValue;
}

export async function readAgentOrientationReadout(binding: FilesystemBinding, input: AgentCoordinationInput): Promise<JsonValue | undefined> {
  const failures: string[] = [];
  const topology = record(artifactByToken(binding, input.date, "module-topology"));
  let fleet: Readonly<Record<string, JsonValue>> | undefined;
  try {
    fleet = record(await readClaudeAgentFleetReadout(binding, input.date));
  } catch (error) {
    noteFailure(failures, "claude-fleet")(error instanceof Error ? error.message : String(error));
  }
  let hookState: Readonly<Record<string, JsonValue>> | undefined;
  try {
    hookState = record(readFeedProjection(binding.dataRoot, input.date, "hook-event"));
  } catch (error) {
    noteFailure(failures, "settlement-hook-event")(error instanceof Error ? error.message : String(error));
  }
  const fileCensus = record(artifactByToken(binding, input.date, "file-census"));
  let codex: Readonly<Record<string, JsonValue>> | undefined;
  if (binding.codexSessionRoot !== undefined) {
    try {
      codex = record(readCodexLatestTranscriptStatus(binding.codexSessionRoot, input.date));
    } catch (error) {
      noteFailure(failures, "codex-latest")(error instanceof Error ? error.message : String(error));
    }
  }
  let presence: Readonly<Record<string, JsonValue>> | undefined;
  try {
    presence = record(sessionPresenceReadout(binding, input.date));
  } catch (error) {
    noteFailure(failures, "session-presence")(error instanceof Error ? error.message : String(error));
  }
  let doctrine: JsonValue | undefined;
  try {
    doctrine = agentDoctrineSuit(doctrineMaterials(binding), {
      ...(input.query === undefined ? {} : { query: input.query }),
    }) as unknown as JsonValue;
  } catch (error) {
    noteFailure(failures, "doctrine-suit")(error instanceof Error ? error.message : String(error));
  }
  const dutiesCountOf = async (sessionId: JsonValue | undefined): Promise<number> => {
    if (typeof sessionId !== "string") return 0;
    let dutiesRead: JsonValue | undefined;
    try {
      dutiesRead = readDutiesView(binding, input.date, sessionId);
    } catch (error) {
      noteFailure(failures, "duties")(error instanceof Error ? error.message : String(error));
    }
    const duties = record(dutiesRead)?.["duties"];
    return Array.isArray(duties) ? duties.length : 0;
  };
  return await agentOrientationReadout({
    date: input.date,
    ...(topology === undefined ? {} : { topology }),
    ...(fleet === undefined ? {} : { fleet }),
    ...(hookState === undefined ? {} : { hookState }),
    ...(fileCensus === undefined ? {} : { fileCensus }),
    ...(codex === undefined ? {} : { codex }),
    ...(presence === undefined ? {} : { presence }),
    ...(doctrine === undefined ? {} : { doctrine }),
    failures,
    dutiesCountOf,
  });
}

export async function readAgentStrategyReadout(binding: FilesystemBinding, input: AgentCoordinationInput): Promise<JsonValue | undefined> {
  const failures: string[] = [];
  const suppliedObservation = record(input.observation);
  if (suppliedObservation !== undefined && suppliedObservation["kind"] !== "metroplat.agent.context-image") {
    throw new TypeError("agent-strategy observation must be an metroplat.agent.context-image");
  }
  const observation = suppliedObservation as unknown as AgentContextImage | undefined
    ?? await readAgentContextImageReadout(binding, input);
  if (observation === undefined) return undefined;
  const suppliedDiagnosis = record(input.diagnosis);
  if (suppliedDiagnosis !== undefined && suppliedDiagnosis["kind"] !== "metroplat.agent.context-diagnosis") {
    throw new TypeError("agent-strategy diagnosis must be an metroplat.agent.context-diagnosis");
  }
  const diagnosis = suppliedDiagnosis ?? diagnoseAgentContext(observation) as unknown as JsonValue;
  const orientation = agentContextPageMaterial(observation, "page:orientation");
  const dispatch = agentContextPageMaterial(observation, "page:work-dispatch");
  const skillProposals = agentContextPageMaterial(observation, "page:skill-proposals");
  return agentStrategyDossier({
    date: input.date,
    actor: input.id ?? "agent:codex",
    goal: input.query ?? "continue governed metroplat development",
    ...(orientation === undefined ? {} : { orientation }),
    diagnosis: diagnosis as unknown as JsonValue,
    ...(dispatch === undefined ? {} : { dispatch }),
    ...(skillProposals === undefined ? {} : { skillProposals }),
    failures,
  }) as unknown as JsonValue;
}

export async function readAgentDiagnosisReadout(binding: FilesystemBinding, input: AgentCoordinationInput): Promise<JsonValue | undefined> {
  const suppliedObservation = record(input.observation);
  if (suppliedObservation !== undefined && suppliedObservation["kind"] !== "metroplat.agent.context-image") {
    throw new TypeError("agent-diagnosis observation must be an metroplat.agent.context-image");
  }
  const observation = suppliedObservation as unknown as AgentContextImage | undefined
    ?? await readAgentContextImageReadout(binding, input);
  return observation === undefined ? undefined : diagnoseAgentContext(observation) as unknown as JsonValue;
}

export async function readAgentHeartbeatReadout(binding: FilesystemBinding, input: AgentCoordinationInput): Promise<JsonValue | undefined> {
  const failures: string[] = [];
  const strategy = await readAgentStrategyReadout(binding, input);
  let presence: JsonValue | undefined;
  try {
    presence = sessionPresenceReadout(binding, input.date);
  } catch (error) {
    noteFailure(failures, "session-presence")(error instanceof Error ? error.message : String(error));
  }
  const inferenceCost = inferenceCostOf(input, binding, noteFailure(failures, "inference-cost"));
  return agentHeartbeatDossier({
    date: input.date,
    actor: input.id ?? "agent:codex",
    goal: input.query ?? "continue governed metroplat development",
    ...(strategy === undefined ? {} : { strategy }),
    ...(presence === undefined ? {} : { presence }),
    ...(inferenceCost === undefined ? {} : { inferenceCost }),
    failures,
  }) as unknown as JsonValue;
}

export async function readAgentTurnReadout(binding: FilesystemBinding, input: AgentCoordinationInput): Promise<JsonValue | undefined> {
  const failures: string[] = [];
  const heartbeat = await readAgentHeartbeatReadout(binding, input);
  const orientation = await readAgentOrientationReadout(binding, input);
  const strategy = await readAgentStrategyReadout(binding, input);
  const dispatch = workDispatchOf(input, binding, noteFailure(failures, "agent-work-dispatch"));
  const skillProposals = readAgentSkillProposalsReadout(binding, input.date);
  const inferenceCost = inferenceCostOf(input, binding, noteFailure(failures, "inference-cost"));
  return agentTurnDossier({
    date: input.date,
    actor: input.id ?? "agent:codex",
    goal: input.query ?? "continue governed metroplat development",
    ...(heartbeat === undefined ? {} : { heartbeat }),
    ...(orientation === undefined ? {} : { orientation }),
    ...(strategy === undefined ? {} : { strategy }),
    ...(dispatch === undefined ? {} : { dispatch }),
    ...(skillProposals === undefined ? {} : { skillProposals }),
    ...(inferenceCost === undefined ? {} : { inferenceCost }),
    failures,
  }) as unknown as JsonValue;
}

export async function readAgentOperationsReadout(binding: FilesystemBinding, input: AgentCoordinationInput): Promise<JsonValue | undefined> {
  const failures: string[] = [];
  const orientation = await readAgentOrientationReadout(binding, input);
  const strategy = await readAgentStrategyReadout(binding, input);
  const heartbeat = await readAgentHeartbeatReadout(binding, input);
  const turn = await readAgentTurnReadout(binding, input);
  const dispatch = workDispatchOf(input, binding, noteFailure(failures, "agent-work-dispatch"));
  const skillProposals = readAgentSkillProposalsReadout(binding, input.date);
  const inferenceCost = inferenceCostOf(input, binding, noteFailure(failures, "inference-cost"));
  let toolStudy: JsonValue | undefined;
  if (binding.codexSessionRoot !== undefined) {
    try {
      toolStudy = readCodexSessionToolStudyCorpus(binding.codexSessionRoot, {
        date: input.date,
        sessionLimit: 12,
      }) as unknown as JsonValue;
    } catch (error) {
      noteFailure(failures, "codex-tool-study")(error instanceof Error ? error.message : String(error));
    }
  }
  return agentOperationsDossier({
    date: input.date,
    actor: input.id ?? "agent:codex",
    goal: input.query ?? "continue governed metroplat development",
    ...(orientation === undefined ? {} : { orientation }),
    ...(strategy === undefined ? {} : { strategy }),
    ...(heartbeat === undefined ? {} : { heartbeat }),
    ...(turn === undefined ? {} : { turn }),
    ...(dispatch === undefined ? {} : { dispatch }),
    ...(skillProposals === undefined ? {} : { skillProposals }),
    ...(inferenceCost === undefined ? {} : { inferenceCost }),
    ...(toolStudy === undefined ? {} : { toolStudy }),
    failures,
  }) as unknown as JsonValue;
}

function executedActuationRequests(root: string, date: string): readonly string[] {
  const feed = journal.feed(root, "rpc", date, { subject: "rpc" });
  if (!journal.sourceStatus(feed).exists) return Object.freeze([]);
  const requests: string[] = [];
  try {
    journal.scan(feed, requests, (accumulator, row) => {
      const { a, v } = eavtObject(row);
      const attribute = record(a as JsonValue | undefined);
      if (attribute?.["kind"] !== "metroplat.rpc.outcome") return accumulator;
      const outcome = record(v as JsonValue | undefined);
      const receipt = record(outcome?.["receipt"]);
      const invoked = record(receipt?.["invocation"]);
      const request = invoked?.["request"];
      if (typeof request === "string" && request.startsWith("agent-actuation:")) accumulator.push(request);
      return accumulator;
    });
  } catch {
    return Object.freeze([]);
  }
  return Object.freeze(requests);
}

/** MAPE-K Execute + Knowledge: dispatch ready monitoring strategy moves to
 *  their mapped RPC operations through the catalog, journal the outcomes, and
 *  refresh the context-image monitoring page from the fresh aggregate so the
 *  post-execution diagnosis reflects the verified state on the same turn. */
export async function readAgentActuationReadout(binding: FilesystemBinding, input: AgentCoordinationInput): Promise<JsonValue | undefined> {
  const failures: string[] = [];
  const suppliedObservation = record(input.observation);
  if (suppliedObservation !== undefined && suppliedObservation["kind"] !== "metroplat.agent.context-image") {
    throw new TypeError("agent-actuation observation must be an metroplat.agent.context-image");
  }
  const observation = suppliedObservation as unknown as AgentContextImage | undefined
    ?? await readAgentContextImageReadout(binding, input);
  if (observation === undefined) return undefined;
  const suppliedDiagnosis = record(input.diagnosis);
  if (suppliedDiagnosis !== undefined && suppliedDiagnosis["kind"] !== "metroplat.agent.context-diagnosis") {
    throw new TypeError("agent-actuation diagnosis must be an metroplat.agent.context-diagnosis");
  }
  const diagnosis = suppliedDiagnosis ?? record(diagnoseAgentContext(observation) as unknown as JsonValue);
  const diagnosisId = typeof diagnosis?.["id"] === "string" ? diagnosis["id"] : undefined;
  const monitoringBefore = typeof diagnosis?.["monitoringCharge"] === "string" ? diagnosis["monitoringCharge"] : "unknown";
  const strategy = record(await readAgentStrategyReadout(binding, Object.freeze({
    ...input,
    observation: observation as unknown as JsonValue,
    ...(diagnosis === undefined ? {} : { diagnosis: diagnosis as unknown as JsonValue }),
  })));
  const moves = Array.isArray(strategy?.["nextMoves"]) ? strategy["nextMoves"] : [];
  const plan = agentActuationPlan({
    date: input.date,
    ...(diagnosisId === undefined ? {} : { diagnosis: diagnosisId }),
    moves,
    executedRequests: executedActuationRequests(binding.dataRoot, input.date),
  });

  // The RPC catalog is the mux: monitoring operations execute through it directly.
  const catalog = createOperationCatalog([
    ...sourceCodePolicyOperations({
      ...(binding.packageRoot === undefined ? {} : { packageRoot: binding.packageRoot }),
      dataRoot: binding.dataRoot,
      ...(binding.now === undefined ? {} : { now: binding.now }),
    }),
    ...proofHealthOperations({
      dataRoot: binding.dataRoot,
      ...(binding.now === undefined ? {} : { now: binding.now }),
    }),
  ]);
  const mappedVerbs = new Set(Object.values(MONITORING_MOVE_OPERATIONS));
  const standing = new Map(catalog.operations
    .filter((candidate) => mappedVerbs.has(candidate.verb))
    .map((candidate) => [candidate.ref, "held" as const]));
  const authorize = authorizationFromStanding(standing, "agent-actuation-standing");
  const witness = journalRpcWitness(binding.dataRoot, {
    ...(binding.rootName === undefined ? {} : { namespace: binding.rootName }),
  });
  const now = binding.now ?? ((): string => new Date().toISOString());
  const actor = input.id ?? "agent:codex";

  const executions: AgentActuationExecution[] = [];
  let refreshedMonitoring: JsonValue | undefined;
  let refreshedProofHealth: JsonValue | undefined;
  for (const planned of plan.entries) {
    if (planned.state !== "planned" || planned.operation === undefined || planned.request === undefined) continue;
    const target = catalog.byVerb.get(planned.operation);
    if (target === undefined) {
      failures.push(`agent-actuation: operation ${planned.operation} is not in the RPC catalog`);
      executions.push(agentActuationExecution({
        move: planned.move,
        operation: planned.operation,
        request: planned.request,
        ok: false,
        reasons: ["operation-not-in-catalog"],
      }));
      continue;
    }
    try {
      const candidate = invocation({
        request: planned.request,
        subject: actor,
        operation: target.ref,
        verb: target.verb,
        resource: planned.operation === "proof-health-monitor-aggregate"
          ? "metroplat:monitoring:proof-health"
          : "metroplat:monitoring:source-code",
        input: Object.freeze({}) as JsonValue,
        caller: Object.freeze({
          transport: "agent-actuation",
          move: planned.move,
          ...(diagnosisId === undefined ? {} : { diagnosis: diagnosisId }),
        }) as JsonValue,
        observedAt: now(),
      });
      const receipt = await dispatch({ catalog, witness, authorize, now }, candidate);
      executions.push(agentActuationExecution({
        move: planned.move,
        operation: planned.operation,
        request: planned.request,
        ok: receipt.ok,
        receipt: receipt.id,
        invocation: candidate.id,
        ...(receipt.ok ? { outcome: receipt.value } : {}),
        reasons: receipt.ok ? [] : receipt.reasons,
      }));
      const outcome = record(receipt.ok ? receipt.value : undefined);
      if (outcome?.["kind"] === "metroplat.monitoring.source-code.aggregate") {
        refreshedMonitoring = receipt.value;
      }
      if (outcome?.["kind"] === "metroplat.monitoring.aggregate" && outcome["name"] === "proof-health") {
        refreshedProofHealth = receipt.value;
      }
    } catch (error) {
      noteFailure(failures, "agent-actuation")(error instanceof Error ? error.message : String(error));
      executions.push(agentActuationExecution({
        move: planned.move,
        operation: planned.operation,
        request: planned.request,
        ok: false,
        reasons: ["dispatch-error"],
      }));
    }
  }

  // Knowledge writeback: refresh the monitoring page from the fresh aggregate
  // and re-diagnose, so the post-execution charge is visible this turn.
  let monitoringAfter = monitoringBefore;
  let contextImageId: string | undefined;
  if (refreshedMonitoring !== undefined || refreshedProofHealth !== undefined) {
    const priorMonitoring = refreshedMonitoring ?? agentContextPageMaterial(observation, "page:monitoring");
    const priorProofHealth = refreshedProofHealth ?? agentContextPageMaterial(observation, "page:proof-health");
    const priorOrientation = agentContextPageMaterial(observation, "page:orientation");
    const priorWorkDispatch = agentContextPageMaterial(observation, "page:work-dispatch");
    const priorSkillProposals = agentContextPageMaterial(observation, "page:skill-proposals");
    const priorTokenUsage = agentContextPageMaterial(observation, "page:token-window");
    const priorToolSurface = agentContextPageMaterial(observation, "page:tool-surface");
    const refreshedImage = agentContextImage({
      date: input.date,
      actor,
      goal: input.query ?? "continue governed metroplat development",
      ...(priorMonitoring === undefined ? {} : { monitoring: priorMonitoring }),
      ...(priorProofHealth === undefined ? {} : { proofHealth: priorProofHealth }),
      ...(priorOrientation === undefined ? {} : { orientation: priorOrientation }),
      ...(priorWorkDispatch === undefined ? {} : { workDispatch: priorWorkDispatch }),
      ...(priorSkillProposals === undefined ? {} : { skillProposals: priorSkillProposals }),
      ...(priorTokenUsage === undefined ? {} : { tokenUsage: priorTokenUsage }),
      ...(priorToolSurface === undefined ? {} : { toolSurface: priorToolSurface }),
      failures,
    });
    contextImageId = refreshedImage.id;
    const refreshedDiagnosis = record(diagnoseAgentContext(refreshedImage) as unknown as JsonValue);
    if (typeof refreshedDiagnosis?.["monitoringCharge"] === "string") {
      monitoringAfter = refreshedDiagnosis["monitoringCharge"];
    }
  }

  return agentActuationDossier({
    date: input.date,
    actor,
    goal: input.query ?? "continue governed metroplat development",
    ...(diagnosisId === undefined ? {} : { diagnosis: diagnosisId }),
    plan,
    executions,
    monitoringBefore,
    monitoringAfter,
    ...(contextImageId === undefined ? {} : { contextImage: contextImageId }),
    failures,
  }) as unknown as JsonValue;
}

export async function readAgentContextImageReadout(binding: FilesystemBinding, input: AgentCoordinationInput): Promise<AgentContextImage | undefined> {
  const failures: string[] = [];
  const orientation = await readAgentOrientationReadout(binding, input);
  const workDispatch = workDispatchOf(input, binding, noteFailure(failures, "agent-work-dispatch"));
  const skillProposals = readAgentSkillProposalsReadout(binding, input.date);
  const tokenUsage = readAgentSessionTokenUsageReadout(binding, {
    date: input.date,
    ...(input.tokenCostRates === undefined ? {} : { tokenCostRates: input.tokenCostRates }),
    ...(input.tokenCostRateTable === undefined ? {} : { tokenCostRateTable: input.tokenCostRateTable }),
  });
  const priorContext = binding.codexMemoryRoot === undefined
    ? undefined
    : readCodexMemoryPriorContext(binding.codexMemoryRoot, {
        query: input.query ?? "continue governed metroplat development",
      }) as unknown as JsonValue;
  const toolSurface = Object.freeze({
    kind: "metroplat.agent.tool-surface",
    source: "src/agents/service",
    actions: Object.freeze([
      ...agentCoordinationOperations(binding).map((act) => Object.freeze({
        verb: act.verb,
        transport: "agent-coordination",
        inputFormat: "json",
        outputFormat: "json",
      })),
      ...workCoordinationOperations(binding).map((act) => Object.freeze({
        verb: act.verb,
        transport: "work-coordination",
        inputFormat: "json",
        outputFormat: "json",
      })),
    ]),
    evidence: Object.freeze(["source:agent-coordination-actions"]),
  }) as unknown as JsonValue;
  return agentContextImage({
    date: input.date,
    actor: input.id ?? "agent:codex",
    goal: input.query ?? "continue governed metroplat development",
    ...(orientation === undefined ? {} : { orientation }),
    ...(workDispatch === undefined ? {} : { workDispatch }),
    ...(skillProposals === undefined ? {} : { skillProposals }),
    ...(priorContext === undefined ? {} : { priorContext }),
    ...(tokenUsage === undefined ? {} : { tokenUsage }),
    toolSurface,
    failures,
  });
}

function readAgentCoordination(
  verb: AgentCoordinationVerb,
  binding: FilesystemBinding,
  input: AgentCoordinationInput,
): unknown | Promise<unknown> {
  if (verb === "orientation") return readAgentOrientationReadout(binding, input);
  if (verb === "skill-candidates") return readAgentSkillCandidatesReadout(binding, input.date);
  if (verb === "skill-proposals") return readAgentSkillProposalsReadout(binding, input.date);
  if (verb === "agent-diagnosis") return readAgentDiagnosisReadout(binding, input);
  if (verb === "agent-strategy") return readAgentStrategyReadout(binding, input);
  if (verb === "agent-heartbeat") return readAgentHeartbeatReadout(binding, input);
  if (verb === "agent-turn") return readAgentTurnReadout(binding, input);
  if (verb === "agent-operations") return readAgentOperationsReadout(binding, input);
  if (verb === "agent-actuation") return readAgentActuationReadout(binding, input);
  return readAgentContextImageReadout(binding, input);
}

export function agentCoordinationOperations(binding: FilesystemBinding): readonly Operation[] {
  const operationOf = (verb: AgentCoordinationVerb): Operation => operation({
    verb,
    inputFormat: "json",
    outputFormat: "json",
    summary: `Read ${verb} agent coordination material.`,
    description: "Domain: { date?, id?, query?, observation?, diagnosis?, tokenCostRates?, tokenCostRateTable? }. date defaults to the binding clock day; id selects the actor; query names the agent goal. agent-diagnosis may analyze a carried context-image observation; agent-strategy may plan from carried context-image and context-diagnosis predecessors.",
    run: async (input: unknown): Promise<unknown> => {
      const readInput = agentCoordinationInputOf(input, binding);
      return await readAgentCoordination(verb, binding, readInput) ?? null;
    },
  });
  return Object.freeze([
    operationOf("orientation"),
    operationOf("skill-candidates"),
    operationOf("skill-proposals"),
    operationOf("agent-diagnosis"),
    operationOf("agent-strategy"),
    operationOf("agent-heartbeat"),
    operationOf("agent-turn"),
    operationOf("agent-operations"),
    operationOf("agent-actuation"),
    operationOf("agent-context-image"),
  ]);
}
