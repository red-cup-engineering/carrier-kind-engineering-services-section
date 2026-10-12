/**
 * codecs/text/json/cloudevents — the arrival profile over CloudEvents 1.0.
 *
 * The standard's attribute rules live once, in the fabricated
 * @red-cup-engineering/json-services-section/validate-cloudevent (computer-networking
 * custody). This module adds only what arrival admission needs on top: the
 * profile (time, JSON data, an optional FOUR charge extension), the arrival
 * token, and the arrival utterance. The utterance reading of an event by
 * illocutionary force belongs to @red-cup-engineering/agentic-communication-engine/messaging.
 *
 * @packageDocumentation
 */
import { validateCloudEvent } from "@red-cup-engineering/json-services-section/validate-cloudevent";
import { mark, utterance, type UtteranceCarrier as UtteranceObject } from "@red-cup-engineering/computer-data-engine/utterance";
import type { ChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import type { JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { cloudEventContract as arrivalProfileContract } from "./schema.mts";

export const CLOUDEVENTS_JSON_CONTENT_TYPE = "application/cloudevents+json" as const;
export const CLOUDEVENTS_SPECVERSION = "1.0" as const;
export const CLOUDEVENTS_DATA_CONTENT_TYPE = "application/json" as const;

export type CloudEventType = string;
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

/** The arrival contract: CloudEvents 1.0 conformance first, then the arrival profile. */
export const cloudEventContract = Object.freeze({
  assert(value: unknown, label: string): CloudEvent {
    const validation = validateCloudEvent({ event: value });
    if (!validation.ok) {
      throw new TypeError(`${label}: ${validation.violations.map((v) => `${v.attribute} ${v.rule}`).join("; ")}`);
    }
    return arrivalProfileContract.assert(value, label) as CloudEvent;
  },
});

/** The protocol-stable CloudEvents identity used as an arrival token. */
export function cloudEventIdentity(event: CloudEvent): string {
  const admitted = cloudEventContract.assert(event, "cloudEventIdentity event");
  return `${admitted.source}#${admitted.id}`;
}

/** Project an arrival utterance from a CloudEvent: token is source+id, claim is data. */
export function arrivalUtteranceFromCloudEvent(event: CloudEvent): UtteranceObject {
  const admitted = cloudEventContract.assert(event, "arrivalUtteranceFromCloudEvent event");
  return utterance(mark(cloudEventIdentity(admitted)), mark(admitted.data));
}
