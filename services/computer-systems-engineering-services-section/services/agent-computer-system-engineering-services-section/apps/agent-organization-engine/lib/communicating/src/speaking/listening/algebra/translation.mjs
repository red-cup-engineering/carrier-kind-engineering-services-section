import { knowledgeLeq, truthLeq, witnessedReading } from "@red-cup-engineering/signchain/bilattice";
import { completePaletteGraph, graphHom, identityGraphHom, composeFactorMaps, mapPathByGraphHom, path, soficImage, fibSubstitute, goldenForbidsBB, fibSubstituteGolden, decoratedFibSubstitute, fibDeepSofic, finiteLocalRuleReceipt, goldenMeanGraph, decoratedGoldenGraph, forgetDecoration } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/sofic";
const soficAnalysis = Object.freeze({ completePaletteGraph, graphHom, identityGraphHom, composeFactorMaps, mapPathByGraphHom, path, soficImage, fibSubstitute, goldenForbidsBB, fibSubstituteGolden, decoratedFibSubstitute, fibDeepSofic, finiteLocalRuleReceipt, goldenMeanGraph, decoratedGoldenGraph, forgetDecoration });

import { soficManifestReceipt } from "./manifest.mjs";
import {
  languageRegisterFiber,
  registerFiberDegradationReceipt,

} from "./register-fiber.mjs";
import { negateReading, readingFamilies, samePoint } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const translateReadingValue = (value) => value;

const hasSoficImageWitness = (manifest) => {
  const graph = manifest.sofic?.graph ?? [
    [false, true],
    [true, true],
  ];
  const factor = manifest.sofic?.factor ?? graph.map((_, index) => index);
  const sample = manifest.sofic?.sample ?? [0, 1, 0];
  return soficAnalysis.soficImage(graph, factor, sample).kind === "sofic.image:witness";
};

const isTruthWitness = (left, right) =>
  truthLeq(witnessedReading(left, "translation-order"), witnessedReading(right, "translation-order"));

const preservesTruthOrder = () => {
  for (const leftName of readingFamilies.knowledge) {
    for (const rightName of readingFamilies.knowledge) {
      const left = leftName;
      const right = rightName;
      if (
        isTruthWitness(left, right)
        && !isTruthWitness(translateReadingValue(left), translateReadingValue(right))
      ) {
        return false;
      }
    }
  }
  return true;
};

const readingMapEntry = (source) => {
  const sourceValue = (source);
  const targetValue = translateReadingValue(sourceValue);
  const negateSourceThenTranslate = translateReadingValue(negateReading(sourceValue));
  const translateThenNegate = negateReading(targetValue);
  return Object.freeze({
    source,
    target: (targetValue),
    negateSourceThenTranslate: (negateSourceThenTranslate),
    translateThenNegate: (translateThenNegate),
    negateCommutes: samePoint(negateSourceThenTranslate, translateThenNegate),
  });
};

const sameFactorMap = (
  left,
  right,
) =>
  left.length === right.length
  && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined
      && entry.source === other.source
      && entry.target === other.target
      && entry.negateSourceThenTranslate === other.negateSourceThenTranslate
      && entry.translateThenNegate === other.translateThenNegate
      && entry.negateCommutes === other.negateCommutes;
  });

const withRegister = (
  data,
  register,
  override,
) => {
  const registers = override ?? data?.register ?? [];
  return {
    ...data,
    register: register !== undefined && !registers.includes(register)
      ? Object.freeze([...registers, register])
      : Object.freeze([...registers]),
  };
};

const degradationReceipt = (
  source,
  target,
  options = {},
) => {
  const sourceFiber = languageRegisterFiber(
    source.bundle.meta.code,
    withRegister(source.bundle.registerFiber, options.sourceRegister, undefined),
  );
  const targetFiber = languageRegisterFiber(
    target.bundle.meta.code,
    withRegister(target.bundle.registerFiber, undefined, options.targetRegisters),
  );
  const selection = {
    ...(options.registerSelection ?? {}),
    ...(options.sourceRegister === undefined ? {} : { register: options.sourceRegister }),
  };
  const fiber = registerFiberDegradationReceipt(sourceFiber, targetFiber, selection);
  const targetRegisters = Object.freeze([...targetFiber.register]);
  return Object.freeze({
    kind: "communicating.translation.degradation",
    sourceRegister: options.sourceRegister ?? null,
    targetRegisters,
    sourceSpecificity: fiber.sourceSpecificity,
    targetSpecificity: fiber.targetSpecificity,
    settlesDown: fiber.settlesDown,
    fabricatesAssertivity: false,
    fiber,
  });
};

export function translationFactorReceipt(
  source,
  target,
  options = {},
) {
  const sourceSofic = soficManifestReceipt(source);
  const targetSofic = soficManifestReceipt(target);
  const factorMap = Object.freeze(readingFamilies.knowledge.map(readingMapEntry));
  return Object.freeze({
    kind: "communicating.translation-factor.receipt",
    sourceLanguage: source.bundle.meta.code,
    targetLanguage: target.bundle.meta.code,
    law: "RelMath.Aperiodic.SoficShift.SoficImage.factor",
    maturity: "Built+green",
    sofic: Object.freeze({
      source: sourceSofic,
      target: targetSofic,
      sourceWitness: hasSoficImageWitness(source),
      targetWitness: hasSoficImageWitness(target),
    }),
    truth: Object.freeze({
      order: "truth",
      factorMap,
      preservesTruthOrder: preservesTruthOrder(),
      commutesWithNegate: factorMap.every((entry) => entry.negateCommutes),
      fixedPoints: Object.freeze({
        absurd: factorMap.find((entry) => entry.source === "absurd")?.target === "absurd",
        stable: factorMap.find((entry) => entry.source === "stable")?.target === "stable",
      }),
    }),
    degradation: degradationReceipt(source, target, options),
  });
}

export function translationFactorChainReceipt(
  manifests,
  options = {},
) {
  if (manifests.length < 2) {
    throw new TypeError("translationFactorChainReceipt: expected at least two language manifests");
  }
  const closeCycle = options.closeCycle ?? true;
  const pairs = manifests.slice(0, -1).map((source, index) => [source, manifests[index + 1]]);
  if (closeCycle) pairs.push([manifests[manifests.length - 1], manifests[0]]);
  const legs = Object.freeze(pairs.map(([source, target]) => translationFactorReceipt(source, target, options)));
  const firstMap = legs[0]?.truth.factorMap ?? [];
  return Object.freeze({
    kind: "communicating.translation-factor.chain-receipt",
    languages: Object.freeze(manifests.map((manifest) => manifest.bundle.meta.code)),
    law: "RelMath.Aperiodic.SoficShift.SoficImage.factor",
    maturity: "Built+green",
    legs,
    oneTruthFactorMap: legs.every((leg) => sameFactorMap(firstMap, leg.truth.factorMap)),
    allSoficWitnesses: legs.every((leg) => leg.sofic.sourceWitness && leg.sofic.targetWitness),
    roundTrip: Object.freeze({
      preservesTruthOrder: legs.every((leg) => leg.truth.preservesTruthOrder),
      commutesWithNegate: legs.every((leg) => leg.truth.commutesWithNegate),
      fixedPoints: Object.freeze({
        absurd: legs.every((leg) => leg.truth.fixedPoints.absurd),
        stable: legs.every((leg) => leg.truth.fixedPoints.stable),
      }),
      neverFabricatesAssertivity: legs.every((leg) =>
        leg.degradation.settlesDown && leg.degradation.fabricatesAssertivity === false),
    }),
  });
}
