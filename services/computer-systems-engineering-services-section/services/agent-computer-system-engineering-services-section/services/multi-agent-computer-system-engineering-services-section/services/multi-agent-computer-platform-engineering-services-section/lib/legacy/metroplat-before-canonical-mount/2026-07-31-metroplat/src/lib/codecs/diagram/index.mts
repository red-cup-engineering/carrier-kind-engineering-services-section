/**
 * projections/diagram - one presented-category diagram for diagram formats.
 *
 * SVG, Mermaid, PlantUML, and XMI are projections of the same diagram:
 * objects are category objects/nodes, morphisms are edges. The projection
 * layer is deliberately format-shaped; the ontology is the presented category.
 */
import { canonicalBytes } from "../../identity/index.mts";
import type { FromSchema } from "../../schema/contract.mts";
import {
  presentedCategoryDiagramContract,
  presentedCategoryDiagramSchema,
} from "./schema.mts";
import { charge, chargeValue } from "../../values/index.mts";
import {
  readFiringsOfSettlementFiltration,
} from "../../fixpoint/index.mts";
import { freeSettlementFiltration, type SettlementFiltrationGenerators } from "../../settling.mts";
import type { Settlement } from "../../settlement.mts";
import { parse as parseJson, type JsonRecord, type JsonValue } from "../json/core.mts";
import { eavtId, eavtObject, type EAVT } from "../json/jsonl/eavt/index.mts";
import { define, restrict, type Projector } from "../projector/index.mts";
import { stringProjector } from "../text/index.mts";
import { xmlProjector } from "../xml-svg/core.mts";
import type { PlacedCell, PlacedEdge, ShapeMorphism, SvgDataform } from "../xml-svg/svg/index.mts";

export {
  presentedCategoryDiagramContract,
  presentedCategoryDiagramSchema,
} from "./schema.mts";

export type PresentedCategoryDiagram = FromSchema<typeof presentedCategoryDiagramSchema> & {
  readonly kind: "metroplat.diagram.presented-category";
  readonly diagramKind?: "class" | "state-machine" | "sequence";
  readonly title?: string;
  readonly description?: string;
  readonly objects: readonly DiagramObject[];
  readonly morphisms: readonly DiagramMorphism[];
};

export interface DiagramObject extends JsonRecord {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly detail?: string;
  readonly href?: string;
}

export interface DiagramMorphism extends JsonRecord {
  readonly id?: string;
  readonly from: string;
  readonly to: string;
  readonly kind: string;
  readonly label: string;
}

export function isPresentedCategoryDiagram(value: unknown): value is PresentedCategoryDiagram {
  return presentedCategoryDiagramContract.validate(value);
}

