/**
 * messaging/cloudevents — CloudEvents as communicating's standard across-envelope.
 *
 * A CloudEvent is one valued membrane utterance in a CNCF envelope: `source`
 * names the speaker token, `type` is the Searle illocutionary force, `time` is
 * the witness time `T`, and JSON `data` carries the claim. The bridge is a
 * functorial view of `UtteranceCarrier`, not a parallel event ontology.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";

import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { mark, utterance } from "@red-cup-engineering/signcell/utterance";

/** CloudEvents JSON Event Format media type for structured mode. */
export const CLOUDEVENTS_JSON_CONTENT_TYPE = "application/cloudevents+json";

/** CloudEvents core spec version carried in `specversion`. */
export const CLOUDEVENTS_SPECVERSION = "1.0";

/** The JSON content type used for direct structured `data` claims. */
export const CLOUDEVENTS_DATA_CONTENT_TYPE = "application/json";

const illocutionaryForceSchema = {
  enum: ["assertive", "directive", "commissive", "expressive", "declaration"],
};

const readingValueNameSchema = {
  enum: ["absurd", "potential", "active", "stable"],
};

export const cloudEventSchema = {
  $id: "communicating/messaging/cloudevents/event",
  title: "CloudEvent",
  description:
    "A CloudEvents structured JSON envelope for one communicating membrane utterance: source=token, type=illocutionary force, time=T, data=claim.",
  type: "object",
  required: ["specversion", "id", "source", "type", "time", "datacontenttype", "data"],
  additionalProperties: false,
  properties: {
    specversion: { const: CLOUDEVENTS_SPECVERSION },
    id: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    type: illocutionaryForceSchema,
    time: { type: "string", minLength: 1 },
    datacontenttype: { const: CLOUDEVENTS_DATA_CONTENT_TYPE },
    data: {},
    emsenntruthreading: readingValueNameSchema,
  },
};

export const cloudEventCarrier = schemaFrom(cloudEventSchema);

function cloudEventId(source, type, time, data) {
  return identifyJsonSemanticContent({
    objectKind: "lenticule.communicating.cloudevent",
    value: { source, type, time, data },
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).token;
}

/** Read a membrane utterance as a CloudEvents structured JSON envelope. */
export function cloudEventFromUtterance(
  carrier,
  type,
  time,
  options = {},
) {
  const source = String(carrier.token.mark.value);
  const data = requireJsonValue(carrier.claim.mark.value, "cloudEventFromUtterance data");
  const event = Object.freeze({
    specversion: CLOUDEVENTS_SPECVERSION,
    id: options.id ?? cloudEventId(source, type, time, data),
    source,
    type,
    time,
    datacontenttype: CLOUDEVENTS_DATA_CONTENT_TYPE,
    data,
    ...(options.truthReading === undefined ? {} : { emsenntruthreading: options.truthReading }),
  });
  return Object.freeze(cloudEventCarrier.assert(event, "cloudEventFromUtterance event"));
}

/** Read a CloudEvents structured JSON envelope back as its membrane utterance. */
export function utteranceFromCloudEvent(event) {
  const admitted = cloudEventCarrier.assert(event, "utteranceFromCloudEvent event");
  return utterance(mark(admitted.source), mark(admitted.data));
}

/** The CloudEvents `type` attribute is the same Searle force read by ActivityPub. */
export function cloudEventIllocutionaryForce(event) {
  return (cloudEventCarrier.assert(event, "cloudEventIllocutionaryForce event")).type;
}
