/**
 * The sole semantic carrier for a roadmap.  It is a typed SignGraph, not a
 * nested status document: literal directions, sources, work structure,
 * skills, resources, changes, actions, receipts, and milestones are cells;
 * their reasons and dependencies are witnessed typed edges.
 */
import { defineType, type DataType, type Result } from "@red-cup-engineering/computer-data-engine";
import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";
import { createSignCell, referenceOf, type SignCell } from "@red-cup-engineering/computer-data-engine/semantic-cell";
import { createSignGraph, type SignGraph, type SignGraphEdge, type SignGraphRelation } from "@red-cup-engineering/computer-data-engine/semantic-graph";

export const ROADMAP_WORK_KINDS = Object.freeze(["endeavor", "campaign", "project", "plan", "task", "work-item"] as const);
export type RoadmapWorkKind = typeof ROADMAP_WORK_KINDS[number];
export type RoadmapNodeKind = "founder-direction" | "theory" | "resource" | "skill" | "change" | "action" | "receiver" | "receipt" | "evidence" | "milestone" | RoadmapWorkKind;

type BaseContent = Readonly<{ readonly title: string; readonly description: string }>;
export type RoadmapNode =
  | Readonly<{ readonly key: string; readonly kind: "founder-direction"; readonly content: BaseContent & Readonly<{ readonly literal: string; readonly recordedAt: string; readonly authority: string }> }>
  | Readonly<{ readonly key: string; readonly kind: "theory"; readonly content: BaseContent & Readonly<{ readonly locator: string; readonly status: "proved" | "implemented" | "documented" | "open"; readonly claim: string }> }>
  | Readonly<{ readonly key: string; readonly kind: "resource"; readonly content: BaseContent & Readonly<{ readonly locator: string; readonly mediaType: string }> }>
  | Readonly<{ readonly key: string; readonly kind: "skill"; readonly content: BaseContent & Readonly<{ readonly locator: string; readonly purpose: string }> }>
  | Readonly<{ readonly key: string; readonly kind: "change"; readonly content: BaseContent & Readonly<{ readonly target: string; readonly before: string; readonly after: string; readonly acceptance: string }> }>
  | Readonly<{ readonly key: string; readonly kind: "action"; readonly content: BaseContent & Readonly<{ readonly operation: string; readonly effect: string; readonly acceptance: string }> }>
  | Readonly<{ readonly key: string; readonly kind: "receiver"; readonly content: BaseContent & Readonly<{ readonly receiver: string; readonly acceptance: string }> }>
  | Readonly<{ readonly key: string; readonly kind: "receipt"; readonly content: BaseContent & Readonly<{ readonly locator: string; readonly outcome: "accepted" | "refused" }> }>
  | Readonly<{ readonly key: string; readonly kind: "evidence"; readonly content: BaseContent & Readonly<{ readonly locator: string; readonly excerpt: string }> }>
  | Readonly<{ readonly key: string; readonly kind: "milestone"; readonly content: BaseContent }>
  | Readonly<{ readonly key: string; readonly kind: RoadmapWorkKind; readonly content: BaseContent & Readonly<{ readonly intendedOutcome: string; readonly acceptance: string }> }>;

export type RoadmapEdgeKind = "contains" | "directed-by" | "informed-by" | "uses-resource" | "uses-skill" | "changes" | "derives-action" | "requires" | "depends-on" | "accepted" | "received-by" | "supersedes";
export type RoadmapEdge = Readonly<{ readonly from: string; readonly predicate: RoadmapEdgeKind; readonly to: string; readonly witness: string }>;
export type SignRoadmapInput = Readonly<{ readonly nodes: readonly RoadmapNode[]; readonly edges: readonly RoadmapEdge[] }>;
export type SignRoadmap = Readonly<{ readonly graph: SignGraph; readonly cells: ReadonlyMap<string, SignCell> }>;
export type SignRoadmapRefusal = Readonly<{ readonly code: "duplicate-key" | "unknown-key" | "invalid-edge" | "invalid-node" | "graph-refused"; readonly message: string }>;

/** Wire contract plus the parser below make an admitted roadmap impossible to
 * mistake for a free-form status document at an RPC boundary. */