function requireRecord(value: unknown, context: string): JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${context}: expected object`);
  }
  return value as JsonRecord;
}

function stringField(record: JsonRecord, key: string, fallback = ""): string {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

function optionalStringField(record: JsonRecord, key: string): { readonly [key: string]: string } | Record<string, never> {
  const value = record[key];
  return typeof value === "string" && value !== "" ? { [key]: value } : {};
}

function objectFrom(value: unknown, index: number): DiagramObject {
  const record = requireRecord(value, `diagram object ${index}`);
  const id = stringField(record, "id");
  const kind = stringField(record, "kind", "object");
  const label = stringField(record, "label", id);
  if (id === "") throw new TypeError(`diagram object ${index}: id is required`);
  return Object.freeze({
    ...record,
    id,
    kind,
    label,
    ...optionalStringField(record, "detail"),
    ...optionalStringField(record, "href"),
  }) as DiagramObject;
}

function morphismFrom(value: unknown, index: number): DiagramMorphism {
  const record = requireRecord(value, `diagram morphism ${index}`);
  const from = stringField(record, "from");
  const to = stringField(record, "to");
  const kind = stringField(record, "kind", "edge");
  const label = stringField(record, "label", kind);
  if (from === "" || to === "") throw new TypeError(`diagram morphism ${index}: from and to are required`);
  return Object.freeze({
    ...record,
    ...optionalStringField(record, "id"),
    from,
    to,
    kind,
    label,
  }) as DiagramMorphism;
}

export function presentedCategoryDiagram(input: {
  readonly title?: string;
  readonly description?: string;
  readonly diagramKind?: "class" | "state-machine" | "sequence";
  readonly objects: readonly unknown[];
  readonly morphisms: readonly unknown[];
}): PresentedCategoryDiagram {
  const value = Object.freeze({
    kind: "metroplat.diagram.presented-category" as const,
    ...(input.diagramKind === undefined ? {} : { diagramKind: input.diagramKind }),
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.description === undefined ? {} : { description: input.description }),
    objects: Object.freeze(input.objects.map(objectFrom)),
    morphisms: Object.freeze(input.morphisms.map(morphismFrom)),
  });
  return presentedCategoryDiagramContract.assert(value, "presented category diagram") as PresentedCategoryDiagram;
}

export function diagramFromPresentedCategory(category: unknown): PresentedCategoryDiagram {
  const record = requireRecord(category, "presented category");
  const objects = Array.isArray(record["objects"]) ? record["objects"] : [];
  const morphisms = Array.isArray(record["morphisms"]) ? record["morphisms"] : [];
  return presentedCategoryDiagram({
    title: stringField(record, "title", "presented category"),
    description: stringField(record, "packageName"),
    diagramKind: "class",
    objects,
    morphisms,
  });
}

const defaultCharge = () => charge(chargeValue("unknown"));

function layout(ids: readonly string[], edges: readonly DiagramMorphism[], opts: {
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly hGap: number;
  readonly vGap: number;
  readonly margin: number;
}): { readonly width: number; readonly height: number; readonly boxes: ReadonlyMap<string, { readonly cx: number; readonly cy: number; readonly w: number; readonly h: number }> } {
  const indegree = new Map(ids.map((id) => [id, 0]));
  for (const edge of edges) indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  const depth = new Map<string, number>();
  for (const id of ids) depth.set(id, indegree.get(id) === 0 ? 0 : 1);
  for (let pass = 0; pass < ids.length; pass += 1) {
    for (const edge of edges) depth.set(edge.to, Math.max(depth.get(edge.to) ?? 0, (depth.get(edge.from) ?? 0) + 1));
  }
  const layers = new Map<number, string[]>();
  for (const id of ids) {
    const layer = depth.get(id) ?? 0;
    const bucket = layers.get(layer) ?? [];
    bucket.push(id);
    layers.set(layer, bucket);
  }
  const boxes = new Map<string, { readonly cx: number; readonly cy: number; readonly w: number; readonly h: number }>();
  const layerEntries = [...layers.entries()].sort((a, b) => a[0] - b[0]);
  let maxLayerWidth = 1;
  for (const [, layerIds] of layerEntries) maxLayerWidth = Math.max(maxLayerWidth, layerIds.length);
  for (const [layer, layerIds] of layerEntries) {
    layerIds.sort((a, b) => ids.indexOf(a) - ids.indexOf(b));
    for (let order = 0; order < layerIds.length; order += 1) {
      const id = layerIds[order]!;
      boxes.set(id, {
        cx: opts.margin + opts.nodeWidth / 2 + order * (opts.nodeWidth + opts.hGap),
        cy: opts.margin + opts.nodeHeight / 2 + layer * (opts.nodeHeight + opts.vGap),
        w: opts.nodeWidth,
        h: opts.nodeHeight,
      });
    }
  }
  return Object.freeze({
    width: opts.margin * 2 + maxLayerWidth * opts.nodeWidth + Math.max(0, maxLayerWidth - 1) * opts.hGap,
    height: opts.margin * 2 + layerEntries.length * opts.nodeHeight + Math.max(0, layerEntries.length - 1) * opts.vGap,
    boxes,
  });
}

export const diagramPalette: Readonly<Record<string, ShapeMorphism>> = Object.freeze({
  package: { shape: "rect", fill: "#17324d", stroke: "#4f9ed8" },
  surface: { shape: "rounded", fill: "#153f33", stroke: "#43b488" },
  strategy: { shape: "stadium", fill: "#3f244f", stroke: "#b987d8" },
  protocol: { shape: "rounded", fill: "#4f3419", stroke: "#d09a4a" },
  target: { shape: "parallelogram", fill: "#3a3f1f", stroke: "#a8b650" },
  term: { shape: "rounded", fill: "#243f4f", stroke: "#70abc8", dash: "5 3" },
  session: { shape: "stadium", fill: "#4f2439", stroke: "#c87098" },
  predicate: { shape: "rounded", fill: "#34383f", stroke: "#8b949e" },
  state: { shape: "rounded", fill: "#153f33", stroke: "#43b488" },
  message: { shape: "stadium", fill: "#243f4f", stroke: "#70abc8" },
});

export function diagramToSvgDataform(diagram: PresentedCategoryDiagram): SvgDataform {
  const geometry = layout(diagram.objects.map((object) => object.id), diagram.morphisms, {
    nodeWidth: 190,
    nodeHeight: 42,
    hGap: 34,
    vGap: 76,
    margin: 34,
  });
  const nodes: PlacedCell[] = [];
  for (const object of diagram.objects) {
    const box = geometry.boxes.get(object.id);
    if (box === undefined) continue;
    nodes.push(Object.freeze({
      e: object.id,
      a: "diagram.object",
      v: object.kind,
      group: object.kind,
      label: object.label,
      title: object.detail ?? `${object.label} (${object.kind})`,
      ...(object.href === undefined ? {} : { href: object.href }),
      data: { id: object.id, kind: object.kind },
      charge: defaultCharge(),
      box,
    }));
  }
  const edges: PlacedEdge[] = [];
  for (const morphism of diagram.morphisms) {
    const fromBox = geometry.boxes.get(morphism.from);
    const toBox = geometry.boxes.get(morphism.to);
    if (fromBox === undefined || toBox === undefined) continue;
    edges.push(Object.freeze({
      from: morphism.from,
      to: morphism.to,
      kind: morphism.kind,
      charge: defaultCharge(),
      fromBox,
      toBox,
    }));
  }
  return Object.freeze({
    width: geometry.width,
    height: geometry.height,
    title: diagram.title ?? "diagram",
    desc: diagram.description ?? `${diagram.objects.length} objects, ${diagram.morphisms.length} morphisms.`,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    background: "#0d1117",
    textColor: "#f0f6fc",
    edgeColor: "#66707f",
  });
}

function cleanId(id: string): string {
  const cleaned = id.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `n_${cleaned}`;
}

function mermaidQuote(value: string): string {
  return JSON.stringify(value).replace(/`/g, "\\`");
}

