import { sitePlay, type OperationsManifoldWorkItem, type SitePlayReading, type SitePlayStep } from "./site-play.mts";
import { generatedAtField, recordOf, stringField } from "./records.mts";

export type ApplicationNucleus = Readonly<{
  id: string;
  endpoint: string;
  application: string;
  arena: Readonly<{
    input: readonly string[];
    output: readonly string[];
  }>;
  sees: readonly string[];
  predicates: readonly string[];
  doneWhen: readonly string[];
  witness: Readonly<{
    status: "present" | "obstructed" | "missing";
    generatedAt?: string;
    kind?: string;
  }>;
}>;

export type ControlCondition = Readonly<{
  condition: "witness-chain" | "safety-envelope" | "charter-tier" | "persistent-state";
  verdict: "pass" | "missing" | "repair";
  evidence: string;
  requiredEvidence: string;
}>;

export type WorkEnactment = Readonly<{
  workId: string;
  title: string;
  office: string;
  target: string;
  settlement: "inquiry" | "derivation" | "procedure" | "process";
  loop: "bounded" | "unbounded";
  status: "admitted" | "needs-control-evidence" | "blocked";
  priority: number;
  strategy: readonly string[];
  doneWhen: readonly string[];
  control: readonly ControlCondition[];
  missingEvidence: readonly string[];
}>;

export type OrchestrationReading = Readonly<{
  kind: "operations-manifold.orchestration";
  generatedAt: string;
  focus: string | null;
  tooling: readonly string[];
  nuclei: readonly ApplicationNucleus[];
  enactments: readonly WorkEnactment[];
  next: readonly WorkEnactment[];
  play: SitePlayReading;
}>;

export async function orchestration(
  repoRoot: string,
  params: Readonly<{ focus?: string | undefined }> = {},
): Promise<OrchestrationReading> {
  const play = await sitePlay(repoRoot, params);
  const enactments = play.workItems.map((item) => enactmentFor(item, play));
  return Object.freeze({
    kind: "operations-manifold.orchestration" as const,
    generatedAt: new Date().toISOString(),
    focus: play.focus,
    tooling: Object.freeze([
      "mcp:graph-workspace",
      "mcp:find-capability",
      "mcp:read-site-operations",
      "mcp:read-orchestration",
      "http:/read-site-operations",
      "http:/read-site-play",
      "http:/read-orchestration",
      "script:read-orchestration",
    ]),
    nuclei: Object.freeze(play.operations.operations.map(applicationNucleusForOperation)),
    enactments: Object.freeze(enactments),
    next: Object.freeze(
      enactments
        .filter((item) => item.status !== "blocked")
        .sort((left, right) => right.priority - left.priority || left.workId.localeCompare(right.workId))
        .slice(0, 8),
    ),
    play,
  });
}

function applicationNucleusForOperation(operation: SitePlayReading["operations"]["operations"][number]): ApplicationNucleus {
  if (operation.status === "obstruction") {
    return Object.freeze({
      id: `operation:${operation.endpoint}`,
      endpoint: operation.endpoint,
      application: "unknown",
      arena: Object.freeze({ input: Object.freeze(["operation-request"]), output: Object.freeze(["obstruction"]) }),
      sees: Object.freeze([operation.url]),
      predicates: Object.freeze(["reachable", "witness-present"]),
      doneWhen: Object.freeze(["operation witness is reachable and shaped as an object"]),
      witness: Object.freeze({ status: "obstructed" as const }),
    });
  }

  const body = recordOf(operation.body);
  const kind = stringField(body, "kind") ?? "operation-witness";
  const keys = body === null ? [] : Object.keys(body).sort();
  const generatedAt = generatedAtField(body);
  return Object.freeze({
    id: `operation:${operation.endpoint}:${kind}`,
    endpoint: operation.endpoint,
    application: kind,
    arena: Object.freeze({
      input: Object.freeze(["site-operation-witness", ...keys.map((key) => `${kind}.${key}`)]),
      output: Object.freeze(["judgments", "steps", "read-work-items", "interrupts", "createCheckpoint"]),
    }),
    sees: Object.freeze(keys),
    predicates: Object.freeze(predicatesFor(kind, keys)),
    doneWhen: Object.freeze(doneWhenFor(kind)),
    witness: Object.freeze({
      status: "present" as const,
      kind,
      ...(generatedAt === undefined ? {} : { generatedAt }),
    }),
  });
}

function predicatesFor(kind: string, keys: readonly string[]): readonly string[] {
  if (kind.endsWith(".publication-game")) {
    return Object.freeze([
      "demand-has-next-assignment",
      "desk-review-queue-empty",
      "runs-obstruction-free",
      "withheld-runs-repaired",
      "compost-evidence-consumed",
      "publication-surfaces-declared",
    ]);
  }
  return Object.freeze(["witness-shaped", ...keys.map((key) => `${key}-available`)]);
}

