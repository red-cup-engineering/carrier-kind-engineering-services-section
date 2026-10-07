import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
/**
 * writing/activitypub/capability — object-capabilities (OCapPub), realized through
 * the OUT (playing) face: ActivityPub as a concurrent game system.
 *
 * Christine Lemmer-Webber's OCapPub/Spritely arc reached for ActivityPub-as-a-
 * distributed-game with object-capabilities instead of identity. That vision is what
 * our OUT face already IS: `playing` is the *-autonomous concurrent-game system (the
 * `cut`/`interact` is interaction), `gaming` is its multi-agent FSym(𝔸) extension
 * (name-passing). So the OCap algebra falls out:
 *
 *   capability   = a LOCUS / design one may play at (playing) — a legal move
 *   invocation   = the CUT / interaction (playing's interaction normal form)
 *   delegation   = NAME-PASSING (gaming's FSym(𝔸) name mobility)
 *   attenuation  = DUALIZE / restriction (the *-autonomous structure)
 *
 * And the grounding is concrete, not analogy: the corpus defines the agent as a
 * perceive→act loop, and `act` already computes the agent's AFFORDANCES (the open
 * cells it may act on). A capability is an affordance reified as an unforgeable,
 * attenuable, delegable reference — and it is EXERCISABLE exactly when it names a
 * move the holder actually has (`canInvoke`). Authority is "what move can you play",
 * not "who are you". See dev/docs/notes/2026-06-25-codecs-on-faces-activitypub-across-scales.md.
 */

/** An object-capability: an unforgeable reference granting the right to play one
 *  locus (affordance). Single-source carrier, bare descent-path `$id`. */
export const capabilitySchema = {
  $id: "animating/writing/activitypub/capability",
  title: "Capability",
  description:
    "An ActivityPub object-capability (OCapPub): an unforgeable reference authorizing one move (`grants` = a locus the OUT/playing face may play). Held by an Actor, attenuable to narrower loci, delegable by name-passing, exercisable only when it names a move the holder has. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "grants", "holder"],
  properties: {
    id: { type: "string" },
    type: { const: "Capability" },
    grants: { type: "string" },
    holder: { type: "string" },
    parent: { type: "string" },
  },
};

export const capabilityCarrier = schemaFrom(capabilitySchema);

let MINT = 0;
/** A fresh unforgeable-enough capability id (monotone per process; callers may supply
 *  their own minted id for determinism). */
function freshId(grants, holder) {
  MINT += 1;
  return `urn:cap:${encodeURIComponent(holder)}:${encodeURIComponent(grants)}:${MINT}`;
}

/** grant — issue a root capability authorizing `grants` (a locus) to `holder`. */
export function grant(holder, grants, id) {
  return {
    id: id ?? freshId(grants, holder),
    type: "Capability",
    grants,
    holder,
  };
}

/**
 * attenuate — derive a NARROWER capability from an existing one (the *-autonomous
 * dualize/restriction). The result authorizes `narrower` (which should be within the
 * parent's grant), is held by the same Actor, and records its provenance via `parent`.
 */
export function attenuate(capability, narrower, id) {
  return {
    id: id ?? freshId(narrower, capability.holder),
    type: "Capability",
    grants: narrower,
    holder: capability.holder,
    parent: capability.id,
  };
}

/**
 * delegate — pass a capability to another Actor (gaming's name-passing): returns the
 * re-issued capability now held by `toActor`, and the `Offer` Activity that conveys
 * it. The offered capability keeps its provenance (`parent` = the original).
 */
export function delegate(capability, toActor, id) {
  const passed = {
    id: id ?? freshId(capability.grants, toActor),
    type: "Capability",
    grants: capability.grants,
    holder: toActor,
    parent: capability.id,
  };
  const activity = {
    type: "Offer",
    actor: capability.holder,
    object: { type: "Capability", id: passed.id, content: passed.grants },
    to: [toActor],
  };
  return { capability: passed, activity };
}

/**
 * invoke — exercise a capability: an `Invoke` Activity addressed at the locus it
 * grants. Handling the invocation is a PLAY — the `cut`/interaction of the holder's
 * strategy against the locus the capability names (playing's interaction normal form).
 */
export function invoke(capability) {
  return {
    type: "Invoke",
    actor: capability.holder,
    object: { type: "Capability", id: capability.id, content: capability.grants },
  };
}

/**
 * canInvoke — the OCap soundness check, grounded in the OUT/playing face: a capability
 * is exercisable exactly when it names a move the holder actually has, i.e. `grants` is
 * among the holder's `affordances` (the open cells `act` reports). Authority by move,
 * not by identity — an unheld move cannot be played even with the token.
 */
export function canInvoke(affordances, capability) {
  return affordances.includes(capability.grants);
}

/**
 * revoke — withdraw a capability: an `Undo` of the grant (the truth-axis `negate` of
 * the authority). Because an `Undo` crosses the across face as a denial, a revoked
 * capability reads as the negation of its grant — and a grant pooled with its
 * revocation lands on ⊤ (the held contradiction of a contested authority). `by`
 * defaults to the holder (self-revocation); an issuer revokes by passing its own IRI.
 */
export function revoke(capability, by) {
  return {
    type: "Undo",
    actor: by ?? capability.holder,
    object: { type: "Capability", id: capability.id, content: capability.grants },
  };
}

/** The outcome of cutting an invocation against the holder's position. */

/**
 * interact — invoke a capability AS the playing cut: cut the invocation against the
 * holder's position (its affordances) and report the interaction's convergence. In
 * ludics the cut of two designs either converges (reaches the Daimon — the strategies
 * agree) or diverges; here the invocation converges exactly when the granted locus is
 * a legal move the holder holds (`canInvoke`). So `invoke` emits the Activity and
 * `interact` is its execution — the convergence reading of playing's interaction
 * normal form, not just the bare wire.
 */
export function interact(capability, affordances) {
  return { locus: capability.grants, converged: canInvoke(affordances, capability) };
}
