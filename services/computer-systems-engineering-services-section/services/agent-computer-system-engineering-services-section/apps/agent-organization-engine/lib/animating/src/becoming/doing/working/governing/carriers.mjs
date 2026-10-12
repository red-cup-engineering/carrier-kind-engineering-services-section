/**
 * carriers — the governing-stage carrier (stage 4, the terminus) and the interior
 * `agent` carrier (the hidden bulk glued from the three boundary faces).
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { faceValueSchema } from "../../../../carriers.mjs";
import { spineProperties } from "../../../spine.mjs";
import { orbitRegimeSchema } from "@red-cup-engineering/knowing/cognizing/section";

const nonnegativeIntegerSchema = { type: "integer", minimum: 0 };
const readingValueNameSchema = { enum: ["absurd", "potential", "active", "stable"] };
const closureKindSchema = { enum: ["inquiry", "procedure", "derivation", "process"] };
const errorClassSchema = { enum: ["MissingInput", "ValidationFailure", "UnexpectedState", "SkillNotFound", "Unresolvable"] };

export const governingSchema = {
  $id: "animating/becoming/doing/working/governing",
  title: "Governing",
  description:
    "Stage 4 of the agency descent, generated WITHIN working — the terminus: the AGENCY reading of relating's `settle` at the settling stage (strict regime). $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "regime", "stage", "face", "epistemic", "settled", "glued", "cohomologyRank", "cells"],
  properties: {
    kind: { const: "animating.becoming.doing.working.governing" },
    ...spineProperties("settling"),
    face: { const: "individual" },
    epistemic: { const: "knowledge" },
    settled: { const: true },
    glued: { type: "boolean" },
    cohomologyRank: nonnegativeIntegerSchema,
    cells: nonnegativeIntegerSchema,
  },
};

export const governingCarrier = schemaFrom(governingSchema);

const governingValueSchema = {
  type: "object",
  additionalProperties: false,
  required: governingSchema.required,
  properties: governingSchema.properties,
};

const perceptionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "recv", "observe", "held", "contested"],
  properties: {
    kind: { const: "animating.agent.perception" },
    recv: readingValueNameSchema,
    observe: readingValueNameSchema,
    held: nonnegativeIntegerSchema,
    contested: nonnegativeIntegerSchema,
  },
};

const actionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "send", "actuate", "affordances"],
  properties: {
    kind: { const: "animating.agent.action" },
    send: readingValueNameSchema,
    actuate: readingValueNameSchema,
    affordances: nonnegativeIntegerSchema,
  },
};

const stanceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "lean"],
  properties: {
    kind: { const: "animating.agent.stance" },
    lean: readingValueNameSchema,
  },
};

const cognitionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "regime", "reflects"],
  properties: {
    kind: { const: "animating.agent.cognition" },
    regime: orbitRegimeSchema,
    reflects: { type: "boolean" },
  },
};

const coherenceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "balanced", "dissonance", "ties"],
  properties: {
    kind: { const: "animating.agent.coherence" },
    balanced: { type: "boolean" },
    dissonance: nonnegativeIntegerSchema,
    ties: nonnegativeIntegerSchema,
  },
};

const goalSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "predicate", "reading", "satisfied", "held"],
  properties: {
    kind: { const: "animating.agent.goal" },
    predicate: { type: "string" },
    reading: readingValueNameSchema,
    satisfied: { type: "boolean" },
    held: readingValueNameSchema,
  },
};

const handednessSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "recv", "send", "actuate", "observe"],
  properties: {
    kind: { const: "animating.agent.handedness" },
    recv: readingValueNameSchema,
    send: readingValueNameSchema,
    actuate: readingValueNameSchema,
    observe: readingValueNameSchema,
  },
};

const characterSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "signature", "behavioralSpace", "constrains", "coherent", "inCharacter"],
  properties: {
    kind: { const: "animating.agent.character" },
    signature: readingValueNameSchema,
    behavioralSpace: nonnegativeIntegerSchema,
    constrains: { type: "boolean" },
    coherent: { type: "boolean" },
    inCharacter: { type: "boolean" },
  },
};

const workSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "operation", "inputsAndPath", "closureKind"],
  properties: {
    kind: { const: "animating.agent.work" },
    operation: { enum: ["open", "settled"] },
    inputsAndPath: { enum: ["open", "settled"] },
    closureKind: closureKindSchema,
  },
};

export const agentSchema = {
  $id: "animating/becoming/doing/working/governing/agent",
  title: "Agent",
  description:
    "The interior agent — the HIDDEN INTERIOR BULK of animating's holographic boundary, the global section glued from three boundary faces. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: [
    "kind", "identity", "loop", "faces", "glued", "perception", "action", "stance",
    "cognition", "coherence", "goal", "governing", "handedness", "settledBelow",
    "openAbove", "milieu", "character", "work",
  ],
  properties: {
    kind: { const: "animating.agent" },
    identity: { type: "string" },
    loop: { const: "perceive->act" },
    faces: { type: "array", items: faceValueSchema },
    glued: { type: "boolean" },
    perception: perceptionSchema,
    action: actionSchema,
    stance: stanceSchema,
    cognition: cognitionSchema,
    coherence: coherenceSchema,
    goal: goalSchema,
    governing: governingValueSchema,
    handedness: handednessSchema,
    settledBelow: { const: true },
    openAbove: { const: true },
    milieu: nonnegativeIntegerSchema,
    character: characterSchema,
    work: workSchema,
  },
};

export const agentCarrier = schemaFrom(agentSchema);

export const skillSchema = {
  $id: "animating/becoming/doing/working/governing/skill",
  title: "Skill",
  description:
    "A typed invocable unit of skillful work — the documented, repeatable method for one type of work. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "name", "closureKind", "operation", "inputsAndPath", "codomain"],
  properties: {
    kind: { const: "animating.skill" },
    name: { type: "string" },
    closureKind: closureKindSchema,
    operation: { enum: ["open", "settled"] },
    inputsAndPath: { enum: ["open", "settled"] },
    codomain: { type: "string" },
  },
};

export const skillCarrier = schemaFrom(skillSchema);

export const skillResultSchema = {
  $id: "animating/becoming/doing/working/governing/skill-result",
  title: "SkillResult",
  description:
    "The complete output of any skill invocation: a Success or a structured SkillError. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "ok", "reading"],
  properties: {
    kind: { const: "animating.skill-result" },
    ok: { type: "boolean" },
    reading: readingValueNameSchema,
    output: true,
    error: {
      type: "object",
      additionalProperties: false,
      required: ["errorClass", "message", "context"],
      properties: {
        errorClass: errorClassSchema,
        message: { type: "string" },
        context: { type: "string" },
        recoveryHint: { type: "string" },
      },
    },
  },
};

export const skillResultCarrier = schemaFrom(skillResultSchema);