export const signRoadmapInputSchema = {
  $id: "metroplat/work/sign-roadmap-input",
  type: "object",
  required: ["nodes", "edges"],
  additionalProperties: false,
  properties: {
    nodes: { type: "array", items: {
      type: "object", required: ["key", "kind", "content"], additionalProperties: false,
      properties: {
        key: { type: "string", minLength: 1 },
        kind: { enum: ["founder-direction", "theory", "resource", "skill", "change", "action", "receiver", "receipt", "evidence", "milestone", "endeavor", "campaign", "project", "plan", "task", "work-item"] },
        content: { type: "object" },
      },
    } },
    edges: { type: "array", items: {
      type: "object", required: ["from", "predicate", "to", "witness"], additionalProperties: false,
      properties: {
        from: { type: "string", minLength: 1 },
        predicate: { enum: ["contains", "directed-by", "informed-by", "uses-resource", "uses-skill", "changes", "derives-action", "requires", "depends-on", "accepted", "received-by", "supersedes"] },
        to: { type: "string", minLength: 1 }, witness: { type: "string", minLength: 1 },
      },
    } },
  },
} as const;
export const signRoadmapInputContract = schemaFrom(signRoadmapInputSchema);
export const signRoadmapAdmissionSchema = {
  $id: "metroplat/work/sign-roadmap-admission",
  oneOf: [
    {
      type: "object", required: ["graph", "appended", "status"], additionalProperties: false,
      properties: {
        graph: { type: "string", minLength: 1 }, appended: { type: "integer", minimum: 0 }, status: { enum: ["admitted", "already-admitted"] },
      },
    },
    {
      type: "object", required: ["ok", "refusal"], additionalProperties: false,
      properties: {
        ok: { const: false },
        refusal: {
          type: "object", required: ["code", "message"], additionalProperties: false,
          properties: { code: { enum: ["duplicate-key", "unknown-key", "invalid-edge", "invalid-node", "graph-refused"] }, message: { type: "string", minLength: 1 } },
        },
      },
    },
  ],
} as const;
export const signRoadmapAdmissionContract = schemaFrom(signRoadmapAdmissionSchema);

const accepted = <Value,>(value: Value): Result<Value, never> => Object.freeze({ ok: true, value });
const refused = (code: SignRoadmapRefusal["code"], message: string): Result<never, SignRoadmapRefusal> => Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });
const workKinds = new Set<string>(ROADMAP_WORK_KINDS);
const sourceKinds = new Set<RoadmapNodeKind>(["founder-direction", "theory", "evidence", "receipt"]);
const allKinds = Object.freeze(["founder-direction", "theory", "resource", "skill", "change", "action", "receiver", "receipt", "evidence", "milestone", ...ROADMAP_WORK_KINDS] as const);

