import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { chuSpace, dual, sameChuSpace } from "@red-cup-engineering/metrologic/chu";
const isReadingInKnowledge = (name) => isReading(name, "knowledge");

import { coordinationCostReceipt, laplacianDualReceipt, treeCoordinationReceipt, landauerEntropyReceipt, receipt, landauerBits, landauerZeroIffReversible, landauerEqualsCoordinationCost } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/coordination-cohomology";
import { coverNerveJudgment, coverNerve, h0Rank, h1Rank, coordinationFree, forestEquality } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/coordination-cohomology";
import { coverNerveOfCohomology } from "@red-cup-engineering/signgraph/cohomology";
const coordinationCohomology = Object.freeze({ coverNerveJudgment, coverNerve, coverNerveOfCohomology, coordinationCostReceipt, laplacianDualReceipt, treeCoordinationReceipt, landauerEntropyReceipt, receipt, h0Rank, h1Rank, coordinationFree, forestEquality, landauerBits, landauerZeroIffReversible, landauerEqualsCoordinationCost });
import { finiteLambekAlgebraSystem, laws, trivialLambekAlgebra, booleanCommutativeLambekAlgebra } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/lambek-calculus";
const lambek = Object.freeze({ finiteLambekAlgebraSystem, laws, trivialLambekAlgebra, booleanCommutativeLambekAlgebra });
import { completePaletteGraph, graphHom, identityGraphHom, composeFactorMaps, mapPathByGraphHom, path, soficImage, fibSubstitute, goldenForbidsBB, fibSubstituteGolden, decoratedFibSubstitute, fibDeepSofic, finiteLocalRuleReceipt, goldenMeanGraph, decoratedGoldenGraph, forgetDecoration } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/sofic";
const sofic = Object.freeze({ completePaletteGraph, graphHom, identityGraphHom, composeFactorMaps, mapPathByGraphHom, path, soficImage, fibSubstitute, goldenForbidsBB, fibSubstituteGolden, decoratedFibSubstitute, fibDeepSofic, finiteLocalRuleReceipt, goldenMeanGraph, decoratedGoldenGraph, forgetDecoration });

