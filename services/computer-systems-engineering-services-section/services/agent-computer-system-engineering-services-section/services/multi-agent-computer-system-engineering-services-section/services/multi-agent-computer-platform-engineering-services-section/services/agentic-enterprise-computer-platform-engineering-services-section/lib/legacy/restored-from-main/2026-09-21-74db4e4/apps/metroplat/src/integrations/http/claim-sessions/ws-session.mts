
// running/ws-session — the transfinite transport over a WebSocket frame loop.
//
// A WebSocket carries the bounded interactive claim session: each text frame is a
// claim `{cell, charge}` advancing the monotone log, and the reply frame is the
// settled judgement (per-cell verdict, contested cells, regime). The pure core
// (`exchangeClaim`, text → text) is split from the ws-frame encoder and the
// node-socket binding, exactly as `routeRequest` is split from `serve`. Nothing is
// overwritten: a contradicting claim flips a cell's verdict to ⊤ (`contested`) with no
// retraction.

import {
  isChargeValueName,
  type ChargeValueName,
} from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import { parse as parseJson, type JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { utteredClaimIdentity } from "@lenticule-science/metrologic/settling/records/utterance/claim-identity";
import { judgementFrame } from "./ws-frame.mts";
import {
  claim,
  claimSessionObservation,
  sessionJudgement,
  type Claim,
  type ClaimSessionObservation,
  type Session,
} from "../../../claims/session.mts";

/** One claim carried on a frame: a charged predication about a cell. */
export type ClaimMessage = Claim;

export interface WebSocketClaimSessionObservationInput {
  readonly sessionId: string;
  readonly message: ClaimMessage;
  readonly session: Session;
  readonly reply: string;
  readonly at: string;
}

/** Parse and validate a claim message from frame text; throws on a malformed claim.
 *
 *  Two frame shapes are admitted. `{token, claim, charge}` is the properly
 *  admitted form — the sender's own identity and its assertion, the minimal
 *  principled pair `Utterance` needs — and this function derives the real
 *  predication cell and its canonical address (`core/persistence`'s
 *  `utteredClaimIdentity`) rather than trusting a caller-invented `cell`
 *  string. `{cell, charge}` is still admitted unchanged for senders that
 *  already have a real address (e.g. one derived from a `JuralRelation`). */
export function parseClaimMessage(text: string): ClaimMessage {
  const value: unknown = parseJson(text);
  const record = value as { cell?: unknown; token?: unknown; claim?: unknown; charge?: unknown };
  const charge = record?.charge;
  if (typeof charge !== "string" || !isChargeValueName(charge)) {
    throw new TypeError("ws-session: not a {cell:string, charge:ChargeValueName} or {token, claim, charge:ChargeValueName} claim");
  }
  if (record.token !== undefined && record.claim !== undefined) {
    const identity = utteredClaimIdentity(record.token as JsonValue, record.claim as JsonValue);
    return { cell: identity.address, charge };
  }
  if (typeof record.cell !== "string") {
    throw new TypeError("ws-session: not a {cell:string, charge:ChargeValueName} or {token, claim, charge:ChargeValueName} claim");
  }
  return { cell: record.cell, charge };
}

/** The settled judgement reply for a session: per-cell verdict, contested cells, and
 *  the regime (`scott` until a cell conflicts, then `transfinite`). */
export function judgementReply(session: Session): string {
  return JSON.stringify(sessionJudgement(session));
}

/** Apply one claim message (frame text) to the session, returning the advanced
 *  session and the judgement reply text — the pure core of the WS loop. */
export function exchangeClaim(
  session: Session,
  messageText: string,
): { readonly session: Session; readonly reply: string } {
  const message = parseClaimMessage(messageText);
  const next = claim(session, message.cell, message.charge);
  return { session: next, reply: judgementReply(next) };
}

export { judgementFrame } from "./ws-frame.mts";

/** Construct the carried claim-session event represented by one accepted WebSocket text frame. */
export function websocketClaimSessionObservation(input: WebSocketClaimSessionObservationInput): ClaimSessionObservation {
  return claimSessionObservation({
    sessionId: input.sessionId,
    transport: "websocket-session",
    claim: input.message,
    session: input.session,
    judgement: parseJson(input.reply) as JsonValue,
    at: input.at,
    boundary: Object.freeze({ transport: "websocket-session", frame: "text", operation: "claim" }),
    caller: Object.freeze({ transport: "websocket-session", session: input.sessionId }),
  });
}
