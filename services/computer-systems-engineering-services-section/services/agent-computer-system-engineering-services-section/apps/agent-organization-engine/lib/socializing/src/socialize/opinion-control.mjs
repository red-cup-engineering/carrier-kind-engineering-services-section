import { slugify } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";
import { isObjectRecord } from "@red-cup-engineering/json-services-section";
import { control as control_2, normsFor, finding } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/differential";
import { semanticHex } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
const differential = Object.freeze({ control: control_2, normsFor, finding });

const OPINION_KINDS = new Set(["intuition", "desire", "guidance", "feedback", "constraint"]);
const OPINION_STANCES = new Set(["favor", "disfavor", "note"]);
const OPINION_SEVERITIES = new Set(["error", "warning", "info"]);
const OPINION_CHARGES = new Set(["potential", "active", "stable", "absurd"]);

export function admitOpinion(params, options = {}) {
  const at = requiredText(options.at ?? params.at, "at");
  const claim = requiredText(params.claim ?? params.text ?? params.q, "opinion text");
  const kind = opinionKindOf(params.kind);
  const stance = opinionStanceOf(params.stance);
  const severity = severityOf(params.severity, kind);
  const scopes = scopesOf(params.scope ?? params.scopes);
  const way = optionalText(params.way) ?? "judgment";
  const source = optionalText(params.source) ?? "opinion-control-service";
  const id = `opinion:${slug(claim).slice(0, 48)}:${semanticHex({ claim, kind, at }).slice(0, 12)}`;
  const value = Object.freeze({
    kind: "opinion-control.opinion.event", event: "held", id,
    opinionKind: kind, stance, severity, scopes, claim, way, at, source,
  });
  const eventId = `opinion-event:${semanticHex(value).slice(0, 24)}`;
  const event = Object.freeze([id, "opinion-control.opinion.held", value, Object.freeze({ at, eventId })]);
  return Object.freeze({
    kind: "opinion-control.opinion.admission",
    accepted: true,
    opinion: opinionFromEvent(event),
    event,
  });
}

export function foldOpinions(events, options = {}) {
  if (!Array.isArray(events)) throw new TypeError("events must be an array");
  const generatedAt = requiredText(options.generatedAt, "generatedAt");
  const byId = new Map();
  let updatedAt = null;
  for (const event of events) {
    if (!Array.isArray(event) || event.length !== 4 || !isRecord(event[2])) continue;
    const [entity, attribute, value, metadata] = event;
    const id = optionalText(value.id) ?? optionalText(entity);
    if (id === null) continue;
    const at = metadataTime(metadata) ?? optionalText(value.at) ?? new Date(0).toISOString();
    updatedAt = updatedAt === null || at > updatedAt ? at : updatedAt;
    const withdrawn = typeof attribute === "string" && attribute.endsWith(".withdrawn");
    const prior = byId.get(id);
    if (prior === undefined) {
      const kind = opinionKindOf(optionalText(value.opinionKind) ?? undefined);
      byId.set(id, {
        id, kind,
        stance: opinionStanceOf(optionalText(value.stance) ?? undefined),
        severity: severityOf(optionalText(value.severity) ?? undefined, kind),
        scopes: scopesOf(value.scopes),
        claim: optionalText(value.claim) ?? id,
        way: optionalText(value.way) ?? "judgment",
        status: withdrawn ? "withdrawn" : "held",
        at, updatedAt: at,
        source: optionalText(value.source) ?? "opinion-control-service",
      });
      continue;
    }
    if (at > prior.updatedAt) prior.updatedAt = at;
    if (withdrawn) prior.status = "withdrawn";
  }
  const opinions = Object.freeze([...byId.values()]
    .sort((left, right) => left.at.localeCompare(right.at) || left.id.localeCompare(right.id))
    .map((opinion) => Object.freeze({ ...opinion })));
  return Object.freeze({
    kind: "opinion-control.snapshot", generatedAt, opinions,
    scopes: Object.freeze([...new Set(opinions.flatMap((opinion) => opinion.scopes))].sort()),
    updatedAt,
  });
}

