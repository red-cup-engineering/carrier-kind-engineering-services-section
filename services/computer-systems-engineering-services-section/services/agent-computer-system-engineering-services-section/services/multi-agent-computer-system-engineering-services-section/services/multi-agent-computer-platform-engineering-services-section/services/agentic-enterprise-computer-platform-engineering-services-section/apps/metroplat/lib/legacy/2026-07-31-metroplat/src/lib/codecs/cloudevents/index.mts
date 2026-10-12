/**
 * codecs/text/json/cloudevents — CloudEvents read as MetroPlat utterance faces.
 *
 * CloudEvents is not a second communication ontology here. It is a structured
 * JSON face of the base utterance object: `source` reads the token, `data`
 * reads the claim, `type` carries the illocutionary force, and
 * `emsenntruthcharge` carries a FOUR-valued charge without making the
 * transport envelope authoritative semantic material.
 *
 * @packageDocumentation
 */
import { canonicalBytes } from "../../identity/index.mts";
import { createHash } from "node:crypto";

import { mark, utterance, type UtteranceObject } from "../../records/utterance/utterance.mts";
import { claimPolarity } from "../english/index.mts";
import type { ChargeValueName } from "../../values/index.mts";
import { requireJsonValue, type JsonValue } from "../json/core.mts";
import { cloudEventContract, cloudEventUtteranceBridgeContract } from "./schema.mts";

export {
  cloudEventContract,
  cloudEventUtteranceBridgeContract,
} from "./schema.mts";

export const CLOUDEVENTS_JSON_CONTENT_TYPE = "application/cloudevents+json" as const;
export const CLOUDEVENTS_SPECVERSION = "1.0" as const;
export const CLOUDEVENTS_DATA_CONTENT_TYPE = "application/json" as const;

export type CloudEventType = string;
export type CloudEventIllocutionaryForce = "assertive" | "directive" | "commissive" | "expressive" | "declaration";
export type CloudEventTruthCharge = ChargeValueName;

export interface CloudEvent {
  readonly specversion: typeof CLOUDEVENTS_SPECVERSION;
  readonly id: string;
  readonly source: string;
  readonly type: CloudEventType;
  readonly time: string;
  readonly datacontenttype: typeof CLOUDEVENTS_DATA_CONTENT_TYPE;
  readonly data: JsonValue;
  readonly emsenntruthcharge?: CloudEventTruthCharge;
  readonly [extension: string]: JsonValue | undefined;
}

export interface CloudEventFromUtteranceOptions {
  readonly id?: string;
  readonly truthCharge?: CloudEventTruthCharge;
}

