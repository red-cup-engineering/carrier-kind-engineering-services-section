import { validateDeterministicExecution } from "./duty-discharge.mjs";

/** The portable, source-span work carrier.  Rail, UI, and provider details are
 * deliberately outside this contract. */
export const STRUCTURED_WORK_INTENT_TYPE = "agent-work.structured-intent";
export const WORK_LEVELS = Object.freeze(["endeavor", "campaign", "project", "plan", "task", "work-item"]);
const SCOPE = /^(endeavor|campaign|project|plan|task|work-item):[^\s:][^\s]*$/u;

export const structuredWorkIntentSchema = Object.freeze({
  $id: "agent-work/structured-work-intent",
  type: "object",
  required: ["kind", "id", "producer", "sources", "items"],
  properties: {
    kind: { const: STRUCTURED_WORK_INTENT_TYPE }, id: { type: "string", minLength: 1 },
    producer: { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1 }, revision: { type: "string", minLength: 1 } }, additionalProperties: false },
    sources: { type: "array", minItems: 1 }, items: { type: "array", minItems: 1 },
  }, additionalProperties: false,
});

function object(value, message) { if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(message); return value; }
function text(value, message) { if (typeof value !== "string" || value.length === 0) throw new TypeError(message); return value; }
function scope(value, message) { text(value, message); if (!SCOPE.test(value)) throw new TypeError(message); return value; }
function itemId(item) { return item.item ?? item.cell; }
function levelOf(value) { return value.slice(0, value.indexOf(":")); }

/** Validates shared work semantics before any rail-specific admission. */
export function assertStructuredWorkIntent(input) {
  const intent = object(input, "structured work intent must be an object");
  if (intent.kind !== STRUCTURED_WORK_INTENT_TYPE) throw new TypeError(`structured work intent kind must be ${STRUCTURED_WORK_INTENT_TYPE}`);
  text(intent.id, "structured work intent id is required");
  const producer = object(intent.producer, "structured work intent producer is required"); text(producer.id, "structured work intent producer.id is required");
  if (!Array.isArray(intent.sources) || intent.sources.length === 0 || !Array.isArray(intent.items) || intent.items.length === 0) throw new TypeError("structured work intent requires sources and items");
  const sourceIds = new Set();
  for (const source of intent.sources) { object(source, "structured work intent source must be an object"); text(source.id, "structured work intent source.id is required"); text(source.kind, "structured work intent source.kind is required"); if (sourceIds.has(source.id)) throw new TypeError(`structured work intent duplicate source ${source.id}`); sourceIds.add(source.id); }
  const byItem = new Map();
  for (const entry of intent.items) {
    object(entry, "structured work intent item must be an object"); const id = scope(itemId(entry), "structured work intent item cell is invalid");
    text(entry.text, `structured work intent ${id} text is required`); if (byItem.has(id)) throw new TypeError(`structured work intent duplicate item ${id}`); byItem.set(id, entry);
    if (!Array.isArray(entry.evidence) || !Array.isArray(entry.provenance) || entry.provenance.length === 0) throw new TypeError(`structured work intent ${id} requires evidence and provenance`);
    if (entry.deterministicExecution !== undefined) validateDeterministicExecution(entry.deterministicExecution);
    for (const citation of entry.provenance) { object(citation, `structured work intent ${id} provenance must be an object`); if (!sourceIds.has(citation.source)) throw new TypeError(`structured work intent ${id} cites unknown source ${citation.source}`); const hasStart = citation.start !== undefined; if (hasStart !== (citation.end !== undefined) || (hasStart && citation.unit === undefined) || (hasStart && citation.end < citation.start)) throw new TypeError(`structured work intent ${id} has an invalid source span`); }
  }
  const rootLevel = Math.min(...[...byItem.keys()].map((id) => WORK_LEVELS.indexOf(levelOf(id))));
  for (const [id, entry] of byItem) { const at = WORK_LEVELS.indexOf(levelOf(id)); if (at === 0 && entry.parent !== undefined) throw new TypeError(`structured work intent endeavor ${id} cannot have a parent`); if (at > rootLevel) { const parent = byItem.get(entry.parent); if (parent === undefined || WORK_LEVELS.indexOf(levelOf(itemId(parent))) !== at - 1) throw new TypeError(`structured work intent ${id} requires its immediate parent in this cut`); } for (const relation of [...(entry.dependencies ?? []), ...(entry.conflicts ?? [])]) { const sibling = byItem.get(relation); if (relation === id || sibling === undefined || sibling.parent !== entry.parent || levelOf(relation) !== levelOf(id)) throw new TypeError(`structured work intent ${relation} is not a sibling of ${id}`); } }
  return Object.freeze(intent);
}

/** The sole portable projection into work obligations; rail adapters own persistence. */
export function structuredWorkIntentObligations(input) {
  const intent = assertStructuredWorkIntent(input);
  return Object.freeze(intent.items.map((entry) => Object.freeze({ cell: entry.cell, item: itemId(entry), ...(entry.parent === undefined ? {} : { parent: entry.parent }), ...(entry.dependencies === undefined ? {} : { dependencies: Object.freeze([...entry.dependencies]) }), ...(entry.conflicts === undefined ? {} : { conflicts: Object.freeze([...entry.conflicts]) }), text: entry.text, ...(entry.work === undefined ? {} : { work: entry.work }), ...(entry.skill === undefined ? {} : { skill: entry.skill }), ...(entry.deterministicExecution === undefined ? {} : { deterministicExecution: validateDeterministicExecution(entry.deterministicExecution) }), evidence: Object.freeze([...entry.evidence, ...entry.provenance.flatMap((p) => [`source:${p.source}`, ...(p.start === undefined ? [] : [`source-span:${p.source}:${p.unit}:${p.start}-${p.end}`]), ...(p.evidence ?? [])])]) })));
}