const META_PREFIX = "%% metroplat.diagram ";
const OBJECT_PREFIX = "%% object ";
const MORPHISM_PREFIX = "%% morphism ";

export function writeMermaid(diagram: PresentedCategoryDiagram): string {
  const lines = [
    `${META_PREFIX}${canonicalBytes({
      kind: diagram.kind,
      diagramKind: diagram.diagramKind ?? "class",
      title: diagram.title ?? "",
      description: diagram.description ?? "",
    })}`,
    ...diagram.objects.map((object) => `${OBJECT_PREFIX}${canonicalBytes(object)}`),
    ...diagram.morphisms.map((morphism) => `${MORPHISM_PREFIX}${canonicalBytes(morphism)}`),
    "graph TD",
  ];
  const ids = new Map(diagram.objects.map((object) => [object.id, cleanId(object.id)] as const));
  for (const object of diagram.objects) lines.push(`  ${ids.get(object.id)}[${mermaidQuote(object.label)}]`);
  for (const morphism of diagram.morphisms) {
    const from = ids.get(morphism.from) ?? cleanId(morphism.from);
    const to = ids.get(morphism.to) ?? cleanId(morphism.to);
    lines.push(`  ${from} -->|${morphism.kind}: ${morphism.label}| ${to}`);
  }
  return `${lines.join("\n")}\n`;
}