export interface CloudEventUtteranceBridge {
  readonly kind: "cloudevents.utterance-bridge:witness" | "cloudevents.utterance-bridge-obstruction";
  readonly event: CloudEvent;
  readonly utterance: UtteranceObject;
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

function nonempty(value: string | undefined, label: string): string {
  if (value === undefined || value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

function cloudEventId(source: string, type: CloudEventType, time: string, data: JsonValue): string {
  const digest = createHash("sha256")
    .update(canonicalBytes({ source, type, time, data }))
    .digest("hex");
  return `urn:sha256:${digest}`;
}

function isDeniedClaim(claim: string): boolean {
  return claimPolarity(claim).polarity === "denied";
}

/** Read one utterance as a CloudEvents structured JSON envelope. */
export function cloudEventFromUtterance(
  utteranceValue: UtteranceObject,
  type: CloudEventType,
  time: string,
  options: CloudEventFromUtteranceOptions = {},
): CloudEvent {
  const source = nonempty(String(utteranceValue.token.mark.value), "CloudEvents source");
  const admittedTime = nonempty(time, "CloudEvents time");
  const data = requireJsonValue(utteranceValue.claim.mark.value, "CloudEvents data");
  return cloudEventContract.assert(Object.freeze({
    specversion: CLOUDEVENTS_SPECVERSION,
    id: options.id ?? cloudEventId(source, type, admittedTime, data),
    source,
    type,
    time: admittedTime,
    datacontenttype: CLOUDEVENTS_DATA_CONTENT_TYPE,
    data,
    ...(options.truthCharge === undefined ? {} : { emsenntruthcharge: options.truthCharge }),
  }), "cloudevents event") as CloudEvent;
}

/** The protocol-stable CloudEvents identity used as an arrival token. */
export function cloudEventIdentity(event: CloudEvent): string {
  const admitted = cloudEventContract.assert(event, "cloudEventIdentity event") as CloudEvent;
  return `${admitted.source}#${admitted.id}`;
}

/** Project an arrival utterance from a CloudEvent: token is source+id, claim is data. */
export function arrivalUtteranceFromCloudEvent(event: CloudEvent): UtteranceObject {
  const admitted = cloudEventContract.assert(event, "arrivalUtteranceFromCloudEvent event") as CloudEvent;
  return utterance(mark(cloudEventIdentity(admitted)), mark(admitted.data));
}

/** Read a CloudEvent back as the base utterance object. */
export function utteranceFromCloudEvent(event: CloudEvent): UtteranceObject {
  const admitted = cloudEventContract.assert(event, "utteranceFromCloudEvent event") as CloudEvent;
  return utterance(mark(admitted.source), mark(admitted.data));
}

/** Read the CloudEvents extension charge, falling back to claim polarity when absent. */
export function truthChargeOfCloudEvent(event: CloudEvent): CloudEventTruthCharge {
  const admitted = cloudEventContract.assert(event, "truthChargeOfCloudEvent event") as CloudEvent;
  if (admitted.emsenntruthcharge !== undefined) return admitted.emsenntruthcharge;
  return isDeniedClaim(String(admitted.data)) ? "held" : "unknown";
}

/** Read the constrained illocutionary-force profile carried by `type`. */
export function illocutionOfCloudEvent(event: CloudEvent): CloudEventIllocutionaryForce {
  const force = (cloudEventContract.assert(event, "illocutionOfCloudEvent event") as CloudEvent).type;
  if (!["assertive", "directive", "commissive", "expressive", "declaration"].includes(force)) {
    throw new TypeError(`CloudEvents type is not an admitted illocutionary force: ${JSON.stringify(force)}`);
  }
  return force as CloudEventIllocutionaryForce;
}

/** Verify that CloudEvents admission and utterance projection preserve source and data. */
export function verifyCloudEventUtteranceBridge(event: CloudEvent): CloudEventUtteranceBridge {
  const admitted = cloudEventContract.assert(event, "verifyCloudEventUtteranceBridge event") as CloudEvent;
  const utteranceValue = utteranceFromCloudEvent(admitted);
  const reasons: string[] = [];
  if (String(utteranceValue.token.mark.value) !== admitted.source) reasons.push("utterance token must be the CloudEvents source");
  if (canonicalBytes(requireJsonValue(utteranceValue.claim.mark.value, "CloudEvents utterance claim")) !== canonicalBytes(admitted.data)) {
    reasons.push("utterance claim must preserve CloudEvents data");
  }
  const roundTrip = cloudEventFromUtterance(utteranceValue, admitted.type, admitted.time, {
    id: admitted.id,
    ...(admitted.emsenntruthcharge === undefined ? {} : { truthCharge: admitted.emsenntruthcharge }),
  });
  if (roundTrip.source !== admitted.source) reasons.push("round-tripped CloudEvents source must remain stable");
  if (canonicalBytes(roundTrip.data) !== canonicalBytes(admitted.data)) reasons.push("round-tripped CloudEvents data must remain stable");
  const ok = reasons.length === 0;
  return cloudEventUtteranceBridgeContract.assert(Object.freeze({
    kind: ok ? "cloudevents.utterance-bridge:witness" as const : "cloudevents.utterance-bridge-obstruction" as const,
    event: admitted,
    utterance: utteranceValue,
    ok,
    reasons: Object.freeze(reasons),
  }), "cloudevents utterance bridge") as CloudEventUtteranceBridge;
}