function typeFor(kind: RoadmapNodeKind): DataType {
  const common = {
    type: "object",
    required: ["title", "description"],
    properties: { title: { type: "string", minLength: 1 }, description: { type: "string", minLength: 1 } },
  } as const;
  const specialized: Record<RoadmapNodeKind, Readonly<{ readonly required: readonly string[]; readonly properties: Readonly<Record<string, unknown>> }>> = {
    "founder-direction": { required: ["literal", "recordedAt", "authority"], properties: { literal: { type: "string", minLength: 1 }, recordedAt: { type: "string", minLength: 1 }, authority: { type: "string", minLength: 1 } } },
    theory: { required: ["locator", "status", "claim"], properties: { locator: { type: "string", minLength: 1 }, status: { enum: ["proved", "implemented", "documented", "open"] }, claim: { type: "string", minLength: 1 } } },
    resource: { required: ["locator", "mediaType"], properties: { locator: { type: "string", minLength: 1 }, mediaType: { type: "string", minLength: 1 } } },
    skill: { required: ["locator", "purpose"], properties: { locator: { type: "string", minLength: 1 }, purpose: { type: "string", minLength: 1 } } },
    change: { required: ["target", "before", "after", "acceptance"], properties: { target: { type: "string", minLength: 1 }, before: { type: "string", minLength: 1 }, after: { type: "string", minLength: 1 }, acceptance: { type: "string", minLength: 1 } } },
    action: { required: ["operation", "effect", "acceptance"], properties: { operation: { type: "string", minLength: 1 }, effect: { type: "string", minLength: 1 }, acceptance: { type: "string", minLength: 1 } } },
    receiver: { required: ["receiver", "acceptance"], properties: { receiver: { type: "string", minLength: 1 }, acceptance: { type: "string", minLength: 1 } } },
    receipt: { required: ["locator", "outcome"], properties: { locator: { type: "string", minLength: 1 }, outcome: { enum: ["accepted", "refused"] } } },
    evidence: { required: ["locator", "excerpt"], properties: { locator: { type: "string", minLength: 1 }, excerpt: { type: "string", minLength: 1 } } },
    milestone: { required: [], properties: {} },
    endeavor: { required: ["intendedOutcome", "acceptance"], properties: { intendedOutcome: { type: "string", minLength: 1 }, acceptance: { type: "string", minLength: 1 } } },
    campaign: { required: ["intendedOutcome", "acceptance"], properties: { intendedOutcome: { type: "string", minLength: 1 }, acceptance: { type: "string", minLength: 1 } } },
    project: { required: ["intendedOutcome", "acceptance"], properties: { intendedOutcome: { type: "string", minLength: 1 }, acceptance: { type: "string", minLength: 1 } } },
    plan: { required: ["intendedOutcome", "acceptance"], properties: { intendedOutcome: { type: "string", minLength: 1 }, acceptance: { type: "string", minLength: 1 } } },
    task: { required: ["intendedOutcome", "acceptance"], properties: { intendedOutcome: { type: "string", minLength: 1 }, acceptance: { type: "string", minLength: 1 } } },
    "work-item": { required: ["intendedOutcome", "acceptance"], properties: { intendedOutcome: { type: "string", minLength: 1 }, acceptance: { type: "string", minLength: 1 } } },
  };
  const details = specialized[kind];
  const result = defineType({
    id: `metroplat.roadmap.${kind}@1`, name: `MetroPlat roadmap ${kind}`, description: `Typed ${kind} cell in the single derived roadmap.`,
    schema: { type: "object", required: [...common.required, ...details.required], properties: { ...common.properties, ...details.properties }, additionalProperties: false },
    parents: [],
  } as const);
  if (!result.ok) throw new Error(result.refusal.message);
  return result.value;
}
const types = new Map<RoadmapNodeKind, DataType>(allKinds.map((kind) => [kind, typeFor(kind)]));
const typeId = (kind: RoadmapNodeKind): string => types.get(kind)!.id;
const kindsFor = (...kinds: readonly RoadmapNodeKind[]): readonly string[] => Object.freeze(kinds.map(typeId));
const evidenceKinds = kindsFor("founder-direction", "theory", "evidence", "receipt");
const relations: readonly SignGraphRelation[] = Object.freeze([
  { id: "roadmap.contains", subjectTypes: kindsFor("endeavor", "campaign", "project", "plan", "task"), objectTypes: kindsFor("campaign", "project", "plan", "task", "work-item"), witnessTypes: evidenceKinds },
  { id: "roadmap.directed-by", subjectTypes: kindsFor(...ROADMAP_WORK_KINDS, "milestone"), objectTypes: kindsFor("founder-direction"), witnessTypes: evidenceKinds },
  { id: "roadmap.informed-by", subjectTypes: kindsFor(...ROADMAP_WORK_KINDS, "milestone", "change"), objectTypes: kindsFor("theory"), witnessTypes: evidenceKinds },
  { id: "roadmap.uses-resource", subjectTypes: kindsFor(...ROADMAP_WORK_KINDS, "change", "action"), objectTypes: kindsFor("resource"), witnessTypes: evidenceKinds },
  { id: "roadmap.uses-skill", subjectTypes: kindsFor("task", "work-item"), objectTypes: kindsFor("skill"), witnessTypes: evidenceKinds },
  { id: "roadmap.changes", subjectTypes: kindsFor("work-item"), objectTypes: kindsFor("change"), witnessTypes: evidenceKinds },
  { id: "roadmap.derives-action", subjectTypes: kindsFor("change"), objectTypes: kindsFor("action"), witnessTypes: evidenceKinds },
  { id: "roadmap.requires", subjectTypes: kindsFor("milestone"), objectTypes: kindsFor(...ROADMAP_WORK_KINDS, "receipt"), witnessTypes: evidenceKinds },
  { id: "roadmap.depends-on", subjectTypes: kindsFor(...ROADMAP_WORK_KINDS), objectTypes: kindsFor(...ROADMAP_WORK_KINDS), witnessTypes: evidenceKinds },
  { id: "roadmap.accepted", subjectTypes: kindsFor("receipt"), objectTypes: kindsFor(...ROADMAP_WORK_KINDS, "change", "action"), witnessTypes: kindsFor("receipt") },
  { id: "roadmap.received-by", subjectTypes: kindsFor("receipt"), objectTypes: kindsFor("receiver"), witnessTypes: kindsFor("receipt") },
  { id: "roadmap.supersedes", subjectTypes: kindsFor("founder-direction"), objectTypes: kindsFor("founder-direction"), witnessTypes: evidenceKinds },
]);
const relationId = (predicate: RoadmapEdgeKind): string => `roadmap.${predicate}`;

