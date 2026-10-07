/**
 * socialize/assertions - assertion-world reads over the Social Field.
 *
 * An EAV assertion is admitted as an observer-local cell: told for, or against
 * when its value is `{ not: X }`. Disagreement is a derived multi-observer read:
 * a cell some observers tell for and others against, where holding a declared
 * contrary predicate (is-closed against is-open, say) over the same subject and
 * object stands against it. The Social Field remains the one socializing
 * carrier; federation is merge/settle/converge over observer stalks.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { cell } from "@red-cup-engineering/signcell/cell";
import {
  admitField,

} from "./field.mjs";
import {
  assertionDisagreementsCarrier,
  socialFieldCarrier,

} from "../carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const CONTRARY_PREDICATE = "contrary-to";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableKey(value) {
  return JSON.stringify(value);
}

function assertionFrom(value, context) {
  if (!isRecord(value) || typeof value.a !== "string" || value.a.trim() === "" || value.e === undefined || value.v === undefined) {
    throw new TypeError(`${context}: expected an assertion { e, a, v }`);
  }
  return Object.freeze({
    e: value.e,
    a: value.a,
    v: value.v,
    ...(value.t === undefined ? {} : { t: value.t }),
    ...(typeof value.source === "string" ? { source: value.source } : {}),
  });
}

function assertionsFrom(value, context) {
  const list = Array.isArray(value) ? value : [value];
  return Object.freeze(list.map((item, index) => assertionFrom(item, `${context}[${index}]`)));
}

const isAgainst = (value) => isRecord(value) && "not" in value;

/** Convert one EAV assertion into the cell this observer locally holds: told for, or against when its value
 *  is `{ not: X }`, witnessed by the assertion. */
export function assertionMeme(assertion) {
  const against = isAgainst(assertion.v);
  const witness = Object.freeze(["socializing", "assertion", assertion.e, assertion.a, assertion.v]);
  return cell(assertion.e, assertion.a, against ? assertion.v.not : assertion.v, { [against ? "against" : "for"]: [witness] });
}

/** Admit assertions into one observer's local stalk. */
export function admitAssertions(field, observer, assertions) {
  if (!Number.isInteger(observer) || observer < 0 || observer >= field.members.length) {
    throw new RangeError(`admitAssertions: observer ${observer} is out of range`);
  }
  const memes = assertions.map((assertion) => assertionMeme(assertion));
  const members = field.members.map((member, index) =>
    index === observer
      ? Object.freeze({ ...member, memes: Object.freeze([...member.memes, ...memes]) })
      : member);
  return Object.freeze({
    ...field,
    members: Object.freeze(members),
  });
}

/** Endomorphic action: add EAV claims to an observer's local meme stalk. */
export const assertAction = operation({
  verb: "assert",
  inputFormat: "json",
  outputFormat: "json",
  options: ["observer", "assertions"],
  summary: "Admit EAV assertions as observer-local memes in a social field.",
  description: "Domain: a social-field carrier. Codomain: the same social-field carrier with assertions appended to one observer's local stalk, each told for (or against, when its value is { not: X }); disagreement is derived later by assertion-disagreements.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input, args = {}) => {
    const field = admitField(input, "assert");
    const observer = Number(args.observer ?? 0);
    const assertions = assertionsFrom((args.assertions ?? []), "assert.assertions");
    return jsonResource(admitAssertions(field, observer, assertions), "social-field");
  },
});

/** Every observer's local cells, each with the observer holding it. */
function heldCells(field) {
  return Object.freeze(field.members.flatMap((member, observer) => member.memes
    .filter((local) => local.subject !== undefined && local.object !== undefined && typeof local.predicate === "string" && Array.isArray(local.for))
    .map((local) => Object.freeze({ observer, cell: local }))));
}

/** The declared contrary of each predicate: those held as (P contrary-to Q) cells, then any passed in. */
function contrarietyOf(held, declared) {
  const contrary = new Map();
  for (const { cell: at } of held) {
    if (at.predicate === CONTRARY_PREDICATE && at.for.length > 0 && typeof at.subject === "string" && typeof at.object === "string") contrary.set(at.subject, at.object);
  }
  for (const [left, right] of Object.entries(declared)) contrary.set(left, right);
  return contrary;
}

const sortedObservers = (observers) => Object.freeze([...observers].sort((a, b) => a - b));

/** Derive disagreements: cells some observers tell for and others tell against, directly or by holding the
 *  predicate's declared contrary over the same subject and object. */
export function assertionDisagreements(field, declared = {}) {
  const held = heldCells(field);
  const contrary = contrarietyOf(held, declared);
  const byCell = new Map();
  const entryAt = (subject, predicate, object) => {
    const key = stableKey([subject, predicate, object]);
    if (!byCell.has(key)) byCell.set(key, { subject, predicate, object, observers: new Set(), contraryObservers: new Set() });
    return byCell.get(key);
  };
  for (const { observer, cell: at } of held) {
    if (at.for.length > 0) entryAt(at.subject, at.predicate, at.object).observers.add(observer);
    if (at.against.length > 0) entryAt(at.subject, at.predicate, at.object).contraryObservers.add(observer);
  }
  for (const { observer, cell: at } of held) {
    if (at.for.length === 0) continue;
    for (const [predicate, contraryPredicate] of contrary) {
      if (contraryPredicate === at.predicate) entryAt(at.subject, predicate, at.object).contraryObservers.add(observer);
    }
  }
  const disagreements = [...byCell.values()]
    .filter((entry) => entry.observers.size > 0 && entry.contraryObservers.size > 0)
    .map((entry) => Object.freeze({
      subject: entry.subject,
      predicate: entry.predicate,
      ...(contrary.has(entry.predicate) ? { contrary: contrary.get(entry.predicate) } : {}),
      object: entry.object,
      observers: sortedObservers(entry.observers),
      contraryObservers: sortedObservers(entry.contraryObservers),
      reading: "stable",
    }));
  return Object.freeze({
    kind: "socializing.assertion-disagreements",
    disagreements: Object.freeze(disagreements),
  });
}

/** Read action: derive assertion disagreements from a social field. */
export const assertionDisagreementsAction = operation({
  verb: "assertion-disagreements",
  inputFormat: "json",
  outputFormat: "json",
  options: ["contrary"],
  summary: "Derive the cells observers of a social field tell both for and against.",
  description: "Domain: a social-field carrier. Codomain: socializing/assertion-disagreements. A read: a disagreement is a cell some observers tell for and others against, directly ({ not: X }) or by holding a declared contrary predicate over the same subject and object.",
  domain: socialFieldCarrier,
  codomain: assertionDisagreementsCarrier,
  run: (input, args = {}) => {
    const contrary = isRecord(args.contrary)
      ? Object.fromEntries(Object.entries(args.contrary).filter((entry) => typeof entry[1] === "string"))
      : {};
    return jsonResource(assertionDisagreements(admitField(input, "assertion-disagreements"), contrary), "assertion-disagreements");
  },
});
