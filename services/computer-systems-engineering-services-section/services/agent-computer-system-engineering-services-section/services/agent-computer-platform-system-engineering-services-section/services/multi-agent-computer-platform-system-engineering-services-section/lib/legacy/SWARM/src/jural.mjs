// jural.mjs — the Hohfeldian jural-relation substrate that every governance regime draws from.
//
// This is NOT itself a governance regime. The corpus is explicit that the four Hohfeldian
// positions are the *shared substrate*, and a regime is "a choice of which jural relations are
// in force and how they settle" (docs/dev/notes/2026-06-04-plural-situational-governance.md,
// §"The synthesis"; archive predication-categories bucket-2
// questions/deontic-hyperdoctrine-for-governance.md).
//
// Each jural relation carries an active-holder, a passive-party, and a scope-action, and maps to
// a deontic modality. Positions and the deontic mapping are quoted from the corpus; this module
// only makes them addressable data — it authors no new deontic theory.

// The four positions and their deontic reading (deontic-hyperdoctrine-for-governance.md §lines 11-20).
export const JURAL_POSITIONS = Object.freeze({
  duty: Object.freeze({
    position: "duty",
    quartet: "first",
    deontic: "obligation",
    gloss: "O(action) — the active-holder must perform the scope-action",
    correlative: "claim-right",
  }),
  privilege: Object.freeze({
    position: "privilege",
    quartet: "first",
    deontic: "permission",
    gloss: "P(action) — the active-holder may perform the scope-action; no duty to refrain",
    correlative: "no-right",
  }),
  power: Object.freeze({
    position: "power",
    quartet: "second",
    deontic: "deontic-possibility-of-state-change",
    gloss: "the active-holder may, by a voluntary act, change the passive-party's normative position",
    correlative: "liability",
  }),
  immunity: Object.freeze({
    position: "immunity",
    quartet: "second",
    deontic: "deontic-impossibility-of-other's-state-change",
    gloss: "the passive-party may not alter the active-holder's normative position",
    correlative: "disability",
  }),
});

// A jural relation instance: who holds the position, over whom, over which action.
export function juralRelation(position, { activeHolder = "", passiveParty = "", scopeAction = "" } = {}) {
  const base = JURAL_POSITIONS[position];
  if (!base) throw new Error(`unknown Hohfeldian position: ${position} (expected one of ${Object.keys(JURAL_POSITIONS).join(", ")})`);
  return Object.freeze({
    kind: "swarm.jural.relation",
    position: base.position,
    quartet: base.quartet,
    deontic: base.deontic,
    correlative: base.correlative,
    activeHolder,
    passiveParty,
    scopeAction,
  });
}

export function isJuralPosition(name) {
  return Object.prototype.hasOwnProperty.call(JURAL_POSITIONS, name);
}
