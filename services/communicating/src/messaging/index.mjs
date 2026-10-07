/**
 * messaging - message passing as a communicating capability, downstream of
 * @red-cup-engineering/relating and grounded in the research corpus.
 *
 * A message is richer than an utterance: it is a linear resource produced by a
 * speaker, carried by a channel, and consumed once by a listener. The carriers
 * below are declared once as JSON-Schema literals in `carriers.mts`; this module
 * keeps the constructors and morphisms over those admitted carrier types.
 */
import { evidence, knowledgeReading } from "@red-cup-engineering/signcell/cell";

import { semiosphere } from "../speaking/signifying/index.mjs";
import { admitCommunication } from "../speaking/listening/parsing/carrier.mjs";
import { articulateCommunication } from "../speaking/listening/parsing/articulating.mjs";

import { read } from "../holography/index.mjs";

export {
  MessageStatusSchema,
  channelCarrier,
  listenerCarrier,
  messageCarrier,
  speakerCarrier,
  uptakeCarrier,
} from "./carriers.mjs";

export {
  CLOUDEVENTS_DATA_CONTENT_TYPE,
  CLOUDEVENTS_JSON_CONTENT_TYPE,
  CLOUDEVENTS_SPECVERSION,
  cloudEventCarrier,
  cloudEventFromUtterance,
  cloudEventIllocutionaryForce,
  cloudEventSchema,
  utteranceFromCloudEvent,
} from "./cloudevents.mjs";

export {
  DIDCOMM_CONTEXT,
  DIDCOMM_ENCRYPTED_TYP,
  DIDCOMM_JWM_ALG,
  DIDCOMM_JWM_ENC,
  DIDCOMM_PRIVATE_VISIBILITY,
  DID_CONTEXT,
  didcommMessageFromUtterance,
  didcommPlaintextMessageCarrier,
  didcommPlaintextMessageSchema,
  didcommSealedMessageCarrier,
  didcommSealedMessageSchema,
  didcommVisibility,
  openDIDCommMessage,
  openDIDCommUtterance,
  sealDIDCommMessage,
  sealDIDCommUtterance,
  utteranceFromDIDCommMessage,
} from "./didcomm.mjs";

export { ACTIVITYPUB_C2S_CONTENT_TYPE, DIDCOMM_PLAINTEXT_CONTENT_TYPE, acrossFaceProtocolMediaTypes, acrossFaceProtocolProjectors, activityPubC2sActivityCarrier, activityPubC2sActivitySchema, activityPubC2sProjector, cloudEventsProjector, didcommProjector, negateProtocolUtterance, protocolProjector, protocolTranslate, protocolWireProjector, readProtocolUtterances, socializingAcrossFaceLift, writeProtocolUtterances } from "./protocol-translate.mjs";

/** Construct a speaker bound to a semiosphere. */
export const speaker = (name, within = semiosphere(name)) =>
  Object.freeze({ kind: "communicating.messaging.speaker", name, semiosphere: within });

/** Construct a listener bound to a semiosphere. */
export const listener = (name, within = semiosphere(name)) =>
  Object.freeze({ kind: "communicating.messaging.listener", name, semiosphere: within });

/** Open a channel: a directed relation between two semiospheres. */
export function openChannel(
  medium,
  from,
  to,
  capacity = null,
) {
  return Object.freeze({ kind: "communicating.messaging.channel", medium, from, to, capacity });
}

/** A channel for a speaker-to-listener pair, named for its medium. */
export const channelBetween = (
  medium,
  from,
  to,
  capacity = null,
) => openChannel(medium, from.semiosphere, to.semiosphere, capacity);

/** Whether a channel admits a text without exceeding its capacity. */
export const withinCapacity = (channel, text) =>
  channel.capacity === null || text.length <= channel.capacity;

/** Send a message: the speaker extends a content into a linear resource in transit. */
export function sendMessage(
  speakerOf,
  listenerOf,
  channel,
  text,
  bundle,
) {
  if (!withinCapacity(channel, text)) {
    throw new RangeError(`channel ${JSON.stringify(channel.medium)} capacity ${channel.capacity} cannot carry ${text.length} marks`);
  }
  return Object.freeze({
    kind: "communicating.messaging.message",
    text,
    content: articulateCommunication(admitCommunication(text.trim()), bundle),
    speaker: speakerOf,
    listener: listenerOf,
    channel,
    status: "sent",
    evidence: evidence({ for: [speakerOf.name] }),
  });
}

/** Receive a message: the listener restricts and consumes the in-transit resource. */
export function receiveMessage(message, bundle) {
  if (message.status === "received") {
    throw new TypeError("receiveMessage: this message is a spent resource (already received once)");
  }
  // Taking a message up spends it: the listener tells it against (a linear resource consumed).
  const taken = evidence({ against: [message.listener?.name ?? "listener"] });
  return Object.freeze({
    kind: "communicating.messaging.uptake",
    consumed: Object.freeze({ ...message, status: "received", evidence: taken }),
    reading: read(message.text.trim(), bundle),
    evidence: taken,
  });
}

/** The knowledge reading of a message's evidence. */
export const messageReading = (message) => knowledgeReading(message.evidence);