export function opinionControl(snapshot) {
  return differential.control(snapshot.opinions
    .filter((opinion) => opinion.status === "held")
    .map((opinion) => Object.freeze({
      id: opinion.id, way: opinion.way, severity: opinion.severity, scopes: opinion.scopes,
      claim: `[${opinion.kind}/${opinion.stance}] ${opinion.claim}`,
    })));
}

export function measureOpinions(snapshot, params, options = {}) {
  const generatedAt = requiredText(options.generatedAt ?? params.generatedAt, "generatedAt");
  const subject = requiredText(params.subject ?? params.text ?? params.q, "subject");
  const scope = optionalText(params.scope);
  const control = opinionControl(snapshot);
  const scoped = scope === null
    ? control.norms
    : [...differential.normsFor(control, scope), ...control.norms.filter((norm) => norm.scopes.includes("*"))];
  const seen = new Set();
  const applicable = scoped.filter((norm) => seen.has(norm.id) ? false : (seen.add(norm.id), true));
  const assessments = parseAssessments(params.assessments);
  const unassessed = [];
  const findings = applicable.map((norm) => {
    const assessment = assessments.get(norm.id);
    if (assessment === undefined) {
      unassessed.push(norm.id);
      return differential.finding(norm, "absurd", "no evidence assessed yet — charge against the subject to weigh this opinion", []);
    }
    return differential.finding(norm, assessment.charge, assessment.message ?? "", assessment.evidence ?? []);
  });
  return Object.freeze({
    kind: "opinion-control.measurement", generatedAt, subject, scope,
    findings: Object.freeze(findings), unassessed: Object.freeze(unassessed), control: Object.freeze(applicable),
  });
}

function opinionFromEvent(event) {
  const value = event[2];
  return Object.freeze({
    id: value.id, kind: value.opinionKind, stance: value.stance, severity: value.severity,
    scopes: value.scopes, claim: value.claim, way: value.way, status: "held",
    at: value.at, updatedAt: value.at, source: value.source,
  });
}

function parseAssessments(value) {
  const assessments = new Map();
  for (const raw of Array.isArray(value) ? value : []) {
    if (!isRecord(raw)) continue;
    const id = optionalText(raw.id);
    const charge = typeof raw.charge === "string" && OPINION_CHARGES.has(raw.charge) ? raw.charge : null;
    if (id === null || charge === null) continue;
    assessments.set(id, Object.freeze({
      id, charge, message: optionalText(raw.message) ?? undefined, evidence: textList(raw.evidence),
    }));
  }
  return assessments;
}

function opinionKindOf(value) {
  const text = optionalText(value);
  return text !== null && OPINION_KINDS.has(text) ? text : "guidance";
}
function opinionStanceOf(value) {
  const text = optionalText(value);
  return text !== null && OPINION_STANCES.has(text) ? text : "favor";
}
function severityOf(value, kind) {
  const text = optionalText(value);
  if (text !== null && OPINION_SEVERITIES.has(text)) return text;
  return kind === "constraint" || kind === "guidance" ? "warning" : "info";
}
function scopesOf(value) {
  const scopes = textList(value);
  return Object.freeze(scopes.length === 0 ? ["*"] : [...new Set(scopes)]);
}
function textList(value) {
  const values = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
  return Object.freeze(values.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean));
}
function metadataTime(value) {
  if (typeof value === "string") return value;
  return isRecord(value) ? optionalText(value.at) : null;
}
function optionalText(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length === 0 ? null : text;
}
function requiredText(value, name) {
  const text = optionalText(value);
  if (text === null) throw new TypeError(`${name} must be a nonempty string`);
  return text;
}
const isRecord = isObjectRecord;
function slug(value) { return slugify(value) || "opinion"; }
