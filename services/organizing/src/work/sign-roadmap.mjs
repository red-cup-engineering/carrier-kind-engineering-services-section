/**
 * The sole semantic carrier for a roadmap.  It is a typed SignGraph, not a
 * nested status document: literal directions, sources, work structure,
 * skills, resources, changes, actions, receipts, and milestones are cells;
 * their reasons and dependencies are witnessed typed edges.
 */
import { defineType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { createTypedMark, referenceOf } from "@red-cup-engineering/signcell/typed-mark";
import { createSignGraph } from "@red-cup-engineering/signcell/semantic-graph";

export const ROADMAP_WORK_KINDS = Object.freeze(["endeavor", "campaign", "project", "plan", "task", "work-item"]);

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
        predicate: { enum: ["contains", "directed-by", "informed-by", "uses-resource", "uses-skill", "changes", "targets", "derives-action", "requires", "depends-on", "accepted", "received-by", "supersedes"] },
        to: { type: "string", minLength: 1 }, witness: { type: "string", minLength: 1 },
      },
    } },
  },
};
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
};
export const signRoadmapAdmissionContract = schemaFrom(signRoadmapAdmissionSchema);

const accepted = (value) => Object.freeze({ ok: true, value });
const refused = (code, message) => Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });
const workKinds = new Set(ROADMAP_WORK_KINDS);
const sourceKinds = new Set(["founder-direction", "theory", "evidence", "receipt"]);
const allKinds = Object.freeze(["founder-direction", "theory", "resource", "skill", "change", "action", "receiver", "receipt", "evidence", "milestone", ...ROADMAP_WORK_KINDS]);

function typeFor(kind) {
  const common = {
    type: "object",
    required: ["title", "description"],
    properties: { title: { type: "string", minLength: 1 }, description: { type: "string", minLength: 1 } },
  };
  const specialized = {
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
  });
  if (!result.ok) throw new Error(result.refusal.message);
  return result.value;
}
const types = new Map(allKinds.map((kind) => [kind, typeFor(kind)]));
const typeId = (kind) => types.get(kind).id;
const kindsFor = (...kinds) => Object.freeze(kinds.map(typeId));
const evidenceKinds = kindsFor("founder-direction", "theory", "evidence", "receipt");
const relations = Object.freeze([
  { id: "roadmap.contains", subjectTypes: kindsFor("endeavor", "campaign", "project", "plan", "task"), objectTypes: kindsFor("campaign", "project", "plan", "task", "work-item"), witnessTypes: evidenceKinds },
  { id: "roadmap.directed-by", subjectTypes: kindsFor(...ROADMAP_WORK_KINDS, "milestone"), objectTypes: kindsFor("founder-direction"), witnessTypes: evidenceKinds },
  { id: "roadmap.informed-by", subjectTypes: kindsFor(...ROADMAP_WORK_KINDS, "milestone", "change"), objectTypes: kindsFor("theory"), witnessTypes: evidenceKinds },
  { id: "roadmap.uses-resource", subjectTypes: kindsFor(...ROADMAP_WORK_KINDS, "change", "action"), objectTypes: kindsFor("resource"), witnessTypes: evidenceKinds },
  { id: "roadmap.uses-skill", subjectTypes: kindsFor("task", "work-item"), objectTypes: kindsFor("skill"), witnessTypes: evidenceKinds },
  { id: "roadmap.changes", subjectTypes: kindsFor("work-item"), objectTypes: kindsFor("change"), witnessTypes: evidenceKinds },
  { id: "roadmap.targets", subjectTypes: kindsFor("change"), objectTypes: kindsFor(...ROADMAP_WORK_KINDS), witnessTypes: evidenceKinds },
  { id: "roadmap.derives-action", subjectTypes: kindsFor("change"), objectTypes: kindsFor("action"), witnessTypes: evidenceKinds },
  { id: "roadmap.requires", subjectTypes: kindsFor("milestone"), objectTypes: kindsFor(...ROADMAP_WORK_KINDS, "receipt"), witnessTypes: evidenceKinds },
  { id: "roadmap.depends-on", subjectTypes: kindsFor(...ROADMAP_WORK_KINDS), objectTypes: kindsFor(...ROADMAP_WORK_KINDS), witnessTypes: evidenceKinds },
  { id: "roadmap.accepted", subjectTypes: kindsFor("receipt"), objectTypes: kindsFor(...ROADMAP_WORK_KINDS, "change", "action"), witnessTypes: kindsFor("receipt") },
  { id: "roadmap.received-by", subjectTypes: kindsFor("receipt"), objectTypes: kindsFor("receiver"), witnessTypes: kindsFor("receipt") },
  { id: "roadmap.supersedes", subjectTypes: kindsFor("founder-direction"), objectTypes: kindsFor("founder-direction"), witnessTypes: evidenceKinds },
]);
const relationId = (predicate) => `roadmap.${predicate}`;

