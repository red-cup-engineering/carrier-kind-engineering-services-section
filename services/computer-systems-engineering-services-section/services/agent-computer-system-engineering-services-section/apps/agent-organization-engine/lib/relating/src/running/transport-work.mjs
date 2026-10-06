// running/transport-work — each transport's work determination.
//
// A transport is a unit of work; its kind fixes whether its operation (the output
// type) and its inputs and path are settled. A request/response serve names its
// codomain but dispatches (operation settled? no, it opens; path settled); an SSE
// feed is settled in both; a settled claim session derives a judgement without
// branching; an open or conflicted session leaves both open. These are
// determination coordinates, not evidence values: animating's classifyWork names
// the four kinds (inquiry, derivation, procedure, process).

import { conflicts } from "./session.mjs";

/** Each transport kind's work determination. */
export const TRANSPORT_WORK = Object.freeze({
  "request-response": Object.freeze({ operation: "open", inputsAndPath: "settled" }),
  "event-stream": Object.freeze({ operation: "settled", inputsAndPath: "settled" }),
  "claim-session": Object.freeze({ operation: "settled", inputsAndPath: "open" }),
  "open-session": Object.freeze({ operation: "open", inputsAndPath: "open" }),
});

/** The live determination of a claim session: a derivation (operation settled,
 *  inputs and path open) while no cell conflicts; a conflict is a branch in the
 *  determination, so the session drops to an inquiry (both open). */
export function sessionWork(session) {
  return Object.freeze({ operation: conflicts(session).length === 0 ? "settled" : "open", inputsAndPath: "open" });
}