import { load } from "./compile.mjs";
import "./profile.mjs";
import { registerFiberAxes, registerFiberDataSchema } from "./register-fiber.mjs";
import { isReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const witnessJournalLiteralSchema = {
  type: "object",
  required: ["entity", "attribute", "value"],
  additionalProperties: false,
  properties: {
    entity: { type: "string", minLength: 1 },
    attribute: { type: "string", minLength: 1 },
    value: {},
    time: { type: "string", minLength: 1 },
    witness: { type: "string", minLength: 1 },
  },
};

const stringArraySchema = { type: "array", items: { type: "string" } };

const suffixRuleSchema = {
  type: "object",
  required: ["pattern", "tag"],
  properties: {
    pattern: { type: "string", minLength: 1 },
    tag: { type: "string", minLength: 1 },
  },
};

const languageBundleSchema = {
  type: "object",
  required: ["meta", "lexicon", "morphology", "reference", "wordOrder", "attachment", "segmentation"],
  properties: {
    meta: {
      type: "object",
      required: ["name", "code", "script", "direction"],
      additionalProperties: false,
      properties: {
        name: { type: "string", minLength: 1 },
        code: { type: "string", minLength: 1 },
        script: { type: "string", minLength: 1 },
        direction: { enum: ["ltr", "rtl"] },
      },
    },
    lexicon: {
      type: "object",
      required: ["determiners", "prepositions", "pronouns", "conjunctions", "auxiliaries", "copula"],
      additionalProperties: false,
      properties: {
        determiners: stringArraySchema,
        prepositions: stringArraySchema,
        pronouns: stringArraySchema,
        conjunctions: stringArraySchema,
        auxiliaries: stringArraySchema,
        copula: stringArraySchema,
      },
    },
    morphology: {
      type: "object",
      required: ["suffixRules", "numberSuffixPattern", "verbFormRules", "numberWords"],
      properties: {
        suffixRules: { type: "array", items: suffixRuleSchema },
        featureRules: { type: "array", items: suffixRuleSchema },
        rootPatternRules: { type: "array", items: { $ref: "communicating/language/morphotactic-pattern-rule" } },
        numberSuffixPattern: { type: "string" },
        verbFormRules: { type: "array", items: suffixRuleSchema },
        numberWords: stringArraySchema,
        irregularPlurals: { type: "object" },
        irregularVerbs: { type: "object" },
        verbStems: stringArraySchema,
      },
    },
    reference: {
      type: "object",
      required: ["pronouns"],
      properties: {
        pronouns: { type: "object" },
        nameGender: { type: "object" },
      },
    },
    wordOrder: { enum: ["SVO", "SOV", "VSO", "VOS", "OVS", "OSV", "free", "topic-comment"] },
    roleBy: { enum: ["case"] },
    grammar: { $ref: "communicating/language/grammar-profile" },
    registerFiber: registerFiberDataSchema,
    attachment: {
      type: "object",
      required: ["determiner", "adjective", "subject", "object"],
      additionalProperties: false,
      properties: {
        determiner: { enum: ["left", "right"] },
        adjective: { enum: ["left", "right"] },
        subject: { enum: ["left", "right"] },
        object: { enum: ["left", "right"] },
      },
    },
    segmentation: {
      type: "object",
      required: ["sentenceTerminatorPattern", "abbreviations"],
      additionalProperties: false,
      properties: {
        sentenceTerminatorPattern: { type: "string" },
        abbreviations: stringArraySchema,
      },
    },
  },
};

export const languageManifestSchema = {
  $id: "communicating/language/manifest",
  type: "object",
  required: ["kind", "bundle"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.language-manifest" },
    bundle: languageBundleSchema,
    witnessJournal: {
      type: "array",
      items: witnessJournalLiteralSchema,
    },
    sen: {
      type: "array",
      items: { type: "object" },
    },
    lambek: {
      type: "object",
      properties: {
        categories: { type: "array", items: { type: "string", minLength: 1 } },
        judgments: { type: "array", items: { type: "object" } },
      },
    },
    sofic: {
      type: "object",
      properties: {
        alphabet: { type: "array", items: { type: "string", minLength: 1 } },
        graph: { type: "array", items: { type: "array", items: { type: "boolean" } } },
        factor: { type: "array", items: { type: "integer", minimum: 0 } },
        sample: { type: "array", items: { type: "integer", minimum: 0 } },
        note: { type: "string" },
      },
    },
    chu: {
      type: "object",
      properties: {
        pts: { type: "array", items: { type: "string", minLength: 1 } },
        sts: { type: "array", items: { type: "string", minLength: 1 } },
        matrix: { type: "array", items: { type: "object" } },
      },
    },
    discourseCover: {
      type: "object",
      required: ["entities", "cells", "components"],
      additionalProperties: false,
      properties: {
        entities: { type: "integer", minimum: 0 },
        cells: { type: "integer", minimum: 0 },
        components: { type: "integer", minimum: 0 },
        note: { type: "string" },
      },
    },
  },
};

export const languageManifestCarrier = schemaFrom(languageManifestSchema);

const asJsonValue = (value) => value;

export function loadLanguageManifest(value, context = "language manifest") {
  return Object.freeze(languageManifestCarrier.assert(value, context));
}

export const bundleFromLanguageManifest = (manifest) => manifest.bundle;

export const compiledBundleFromLanguageManifest = (manifest) =>
  load(bundleFromLanguageManifest(manifest));

export function languageManifestWitnessJournalRows(manifest) {
  const language = `language:${manifest.bundle.meta.code}`;
  const rows = [
    { entity: language, attribute: "communicating.name", value: manifest.bundle.meta.name, witness: "manifest.bundle.meta.name" },
    { entity: language, attribute: "communicating.script", value: manifest.bundle.meta.script, witness: "manifest.bundle.meta.script" },
    { entity: language, attribute: "communicating.direction", value: manifest.bundle.meta.direction, witness: "manifest.bundle.meta.direction" },
    { entity: language, attribute: "communicating.wordOrder", value: manifest.bundle.wordOrder, witness: "manifest.bundle.wordOrder" },
  ];
  if (manifest.bundle.grammar !== undefined) {
    rows.push({
      entity: language,
      attribute: "communicating.grammarProfile",
      value: manifest.bundle.grammar,
      witness: "manifest.bundle.grammar",
    });
  }
  for (const axis of registerFiberAxes) {
    const values = manifest.bundle.registerFiber?.[axis] ?? [];
    if (values.length === 0) continue;
    rows.push({
      entity: language,
      attribute: `communicating.${axis}`,
      value: values,
      witness: `manifest.bundle.registerFiber.${axis}`,
    });
  }
  for (const [index, row] of (manifest.witnessJournal ?? []).entries()) {
    rows.push({
      witness: `manifest.witnessJournal.${index}`,
      ...row,
    });
  }
  return Object.freeze(rows);
}

export function lambekManifestReceipt(manifest) {
  const categories = Object.freeze([
    ...new Set([
      "S",
      "NP",
      "N",
      "VP",
      ...(manifest.lambek?.categories ?? []),
    ]),
  ]);
  return Object.freeze({
    kind: "communicating.lambek-language-receipt",
    language: manifest.bundle.meta.code,
    categories,
    judgments: manifest.lambek?.judgments ?? [],
    wordOrder: manifest.bundle.grammar?.wordOrder ?? manifest.bundle.wordOrder,
    laws: lambek.laws(lambek.booleanCommutativeLambekAlgebra),
  });
}

export function soficManifestReceipt(manifest) {
  const alphabet = manifest.sofic?.alphabet ?? ["C", "V"];
  const graph = manifest.sofic?.graph ?? [
    [false, true],
    [true, true],
  ];
  const factor = manifest.sofic?.factor ?? alphabet.map((_, index) => index);
  const sample = manifest.sofic?.sample ?? [0, 1, 0];
  return Object.freeze({
    kind: "communicating.sofic-language-receipt",
    language: manifest.bundle.meta.code,
    alphabet,
    graph,
    factor,
    sample,
    note: manifest.sofic?.note ?? "finite phonotactic/morphotactic sofic reading",
    image: sofic.soficImage(graph, factor, sample),
  });
}

export function chuManifestReceipt(manifest) {
  const pts = manifest.chu?.pts ?? manifest.bundle.lexicon.pronouns;
  const sts = manifest.chu?.sts ?? ["speaker", "listener"];
  const matrix = manifest.chu?.matrix ?? pts.flatMap((pt) =>
    sts.map((st) => ({ pt, st, reading: "absurd" })));
  const r = matrix.map((entry) => ({
    pt: String(entry["pt"] ?? ""),
    st: String(entry["st"] ?? ""),
    reading: String(entry["reading"] ?? entry["value"] ?? "absurd"),
  }));
  const space = asJsonValue(Object.freeze({
    pts,
    sts,
    r,
  }));
  const pairing = chuSpace(pts, sts, (point, state) => {
    const entry = r.find((entry) => entry.pt === point && entry.st === state);
    if (!entry) return undefined;
    if (!isReadingInKnowledge(entry.reading)) throw new TypeError(`Invalid Chu reading: ${entry.reading}`);
    return entry.reading;
  });
  return Object.freeze({
    kind: "communicating.chu-language-receipt",
    language: manifest.bundle.meta.code,
    space,
    dualInvolution: sameChuSpace(dual(dual(pairing)), pairing),
  });
}

export function discourseCoverManifestReceipt(manifest) {
  const cover = manifest.discourseCover ?? {
    entities: Math.max(1, manifest.bundle.lexicon.pronouns.length),
    cells: Math.max(0, manifest.bundle.lexicon.conjunctions.length),
    components: 1,
  };
  return Object.freeze({
    kind: "communicating.discourse-cover-receipt",
    language: manifest.bundle.meta.code,
    cover,
    cohomology: coordinationCohomology.receipt(),
  });
}

export function languageManifestReceipts(manifest) {
  return Object.freeze({
    kind: "communicating.language-manifest.receipts",
    language: manifest.bundle.meta.code,
    witnessJournal: languageManifestWitnessJournalRows(manifest),
    lambek: lambekManifestReceipt(manifest),
    sofic: soficManifestReceipt(manifest),
    chu: chuManifestReceipt(manifest),
    discourseCover: discourseCoverManifestReceipt(manifest),
  });
}
