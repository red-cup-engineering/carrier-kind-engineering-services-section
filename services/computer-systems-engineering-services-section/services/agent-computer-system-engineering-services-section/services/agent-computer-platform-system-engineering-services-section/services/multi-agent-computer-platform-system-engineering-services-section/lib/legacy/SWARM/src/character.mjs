// character.mjs — a CGS character: a bounded four-coordinate handedness over the predication plane.
//
// GROUNDING (cite path:line, state what files SAY).
//
//   computer/docs/dev/notes/agentic-drone-swarm-systems.md:70-80 — an embodied participant has
//   embodied handedness, a four-tuple h(d) = (recv, send, actuate, observe), each coordinate BOUNDED:
//   recv is the context window; send is rate-limited output bandwidth; actuate is precondition-bounded
//   (available tools); observe is partial (cannot read the whole substrate). "Categorically the note
//   states this is Player/Opponent duality (-)^perp in CGS … a morphism A->B is a strategy on
//   A^perp || B."
//
//   computer/docs/dev/notes/concurrent-game-system.md:363-381 — THEOREM: embodied handedness IS
//   Player/Opponent duality (-)^perp. recv/observe are the Opponent-side coordinates on the input
//   arena A; send/actuate are the Player-side coordinates on the output arena B (lines 373-378). A
//   symmetric peer (recv=send, observe=actuate) is the degenerate copycat on A^perp || A (line 379);
//   "the asymmetric handedness is the generic morphism in CGS" (line 379).
//
//   This module does NOT re-derive that theorem. It supplies the TYPE: a Character is the substrate
//   record of one participant's four bounded coordinates, partitioned by which side of (-)^perp each
//   coordinate sits on — recv/observe Opponent-side (input arena), send/actuate Player-side (output
//   arena). An LLM worker and a device are the SAME type at different bounds (an LLM's `recv` bound is
//   the context window; a device's `observe` bound is its sensor partiality). Per the four-tuple's
//   bounded reading, recv/send are bounded SCALARS here; actuate/observe are PLUGGABLE (a capability
//   surface and an observation frontier the caller supplies).
//
//   players.mjs:13-21 (defaultHandedness) already builds the same four coordinate names over an agent;
//   this module types that record as a Character and adds the polarity partition the CGS theorem names,
//   without touching players.mjs.
//
//   The OFFICE/RECOGNITION ROLE as a COSTATE: offices.mjs:145-167 builds the office×capability relation
//   as a Chu space over FOUR and reads a point's row with `can`/`holdsCapability` (offices.mjs:140-163).
//   A character's office is therefore a POINT of that Chu space whose row (its costate) is exactly the
//   capabilities it actuates — the `actuate` bound is the office's costate. This module reads that
//   costate via offices.mjs (it does not rebuild the Chu space).
//
// It owns no algebra and no I/O. It is a pure typing over agents.mjs + offices.mjs + players.mjs.

import { agentCapabilities, officeNameFor, holdsCapability } from "./offices.mjs";
import { defaultHandedness } from "./players.mjs";

// The polarity partition the CGS theorem names (concurrent-game-system.md:373-378):
//   input arena A  (Opponent-side): the character receives/observes; environment dictates.
//   output arena B (Player-side):   the character sends/actuates; environment receives.
export const POLARITY = Object.freeze({
  recv: "opponent",
  observe: "opponent",
  send: "player",
  actuate: "player",
});

// A bound is the substrate record of how a coordinate is LIMITED (the note's "each coordinate
// bounded"). recv/send carry a numeric bound (context window, output bandwidth); actuate/observe carry
// a pluggable surface (capability set, observation frontier) — `null` means unbounded-as-recorded,
// which is NOT the same as unbounded-in-fact (the substrate simply has not recorded a limit).
function bound(value) {
  return value === undefined ? null : value;
}

// character(agent, opts?) -> the typed four-coordinate handedness of one participant.
// opts.recvBound / opts.sendBound — numeric bounds (LLM context window; output rate). Pluggable.
// opts.observe — an observation frontier (a device's sensor partiality; an LLM worker's read scope).
// opts.actuate — overrides the actuate surface; defaults to the office's capability costate.
// The default coordinate STRINGS come from players.mjs:defaultHandedness so this is the same record.
export function character(agent, opts = {}) {
  if (!agent || !agent.name) throw new Error("character(agent): missing agent.name.");
  const office = officeNameFor(agent);
  const handedness = { ...defaultHandedness(agent), ...(agent.handedness ?? {}) };
  const capabilities = agentCapabilities(agent);

  const coordinates = {
    // Opponent-side (input arena A): receive + observe.
    recv: { polarity: POLARITY.recv, channel: handedness.recv, bound: bound(opts.recvBound) },
    observe: {
      polarity: POLARITY.observe,
      frontier: opts.observe ?? handedness.observe,
      bound: bound(opts.observeBound), // partiality: null = no recorded limit on what it can read
    },
    // Player-side (output arena B): send + actuate.
    send: { polarity: POLARITY.send, channel: handedness.send, bound: bound(opts.sendBound) },
    actuate: {
      polarity: POLARITY.actuate,
      // The actuate surface IS the office's capability costate (offices.mjs row read). A caller may
      // override with a device's effect set; otherwise the surface is precondition-bounded by office.
      surface: opts.actuate ?? capabilities,
      bound: bound(opts.actuateBound),
    },
  };

  return {
    kind: "swarm.character",
    name: agent.name,
    office,
    // The morphism shape this character is a strategy on (concurrent-game-system.md:154,167): it plays
    // Opponent-style on its input and Player-style on its output. Recorded, not refused.
    arenaFormula: "A^perp || B",
    coordinates,
    // A character is SYMMETRIC (a copycat peer, concurrent-game-system.md:379) iff its Opponent-side
    // and Player-side channels coincide — the degenerate self-dual case. The generic participant is
    // asymmetric; this flag records which case THIS character is, it does not impose symmetry.
    symmetric:
      coordinates.recv.channel === coordinates.send.channel &&
      coordinates.observe.frontier === coordinates.actuate.surface,
  };
}

// costate(character, capability) -> the office costate read at one capability: does this character's
// office actuate `capability`? This is the office×capability Chu row read (offices.mjs:161), surfaced
// as the character's actuate-side query. An office/recognition role is a costate over the capability
// plane (the seam brief's "an office/recognition role is a costate").
export function costate(character, capability) {
  return holdsCapability(character.office, capability);
}

// sides(character) -> the two arenas the handedness partitions into, by CGS polarity. The bridge a
// reader uses to see a character AS a morphism A^perp || B without re-deriving the duality theorem.
export function sides(character) {
  const c = character.coordinates;
  return {
    input: { arena: "A", polarity: "opponent", coordinates: { recv: c.recv, observe: c.observe } },
    output: { arena: "B", polarity: "player", coordinates: { send: c.send, actuate: c.actuate } },
  };
}
