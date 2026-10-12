/**
 * Development as a content-addressed language dialect.
 *
 * The phase readout deliberately reuses MetroPlat's causal-set and
 * predication-cohomology owners. Its structural/transport/topological/control
 * coordinates are a software architecture induced by the multi-sector shape
 * of `SectorPhaseDiagram.lean`; they are not a claim that a development graph
 * is itself a material basin or that the material theorem proves translation.
 */
import { contentAddress, type ArtifactRef } from "../../identity/index.mts";
import { jsonResource } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { cohomologyOfCells, type CohomologyCarrier as Cohomology } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/cohomology";
import { cell, predicateOfClaim } from "@red-cup-engineering/computer-data-engine/predication";
import { settleCausalSet, type CausalSettlementJudgment, type CausalSetCarrier } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/causal";
import { claim, mark, token } from "@red-cup-engineering/computer-data-engine/utterance";
import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";
import { chargeValue, joinKnowledgeValue, type ChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import {
  languageArtifactIsValid,
  translationWitnessIsValid,
  type LanguageArtifact,
  type LanguageAssertion,
  type LanguageTranslationWitness,
} from "../presentation.mts";

export const developmentStages = Object.freeze(["dream", "plan", "architect", "spec", "tests", "docs", "code"] as const);
export type DevelopmentStage = (typeof developmentStages)[number];

export type DevelopmentAssertion = LanguageAssertion;

export interface DevelopmentArtifact extends LanguageArtifact {
  readonly stage: DevelopmentStage;
  readonly translations: readonly LanguageTranslationWitness[];
}

export type DevelopmentProgressionViolationCode =
  | "duplicate-artifact"
  | "invalid-artifact-address"
  | "invalid-translation"
  | "missing-stage"
  | "unknown-cause"
  | "retrograde-cause"
  | "missing-predecessor"
  | "claim-not-preserved";

export interface DevelopmentProgressionViolation {
  readonly code: DevelopmentProgressionViolationCode;
  readonly stage: DevelopmentStage;
  readonly artifact?: ArtifactRef;
  readonly claim?: ArtifactRef;
  readonly cause?: ArtifactRef;
}

export interface DevelopmentClaimReading {
  readonly claim: ArtifactRef;
  readonly charge: ChargeValueName;
  readonly stages: readonly DevelopmentStage[];
}

/** A causal dependency that carries one shared predictor between surfaces. */
export interface DevelopmentTranslation {
  readonly from: ArtifactRef;
  readonly to: ArtifactRef;
  readonly fromStage: DevelopmentStage;
  readonly toStage: DevelopmentStage;
  readonly witness: ArtifactRef;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly predictors: readonly ArtifactRef[];
}

export interface DevelopmentPhaseReadout {
  /** Surface colors and their shared FOUR-valued predictors. */
  readonly structural: Readonly<{
    readonly coloring: readonly Readonly<{ artifact: ArtifactRef; color: DevelopmentStage }>[];
    stages: readonly Readonly<{ stage: DevelopmentStage; artifacts: readonly ArtifactRef[] }>[];
    predictors: readonly DevelopmentClaimReading[];
  }>;
  /** Witnessed causal crossings that actually retain at least one predictor. */
  readonly transport: Readonly<{ translations: readonly DevelopmentTranslation[] }>;
  /** Existing causal closure and graph-cohomology readings over those crossings. */
  readonly topological: Readonly<{
    causalSet: CausalSetCarrier;
    causalClosure: CausalSettlementJudgment;
    translationCohomology: Cohomology;
  }>;
  /** Revision policy induced by the bounded judgment, not a material temperature. */
  readonly control: Readonly<{
    regime: "frozen" | "hopping";
    evidence: readonly string[];
  }>;
}

export interface DevelopmentProgressionReceipt {
  readonly kind: "metroplat.language.development-progression";
  readonly version: 1;
  readonly order: typeof developmentStages;
  readonly artifacts: readonly DevelopmentArtifact[];
  readonly readings: readonly DevelopmentClaimReading[];
  readonly phase: DevelopmentPhaseReadout;
  readonly violations: readonly DevelopmentProgressionViolation[];
  readonly complete: boolean;
  readonly address: ArtifactRef;
}

const artifactRefSchema = { type: "string", pattern: "^metroplat:artifact:1:" } as const;

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
        required: ["claim", "charge"],
        additionalProperties: false,
        properties: {
          claim: artifactRefSchema,
          charge: { enum: ["unknown", "held", "denied", "contested"] },
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
} as const;

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
} as const;

export const developmentArtifactContract = schemaFrom(developmentArtifactSchema);
export const developmentProgressionContract = schemaFrom(developmentProgressionSchema);

const stageIndex = (stage: DevelopmentStage): number => developmentStages.indexOf(stage);
const translationPredicate = predicateOfClaim(claim(mark("metroplat.language.development.translation")));

/**
 * Read a finite artifact family as the software-development dialect. Causal
 * edges and claim assertions are explicit data: stage order is never guessed
 * from filenames, timestamps, or host-language placement.
 */