function recordOf(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : undefined;
}

function requiredText(content: Readonly<Record<string, unknown>>, names: readonly string[]): boolean {
  return names.every((name) => typeof content[name] === "string" && (content[name] as string).trim() !== "");
}

/** Decode untrusted wire values before they become the shared roadmap model. */
export function parseSignRoadmapInput(input: unknown): Result<SignRoadmapInput, SignRoadmapRefusal> {
  const record = recordOf(input);
  if (record === undefined || !Array.isArray(record.nodes) || !Array.isArray(record.edges)) return refused("invalid-node", "roadmap requires nodes and edges arrays");
  const nodes: RoadmapNode[] = [];
  for (const rawNode of record.nodes) {
    const node = recordOf(rawNode);
    const content = node === undefined ? undefined : recordOf(node.content);
    const key = node?.key;
    const kind = node?.kind;
    if (node === undefined || content === undefined || typeof key !== "string" || key.trim() === "" || typeof kind !== "string" || !allKinds.includes(kind as RoadmapNodeKind) || !requiredText(content, ["title", "description"])) return refused("invalid-node", "roadmap node has an invalid key, kind, or base content");
    const textsByKind: Partial<Record<RoadmapNodeKind, readonly string[]>> = {
      "founder-direction": ["literal", "recordedAt", "authority"], theory: ["locator", "status", "claim"], resource: ["locator", "mediaType"], skill: ["locator", "purpose"],
      change: ["target", "before", "after", "acceptance"], action: ["operation", "effect", "acceptance"], receiver: ["receiver", "acceptance"], receipt: ["locator", "outcome"], evidence: ["locator", "excerpt"],
      endeavor: ["intendedOutcome", "acceptance"], campaign: ["intendedOutcome", "acceptance"], project: ["intendedOutcome", "acceptance"], plan: ["intendedOutcome", "acceptance"], task: ["intendedOutcome", "acceptance"], "work-item": ["intendedOutcome", "acceptance"],
    };
    if (!requiredText(content, textsByKind[kind as RoadmapNodeKind] ?? [])) return refused("invalid-node", `roadmap ${kind} node lacks required content`);
    if (kind === "theory" && !["proved", "implemented", "documented", "open"].includes(content.status as string)) return refused("invalid-node", "roadmap theory status is invalid");
    if (kind === "receipt" && !["accepted", "refused"].includes(content.outcome as string)) return refused("invalid-node", "roadmap receipt outcome is invalid");
    nodes.push(Object.freeze({ key, kind, content: Object.freeze({ ...content }) } as RoadmapNode));
  }
  const edges: RoadmapEdge[] = [];
  for (const rawEdge of record.edges) {
    const edge = recordOf(rawEdge);
    if (edge === undefined || typeof edge.from !== "string" || typeof edge.to !== "string" || typeof edge.witness !== "string" || typeof edge.predicate !== "string" || !["contains", "directed-by", "informed-by", "uses-resource", "uses-skill", "changes", "derives-action", "requires", "depends-on", "accepted", "received-by", "supersedes"].includes(edge.predicate)) return refused("invalid-edge", "roadmap edge is not a declared typed edge");
    edges.push(Object.freeze({ from: edge.from, to: edge.to, witness: edge.witness, predicate: edge.predicate as RoadmapEdgeKind }));
  }
  return accepted(Object.freeze({ nodes: Object.freeze(nodes), edges: Object.freeze(edges) }));
}

