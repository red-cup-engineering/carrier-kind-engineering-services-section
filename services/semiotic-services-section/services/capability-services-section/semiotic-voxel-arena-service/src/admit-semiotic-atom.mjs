/**
 * SXC-M4: the active-only Semiotic Voxel transition.
 *
 * This module is intentionally a pure admission law.  The arena is the input
 * position plus this invocation; it is never stored or restored here.  The
 * `(2,3)` pebble game remains an external mathematical oracle: this law
 * validates the caller-supplied judgment's scope and refuses a rejected
 * contact rather than duplicating or self-attesting the oracle.  Provider
 * identity and receipt verification belong at the unbuilt A2A/chain seam.
 */

const POLARITIES = new Set(["proponent", "opponent"]);
const PEBBLE_MODEL = "generic-2d-rigidity-(2,3)-pebble-game/v1";

function refusal(reason, detail) {
  return Object.freeze({ kind: "semiotic-voxel-arena-refusal/v1", admitted: false, reason, detail });
}

function uniqueStrings(value) {
  return Array.isArray(value)
    && value.every((item) => typeof item === "string" && item.length > 0)
    && new Set(value).size === value.length;
}

function causalPast(byId, parentIds) {
  const past = new Set();
  const visit = (id) => {
    if (past.has(id)) return;
    past.add(id);
    for (const parent of byId.get(id).parentIds) visit(parent);
  };
  for (const parent of parentIds) visit(parent);
  return [...past].sort();
}

function judgmentScopeIsValid(judgment, atomId, cone) {
  if (judgment === null || typeof judgment !== "object") return false;
  if (judgment.model !== PEBBLE_MODEL || judgment.atomId !== atomId) return false;
  if (!uniqueStrings(judgment.vertices) || judgment.vertices.length !== cone.length) return false;
  const sortedVertices = [...judgment.vertices].sort();
  const sortedCone = [...cone].sort();
  if (sortedVertices.some((vertex, index) => vertex !== sortedCone[index])) return false;
  if (!Array.isArray(judgment.accepted) || !Array.isArray(judgment.rejected)) return false;
  if (judgment.rejected.length !== 0) return false;
  const allowed = new Set(cone);
  let touchesAtom = false;
  for (const edge of [...judgment.accepted, ...judgment.rejected]) {
    if (!Array.isArray(edge) || edge.length !== 2 || !edge.every((id) => typeof id === "string" && allowed.has(id))) return false;
    if (edge.includes(atomId)) touchesAtom = true;
  }
  return touchesAtom;
}

/**
 * Admit one atom into an ephemeral causally closed arena position.
 *
 * @param {{ position: { atoms: readonly { id: string, parentIds: readonly string[] }[] }, atom: { id: string, polarity: "proponent"|"opponent", parentIds: readonly string[] }, pebbleJudgment: object }} request
 */
export function admitSemioticAtom(request) {
  if (request === null || typeof request !== "object") return refusal("invalid-request", "request must be an object");
  const { position, atom, pebbleJudgment } = request;
  if (position === null || typeof position !== "object" || !Array.isArray(position.atoms)) return refusal("invalid-position", "position.atoms must be an array");
  if (atom === null || typeof atom !== "object" || typeof atom.id !== "string" || atom.id.length === 0
    || !POLARITIES.has(atom.polarity) || !uniqueStrings(atom.parentIds)) {
    return refusal("invalid-atom", "atom needs a non-empty id, a polarity, and unique parentIds");
  }

  const byId = new Map();
  for (const prior of position.atoms) {
    if (prior === null || typeof prior !== "object" || typeof prior.id !== "string" || !uniqueStrings(prior.parentIds)
      || byId.has(prior.id) || prior.parentIds.includes(prior.id) || prior.parentIds.some((id) => !byId.has(id))) {
      return refusal("invalid-position", "position must be a topologically ordered, causally closed event set");
    }
    byId.set(prior.id, prior);
  }
  if (byId.has(atom.id) || atom.parentIds.includes(atom.id)) return refusal("duplicate-or-reflexive-atom", atom.id);
  const missing = atom.parentIds.find((id) => !byId.has(id));
  if (missing !== undefined) return refusal("cause-outside-light-cone", missing);

  const past = causalPast(byId, atom.parentIds);
  const cone = [...past, atom.id];
  if (!judgmentScopeIsValid(pebbleJudgment, atom.id, cone)) {
    return refusal("unsettled-or-out-of-cone-pebble-judgment", "the supplied (2,3) oracle judgment must name exactly this causal cone and accept only contacts within it");
  }

  const admittedAtom = Object.freeze({ id: atom.id, polarity: atom.polarity, parentIds: Object.freeze([...atom.parentIds]) });
  const nextPosition = Object.freeze({ atoms: Object.freeze([...position.atoms, admittedAtom]) });
  return Object.freeze({
    kind: "semiotic-voxel-arena-transition/v1",
    admitted: true,
    atom: admittedAtom,
    causalPast: Object.freeze(past),
    position: nextPosition,
    boundaryTransaction: Object.freeze({
      op: "add",
      e: atom.id,
      a: "semiotic-voxel/causal-event",
      v: Object.freeze({ polarity: atom.polarity, parentIds: Object.freeze([...atom.parentIds]), pebbleJudgment: PEBBLE_MODEL }),
    }),
  });
}

export { PEBBLE_MODEL };