export function readMermaid(source: string): PresentedCategoryDiagram {
  let title = "";
  let description = "";
  let diagramKind: PresentedCategoryDiagram["diagramKind"] = "class";
  const objects: JsonRecord[] = [];
  const morphisms: JsonRecord[] = [];
  for (const line of source.split(/\r?\n/)) {
    if (line.startsWith(META_PREFIX)) {
      const meta = requireRecord(parseJson(line.slice(META_PREFIX.length)), "mermaid metadata");
      title = stringField(meta, "title");
      description = stringField(meta, "description");
      const rawKind = stringField(meta, "diagramKind", "class");
      diagramKind = rawKind === "state-machine" || rawKind === "sequence" ? rawKind : "class";
    } else if (line.startsWith(OBJECT_PREFIX)) {
      objects.push(requireRecord(parseJson(line.slice(OBJECT_PREFIX.length)), "mermaid object"));
    } else if (line.startsWith(MORPHISM_PREFIX)) {
      morphisms.push(requireRecord(parseJson(line.slice(MORPHISM_PREFIX.length)), "mermaid morphism"));
    }
  }
  return presentedCategoryDiagram({
    ...(title === "" ? {} : { title }),
    ...(description === "" ? {} : { description }),
    diagramKind,
    objects,
    morphisms,
  });
}

export const mermaidProjector: Projector<PresentedCategoryDiagram> = restrict(stringProjector as unknown as Projector<PresentedCategoryDiagram>, {
  type: "mermaid",
  corner: "assertion",
  rung: "identity",
  recognize: (resource) => resource.path.endsWith(".mmd") || resource.content.includes(META_PREFIX),
  read: (resource) => [readMermaid(resource.content)],
  write: (items) => items.map((item) => writeMermaid(item)).join("\n"),
});

function xmlAttr(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]!));
}

