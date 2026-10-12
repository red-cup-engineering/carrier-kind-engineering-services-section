/**
 * bourdieu — Pierre Bourdieu's FIELD, CAPITAL, and SYMBOLIC VIOLENCE (frontier register §3): the
 * sociology-giant lens, almost never formalized, that names the affective cluster's core.
 *
 * SYMBOLIC VIOLENCE is domination MISRECOGNIZED as legitimate by the dominated — power that works
 * because the subordinated party endorses the very arrangement that subordinates them. In the package's
 * terms it is a savior–slave (duty-without-power, the power held elsewhere) whose subordinated agent does
 * NOT contest the binding — its own stalk carries no refusal, no ⊤, only acceptance. Misrecognition is
 * thus measurable: domination (the structural fact, from `dutyPowerValence`) plus the absence of any
 * contesting stance authored by the dominated agent. This is what makes symbolic violence the
 * sociological name for californication's affective foreclosure — the exit stays open, but the
 * dominated do not want it because they take the order to be legitimate.
 *
 * CAPITAL is the resource whose distribution structures a field; symbolic capital (recognition,
 * prestige) is the form whose concentration converts misrecognition into durable advantage.
 *
 * Reuses `dutyPowerValence` (`clastre.mts`) and the concentration idiom; re-derives nothing.
 */

import { dutyPowerValence } from "./clastre.mjs";

/** The symbolic-violence reading for an agent over a scope. */

  

    

  

/**
 * symbolicViolence — detect Bourdieusian symbolic violence: an agent dominated over a scope (savior–slave
 * by `dutyPowerValence`) who authors no contesting stance over it (no relation of theirs holds an `active`
 * denial or a `stable` ⊤ on the scope). Domination plus the dominated's own endorsement is misrecognition
 * — the sociological core of californication's affective foreclosure.
 */
export function symbolicViolence(relations, agent, scope) {
  const dominated = dutyPowerValence(relations, agent, scope).valence === "savior-slave";
  const contests = relations.some((relation) =>
    relation.active === agent
    && relation.scope === scope
    && (relation.standing === "active" || relation.standing === "stable"));
  const endorsed = !contests;
  return Object.freeze({
    kind: "socializing.symbolic-violence",
    agent,
    scope,
    dominated,
    endorsed,
    symbolicViolence: dominated && endorsed,
  });
}

/** An agent's holdings across the four forms of Bourdieusian capital. */

/** An agent and its capital. */

/** The concentration of one form of capital across the field. */

    

/**
 * capitalConcentration — the share of one form of capital held by its largest holder, the structuring
 * inequality of the field on that axis. Symbolic capital concentrated is how misrecognition (symbolic
 * violence) converts into durable position.
 */
export function capitalConcentration(holders, dimension) {
  let total = 0;
  let topHolder = "";
  let topValue = 0;
  for (const holder of holders) {
    const value = Math.max(0, holder.capital[dimension]);
    total += value;
    if (value > topValue) { topValue = value; topHolder = holder.agent; }
  }
  return Object.freeze({
    kind: "socializing.capital-concentration",
    dimension,
    total,
    topHolder,
    topShare: total > 0 ? topValue / total : 0,
  });
}
