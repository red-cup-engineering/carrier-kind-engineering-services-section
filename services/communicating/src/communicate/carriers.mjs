import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { memeCarrier } from "@red-cup-engineering/relating";

const memeSlot = {
  $ref: memeCarrier.id,
  description: "A relating meme carrier.",
};
const jsonSlot = {};

const withMeme = {
  meme: memeSlot,
};

export const speakInputSchema = {
  $id: "communicating/communicate/speak-input",
  type: "object",
  required: ["meme", "speaker"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    speaker: { type: "string" },
    listener: { type: "string" },
    medium: { type: "string" },
    capacity: { type: "number" },
  },
};
export const speakInputCarrier = schemaFrom(speakInputSchema);

export const listenInputSchema = {
  $id: "communicating/communicate/listen-input",
  type: "object",
  required: ["meme", "listener"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    listener: { type: "string" },
  },
};
export const listenInputCarrier = schemaFrom(listenInputSchema);

export const groundInputSchema = {
  $id: "communicating/communicate/ground-input",
  type: "object",
  required: ["meme", "partner", "mode"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    partner: { type: "string" },
    mode: { enum: ["assertion", "accommodation", "challenge"] },
  },
};
export const groundInputCarrier = schemaFrom(groundInputSchema);

export const composeInputSchema = {
  $id: "communicating/communicate/compose-input",
  type: "object",
  required: ["meme", "with"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    with: memeSlot,
  },
};
export const composeInputCarrier = schemaFrom(composeInputSchema);

export const illocuteInputSchema = {
  $id: "communicating/communicate/illocute-input",
  type: "object",
  required: ["meme", "force"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    force: { enum: ["assertive", "directive", "commissive", "expressive", "declaration"] },
    goal: { type: "string" },
    perlocution: { type: "string" },
  },
};
export const illocuteInputCarrier = schemaFrom(illocuteInputSchema);

export const modalizeInputSchema = {
  $id: "communicating/communicate/modalize-input",
  type: "object",
  required: ["meme", "mode", "witness"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    mode: { type: "string" },
    witness: { type: "string" },
  },
};
export const modalizeInputCarrier = schemaFrom(modalizeInputSchema);

export const presupposeInputSchema = {
  $id: "communicating/communicate/presuppose-input",
  type: "object",
  required: ["meme", "trigger"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    trigger: { type: "string" },
  },
};
export const presupposeInputCarrier = schemaFrom(presupposeInputSchema);

export const quoteInputSchema = {
  $id: "communicating/communicate/quote-input",
  type: "object",
  required: ["meme", "position"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    position: { enum: ["subject", "object"] },
  },
};
export const quoteInputCarrier = schemaFrom(quoteInputSchema);

export const referInputSchema = {
  $id: "communicating/communicate/refer-input",
  type: "object",
  required: ["meme", "position", "entity"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    position: { enum: ["subject", "object"] },
    entity: jsonSlot,
  },
};
export const referInputCarrier = schemaFrom(referInputSchema);

export const translateInputSchema = {
  $id: "communicating/communicate/translate-input",
  type: "object",
  required: ["meme", "target"],
  additionalProperties: false,
  properties: {
    ...withMeme,
    target: { type: "string", minLength: 1 },
  },
};
export const translateInputCarrier = schemaFrom(translateInputSchema);