export function developmentProgressionOf(input: readonly DevelopmentArtifact[]): DevelopmentProgressionReceipt {
  const artifacts = Object.freeze([...input].sort((left, right) =>
    stageIndex(left.stage) - stageIndex(right.stage) || left.address.localeCompare(right.address)));
  const byAddress = new Map<ArtifactRef, DevelopmentArtifact>();
  const violations: DevelopmentProgressionViolation[] = [];
  const translations: DevelopmentTranslation[] = [];

  for (const artifact of artifacts) {
    if (byAddress.has(artifact.address)) {
      violations.push(Object.freeze({ code: "duplicate-artifact" as const, stage: artifact.stage, artifact: artifact.address }));
    } else if (!languageArtifactIsValid(artifact)) {
      violations.push(Object.freeze({ code: "invalid-artifact-address" as const, stage: artifact.stage, artifact: artifact.address }));
      byAddress.set(artifact.address, artifact);
    } else {
      byAddress.set(artifact.address, artifact);
    }
  }
  for (const stage of developmentStages) {
    if (!artifacts.some((artifact) => artifact.stage === stage)) {
      violations.push(Object.freeze({ code: "missing-stage" as const, stage }));
    }
  }

  for (const artifact of artifacts) {
    const index = stageIndex(artifact.stage);
    for (const witness of artifact.translations) {
      const cause = witness.source;
      const predecessor = byAddress.get(cause);
      if (predecessor === undefined) {
        violations.push(Object.freeze({ code: "unknown-cause" as const, stage: artifact.stage, artifact: artifact.address, cause }));
      } else if (stageIndex(predecessor.stage) >= index) {
        violations.push(Object.freeze({ code: "retrograde-cause" as const, stage: artifact.stage, artifact: artifact.address, cause }));
      } else if (!translationWitnessIsValid(witness, predecessor, artifact)) {
        violations.push(Object.freeze({ code: "invalid-translation" as const, stage: artifact.stage, artifact: artifact.address, cause }));
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
      const prior = developmentStages[index - 1]!;
      if (!artifact.translations.some((witness) => byAddress.get(witness.source)?.stage === prior)) {
        violations.push(Object.freeze({ code: "missing-predecessor" as const, stage: artifact.stage, artifact: artifact.address }));
      }
    }
  }

  const stageClaims = new Map<DevelopmentStage, Set<ArtifactRef>>(
    developmentStages.map((stage) => [stage, new Set<ArtifactRef>()]),
  );
  const claimCharges = new Map<ArtifactRef, ChargeValueName>();
  const claimStages = new Map<ArtifactRef, DevelopmentStage[]>();
  for (const artifact of artifacts) {
    for (const assertion of artifact.assertions) {
      stageClaims.get(artifact.stage)!.add(assertion.claim);
      const prior = claimCharges.get(assertion.claim) ?? "unknown";
      claimCharges.set(assertion.claim, joinKnowledgeValue(chargeValue(prior), chargeValue(assertion.charge)).name);
      claimStages.set(assertion.claim, [...(claimStages.get(assertion.claim) ?? []), artifact.stage]);
    }
  }
  for (let index = 1; index < developmentStages.length; index += 1) {
    const prior = developmentStages[index - 1]!;
    const stage = developmentStages[index]!;
    for (const claim of stageClaims.get(prior)!) {
      if (!stageClaims.get(stage)!.has(claim)) {
        violations.push(Object.freeze({ code: "claim-not-preserved" as const, stage, claim }));
      }
    }
  }

  const readings = Object.freeze([...claimCharges]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([claim, charge]) => Object.freeze({
      claim,
      charge,
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
  const causalSet: CausalSetCarrier = Object.freeze({
    kind: "lorentzian.causalSet" as const,
    events: Object.freeze(artifacts.map((artifact) => artifact.address)),
    links: Object.freeze(canonicalTranslations.map((translation) => Object.freeze({ from: translation.from, to: translation.to }))),
  });
  const causalClosure = settleCausalSet(causalSet);
  const translationCells = canonicalTranslations.map((translation) => cell(
    token(mark(translation.from)),
    translationPredicate,
    token(mark(translation.to)),
  ));
  const translationCohomology = jsonResource(cohomologyOfCells(
    translationCells,
    artifacts.map((artifact) => token(mark(artifact.address))),
  ), "development translation cohomology") as unknown as Cohomology;
  const complete = canonicalViolations.length === 0 && causalClosure.kind === "lorentzian.causalSettle:witness";
  const phase: DevelopmentPhaseReadout = Object.freeze({
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
      regime: complete ? "frozen" as const : "hopping" as const,
      evidence: Object.freeze([
        `violations:${canonicalViolations.length}`,
        `causal-closure:${causalClosure.kind}`,
        `translation-h1:${translationCohomology.firstCohomology.rank.members.length}`,
      ]),
    }),
  });
  const body = Object.freeze({
    kind: "metroplat.language.development-progression" as const,
    version: 1 as const,
    order: developmentStages,
    artifacts,
    readings,
    phase,
    violations: canonicalViolations,
    complete,
  });
  return Object.freeze({ ...body, address: contentAddress(body) });
}
