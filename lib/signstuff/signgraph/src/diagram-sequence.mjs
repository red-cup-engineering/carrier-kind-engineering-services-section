/**
 * projections/diagram - the diagrams MetroPlat derives, over relating's presented-category carrier.
 *
 * SVG, Mermaid, PlantUML, and XMI are projections of the same diagram: objects are category
 * objects/nodes, morphisms are edges. The carrier, its readers/writers and its projectors live
 * once, in @red-cup-engineering/relating/writing; this file keeps only the diagrams MetroPlat
 * itself derives, from a settlement filtration or a statement log.
 */

import { canonicalJson } from "@red-cup-engineering/json-services-section";

import { presentedCategoryDiagram } from "@red-cup-engineering/signgraph/diagram";
import { eavtKey, eavtRecord } from "@red-cup-engineering/eavt-services-section/row";

function requireRecord(value, context) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${context}: expected object`);
  }
  return value;
}

function stringField(record, key, fallback = "") {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

export function diagramFromPresentedCategory(category) {
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

function labelOf(value) {
  return typeof value === "string" ? value : canonicalJson(value);
}

function participantId(role, value) {
  return `${role}:${canonicalJson(value)}`;
}

export function statementSequenceDiagram(rows) {
  const ordered = rows
    .map((row) => eavtRecord(row))
    .sort((left, right) => canonicalJson(left.t).localeCompare(canonicalJson(right.t)) || eavtKey(left).localeCompare(eavtKey(right)));
  const objects = new Map();
  const morphisms = [];
  const addParticipant = (id, label, detail) => {
    if (objects.has(id)) return;
    objects.set(id, Object.freeze({ id, kind: "participant", label, detail }));
  };
  for (const row of ordered) {
    const from = participantId("entity", row.e);
    const to = participantId("attribute", row.a);
    addParticipant(from, labelOf(row.e), "EAVT entity: invocation caller or statement subject.");
    addParticipant(to, labelOf(row.a), "EAVT attribute: invocation morphism and arguments.");
    morphisms.push(Object.freeze({
      id: `statement:${eavtKey(row)}`,
      from,
      to,
      kind: "message",
      label: labelOf(row.a),
      detail: `value ${labelOf(row.v)} at ${labelOf(row.t)}`,
    }));
  }
  return presentedCategoryDiagram({
    title: "statement log sequence",
    description: "Participants are EAVT entities and attributes; messages are statement rows ordered by time.",
    diagramKind: "sequence",
    objects: [...objects.values()],
    morphisms,
  });
}
