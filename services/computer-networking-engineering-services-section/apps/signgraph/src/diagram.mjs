/**
 * writing/diagram - one presented-category carrier for diagram formats.
 *
 * SVG, Mermaid, PlantUML, and XMI are projections of the same carrier:
 * objects are category objects/nodes, morphisms are edges. The projection
 * layer is deliberately format-shaped; the ontology is the presented category.
 */

import {
  presentedCategoryDiagramCarrier,
  presentedCategoryDiagramSchema,
} from "./diagram-schema.mjs";
import { evidence } from "@red-cup-engineering/signcell/cell";
import { canonical, parse as parseJson } from "@red-cup-engineering/json-services-section";
import { define, restrict,                } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { stringProjector } from "@red-cup-engineering/computer-content-engineering-services-section/text-projector";
import { xmlProjector } from "@red-cup-engineering/xml-document-rendering-service";
import { eavtId, eavtRecord } from "@red-cup-engineering/eavt/row";

export {
  presentedCategoryDiagramCarrier,
  presentedCategoryDiagramSchema,
} from "./diagram-schema.mjs";

export function isPresentedCategoryDiagram(value         )                                    {
  return presentedCategoryDiagramCarrier.validate(value);
}

export function requireRecord(value         , context        )             {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${context}: expected object`);
  }
  return value              ;
}

function stringField(record            , key        , fallback = "")         {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

function optionalStringField(record            , key        )                                                             {
  const value = record[key];
  return typeof value === "string" && value !== "" ? { [key]: value } : {};
}

export function objectFrom(value         , index        )                {
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
  })                 ;
}

export function morphismFrom(value         , index        )                  {
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
  })                   ;
}

export function presentedCategoryDiagram(input

 )                           {
  const value = Object.freeze({
    kind: "relating.diagram.presented-category"         ,
    ...(input.diagramKind === undefined ? {} : { diagramKind: input.diagramKind }),
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.description === undefined ? {} : { description: input.description }),
    objects: Object.freeze(input.objects.map(objectFrom)),
    morphisms: Object.freeze(input.morphisms.map(morphismFrom)),
  });
  return presentedCategoryDiagramCarrier.assert(value, "presented category diagram")                            ;
}

export function diagramFromCarrierCategory(category         )                           {
  const record = requireRecord(category, "carrier category");
  const objects = Array.isArray(record["objects"]) ? record["objects"] : [];
  const morphisms = Array.isArray(record["morphisms"]) ? record["morphisms"] : [];
  return presentedCategoryDiagram({
    title: stringField(record, "title", "carrier category"),
    description: stringField(record, "packageName"),
    diagramKind: "class",
    objects,
    morphisms,
  });
}

export function layout(ids                   , edges                            , opts

 )                                                                                                                                                                                 {
  const indegree = new Map(ids.map((id) => [id, 0]));
  for (const edge of edges) indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  const depth = new Map                ();
  for (const id of ids) depth.set(id, indegree.get(id) === 0 ? 0 : 1);
  for (let pass = 0; pass < ids.length; pass += 1) {
    for (const edge of edges) depth.set(edge.to, Math.max(depth.get(edge.to) ?? 0, (depth.get(edge.from) ?? 0) + 1));
  }
  const layers = new Map                  ();
  for (const id of ids) {
    const layer = depth.get(id) ?? 0;
    const bucket = layers.get(layer) ?? [];
    bucket.push(id);
    layers.set(layer, bucket);
  }
  const boxes = new Map                                                                                              ();
  const layerEntries = [...layers.entries()].sort((a, b) => a[0] - b[0]);
  let maxLayerWidth = 1;
  for (const [, layerIds] of layerEntries) maxLayerWidth = Math.max(maxLayerWidth, layerIds.length);
  for (const [layer, layerIds] of layerEntries) {
    layerIds.sort((a, b) => ids.indexOf(a) - ids.indexOf(b));
    for (let order = 0; order < layerIds.length; order += 1) {
      const id = layerIds[order] ;
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

export const diagramPalette                                          = Object.freeze({
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

export function diagramToSvgDataform(diagram                          )              {
  const geometry = layout(diagram.objects.map((object) => object.id), diagram.morphisms, {
    nodeWidth: 190,
    nodeHeight: 42,
    hGap: 34,
    vGap: 76,
    margin: 34,
  });
  const nodes               = [];
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
      evidence: evidence(),
      box,
    }));
  }
  const edges               = [];
  for (const morphism of diagram.morphisms) {
    const fromBox = geometry.boxes.get(morphism.from);
    const toBox = geometry.boxes.get(morphism.to);
    if (fromBox === undefined || toBox === undefined) continue;
    edges.push(Object.freeze({
      from: morphism.from,
      to: morphism.to,
      kind: morphism.kind,
      evidence: evidence(),
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

function cleanId(id        )         {
  const cleaned = id.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `n_${cleaned}`;
}

function mermaidQuote(value        )         {
  return JSON.stringify(value).replace(/`/g, "\\`");
}

const META_PREFIX = "%% relating.diagram ";
const OBJECT_PREFIX = "%% object ";
const MORPHISM_PREFIX = "%% morphism ";

