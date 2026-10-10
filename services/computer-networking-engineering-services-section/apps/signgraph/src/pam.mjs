
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { cell, knowledgeReading, triple, witnessAgainst, witnessFor } from "@red-cup-engineering/signcell/cell";

import { createRelationWeb, immutableJson } from "@red-cup-engineering/eavt-services-section/relation-web";
import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";

const freezeList = (values) => Object.freeze([...values]);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const present = (value, label) => {
  if (value === undefined) throw new TypeError(`${label} must be present`);
  return value;
};
function normalizeClaim(claim) {
  if (claim === null || typeof claim !== "object" || Array.isArray(claim)) throw new TypeError("claim must be an object");
  const normalized = {
    subject: immutableJson(present(claim.subject, "claim.subject"), "claim.subject"),
    predicate: immutableJson(present(claim.predicate, "claim.predicate"), "claim.predicate"),
    object: immutableJson(present(claim.object, "claim.object"), "claim.object"),
    polarity: claim.polarity ?? "for",
    ...(hasOwn(claim, "evidence") ? { evidence: immutableJson(claim.evidence, "claim.evidence") } : {}),
  };
  if (normalized.polarity !== "for" && normalized.polarity !== "against") throw new TypeError("claim.polarity must be \"for\" or \"against\"");
  return Object.freeze(normalized);
}
function messageIdentity(sender, claims, suppliedId) {
  if (suppliedId !== undefined) {
    if (typeof suppliedId !== "string" || suppliedId.length === 0) throw new TypeError("message.id must be a non-empty string when supplied");
    return suppliedId;
  }
  return semanticId({ sender, claims });
}
export function reifyMessage(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("PAM input must be a message object");
  const sender = immutableJson(present(input.sender, "message.sender"), "message.sender");
  if (!Array.isArray(input.claims) || input.claims.length === 0) throw new TypeError("message.claims must be a non-empty array");
  const claims = freezeList(input.claims.map(normalizeClaim));
  return Object.freeze({ type: "pam.message", id: messageIdentity(sender, claims, input.id), sender, claims });
}
const matches = (pattern, key, actual) => !hasOwn(pattern, key) || canonicalJson(pattern[key]) === canonicalJson(actual);
function assertRowOrderMarker(value, label) {
  if (value === null || typeof value !== "object" || !Number.isInteger(value.ordinal) || !Number.isInteger(value.relationIndex)) throw new TypeError(`${label} must be a row (or { ordinal, relationIndex }) carrying integer ordinal and relationIndex fields`);
  return value;
}
const compareRowOrder = (left, right) => (left.ordinal - right.ordinal) || (left.relationIndex - right.relationIndex);
function withinWindow(observation, { until, after } = {}) {
  if (until !== undefined && after !== undefined) throw new TypeError("windowed reading accepts only one of until or after");
  if (until !== undefined) return compareRowOrder(observation, assertRowOrderMarker(until, "until")) <= 0;
  if (after !== undefined) return compareRowOrder(observation, assertRowOrderMarker(after, "after")) > 0;
  return true;
}

/** Predicate Algebra Modeling folds observations in a SignGraph relation web into SignCells. */
export function createPam({ web = createRelationWeb() } = {}) {
  function valuation(windowOptions = {}) {
    const cells = new Map();
    for (const observation of web.query()) {
      if (!withinWindow(observation, windowOptions)) continue;
      const polarity = observation.polarity ?? observation.datum ?? "for";
      if (polarity !== "for" && polarity !== "against") throw new TypeError(`PAM has no polarity mapping for ${JSON.stringify(polarity)}`);
      const key = web.cellAddress(observation), current = cells.get(key) ?? cell(observation.subject, observation.predicate, observation.object);
      const witness = Object.freeze({ eventId: observation.eventId, ordinal: observation.ordinal, source: observation.source, relationIndex: observation.relationIndex, ...(hasOwn(observation, "evidence") ? { detail: observation.evidence } : {}) });
      cells.set(key, polarity === "for" ? witnessFor(current, witness) : witnessAgainst(current, witness));
    }
    return cells;
  }
  const readWitness = (told) => Object.freeze({ kind: "pam.read-witness", cell: triple(told), cellAddress: web.cellAddress(told), reading: knowledgeReading(told), evidence: Object.freeze({ for: told.for, against: told.against }), derivations: freezeList([]), settlement: Object.freeze({ status: "not-run", reason: "no-closure-executor" }) });
  const pam = {
    web,
    dispatch(input) {
      const message = reifyMessage(input), observation = web.observe({ id: message.id, source: Object.freeze({ kind: "pam.message", message }), relations: message.claims });
      return Object.freeze({ kind: "pam.dispatch-witness", admitted: observation.admitted, duplicate: observation.duplicate, message, observation, readings: freezeList(message.claims.map((claim) => pam.read(claim))) });
    },
    read(cell, options = {}) {
      const normalized = Object.freeze({ subject: present(cell.subject, "cell.subject"), predicate: present(cell.predicate, "cell.predicate"), object: present(cell.object, "cell.object") });
      return readWitness(valuation(options).get(web.cellAddress(normalized)) ?? cell(normalized.subject, normalized.predicate, normalized.object));
    },
    query(pattern = {}, options = {}) {
      const readings = [];
      for (const told of valuation(options).values()) {
        if (!matches(pattern, "subject", told.subject) || !matches(pattern, "predicate", told.predicate) || !matches(pattern, "object", told.object)) continue;
        const witness = readWitness(told);
        if (!hasOwn(pattern, "reading") || pattern.reading === witness.reading) readings.push(witness);
      }
      readings.sort((left, right) => left.cellAddress.localeCompare(right.cellAddress));
      return freezeList(readings);
    },
    reindex(move, { name = move.name || "anonymous-cell-move" } = {}) {
      if (typeof move !== "function") throw new TypeError("PAM reindex move must be a function");
      return Object.freeze({ kind: "pam.reindexed-view", name, read(requestedCell) { const sourceCell = move(requestedCell); return Object.freeze({ kind: "pam.reindexed-read-witness", move: name, requestedCell: Object.freeze({ ...requestedCell }), sourceCell, witness: pam.read(sourceCell) }); } });
    },
    neighbors(term, { direction = "both", predicate } = {}) {
      if (!["incoming", "outgoing", "both"].includes(direction)) throw new TypeError("direction must be incoming, outgoing, or both");
      const restriction = predicate === undefined ? {} : { predicate };
      return Object.freeze({ kind: "pam.neighborhood-witness", term, incoming: direction === "outgoing" ? freezeList([]) : pam.query({ object: term, ...restriction }), outgoing: direction === "incoming" ? freezeList([]) : pam.query({ subject: term, ...restriction }) });
    },
    messages: () => freezeList(web.events().filter((event) => event.source?.kind === "pam.message").map((event) => event.source.message)),
  };
  return Object.freeze(pam);
}
export function replayPam(messages, options = {}) { const pam = createPam(options); for (const message of messages) pam.dispatch(message); return pam; }
