/**
 * writing/activitypub/collections — the inbox/outbox legs of the across face as AS2
 * OrderedCollections. inbox = perceive (inbound), outbox = act (outbound).
 *
 * No second ontology: `perceiveInbox` does not re-implement folding — it admits the
 * inbound Activities as the polarity-aware membrane (via `utteranceFromActivity`) and
 * runs the agent's OWN public `perceive` loop leg over them. The outbox is the AS2
 * wire envelope of the agent's outbound Activities. An OrderedCollection here nests
 * already-carried `Activity` values, so it is a plain typed envelope rather than a
 * re-registered carrier (avoids nesting a second `$id` under the collection).
 *
 * See dev/docs/notes/2026-06-25-codecs-on-faces-activitypub-across-scales.md.
 */

import { utteranceFromActivity, ACTIVITYSTREAMS_CONTEXT } from "./index.mjs";
import { perceive } from "../../becoming/doing/working/governing/agent.mjs";

/** An ActivityStreams OrderedCollection — the wire envelope of an inbox/outbox: a
 *  count and the ordered Activities. A plain typed envelope over carried Activities. */

/** Wrap Activities as an AS2 OrderedCollection (the outbox/published wire form). */
export function orderedCollection(activities, id) {
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    ...(id === undefined ? {} : { id }),
    type: "OrderedCollection",
    totalItems: activities.length,
    orderedItems: [...activities],
  };
}

/** The outbox of an agent: its outbound Activities as a published OrderedCollection. */
export function outboxOf(activities, id) {
  return orderedCollection(activities, id);
}

/** Each inbound Activity as a `[token, claim]` seed pair — the polarity-aware membrane
 *  reading (Undo crosses as a denial), the exact form `admitSeed`/`perceive` admit. */
function seedFromActivities(activities) {
  return activities.map((activity) => {
    const u = utteranceFromActivity(activity);
    return [String(u.token.mark.value), String(u.claim.mark.value)];
  });
}

/**
 * perceiveInbox — the inbox leg: fold a batch of inbound Activities into the agent.
 * The Activities become the polarity-aware inbound membrane and the agent's OWN
 * `perceive` loop leg folds them over prior `memory` (append-only). With empty
 * memory it is the agent freshly perceiving its inbox. A held contradiction (an
 * assertion and its `Undo`) lands as ⊤ at the membrane, exactly as the across face reads it.
 */
export function perceiveInbox(
  activities,
  memory,
  options = {},
) {
  return perceive(seedFromActivities(activities), memory, options);
}
