// One table mapping a ready duty's scope prefix (and, for the derivation
// hand, its classified lane) to the executor hand that may act on it. The
// table is the single place this decision is made; nothing else in the
// executor branches on scope prefixes or lanes.

export const MISSING_CAPABILITY_SCOPE_PREFIX = "task:friction-missing-capability-";
export const CARRIER_FALSEHOOD_SCOPE_PREFIX = "task:friction-carrier-falsehood-";
export const COMMAND_FRICTION_SCOPE_PREFIX = "task:friction-command-";
export const TOOL_FRICTION_SCOPE_PREFIX = "task:friction-tool-";

/**
 * @typedef {"inquiry"|"missing-capability"|"derivation"|"carrier-falsehood"} DutyHand
 */

/**
 * Ordered scope-prefix (and, for derivation, lane) rules; the first match wins.
 * @type {ReadonlyArray<{hand: DutyHand, matches: (duty: {scope: string}, demand: {lane: string}) => boolean}>}
 */
export const HAND_ELIGIBILITY_TABLE = Object.freeze([
  Object.freeze({
    hand: "missing-capability",
    matches: (duty, demand) => duty.scope.startsWith(MISSING_CAPABILITY_SCOPE_PREFIX) && demand.lane !== "script",
  }),
  Object.freeze({
    hand: "carrier-falsehood",
    matches: (duty) => duty.scope.startsWith(CARRIER_FALSEHOOD_SCOPE_PREFIX),
  }),
  Object.freeze({
    hand: "derivation",
    matches: (duty, demand) => demand.lane === "run-and-read" || duty.scope.startsWith(COMMAND_FRICTION_SCOPE_PREFIX) || duty.scope.startsWith(TOOL_FRICTION_SCOPE_PREFIX),
  }),
  Object.freeze({
    hand: "inquiry",
    matches: (_duty, demand) => demand.workType === "inquiry" && demand.lane === "frontier",
  }),
]);

/**
 * The one hand eligible to act on a ready duty, by scope prefix and classified lane.
 * @param {{scope: string}} duty
 * @param {{lane: string}} demand
 * @returns {DutyHand|null} the eligible hand, or null when no hand claims this duty.
 */
export function handOfDuty(duty, demand) {
  const row = HAND_ELIGIBILITY_TABLE.find((entry) => entry.matches(duty, demand));
  return row ? row.hand : null;
}