function xmlUnattr(value: string): string {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

export function writeXmi(diagram: PresentedCategoryDiagram): string {
  const attrs = [
    `kind="${xmlAttr(diagram.kind)}"`,
    `diagramKind="${xmlAttr(diagram.diagramKind ?? "class")}"`,
    `title="${xmlAttr(diagram.title ?? "")}"`,
    `description="${xmlAttr(diagram.description ?? "")}"`,
  ].join(" ");
  const objects = diagram.objects.map((object) =>
    `  <object id="${xmlAttr(object.id)}" kind="${xmlAttr(object.kind)}" label="${xmlAttr(object.label)}"` +
    `${object.detail === undefined ? "" : ` detail="${xmlAttr(object.detail)}"`}` +
    `${object.href === undefined ? "" : ` href="${xmlAttr(object.href)}"`}/>`).join("\n");
  const morphisms = diagram.morphisms.map((morphism, index) =>
    `  <morphism id="${xmlAttr(morphism.id ?? `morphism:${index}`)}" from="${xmlAttr(morphism.from)}" to="${xmlAttr(morphism.to)}" kind="${xmlAttr(morphism.kind)}" label="${xmlAttr(morphism.label)}"/>`).join("\n");
  return `<xmi:XMI xmlns:xmi="http://www.omg.org/XMI" xmlns:metroplat="https://561.group/metroplat/diagram">\n<metroplat:diagram ${attrs}>\n${objects}\n${morphisms}\n</metroplat:diagram>\n</xmi:XMI>\n`;
}

function attrsOf(tag: string): JsonRecord {
  const out: Record<string, JsonValue> = {};
  for (const match of tag.matchAll(/\s([A-Za-z_:][A-Za-z0-9_.:-]*)="([^"]*)"/g)) out[match[1]!] = xmlUnattr(match[2]!);
  return out;
}

export function readXmi(source: string): PresentedCategoryDiagram {
  const diagramTag = source.match(/<metroplat:diagram\b[^>]*>/)?.[0];
  if (diagramTag === undefined) throw new TypeError("xmi diagram: missing metroplat:diagram");
  const meta = attrsOf(diagramTag);
  const objects = [...source.matchAll(/<object\b[^>]*\/>/g)].map((match) => attrsOf(match[0]));
  const morphisms = [...source.matchAll(/<morphism\b[^>]*\/>/g)].map((match) => attrsOf(match[0]));
  const rawKind = stringField(meta, "diagramKind", "class");
  return presentedCategoryDiagram({
    title: stringField(meta, "title"),
    description: stringField(meta, "description"),
    diagramKind: rawKind === "state-machine" || rawKind === "sequence" ? rawKind : "class",
    objects,
    morphisms,
  });
}

export const umlProjector: Projector<PresentedCategoryDiagram> = define<PresentedCategoryDiagram>({
  type: "uml.xmi",
  corner: "assertion",
  rung: "identity",
  recognize: (resource) => resource.path.endsWith(".xmi") || resource.content.includes("<metroplat:diagram"),
  read: (resource) => [readXmi(resource.content)],
  write: (items) => items.map((item) => writeXmi(item)).join("\n"),
});

function plantLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

export function writePlantUml(diagram: PresentedCategoryDiagram): string {
  const lines = [
    "@startuml",
    `' metroplat.diagram ${canonicalBytes({
      kind: diagram.kind,
      diagramKind: diagram.diagramKind ?? "class",
      title: diagram.title ?? "",
      description: diagram.description ?? "",
    })}`,
    ...diagram.objects.map((object) => `' object ${canonicalBytes(object)}`),
    ...diagram.morphisms.map((morphism) => `' morphism ${canonicalBytes(morphism)}`),
  ];
  if (diagram.diagramKind === "state-machine") {
    for (const object of diagram.objects) lines.push(`state "${plantLabel(object.label)}" as ${cleanId(object.id)}`);
    for (const morphism of diagram.morphisms) lines.push(`${cleanId(morphism.from)} --> ${cleanId(morphism.to)} : ${plantLabel(morphism.label)}`);
  } else if (diagram.diagramKind === "sequence") {
    for (const object of diagram.objects) lines.push(`participant "${plantLabel(object.label)}" as ${cleanId(object.id)}`);
    for (const morphism of diagram.morphisms) lines.push(`${cleanId(morphism.from)} -> ${cleanId(morphism.to)} : ${plantLabel(morphism.label)}`);
  } else {
    for (const object of diagram.objects) lines.push(`class "${plantLabel(object.label)}" as ${cleanId(object.id)}`);
    for (const morphism of diagram.morphisms) lines.push(`${cleanId(morphism.from)} --> ${cleanId(morphism.to)} : ${plantLabel(morphism.label)}`);
  }
  lines.push("@enduml");
  return `${lines.join("\n")}\n`;
}

export function readPlantUml(source: string): PresentedCategoryDiagram {
  const metaLine = source.split(/\r?\n/).find((line) => line.startsWith("' metroplat.diagram "));
  const meta = metaLine === undefined ? {} : requireRecord(parseJson(metaLine.slice("' metroplat.diagram ".length)), "plantuml metadata");
  const objects = source.split(/\r?\n/)
    .filter((line) => line.startsWith("' object "))
    .map((line) => requireRecord(parseJson(line.slice("' object ".length)), "plantuml object"));
  const morphisms = source.split(/\r?\n/)
    .filter((line) => line.startsWith("' morphism "))
    .map((line) => requireRecord(parseJson(line.slice("' morphism ".length)), "plantuml morphism"));
  const rawKind = stringField(meta, "diagramKind", "class");
  return presentedCategoryDiagram({
    title: stringField(meta, "title"),
    description: stringField(meta, "description"),
    diagramKind: rawKind === "state-machine" || rawKind === "sequence" ? rawKind : "class",
    objects,
    morphisms,
  });
}

export const plantUmlProjector: Projector<PresentedCategoryDiagram> = restrict(stringProjector as unknown as Projector<PresentedCategoryDiagram>, {
  type: "plantuml",
  corner: "assertion",
  rung: "identity",
  recognize: (resource) => resource.path.endsWith(".puml") || resource.content.trimStart().startsWith("@startuml"),
  read: (resource) => [readPlantUml(resource.content)],
  write: (items) => items.map((item) => writePlantUml(item)).join("\n"),
});

function stageId(index: number): string {
  return `stage:${index}`;
}

function labelOf(value: JsonValue): string {
  return typeof value === "string" ? value : canonicalBytes(value);
}

function isSettlementFiltration(value: unknown): value is Settlement {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && (value as { readonly kind?: unknown }).kind === "predication.settlement.filtration"
    && Array.isArray((value as { readonly stages?: unknown }).stages);
}

export function settlementFiltrationStateMachineDiagram(input: Settlement | SettlementFiltrationGenerators): PresentedCategoryDiagram {
  const filtration = isSettlementFiltration(input) ? input : freeSettlementFiltration(input);
  const firings = readFiringsOfSettlementFiltration(filtration);
  const objects = filtration.stages.map((stage, index) => ({
    id: stageId(index),
    kind: "state",
    label: `stage ${index}`,
    detail: stage.shape.kind,
  }));
  const morphisms = firings.map((firing, index) => {
    const stageIndex = filtration.stages.findIndex((stage) => canonicalBytes(stage.ordinal as unknown as JsonValue) === canonicalBytes(firing.source.ordinal as unknown as JsonValue));
    const from = stageId(Math.max(0, stageIndex - 1));
    const to = stageId(stageIndex < 0 ? index + 1 : stageIndex);
    return {
      id: `firing:${index}`,
      from,
      to,
      kind: "firing",
      label: `${firing.added.cells.length} cell${firing.added.cells.length === 1 ? "" : "s"}`,
    };
  });
  return presentedCategoryDiagram({
    title: "settlement filtration state machine",
    description: "States are settlement stages; transitions are read-firings-of-settlement-filtration.",
    diagramKind: "state-machine",
    objects,
    morphisms,
  });
}

function participantId(role: "entity" | "attribute", value: JsonValue): string {
  return `${role}:${canonicalBytes(value)}`;
}

export function statementSequenceDiagram(rows: readonly EAVT[]): PresentedCategoryDiagram {
  const ordered = rows
    .map((row) => eavtObject(row))
    .sort((left, right) => canonicalBytes(left.t).localeCompare(canonicalBytes(right.t)) || eavtId(left).localeCompare(eavtId(right)));
  const objects = new Map<string, DiagramObject>();
  const morphisms: DiagramMorphism[] = [];
  const addParticipant = (id: string, label: string, detail: string): void => {
    if (objects.has(id)) return;
    objects.set(id, Object.freeze({ id, kind: "participant", label, detail }));
  };
  for (const row of ordered) {
    const from = participantId("entity", row.e);
    const to = participantId("attribute", row.a);
    addParticipant(from, labelOf(row.e), "EAVT entity: invocation caller or statement subject.");
    addParticipant(to, labelOf(row.a), "EAVT attribute: invocation morphism and arguments.");
    morphisms.push(Object.freeze({
      id: `statement:${eavtId(row)}`,
      from,
      to,
      kind: "message",
      label: labelOf(row.a),
      detail: `value ${labelOf(row.v)} at ${labelOf(row.t)}`,
    }) as DiagramMorphism);
  }
  return presentedCategoryDiagram({
    title: "statement log sequence",
    description: "Participants are EAVT entities and attributes; messages are statement rows ordered by time.",
    diagramKind: "sequence",
    objects: [...objects.values()],
    morphisms,
  });
}