function validContainment(from: RoadmapNodeKind, to: RoadmapNodeKind): boolean {
  if (!workKinds.has(from) || !workKinds.has(to)) return false;
  return ROADMAP_WORK_KINDS.indexOf(to as RoadmapWorkKind) === ROADMAP_WORK_KINDS.indexOf(from as RoadmapWorkKind) + 1;
}

/** Create the one roadmap graph from fully typed cells and explicitly witnessed edges. */
export function createSignRoadmap(input: SignRoadmapInput): Result<SignRoadmap, SignRoadmapRefusal> {
  const cells = new Map<string, SignCell>();
  const kinds = new Map<string, RoadmapNodeKind>();
  for (const node of input.nodes) {
    if (node.key.trim() === "" || cells.has(node.key)) return refused(node.key.trim() === "" ? "invalid-node" : "duplicate-key", `roadmap node key ${node.key || "(empty)"} is invalid`);
    const type = types.get(node.kind);
    if (type === undefined) return refused("invalid-node", `unknown roadmap node kind ${node.kind}`);
    const cell = createSignCell(type, node.content);
    if (!cell.ok) return refused("invalid-node", `${node.key}: ${cell.refusal.message}`);
    cells.set(node.key, cell.value); kinds.set(node.key, node.kind);
  }
  const edges: SignGraphEdge[] = [];
  for (const edge of input.edges) {
    const from = cells.get(edge.from), to = cells.get(edge.to), witness = cells.get(edge.witness);
    if (from === undefined || to === undefined || witness === undefined) return refused("unknown-key", `edge ${edge.predicate} references a node key not present in this roadmap`);
    const fromKind = kinds.get(edge.from)!, toKind = kinds.get(edge.to)!, witnessKind = kinds.get(edge.witness)!;
    if (edge.predicate === "contains" && !validContainment(fromKind, toKind)) return refused("invalid-edge", "roadmap containment must move exactly one level down the work spine");
    if (!sourceKinds.has(witnessKind)) return refused("invalid-edge", "every roadmap edge must be witnessed by a direction, theory, evidence, or receipt cell");
    edges.push(Object.freeze({ subject: referenceOf(from), predicate: relationId(edge.predicate), object: referenceOf(to), witness: referenceOf(witness) }));
  }
  const graph = createSignGraph({ cells: [...cells.values()], relations, edges });
  return graph.ok ? accepted(Object.freeze({ graph: graph.value, cells })) : refused("graph-refused", graph.refusal.message);
}

export interface DerivedMilestone {
  readonly milestone: string;
  readonly requirements: readonly string[];
  readonly accepted: readonly string[];
  readonly reached: boolean;
}

/** Milestone state is a readout: all required targets need an accepted receipt. */
export function deriveMilestones(roadmap: SignRoadmap): readonly DerivedMilestone[] {
  const keyOfId = new Map([...roadmap.cells.entries()].map(([key, cell]) => [cell.id, key]));
  const milestones = [...roadmap.cells.entries()].filter(([key]) => roadmap.graph.cells.find((cell) => cell.id === roadmap.cells.get(key)!.id)?.type === typeId("milestone"));
  const accepted = new Set(roadmap.graph.edges.filter((entry) => entry.edge.predicate === "roadmap.accepted").map((entry) => entry.edge.object.id));
  return Object.freeze(milestones.map(([key, cell]) => {
    const requirements = roadmap.graph.edges.filter((entry) => entry.edge.predicate === "roadmap.requires" && entry.edge.subject.id === cell.id)
      .map((entry) => keyOfId.get(entry.edge.object.id)!).sort();
    const reached = requirements.length > 0 && requirements.every((requirement) => accepted.has(roadmap.cells.get(requirement)!.id));
    return Object.freeze({ milestone: key, requirements: Object.freeze(requirements), accepted: Object.freeze(requirements.filter((requirement) => accepted.has(roadmap.cells.get(requirement)!.id))), reached });
  }));
}
