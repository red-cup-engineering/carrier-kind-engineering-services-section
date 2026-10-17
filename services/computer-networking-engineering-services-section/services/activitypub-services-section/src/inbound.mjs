/**
 * inbound -- paraconsistent reading of federated activities.
 *
 * ActivityPub 7 delivers activities to an inbox; the conventional server applies each with
 * last-writer-wins, so a later `Delete` erases an earlier `Create` and peers who disagree fight until
 * one lands last. Here every verified inbound activity is a *witnessed claim*: it is told as relation
 * observations whose polarity is `for` (Create, Update, Follow, Accept, Like, Announce, an Undo of a
 * Delete) or `against` (Delete, an Undo of anything else), each carrying the activity id as its
 * evidence. {@link settleObservations} folds observations by the Belnap knowledge join -- a cell told
 * both for and against is `contradicted` (both witnesses kept), never resolved by arrival order, and
 * the fold is commutative, associative and idempotent so delivery order cannot matter.
 *
 * Activity verification (HTTP signatures, Data Integrity proofs) is Fedify's, before this module sees
 * the activity; this module only reads what has been admitted. Pure: no clock, no network.
 */
import { observationBatch } from "@red-cup-engineering/eavt-services-section/relation-web";
import { isAS2 } from "./as2.mjs";

const ID_FIELDS = new Set(["@context", "id"]);

/** The IRI of an `object`/`actor` that may be inline or a bare IRI. */
export function iriOf(value) {
  if (typeof value === "string") return value;
  if (value !== null && typeof value === "object" && typeof value.id === "string") return value.id;
  return null;
}

/** The IRI of the thing an activity is about: its object, else its target. */
export function subjectOf(activity) {
  return iriOf(activity?.object) ?? iriOf(activity?.target);
}

/**
 * The witness of an activity: its `id` (ActivityPub 3.2 requires server-assigned ids), else a
 * deterministic `actor@published` mark so the claim is still traceable.
 */
export function citationOf(activity) {
  if (typeof activity?.id === "string" && activity.id.length > 0) return activity.id;
  return `${iriOf(activity?.actor) ?? "anonymous"}@${typeof activity?.published === "string" ? activity.published : "unstamped"}`;
}

/** Lift an inline object's fields into a flat `{ predicate: value }` claim map (addressing is not predication). */
export function objectToClaims(object) {
  const claims = {};
  if (object === null || typeof object !== "object") return claims;
  for (const [key, value] of Object.entries(object)) if (!ID_FIELDS.has(key) && value !== undefined) claims[key] = value;
  return claims;
}

const MEMBERSHIP = Object.freeze({ Follow: "follows", Accept: "accepted", Like: "likes", Announce: "announces", Block: "blocks", Dislike: "dislikes" });

/**
 * The reading of one activity: `{ subject, polarity, claims, citation, activityType }`, or null for
 * an activity that cannot be placed (no subject, an unhandled type).
 *
 *  - Create/Update  -> for, the object's fields (an Update is a fresh witness: monotone, not overwrite)
 *  - Delete         -> against, the object's fields (or `exists: true` for a bare IRI / Tombstone)
 *  - Undo           -> the wrapped activity inverted: of a Delete for; of anything else against
 *  - Follow, Accept, Like, Announce, Block, Dislike -> for, a membership cell on the *actor*
 *  - Reject         -> against the rejected activity's membership cell
 */
