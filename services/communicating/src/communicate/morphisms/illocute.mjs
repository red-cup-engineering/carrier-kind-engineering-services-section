import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { memeCarrier } from "@red-cup-engineering/relating";

import { illocuteInputCarrier } from "../carriers.mjs";
import { illocuteTerm } from "../expressing.mjs";

export const illocuteAction = operation({
  verb: "illocute",
  inputFormat: "json",
  outputFormat: "json",
  options: ["force", "goal", "perlocution"],
  summary: "Stamp illocutionary force on a meme using a finite CHL branch table.",
  description: "Domain: communicating/communicate/illocute-input. Codomain: meme. The force field selects the evidence move inside CHL IR; no TypeScript helper participates in evaluation.",
  domain: illocuteInputCarrier,
  codomain: memeCarrier,
  runTerm: illocuteTerm,
});

// ---- illocutionary force and communication-action admission ----
const accepted = (value) => Object.freeze({ ok: true, value });
const refused = (code, message) => Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;
const _nonnegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

export function performIllocution(force, message) {
  return Object.freeze({ kind: "sign.illocution", force, message });
}
/** Closed migration, never an untyped legacy alias. */
export const legacyIllocutionaryForceMap = Object.freeze({
  assertive: "assertion", directive: "directive", commissive: "commitment", declarative: "declaration", expressive: "expression",
});
export function migrateIllocutionaryForce(force) { return legacyIllocutionaryForceMap[force]; }
/** The generic replacement for an application-local action-plus-two-marks protocol. */
export function admitCommunicationAction(input) {
  if (!nonempty(input.action) || !nonempty(input.actor) || !nonempty(input.claim)) return refused("invalid-action", "action, actor, and claim must be nonempty strings");
  return accepted(Object.freeze({ kind: "sign.communication-action", ...input }));
}
