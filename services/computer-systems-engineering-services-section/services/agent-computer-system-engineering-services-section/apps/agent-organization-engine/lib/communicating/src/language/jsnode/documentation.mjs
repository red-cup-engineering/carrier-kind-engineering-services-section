/**
 * Addressed descriptive documentation projected from one measured JSNode being.
 *
 * This is deliberately a projection of source observation, not a replacement
 * for design intent. The English and JSDoc carriers retain the exact measured
 * semantics they describe, together with the translation's validation scope
 * and known losses.
 *
 */

import { artifactId, isArtifactRef } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { canonicalJsonValue } from "@red-cup-engineering/json-services-section/canonical-json";
import {
  defineLanguageFamily,
  defineLanguagePresentation,
  defineLanguageTranslation,
  languageArtifactOf,
  translateInLanguageFamily,

} from "../presentation.mjs";

import {
  nodeBeingSpeciesFormula,
  readNodeBeingTaxon,

} from "./taxonomy.mjs";

export const nodeDeclarationKinds = Object.freeze([
  "function", "class", "interface", "type", "const",
]);

/** The topology reading required to describe a declaration without guessing intent. */

const documentationValidationScope = Object.freeze([
  "declaration form and export visibility",
  "per-predicate observation basis and confidence",
  "observed effect closure, ports, and unresolved calls",
  "SEN/FCA species formula and selected FOUR-valued taxon reading",
]);

export const nodeBeingDocumentationLossProfile = Object.freeze({
  kind: "lossy",
  omits: Object.freeze([
    "authorial and architectural intent not present in the source observation",
    "Lambek proof of the emitted English prose",
    "parameter, return, exception, and temporal semantics not measured by source topology",
    "runtime effects hidden by dynamic dispatch or unresolved calls",
  ]),
});

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : undefined;
}


const jsnodeBeingPresentation = defineLanguagePresentation({
  id: "metroplat.language.jsnode.being",
  name: "JSNode being observation",
  version: "1",
  corner: "assertion",
  rung: "strict",
  validationScope: documentationValidationScope,
  contract: Object.freeze({ grammar: Object.freeze({ kind: "json-kind", value: "metroplat.language.jsnode.documentation-semantics" }), judgments: Object.freeze([...documentationValidationScope]), reduction: Object.freeze({ kind: "identity" }), semantics: Object.freeze({ kind: "self" }), canonicalEncoding: Object.freeze({ kind: "rfc8785-jcs" }) }),
  canonicalExpression: canonicalJsonValue,
  accepts(expression) {
    return record(expression)?.["kind"] === "metroplat.language.jsnode.documentation-semantics";
  },
  semantics: canonicalJsonValue,
});

const jsdocPresentation = defineLanguagePresentation({
  id: "metroplat.language.jsdoc",
  name: "JSDoc with English prose",
  version: "1",
  corner: "prose",
  rung: "strict",
  validationScope: documentationValidationScope,
  contract: Object.freeze({ grammar: Object.freeze({ kind: "json-kind", value: "metroplat.language.jsdoc.expression" }), judgments: Object.freeze([...documentationValidationScope]), reduction: Object.freeze({ kind: "projection", field: "semantics" }), semantics: Object.freeze({ kind: "field", field: "semantics" }), canonicalEncoding: Object.freeze({ kind: "rfc8785-jcs" }) }),
  canonicalExpression: canonicalJsonValue,
  accepts(expression) {
    const value = record(expression);
    return value?.["kind"] === "metroplat.language.jsdoc.expression"
      && typeof value["text"] === "string"
      && typeof value["jsdoc"] === "string"
      && record(value["semantics"])?.["kind"] === "metroplat.language.jsnode.documentation-semantics";
  },
  semantics(expression) {
    const semantics = record(expression)?.["semantics"];
    if (semantics === undefined) throw new TypeError("JSDoc expression has no measured JSNode semantics");
    return canonicalJsonValue(semantics);
  },
});

function unique(values) {
  return Object.freeze([...new Set(values)].sort());
}

function artifactRef(value, subject) {
  if (!isArtifactRef(value)) {
    throw new TypeError(`JSNode ${subject} must be an artifact address: ${JSON.stringify(value)}`);
  }
  return value;
}

