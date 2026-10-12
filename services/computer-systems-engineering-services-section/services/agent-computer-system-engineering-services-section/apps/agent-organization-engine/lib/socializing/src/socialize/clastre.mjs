/**
 * clastre — the SAVIOR–SLAVE / CLASTREAN dual (Result 1 of the californication note,
 * dev/docs/notes/2026-06-25-californication-as-a-governance-configuration.md).
 *
 * Pierre Clastres (Society Against the State, 1974) described offices engineered so coercive power
 * never separates out: prestige, oratorical duty, obligation of generosity — and NO command (the chief
 * who orders is ignored). A CLASTREAN office is duty-without-power as LIBERATION. Californication's
 * savior–slave subject has the SAME jural shape — total duty, no power — as DOMINATION. The whole
 * difference is one quantifier over the rest of the field: whether the correlative power is held
 * elsewhere.
 *
 *   Proposition 1. An agent bearing a duty over scope X with no power over X is
 *     - CLASTREAN     iff NO agent holds the power over X (the duty answers to no coercive capacity); or
 *     - SAVIOR–SLAVE  iff SOME OTHER agent holds the power over X (answerable for what it cannot control).
 *
 * Inspecting the agent alone cannot tell these apart — both are duty, no power. Only a search of the
 * field for the rehomed power distinguishes them. This consumes the jural substrate of ./govern.mts and
 * the office constructor of ./office.mts; it re-derives nothing.
 */
import { office } from "./office.mjs";

/** A jural relation is HELD when its standing is asserted (`potential`) or contested (`stable`); a
 *  denied (`active`) or unspoken (`absurd`) relation does not bind. */
function held(relation) {
  return relation.standing === "potential" || relation.standing === "stable";
}

/** The valence of an agent's standing over a scope, per Proposition 1. */

/** The Result-1 reading: how an agent's duty/power over a scope is configured, and (if duty-without-power)
 *  whether it is the liberatory Clastrean form or the californicated savior–slave trap. */

  

/**
 * dutyPowerValence — classify an agent's configuration over a scope (Proposition 1). The savior–slave
 * verdict requires the field-wide search the proposition demands: it is `savior-slave` exactly when the
 * agent carries the duty-shaped half of an office while the power-shaped half is held by someone else,
 * and `clastrean` when that power is held by no one at all.
 */
export function dutyPowerValence(relations, agent, scope) {
  const overScope = relations.filter((relation) => relation.scope === scope && held(relation));
  const bearsDuty = overScope.some((relation) => relation.kind === "duty" && relation.active === agent);
  const holdsPower = overScope.some((relation) => relation.kind === "power" && relation.active === agent);
  const powerElsewhere = overScope.some((relation) => relation.kind === "power" && relation.active !== agent);

  const valence = holdsPower
    ? "empowered"
    : bearsDuty
      ? (powerElsewhere ? "savior-slave" : "clastrean")
      : "none";

  return Object.freeze({
    kind: "socializing.duty-power-valence",
    agent,
    scope,
    valence,
    bearsDuty,
    holdsPower,
    powerElsewhere,
  });
}

/**
 * clastreanOffice — construct an office that is all prestige, duty, privilege, and immunity and carries
 * NO coercive power (the Clastrean form: authority that cannot command). Rejects any `power`-kind entry:
 * a Clastrean office with a power is a contradiction in terms. The resulting incumbent, by Proposition 1,
 * is `clastrean` over its scopes precisely as long as no one else in the field holds the matching power —
 * which is the standing condition a `coagulationGuard` (forthcoming) would watch.
 */
export function clastreanOffice(name, profile) {
  const coercive = profile.find((entry) => entry.kind === "power");
  if (coercive !== undefined) {
    throw new RangeError(`clastreanOffice: a Clastrean office holds no power (got a power over ${coercive.over.level}:${coercive.over.id})`);
  }
  return office(name, profile);
}

/** A (agent, scope) duty classified as a savior–slave trap. */

/** A field-wide census of duty-without-power configurations — the structural, non-temporal sweep of
 *  Proposition 1 across every held duty. */

    

  

/**
 * saviorSlaveCensus — sweep every held duty in the field and classify it by Proposition 1, counting
 * the savior–slave traps (answerable-without-power-while-power-is-held-elsewhere), the Clastrean duties
 * (answerable where no power exists), and the empowered. The structural half of the californication
 * audit's Result-1 reading — it needs no temporal data because the valence is a fact about the current
 * field, not about a process over time.
 */
export function saviorSlaveCensus(relations) {
  const seen = new Set();
  let saviorSlave = 0;
  let clastrean = 0;
  let empowered = 0;
  let duties = 0;
  const traps = [];
  for (const relation of relations) {
    if (relation.kind !== "duty" || !held(relation)) continue;
    const key = `${relation.active}\0${relation.scope}`;
    if (seen.has(key)) continue;
    seen.add(key);
    duties += 1;
    const valence = dutyPowerValence(relations, relation.active, relation.scope).valence;
    if (valence === "savior-slave") { saviorSlave += 1; traps.push(Object.freeze({ agent: relation.active, scope: relation.scope })); }
    else if (valence === "clastrean") clastrean += 1;
    else if (valence === "empowered") empowered += 1;
  }
  return Object.freeze({
    kind: "socializing.savior-slave-census",
    duties,
    saviorSlave,
    clastrean,
    empowered,
    traps: Object.freeze(traps),
  });
}
