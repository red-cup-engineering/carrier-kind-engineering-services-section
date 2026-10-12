
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { knowledgeLeq, witnessedReading } from "@red-cup-engineering/signchain/bilattice";

export const registerFiberAxes = Object.freeze([
  "register",
  "style",
  "evidentiality",
  "politeness",
  "genre",
]);

const stringArraySchema = { type: "array", items: { type: "string", minLength: 1 } };

export const registerFiberDataSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    register: stringArraySchema,
    style: stringArraySchema,
    evidentiality: stringArraySchema,
    politeness: stringArraySchema,
    genre: stringArraySchema,
  },
};

export const languageRegisterFiberSchema = {
  $id: "communicating/language/register-fiber",
  type: "object",
  required: ["kind", "language", "register", "style", "evidentiality", "politeness", "genre"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.language-register-fiber" },
    language: { type: "string", minLength: 1 },
    register: stringArraySchema,
    style: stringArraySchema,
    evidentiality: stringArraySchema,
    politeness: stringArraySchema,
    genre: stringArraySchema,
  },
};

export const languageRegisterFiberCarrier = schemaFrom(languageRegisterFiberSchema);

const emptyData = Object.freeze({
  register: Object.freeze([]),
  style: Object.freeze([]),
  evidentiality: Object.freeze([]),
  politeness: Object.freeze([]),
  genre: Object.freeze([]),
});

function axisValues(data, axis) {
  return Object.freeze([...(data?.[axis] ?? [])]);
}

export function languageRegisterFiber(language, data = emptyData) {
  const fiber = Object.freeze({
    kind: "communicating.language-register-fiber",
    language,
    register: axisValues(data, "register"),
    style: axisValues(data, "style"),
    evidentiality: axisValues(data, "evidentiality"),
    politeness: axisValues(data, "politeness"),
    genre: axisValues(data, "genre"),
  });
  languageRegisterFiberCarrier.assert(fiber, "language register fiber");
  return fiber;
}

const specificityOf = (carried) =>
  ((carried ? "potential" : "absurd"));

function axisReceipt(
  axis,
  source,
  target,
  selection,
) {
  const sourceValue = selection[axis] ?? null;
  const sourceCarries = sourceValue !== null && source[axis].includes(sourceValue);
  const targetValue = sourceCarries && target[axis].includes(sourceValue) ? sourceValue : null;
  const sourceSpecificity = specificityOf(sourceCarries);
  const targetSpecificity = specificityOf(targetValue !== null);
  return Object.freeze({
    axis,
    sourceValue,
    targetValue,
    sourceSpecificity,
    targetSpecificity,
    settlesDown: knowledgeLeq(
      witnessedReading(targetSpecificity, "register-fiber-order"),
      witnessedReading(sourceSpecificity, "register-fiber-order"),
    ),
    lost: sourceCarries && targetValue === null,
  });
}

export function registerFiberDegradationReceipt(
  source,
  target,
  selection = {},
) {
  const axes = Object.freeze(registerFiberAxes.map((axis) => axisReceipt(axis, source, target, selection)));
  const sourceSpecificity = specificityOf(axes.some((axis) => axis.sourceSpecificity !== "absurd"));
  const targetSpecificity = specificityOf(axes.some((axis) => axis.targetSpecificity !== "absurd"));
  return Object.freeze({
    kind: "communicating.register-fiber.degradation",
    sourceLanguage: source.language,
    targetLanguage: target.language,
    axes,
    sourceSpecificity,
    targetSpecificity,
    settlesDown: knowledgeLeq(
      witnessedReading(targetSpecificity, "register-fiber-order"),
      witnessedReading(sourceSpecificity, "register-fiber-order"),
    )
      && axes.every((axis) => axis.settlesDown),
    fabricatesAssertivity: false,
  });
}