function recordOf(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function requiredText(content, names) {
  return names.every((name) => typeof content[name] === "string" && (content[name]).trim() !== "");
}

/** Decode untrusted wire values before they become the shared roadmap model. */
export function parseSignRoadmapInput(input) {
  const record = recordOf(input);
  if (record === undefined || !Array.isArray(record.nodes) || !Array.isArray(record.edges)) return refused("invalid-node", "roadmap requires nodes and edges arrays");
  const nodes = [];
  for (const rawNode of record.nodes) {
    const node = recordOf(rawNode);
    const content = node === undefined ? undefined : recordOf(node.content);
    const key = node?.key;
    const kind = node?.kind;
    if (node === undefined || content === undefined || typeof key !== "string" || key.trim() === "" || typeof kind !== "string" || !allKinds.includes(kind) || !requiredText(content, ["title", "description"])) return refused("invalid-node", "roadmap node has an invalid key, kind, or base content");
    const textsByKind = {
      "founder-direction": ["literal", "recordedAt", "authority"], theory: ["locator", "status", "claim"], resource: ["locator", "mediaType"], skill: ["locator", "purpose"],
      change: ["target", "before", "after", "acceptance"], action: ["operation", "effect", "acceptance"], receiver: ["receiver", "acceptance"], receipt: ["locator", "outcome"], evidence: ["locator", "excerpt"],
      endeavor: ["intendedOutcome", "acceptance"], campaign: ["intendedOutcome", "acceptance"], project: ["intendedOutcome", "acceptance"], plan: ["intendedOutcome", "acceptance"], task: ["intendedOutcome", "acceptance"], "work-item": ["intendedOutcome", "acceptance"],
    };
    if (!requiredText(content, textsByKind[kind] ?? [])) return refused("invalid-node", `roadmap ${kind} node lacks required content`);
    if (kind === "theory" && !["proved", "implemented", "documented", "open"].includes(content.status)) return refused("invalid-node", "roadmap theory status is invalid");
    if (kind === "receipt" && !["accepted", "refused"].includes(content.outcome)) return refused("invalid-node", "roadmap receipt outcome is invalid");
    nodes.push(Object.freeze({ key, kind, content: Object.freeze({ ...content }) }));
  }
  const edges = [];
  for (const rawEdge of record.edges) {
    const edge = recordOf(rawEdge);
    if (edge === undefined || typeof edge.from !== "string" || typeof edge.to !== "string" || typeof edge.witness !== "string" || typeof edge.predicate !== "string" || !["contains", "directed-by", "informed-by", "uses-resource", "uses-skill", "changes", "targets", "derives-action", "requires", "depends-on", "accepted", "received-by", "supersedes"].includes(edge.predicate)) return refused("invalid-edge", "roadmap edge is not a declared typed edge");
    edges.push(Object.freeze({ from: edge.from, to: edge.to, witness: edge.witness, predicate: edge.predicate }));
  }
  return accepted(Object.freeze({ nodes: Object.freeze(nodes), edges: Object.freeze(edges) }));
}

function validContainment(from, to) {
  if (!workKinds.has(from) || !workKinds.has(to)) return false;
  return ROADMAP_WORK_KINDS.indexOf(to) === ROADMAP_WORK_KINDS.indexOf(from) + 1;
}

/** Create the one roadmap graph from fully typed cells and explicitly witnessed edges. */
export function createSignRoadmap(input) {
  const cells = new Map();
  const kinds = new Map();
  for (const node of input.nodes) {
    if (node.key.trim() === "" || cells.has(node.key)) return refused(node.key.trim() === "" ? "invalid-node" : "duplicate-key", `roadmap node key ${node.key || "(empty)"} is invalid`);
    const type = types.get(node.kind);
    if (type === undefined) return refused("invalid-node", `unknown roadmap node kind ${node.kind}`);
    const cell = createTypedMark(type, node.content);
    if (!cell.ok) return refused("invalid-node", `${node.key}: ${cell.refusal.message}`);
    cells.set(node.key, cell.value); kinds.set(node.key, node.kind);
  }
  const edges = [];
  for (const edge of input.edges) {
    const from = cells.get(edge.from), to = cells.get(edge.to), witness = cells.get(edge.witness);
    if (from === undefined || to === undefined || witness === undefined) return refused("unknown-key", `edge ${edge.predicate} references a node key not present in this roadmap`);
    const fromKind = kinds.get(edge.from), toKind = kinds.get(edge.to), witnessKind = kinds.get(edge.witness);
    if (edge.predicate === "contains" && !validContainment(fromKind, toKind)) return refused("invalid-edge", "roadmap containment must move exactly one level down the work spine");
    if (!sourceKinds.has(witnessKind)) return refused("invalid-edge", "every roadmap edge must be witnessed by a direction, theory, evidence, or receipt cell");
    edges.push(Object.freeze({ subject: referenceOf(from), predicate: relationId(edge.predicate), object: referenceOf(to), witness: referenceOf(witness) }));
  }
  const graph = createSignGraph({ cells: [...cells.values()], relations, edges });
  return graph.ok ? accepted(Object.freeze({ graph: graph.value, cells })) : refused("graph-refused", graph.refusal.message);
}

/** One work scope's evidence-closed view. Ancestors supply governing context;
 * dependencies retain their own Actions. Siblings and unrelated milestones
 * are not part of this view, so partial requirements cannot imply completion. */
export function scopeSignRoadmap(roadmap, scope) {
  const graph = roadmap.graph;
  const cells = new Map(graph.cells.map(cell => [cell.id, cell]));
  const focus = graph.cells.filter(cell => ROADMAP_WORK_KINDS.some(kind =>
    cell.type === typeId(kind) && scope === `${kind}:${cell.content.title}`));
  if (focus.length === 0) return undefined;
  const outgoing = new Map(), incoming = new Map();
  for (const entry of graph.edges) {
    for (const [index, id] of [[outgoing, entry.edge.subject.id], [incoming, entry.edge.object.id]]) {
      const entries = index.get(id) ?? [];
      entries.push(entry); index.set(id, entries);
    }
  }
  const selectedCells = new Set(focus.map(cell => cell.id)), selectedEdges = new Map();
  const pending = focus.map(cell => [cell.id, "work"]), visited = new Set();
  const include = entry => {
    selectedEdges.set(entry.id, entry.edge);
    for (const reference of [entry.edge.subject, entry.edge.object, entry.edge.witness]) selectedCells.add(reference.id);
  };
  while (pending.length > 0) {
    const [id, role] = pending.pop(), key = `${role}:${id}`;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const entry of outgoing.get(id) ?? []) {
      const { predicate, object } = entry.edge;
      if (["roadmap.directed-by", "roadmap.informed-by", "roadmap.uses-resource", "roadmap.uses-skill"].includes(predicate)) {
        include(entry);
        pending.push([object.id, "context"]);
      } else if (role === "work" && predicate === "roadmap.depends-on") {
        include(entry); pending.push([object.id, "work"]);
      } else if (role === "work" && predicate === "roadmap.changes") {
        include(entry); pending.push([object.id, "change"]);
      } else if (role === "change" && predicate === "roadmap.derives-action") {
        include(entry); pending.push([object.id, "action"]);
      } else if (role === "receipt" && predicate === "roadmap.received-by") {
        include(entry);
      } else if (role === "context" && predicate === "roadmap.supersedes") {
        include(entry); pending.push([object.id, "context"]);
      }
    }
    for (const entry of incoming.get(id) ?? []) {
      const { predicate, subject } = entry.edge;
      if ((role === "work" || role === "ancestor") && predicate === "roadmap.contains") {
        include(entry); pending.push([subject.id, "ancestor"]);
      } else if (role === "work" && predicate === "roadmap.targets") {
        include(entry); pending.push([subject.id, "change"]);
      } else if (["work", "change", "action"].includes(role) && predicate === "roadmap.accepted") {
        include(entry); pending.push([subject.id, "receipt"]);
      }
    }
  }
  const projected = createSignGraph({ cells: [...selectedCells].map(id => cells.get(id)), relations: graph.relations, edges: [...selectedEdges.values()] });
  if (!projected.ok) throw new TypeError(projected.refusal.message);
  return Object.freeze({ graph: projected.value, cells: new Map(projected.value.cells.map(cell => [cell.id, cell])) });
}

/** Milestone state is a readout: all required targets need an accepted receipt. */
export function deriveMilestones(roadmap) {
  const keyOfId = new Map([...roadmap.cells.entries()].map(([key, cell]) => [cell.id, key]));
  const milestones = [...roadmap.cells.entries()].filter(([key]) => roadmap.graph.cells.find((cell) => cell.id === roadmap.cells.get(key).id)?.type === typeId("milestone"));
  const accepted = new Set(roadmap.graph.edges.filter((entry) => entry.edge.predicate === "roadmap.accepted").map((entry) => entry.edge.object.id));
  return Object.freeze(milestones.map(([key, cell]) => {
    const requirements = roadmap.graph.edges.filter((entry) => entry.edge.predicate === "roadmap.requires" && entry.edge.subject.id === cell.id)
      .map((entry) => keyOfId.get(entry.edge.object.id)).sort();
    const reached = requirements.length > 0 && requirements.every((requirement) => accepted.has(roadmap.cells.get(requirement).id));
    return Object.freeze({ milestone: key, requirements: Object.freeze(requirements), accepted: Object.freeze(requirements.filter((requirement) => accepted.has(roadmap.cells.get(requirement).id))), reached });
  }));
}