export function writeMermaid(diagram                          )         {
  const lines = [
    `${META_PREFIX}${canonical({
      kind: diagram.kind,
      diagramKind: diagram.diagramKind ?? "class",
      title: diagram.title ?? "",
      description: diagram.description ?? "",
    })}`,
    ...diagram.objects.map((object) => `${OBJECT_PREFIX}${canonical(object)}`),
    ...diagram.morphisms.map((morphism) => `${MORPHISM_PREFIX}${canonical(morphism)}`),
    "graph TD",
  ];
  const ids = new Map(diagram.objects.map((object) => [object.id, cleanId(object.id)]         ));
  for (const object of diagram.objects) lines.push(`  ${ids.get(object.id)}[${mermaidQuote(object.label)}]`);
  for (const morphism of diagram.morphisms) {
    const from = ids.get(morphism.from) ?? cleanId(morphism.from);
    const to = ids.get(morphism.to) ?? cleanId(morphism.to);
    lines.push(`  ${from} -->|${morphism.kind}: ${morphism.label}| ${to}`);
  }
  return `${lines.join("\n")}\n`;
}

export function readMermaid(source        )                           {
  let title = "";
  let description = "";
  let diagramKind                                          = "class";
  const objects               = [];
  const morphisms               = [];
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

export const mermaidProjector                                      = restrict(stringProjector                                                  , {
  type: "mermaid",
  corner: "assertion",
  rung: "strict",
  recognize: (resource) => resource.path.endsWith(".mmd") || resource.content.includes(META_PREFIX),
  read: (resource) => [readMermaid(resource.content)],
  write: (items) => items.map((item) => writeMermaid(item)).join("\n"),
});

function xmlAttr(value        )         {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char] ));
}

function xmlUnattr(value        )         {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

export function writeXmi(diagram                          )         {
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
  return `<xmi:XMI xmlns:xmi="http://www.omg.org/XMI" xmlns:relating="https://561.group/relating/diagram">\n<relating:diagram ${attrs}>\n${objects}\n${morphisms}\n</relating:diagram>\n</xmi:XMI>\n`;
}

function attrsOf(tag        )             {
  const out                            = {};
  for (const match of tag.matchAll(/\s([A-Za-z_:][A-Za-z0-9_.:-]*)="([^"]*)"/g)) out[match[1] ] = xmlUnattr(match[2] );
  return out;
}

export function readXmi(source        )                           {
  const diagramTag = source.match(/<relating:diagram\b[^>]*>/)?.[0];
  if (diagramTag === undefined) throw new TypeError("xmi diagram: missing relating:diagram");
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

export const umlProjector                                      = define                          ({
  type: "uml.xmi",
  corner: "assertion",
  rung: "strict",
  recognize: (resource) => resource.path.endsWith(".xmi") || resource.content.includes("<relating:diagram"),
  read: (resource) => [readXmi(resource.content)],
  write: (items) => items.map((item) => writeXmi(item)).join("\n"),
});

function plantLabel(value        )         {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

export function writePlantUml(diagram                          )         {
  const lines = [
    "@startuml",
    `' relating.diagram ${canonical({
      kind: diagram.kind,
      diagramKind: diagram.diagramKind ?? "class",
      title: diagram.title ?? "",
      description: diagram.description ?? "",
    })}`,
    ...diagram.objects.map((object) => `' object ${canonical(object)}`),
    ...diagram.morphisms.map((morphism) => `' morphism ${canonical(morphism)}`),
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

export function readPlantUml(source        )                           {
  const metaLine = source.split(/\r?\n/).find((line) => line.startsWith("' relating.diagram "));
  const meta = metaLine === undefined ? {} : requireRecord(parseJson(metaLine.slice("' relating.diagram ".length)), "plantuml metadata");
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

export const plantUmlProjector                                      = restrict(stringProjector                                                  , {
  type: "plantuml",
  corner: "assertion",
  rung: "strict",
  recognize: (resource) => resource.path.endsWith(".puml") || resource.content.trimStart().startsWith("@startuml"),
  read: (resource) => [readPlantUml(resource.content)],
  write: (items) => items.map((item) => writePlantUml(item)).join("\n"),
});

function labelOf(value           )         {
  return typeof value === "string" ? value : canonical(value);
}

function participantId(role                        , value           )         {
  return `${role}:${canonical(value)}`;
}

export function witnessLedgerSequenceDiagram(rows                                )                           {
  const ordered = rows
    .map((row) => eavtRecord(row))
    .sort((left, right) => canonical(left.t).localeCompare(canonical(right.t)) || eavtId(left).localeCompare(eavtId(right)));
  const objects = new Map                       ();
  const morphisms                    = [];
  const addParticipant = (id        , label        , detail        )       => {
    if (objects.has(id)) return;
    objects.set(id, Object.freeze({ id, kind: "participant", label, detail }));
  };
  for (const row of ordered) {
    const from = participantId("entity", row.e);
    const to = participantId("attribute", row.a);
    addParticipant(from, labelOf(row.e), "EAVT entity: invocation caller or witness subject.");
    addParticipant(to, labelOf(row.a), "EAVT attribute: invocation morphism and arguments.");
    morphisms.push(Object.freeze({
      id: `witness:${eavtId(row)}`,
      from,
      to,
      kind: "message",
      label: labelOf(row.a),
      detail: `value ${labelOf(row.v)} at ${labelOf(row.t)}`,
    })                   );
  }
  return presentedCategoryDiagram({
    title: "witness ledger sequence",
    description: "Participants are EAVT entities and attributes; messages are witness rows ordered by time.",
    diagramKind: "sequence",
    objects: [...objects.values()],
    morphisms,
  });
}