export function activityToClaims(activity) {
  if (!isAS2(activity) || typeof activity.type !== "string") return null;
  const type = activity.type;
  const citation = citationOf(activity);
  const actor = iriOf(activity.actor);
  if (type in MEMBERSHIP) {
    const target = subjectOf(activity);
    if (actor === null || target === null) return null;
    return { subject: actor, polarity: "for", claims: { [MEMBERSHIP[type]]: target }, citation, activityType: type };
  }
  if (type === "Reject" || type === "Undo") {
    const inner = activity.object !== null && typeof activity.object === "object" ? activity.object : null;
    if (inner === null) return null;
    const innerType = typeof inner.type === "string" ? inner.type : null;
    if (innerType !== null && innerType in MEMBERSHIP) {
      const target = subjectOf(inner);
      const innerActor = iriOf(inner.actor) ?? actor;
      if (innerActor === null || target === null) return null;
      return { subject: innerActor, polarity: "against", claims: { [MEMBERSHIP[innerType]]: target }, citation, activityType: type };
    }
    if (type === "Reject") return null;
    const subject = subjectOf(inner);
    if (subject === null) return null;
    const lifted = objectToClaims(inner.object !== null && typeof inner.object === "object" ? inner.object : {});
    const claims = Object.keys(lifted).length > 0 ? lifted : { exists: true };
    return { subject, polarity: innerType === "Delete" ? "for" : "against", claims, citation, activityType: type };
  }
  const subject = subjectOf(activity);
  if (subject === null) return null;
  const lifted = objectToClaims(activity.object);
  if (type === "Create" || type === "Update") return { subject, polarity: "for", claims: lifted, citation, activityType: type };
  if (type === "Delete") return { subject, polarity: "against", claims: Object.keys(lifted).length > 0 ? lifted : { exists: true }, citation, activityType: type };
  return null;
}

/**
 * One inbound activity as a relation-web observation batch: a relation `subject -predicate-> value`
 * per claim, polarity `for`/`against`, evidence the activity id. An activity that cannot be placed is a
 * refused batch with its reason, never a silent drop. `source` names the receiving inbox.
 */
export function activityObservation(activity, { inbox, receivedAt } = {}) {
  const source = { protocol: "activitypub", ...(inbox === undefined ? {} : { inbox }), ...(receivedAt === undefined ? {} : { receivedAt }) };
  const mapped = activityToClaims(activity);
  if (mapped === null) return observationBatch({ source, admission: { status: "refused", refusal: { reason: "activity cannot be placed: not an ActivityStreams activity with a subject, or an unhandled type" } }, relations: [] });
  const relations = Object.entries(mapped.claims).map(([predicate, object]) => ({
    subject: mapped.subject, predicate, object, polarity: mapped.polarity, evidence: { activity: mapped.citation, type: mapped.activityType },
  }));
  return observationBatch({ source, relations });
}

const cellKey = (r) => JSON.stringify([r.subject, r.predicate, r.object]);

/**
 * The Belnap settle of observations (those of a relation web's `query()` or of batches' `relations`):
 * per `(subject, predicate, object)` cell, `affirmed` when only told `for`, `denied` when only told
 * `against`, `contradicted` when told both (with the witnesses of each side). Order-independent.
 */
export function settleObservations(observations) {
  const cells = new Map();
  for (const o of observations) {
    if (o.polarity !== "for" && o.polarity !== "against") continue;
    const key = cellKey(o);
    const cell = cells.get(key) ?? { subject: o.subject, predicate: o.predicate, object: o.object, for: new Set(), against: new Set() };
    cell[o.polarity].add(o.evidence?.activity ?? null);
    cells.set(key, cell);
  }
  const out = { affirmed: [], denied: [], contradicted: [] };
  for (const cell of [...cells.values()].sort((a, b) => (cellKey(a) < cellKey(b) ? -1 : 1))) {
    const witnesses = (set) => [...set].sort();
    const base = { subject: cell.subject, predicate: cell.predicate, object: cell.object };
    if (cell.for.size > 0 && cell.against.size > 0) out.contradicted.push({ ...base, affirmedBy: witnesses(cell.for), deniedBy: witnesses(cell.against) });
    else if (cell.for.size > 0) out.affirmed.push({ ...base, citation: witnesses(cell.for) });
    else out.denied.push({ ...base, citation: witnesses(cell.against) });
  }
  return Object.freeze(out);
}

/**
 * The inbox decision as data (ActivityPub 7: a successful inbox POST is 202 Accepted, processing being
 * asynchronous): 400 for a non-AS2 or unplaceable body, else 202 with the observation to record.
 */
export function receiveInbound(body, context = {}) {
  if (!isAS2(body)) return { status: 400, reason: "body is not an ActivityStreams 2.0 document" };
  const observation = activityObservation(body, context);
  if (observation.admission.status === "refused") return { status: 400, reason: observation.admission.refusal.reason, observation };
  return { status: 202, observation };
}