function observationOf(being) {
  const closure = being.effectClosure;
  return Object.freeze({
    kind: being.kind,
    subject: being.subject,
    predicates: being.predicates,
    ports: being.ports,
    ...(closure === undefined ? {} : {
      effectClosure: Object.freeze({
        ...closure,
        identity: artifactRef(closure.identity, "effect-closure identity"),
      }),
    }),
  });
}

function effectClosureOf(being) {
  const closure = being.effectClosure;
  if (closure === undefined) return undefined;
  const material = Object.freeze({
    kind: closure.kind,
    directPorts: unique(closure.directPorts),
    ports: unique(closure.ports),
    callables: unique(closure.callables),
    reachableCallables: closure.reachableCallables,
    unresolved: unique(closure.unresolved),
    rounds: closure.rounds,
    recursive: closure.recursive,
  });
  if (closure.identity !== artifactId(material)) {
    throw new TypeError(`JSNode effect-closure identity does not verify for ${JSON.stringify(being.subject)}`);
  }
  return Object.freeze({ ...material, identity: closure.identity });
}

function documentationSemantics(input) {
  const observation = observationOf(input.being);
  const expectedFormula = nodeBeingSpeciesFormula(observation);
  if (input.being.formula.identity !== expectedFormula.identity) {
    throw new TypeError(`JSNode species-formula identity does not verify for ${JSON.stringify(input.declaration)}`);
  }
  if (input.being.taxon !== "unresolved") {
    const expected = readNodeBeingTaxon(observation, input.being.taxon);
    const observed = canonicalJson(Object.freeze({
      identity: input.being.taxonIdentity,
      reading: input.being.taxonReading,
      defect: input.being.taxonomicDefect,
      support: unique(input.being.taxonSupport),
      missing: unique(input.being.taxonMissing),
      obstructions: unique(input.being.taxonObstructions),
    }));
    const derived = canonicalJson(Object.freeze({
      identity: expected.taxonIdentity,
      reading: expected.reading,
      defect: expected.defect,
      support: unique(expected.support),
      missing: unique(expected.missing),
      obstructions: unique(expected.obstructions),
    }));
    if (observed !== derived) {
      throw new TypeError(`JSNode taxon reading does not verify for ${JSON.stringify(input.declaration)}`);
    }
  }
  return JSON.parse(canonicalJson(Object.freeze({
    kind: "metroplat.language.jsnode.documentation-semantics",
    version: 1,
    declaration: input.declaration,
    declarationKind: input.declarationKind,
    exported: input.exported,
    being: Object.freeze({
      kind: input.being.kind,
      subject: input.being.subject,
      predicates: input.being.predicates,
      ports: unique(input.being.ports),
      ...(input.being.effectClosure === undefined ? {} : { effectClosure: effectClosureOf(input.being) }),
      confidence: input.being.confidence,
      formula: expectedFormula,
      taxon: input.being.taxon,
      taxonIdentity: input.being.taxonIdentity,
      taxonReading: input.being.taxonReading,
      taxonomicDefect: input.being.taxonomicDefect,
      taxonSupport: unique(input.being.taxonSupport),
      taxonMissing: unique(input.being.taxonMissing),
      taxonObstructions: unique(input.being.taxonObstructions),
    }),
  })));
}

function quoted(value) {
  return `\`${value.replace(/`/gu, "\\`")}\``;
}

function englishText(input) {
  const visibility = input.exported ? "an exported" : "a package-local";
  const first = `MetroPlat observes ${quoted(input.declaration)} as ${visibility} ${input.declarationKind}.`;
  const species = input.being.taxon === "unresolved"
    ? `Its current SEN/FCA reading does not resolve a JSNode species; the nearest measured formula has ${input.being.taxonomicDefect} taxonomic defect${input.being.taxonomicDefect === 1 ? "" : "s"}.`
    : `Its current SEN/FCA reading is ${input.being.taxonReading} for the ${quoted(input.being.taxon)} JSNode species, with ${input.being.confidence} evidence and ${input.being.taxonomicDefect} taxonomic defect${input.being.taxonomicDefect === 1 ? "" : "s"}.`;
  const closure = input.being.effectClosure;
  const effects = closure === undefined
    ? "Source topology did not measure an effect closure for this declaration."
    : `The observed effect closure reaches ${closure.reachableCallables} package callable${closure.reachableCallables === 1 ? "" : "s"} and carries ${closure.ports.length === 0 ? "no observed ports" : `the ports ${closure.ports.map(quoted).join(", ")}`}.`;
  const unresolved = closure === undefined || closure.unresolved.length === 0
    ? undefined
    : `The observation leaves these calls unresolved: ${closure.unresolved.map(quoted).join(", ")}.`;
  return [first, species, effects, unresolved, "This descriptive projection does not assert intent beyond that measured reading."]
    .filter((sentence) => sentence !== undefined)
    .join(" ");
}

