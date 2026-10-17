/**
 * recipients -- the delivery targets of an authored activity (ActivityPub 7.1.1 and 5.6).
 *
 * The final destination of an activity is the union of its `to`, `bto`, `cc`, `bcc` and `audience`,
 * with these rules applied:
 *  - the Public collection is addressing only and is never a delivery target (5.6);
 *  - the author is never delivered to (7.1.1);
 *  - the author's own followers collection is expanded to its members (7.1.1, with `resolveFollowers`);
 *    other collections are not expanded here, as they are not owned by the author;
 *  - a recipient's `sharedInbox` is preferred, then its `inbox`, and the result is deduplicated (7.1.3);
 *  - a `Block` is never delivered to its object;
 *  - `bto` and `bcc` are removed from the activity before delivery (7: "MUST remove").
 */
import { PUBLIC } from "./as2.mjs";

const listOf = (value) => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);
const idOf = (value) => (typeof value === "string" ? value : value !== null && typeof value === "object" && typeof value.id === "string" ? value.id : null);

/** The activity as it travels: `bto` and `bcc` removed, never mutating the input. */
export function stripPrivateAudience(activity) {
  const { bto: _bto, bcc: _bcc, ...rest } = activity;
  if (rest.object !== null && typeof rest.object === "object" && !Array.isArray(rest.object)) {
    const { bto: _objectBto, bcc: _objectBcc, ...object } = rest.object;
    return { ...rest, object };
  }
  return rest;
}

/**
 * Resolve an activity's delivery inboxes.
 *
 * @param activity the authored activity.
 * @param options.followersId the author's followers collection IRI.
 * @param options.resolveFollowers async () => [{ actorId, inboxId, sharedInboxId? }] the followers' inboxes.
 * @param options.resolveActor async (iri) => { inboxId, sharedInboxId? } | null for a directly addressed actor.
 * @returns { inboxes: string[], activity } the deduplicated inbox IRIs and the activity to deliver.
 */
export async function deliveryTargets(activity, { followersId, resolveFollowers = async () => [], resolveActor = async () => null } = {}) {
  const author = idOf(activity.actor);
  const addressed = [];
  for (const field of ["to", "bto", "cc", "bcc", "audience"]) for (const entry of listOf(activity[field])) {
    const id = idOf(entry);
    if (id !== null) addressed.push(id);
  }
  const blocked = activity.type === "Block" ? idOf(activity.object) : null;
  const inboxes = [];
  const add = (inbox) => { if (typeof inbox === "string" && !inboxes.includes(inbox)) inboxes.push(inbox); };
  const seen = new Set();
  for (const id of addressed) {
    if (id === PUBLIC || id === author || id === blocked || seen.has(id)) continue;
    seen.add(id);
    if (followersId !== undefined && id === followersId) {
      for (const follower of await resolveFollowers()) if (follower.actorId !== author && follower.actorId !== blocked) add(follower.sharedInboxId ?? follower.inboxId);
      continue;
    }
    const resolved = await resolveActor(id);
    if (resolved !== null && resolved !== undefined) add(resolved.sharedInboxId ?? resolved.inboxId);
  }
  return Object.freeze({ inboxes: Object.freeze(inboxes), activity: stripPrivateAudience(activity) });
}
