/**
 * Development as a content-addressed language dialect.
 *
 * The phase readout deliberately reuses MetroPlat's causal-set and
 * predication-cohomology owners. Its structural/transport/topological/control
 * coordinates are a software architecture induced by the multi-sector shape
 * of `SectorPhaseDiagram.lean`; they are not a claim that a development graph
 * is itself a material basin or that the material theorem proves translation.
 */
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { cohomologyOfCells } from "@red-cup-engineering/signgraph/cohomology";
import { cell } from "@red-cup-engineering/signcell/cell";
import { settleCausalSet } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/causal";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import {
  languageArtifactIsValid,
  translationWitnessIsValid,

} from "../presentation.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";
import { readingFamilies, readingOfSides, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

export const developmentStages = Object.freeze(["dream", "plan", "architect", "spec", "tests", "docs", "code"]);

/** A causal dependency that carries one shared predictor between surfaces. */

const artifactRefSchema = { type: "string", pattern: "^ni:///sha-256;[A-Za-z0-9_-]{43}$" };

export const developmentArtifactSchema = {
  $id: "metroplat/language/development-artifact",
  title: "DevelopmentArtifact",
  description: "One content-addressed artifact in the dream-to-plan-to-architect-to-spec-to-tests-to-docs-to-code development dialect.",
  type: "object",
  required: ["kind", "version", "language", "presentation", "expression", "semanticAddress", "assertions", "address", "stage", "translations"],
  additionalProperties: false,
  properties: {
    address: artifactRefSchema,
    kind: { const: "metroplat.language.artifact" },
    version: { const: 2 },
    language: { type: "string", minLength: 1 },
    presentation: artifactRefSchema,
    expression: {},
    type: {},
    semanticAddress: artifactRefSchema,
    stage: { enum: ["dream", "plan", "architect", "spec", "tests", "docs", "code"] },
    assertions: {
      type: "array",
      items: {
        type: "object",
        required: ["claim", "reading"],
        additionalProperties: false,
        properties: {
          claim: artifactRefSchema,
          reading: { enum: Object.values(readingFamilies).flat() },
        },
      },
    },
    translations: {
      type: "array",
      items: {
        type: "object",
        required: ["kind", "version", "family", "route", "source", "target", "sourceLanguage", "targetLanguage", "sourcePresentation", "targetPresentation", "semanticAddress", "assertions", "validationScope", "lossProfile", "address"],
        additionalProperties: false,
        properties: {
          kind: { const: "metroplat.language.translation" },
          version: { const: 3 },
          family: artifactRefSchema,
          route: { type: "array", items: artifactRefSchema },
          source: artifactRefSchema,
          target: artifactRefSchema,
          sourceLanguage: { type: "string", minLength: 1 },
          targetLanguage: { type: "string", minLength: 1 },
          sourcePresentation: artifactRefSchema,
          targetPresentation: artifactRefSchema,
          semanticAddress: artifactRefSchema,
          assertions: { type: "array", items: { type: "object", additionalProperties: true } },
          validationScope: { type: "array", items: { type: "string", minLength: 1 } },
          lossProfile: { type: "object", additionalProperties: true },
          address: artifactRefSchema,
        },
      },
    },
  },
};

export const developmentProgressionSchema = {
  $id: "metroplat/language/development-progression",
  title: "DevelopmentProgressionReceipt",
  description: "Content-addressed causal, FOUR-valued, and topological judgment of the dream-to-plan-to-architect-to-spec-to-tests-to-docs-to-code development dialect.",
  type: "object",
  required: ["kind", "version", "order", "artifacts", "readings", "phase", "violations", "complete", "address"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.language.development-progression" },
    version: { const: 1 },
    order: { type: "array", prefixItems: [{ const: "dream" }, { const: "plan" }, { const: "architect" }, { const: "spec" }, { const: "tests" }, { const: "docs" }, { const: "code" }], items: false },
    artifacts: { type: "array", items: developmentArtifactSchema },
    readings: { type: "array", items: { type: "object", additionalProperties: true } },
    phase: { type: "object", additionalProperties: true },
    violations: { type: "array", items: { type: "object", additionalProperties: true } },
    complete: { type: "boolean" },
    address: artifactRefSchema,
  },
};

export const developmentArtifactContract = schemaFrom(developmentArtifactSchema);
export const developmentProgressionContract = schemaFrom(developmentProgressionSchema);

const stageIndex = (stage) => developmentStages.indexOf(stage);
const translationPredicate = "metroplat.language.development.translation";

/**
 * Read a finite artifact family as the software-development dialect. Causal
 * edges and claim assertions are explicit data: stage order is never guessed
 * from filenames, timestamps, or host-language placement.
 */
export function developmentProgressionOf(input) {
  const artifacts = Object.freeze([...input].sort((left, right) =>
    stageIndex(left.stage) - stageIndex(right.stage) || left.address.localeCompare(right.address)));
  const byAddress = new Map();
  const violations = [];
  const translations = [];

  for (const artifact of artifacts) {
    if (byAddress.has(artifact.address)) {
      violations.push(Object.freeze({ code: "duplicate-artifact", stage: artifact.stage, artifact: artifact.address }));
    } else if (!languageArtifactIsValid(artifact)) {
      violations.push(Object.freeze({ code: "invalid-artifact-address", stage: artifact.stage, artifact: artifact.address }));
      byAddress.set(artifact.address, artifact);
    } else {
      byAddress.set(artifact.address, artifact);
    }
  }
  for (const stage of developmentStages) {
    if (!artifacts.some((artifact) => artifact.stage === stage)) {
      violations.push(Object.freeze({ code: "missing-stage", stage }));
    }
  }

  for (const artifact of artifacts) {
    const index = stageIndex(artifact.stage);
    for (const witness of artifact.translations) {
      const cause = witness.source;
      const predecessor = byAddress.get(cause);
      if (predecessor === undefined) {
        violations.push(Object.freeze({ code: "unknown-cause", stage: artifact.stage, artifact: artifact.address, cause }));
      } else if (stageIndex(predecessor.stage) >= index) {
        violations.push(Object.freeze({ code: "retrograde-cause", stage: artifact.stage, artifact: artifact.address, cause }));
      } else if (!translationWitnessIsValid(witness, predecessor, artifact)) {
        violations.push(Object.freeze({ code: "invalid-translation", stage: artifact.stage, artifact: artifact.address, cause }));
      } else {
        const predictors = Object.freeze(witness.assertions.map((assertion) => assertion.claim)
          .filter((predictor, predictorIndex, all) => all.indexOf(predictor) === predictorIndex)
          .sort());
        translations.push(Object.freeze({
          from: predecessor.address,
          to: artifact.address,
          fromStage: predecessor.stage,
          toStage: artifact.stage,
          witness: witness.address,
          sourceLanguage: witness.sourceLanguage,
          targetLanguage: witness.targetLanguage,
          predictors,
        }));
      }
    }
    if (index > 0) {
      const prior = developmentStages[index - 1];
      if (!artifact.translations.some((witness) => byAddress.get(witness.source)?.stage === prior)) {
        violations.push(Object.freeze({ code: "missing-predecessor", stage: artifact.stage, artifact: artifact.address }));
      }
    }
  }

  const stageClaims = new Map(
    developmentStages.map((stage) => [stage, new Set()]),
  );
  // A claim's reading is derived from who told it: each artifact's assertion is that artifact's telling
  // (the sides its reading names, in whatever family), and the claim's sides are the artifacts told on each.
  const claimSides = new Map();
  const claimStages = new Map();
  for (const artifact of artifacts) {
    for (const assertion of artifact.assertions) {
      stageClaims.get(artifact.stage).add(assertion.claim);
      const sides = claimSides.get(assertion.claim) ?? { for: new Set(), against: new Set() };
      const [forTold, againstTold] = sidesOfReading(assertion.reading);
      if (forTold) sides.for.add(artifact.address);
      if (againstTold) sides.against.add(artifact.address);
      claimSides.set(assertion.claim, sides);
      claimStages.set(assertion.claim, [...(claimStages.get(assertion.claim) ?? []), artifact.stage]);
    }
  }
  for (let index = 1; index < developmentStages.length; index += 1) {
    const prior = developmentStages[index - 1];
    const stage = developmentStages[index];
    for (const claim of stageClaims.get(prior)) {
      if (!stageClaims.get(stage).has(claim)) {
        violations.push(Object.freeze({ code: "claim-not-preserved", stage, claim }));
      }
    }
  }

  const readings = Object.freeze([...claimSides]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([claim, sides]) => Object.freeze({
      claim,
      reading: readingOfSides("knowledge", sides.for.size > 0, sides.against.size > 0),
      for: Object.freeze([...sides.for].sort()),
      against: Object.freeze([...sides.against].sort()),
      stages: Object.freeze([...new Set(claimStages.get(claim) ?? [])]
        .sort((left, right) => stageIndex(left) - stageIndex(right))),
    })));
  const canonicalViolations = Object.freeze([...violations].sort((left, right) =>
    left.code.localeCompare(right.code)
      || stageIndex(left.stage) - stageIndex(right.stage)
      || (left.artifact ?? "").localeCompare(right.artifact ?? "")
      || (left.claim ?? "").localeCompare(right.claim ?? "")));
  const canonicalTranslations = Object.freeze([...translations].sort((left, right) =>
    stageIndex(left.fromStage) - stageIndex(right.fromStage)
      || left.from.localeCompare(right.from)
      || left.to.localeCompare(right.to)));
  const causalSet = Object.freeze({
    kind: "lorentzian.causalSet",
    events: Object.freeze(artifacts.map((artifact) => artifact.address)),
    links: Object.freeze(canonicalTranslations.map((translation) => Object.freeze({ from: translation.from, to: translation.to }))),
  });
  const causalClosure = settleCausalSet(causalSet);
  const translationCells = canonicalTranslations.map((translation) => cell(
    translation.from,
    translationPredicate,
    translation.to,
  ));
  const translationCohomology = jsonResource(cohomologyOfCells(
    translationCells,
    artifacts.map((artifact) => artifact.address),
  ), "development translation cohomology");
  const complete = canonicalViolations.length === 0 && causalClosure.kind === "lorentzian.causalSettle:witness";
  const phase = Object.freeze({
    structural: Object.freeze({
      coloring: Object.freeze(artifacts.map((artifact) => Object.freeze({ artifact: artifact.address, color: artifact.stage }))),
      stages: Object.freeze(developmentStages.map((stage) => Object.freeze({
        stage,
        artifacts: Object.freeze(artifacts.filter((artifact) => artifact.stage === stage).map((artifact) => artifact.address)),
      }))),
      predictors: readings,
    }),
    transport: Object.freeze({ translations: canonicalTranslations }),
    topological: Object.freeze({ causalSet, causalClosure, translationCohomology }),
    control: Object.freeze({
      regime: complete ? "frozen" : "hopping",
      evidence: Object.freeze([
        `violations:${canonicalViolations.length}`,
        `causal-closure:${causalClosure.kind}`,
        `translation-h1:${translationCohomology.firstCohomology.rank}`,
      ]),
    }),
  });
  const body = Object.freeze({
    kind: "metroplat.language.development-progression",
    version: 1,
    order: developmentStages,
    artifacts,
    readings,
    phase,
    violations: canonicalViolations,
    complete,
  });
  return Object.freeze({ ...body, address: artifactId(body) });
}