function doneWhenFor(kind: string): readonly string[] {
  if (kind.endsWith(".publication-game")) {
    return Object.freeze([
      "operation witness reachable",
      "no obstructed runs",
      "no withheld runs without repair evidence",
      "no editorial candidates waiting without the required office",
      "next assignment selected or demand intentionally empty",
    ]);
  }
  return Object.freeze(["operation witness reachable", "required predicates settled"]);
}

function enactmentFor(item: OperationsManifoldWorkItem, play: SitePlayReading): WorkEnactment {
  const step = play.steps.find((candidate) =>
    item.fields.source === `${candidate.endpoint}:${candidate.subject}` &&
    item.fields.title === titleForMove(candidate.move)
  );
  const settlement = settlementFor(item, step);
  const loop = settlement === "procedure" || settlement === "process" ? "bounded" : "unbounded";
  const control = controlFor(item, step, settlement, play);
  const missingEvidence = control.filter((condition) => condition.verdict !== "pass").map((condition) => condition.requiredEvidence);
  return Object.freeze({
    workId: item.workId,
    title: item.fields.title,
    office: officeFor(item),
    target: item.fields.source,
    settlement,
    loop,
    status: missingEvidence.length === 0 ? "admitted" : "needs-control-evidence",
    priority: item.fields.priority,
    strategy: Object.freeze(strategyFor(item, step)),
    doneWhen: Object.freeze(doneWhenForWork(item, step)),
    control: Object.freeze(control),
    missingEvidence: Object.freeze(missingEvidence),
  });
}

function titleForMove(move: string): string {
  return move.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function settlementFor(item: OperationsManifoldWorkItem, step: SitePlayStep | undefined): WorkEnactment["settlement"] {
  if (item.fields.requiredSkill === "fable" || step?.requiresReview === true) return "derivation";
  if (step?.move === "prepare-next-assignment") return "inquiry";
  if (step?.move === "restore-obstructed-intake") return "procedure";
  return "process";
}

function officeFor(item: OperationsManifoldWorkItem): string {
  return item.fields.requiredSkill === "fable" ? "koios.newsroom" : "operations-manifold.engineering";
}

function strategyFor(item: OperationsManifoldWorkItem, step: SitePlayStep | undefined): readonly string[] {
  return [
    "observe operation witness through MCP/site-operation surface",
    `classify read-work as ${settlementFor(item, step)}`,
    `dispatch to ${officeFor(item)}`,
    "verify done conditions against witness evidence",
    "settle report back into 561 Group Operations Manifold read-work state",
  ];
}

function doneWhenForWork(item: OperationsManifoldWorkItem, step: SitePlayStep | undefined): readonly string[] {
  if (step?.move === "restore-obstructed-intake") return ["affected operation returns a witness", "obstruction count decreases"];
  if (step?.move === "repair-withheld-runs") return ["withheld run gates pass", "compost evidence is consumed into a repaired candidate"];
  if (step?.move === "review-editorial-read-work") return ["required newsroom office reviews candidate", "review decision is recorded as witness evidence"];
  if (step?.move === "prepare-next-assignment") return ["next assignment has input evidence", "assignment is either enacted or explicitly deferred"];
  return [item.fields.summary];
}

function controlFor(
  item: OperationsManifoldWorkItem,
  step: SitePlayStep | undefined,
  settlement: WorkEnactment["settlement"],
  play: SitePlayReading,
): readonly ControlCondition[] {
  const witnessEvidence = item.fields.source.length > 0 ? item.fields.source : "";
  const charterTier = settlement === "procedure" || settlement === "process" ? "T1 rules" : "T2 guidelines";
  return [
    condition(
      "witness-chain",
      witnessEvidence.length > 0 ? "pass" : "missing",
      witnessEvidence.length > 0 ? `source witness ${witnessEvidence}` : "no source witness recorded",
      "source witness tied to the read-workitem",
    ),
    condition(
      "safety-envelope",
      "pass",
      "non-actuating site/software read-workitem; safety-envelope precheck is vacuous",
      "safety-envelope declaration or non-actuating class exemption",
    ),
    condition(
      "charter-tier",
      officeFor(item).length > 0 ? "pass" : "missing",
      `${charterTier} via ${officeFor(item)} for ${step?.move ?? item.fields.subject}`,
      "office authorization at the required charter tier",
    ),
    condition(
      "persistent-state",
      play.createCheckpoint.operations.length > 0 ? "pass" : "missing",
      play.createCheckpoint.operations.length > 0 ? `${play.createCheckpoint.operations.length} operation createCheckpoint(s)` : "no createCheckpoint",
      "createCheckpoint preserving interrupt/resume state",
    ),
  ];
}

function condition(
  conditionName: ControlCondition["condition"],
  verdict: ControlCondition["verdict"],
  evidence: string,
  requiredEvidence: string,
): ControlCondition {
  return Object.freeze({ condition: conditionName, verdict, evidence, requiredEvidence });
}