function safeCommentLines(value) {
  return Object.freeze(value.replace(/\*\//gu, "*\\/").split(/\r?\n/gu));
}

function jsdocText(input, text) {
  const firstSentenceEnd = text.indexOf(". ");
  const generatedSummary = firstSentenceEnd < 0 ? text : text.slice(0, firstSentenceEnd + 1);
  const summary = input.sourceSummary?.trim() || generatedSummary;
  const lines = [
    ...safeCommentLines(summary),
    "",
    "@remarks",
    ...safeCommentLines(text),
    "",
    `Validation scope: ${documentationValidationScope.join("; ")}.`,
    `Known losses: ${nodeBeingDocumentationLossProfile.kind === "lossy" ? nodeBeingDocumentationLossProfile.omits.join("; ") : "none"}.`,
  ];
  return ["/**", ...lines.map((line) => line.length === 0 ? " *" : ` * ${line}`), " */"].join("\n");
}

/**
 * Project one measured declaration reading into English-bearing JSDoc.
 *
 * The generic language translator checks that both carriers expose identical
 * machine semantics and that the FOUR-valued taxon assertion survives. The
 * returned form is compact enough for a bounded topology page; its three
 * addresses resolve the source, target, and translation identities.
 */
export function projectNodeBeingDocumentation(input) {
  if (!nodeDeclarationKinds.includes(input.declarationKind)) {
    throw new TypeError(`unsupported JSNode declaration kind: ${JSON.stringify(input.declarationKind)}`);
  }
  const semantics = documentationSemantics(input);
  const source = languageArtifactOf(jsnodeBeingPresentation, semantics, {
    assertions: Object.freeze([{ claim: artifactRef(input.being.taxonIdentity, "taxon identity"), reading: input.being.taxonReading }]),
  });
  const text = englishText(input);
  const jsdoc = jsdocText(input, text);
  const translation = defineLanguageTranslation({
    source: jsnodeBeingPresentation.address,
    target: jsdocPresentation.address,
    contract: Object.freeze({ kind: "metroplat.language.jsnode-being-to-jsdoc", version: 1 }),
    lossProfile: nodeBeingDocumentationLossProfile,
    translate: (expression) => Object.freeze({
      kind: "metroplat.language.jsdoc.expression",
      version: 1,
      text,
      jsdoc,
      ...(input.sourceSummary === undefined ? {} : { sourceSummary: input.sourceSummary.trim() }),
      semantics: expression,
    }),
  });
  const family = defineLanguageFamily({ id: "metroplat.language.jsnode-documentation", name: "JSNode documentation", sharedSemantics: Object.freeze({ kind: "measured-jsnode-being" }), presentations: Object.freeze([jsnodeBeingPresentation, jsdocPresentation]), translations: Object.freeze([translation]) });
  const translated = translateInLanguageFamily({
    family,
    source,
    targetPresentation: jsdocPresentation.address,
  });
  if (!translated.ok) {
    throw new TypeError(`JSNode documentation projection failed: ${translated.obstruction.code}: ${translated.obstruction.message}`);
  }
  return Object.freeze({
    kind: "metroplat.language.jsnode.documentation-projection",
    version: 1,
    source: source.address,
    artifact: translated.artifact.address,
    witness: translated.witness.address,
    text,
    jsdoc,
    ...(input.sourceSummary === undefined ? {} : { sourceSummary: input.sourceSummary.trim() }),
    validationScope: translated.witness.validationScope,
    lossProfile: translated.witness.lossProfile,
  });
}

/** Re-project the input and compare the complete compact carrier. */
export function nodeBeingDocumentationProjectionIsValid(
  projection,
  input,
) {
  return canonicalJson(projection) === canonicalJson(projectNodeBeingDocumentation(input));
}
