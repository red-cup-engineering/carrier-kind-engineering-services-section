/**
 * JSNode beings as a finite formal context evaluated by SEN.
 *
 * A host-language observer supplies atomic attributes for a source symbol. The
 * taxa below are formulae over those attributes, not names guessed from paths.
 * Membership is evaluated by SEN's FCA `extentOfIntentTerm`; placement is a
 * downstream projection owned by the source monitor.
 */

import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import {
  extentOfIntent,
  finiteFcaContext,
  intentOfExtent,

} from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/fca-lambek-circle";

const nodeBeingStringSequenceSchema = { type: "array", items: { type: "string", minLength: 1 } };
const nodeBeingArtifactReferenceSchema = { type: "string", pattern: "^ni:///sha-256;[A-Za-z0-9_-]{43}$" };

export const nodeBeingTaxonNames = Object.freeze([
  "schema",
  "domain-morphism",
  "generic-utility",
  "adapter",
  "repository-port",
  "service",
  "controller",
  "command",
  "middleware",
  "validator",
  "mapper",
  "hook",
  "error",
  "entity",
  "route-table",
  "type-object",
  "boundary-transfer-object",
  "plugin",
  "state-binding",
  "domain-value",
  "generic-value",
]);

export const nodeBeingLayerNames = Object.freeze([
  "schemas", "domain", "adapters", "repositories", "services", "controllers",
  "commands", "middleware", "errors", "entities", "routes", "types", "utils",
  "helpers", "hooks", "components", "store", "state", "clients", "plugins",
  "lib", "dto", "mappers", "views", "validators",
]);

/**
 * Canonical filename suffix for every JSNode package layer.
 *
 * This is language vocabulary shared by carrier observation and projection,
 * not a source-monitor convention. Keeping the table here ensures a projected
 * filename is readable as the same layer on the next observation.
 */
export const nodeBeingLayerFilenameSuffixes = Object.freeze({
  schemas: "schema", domain: "domain", adapters: "adapter", repositories: "repository",
  services: "service", controllers: "controller", commands: "command", middleware: "middleware",
  errors: "error", entities: "entity", routes: "route", types: "type", utils: "util",
  helpers: "helper", hooks: "hook", components: "component", store: "store", state: "state",
  clients: "client", plugins: "plugin", lib: "lib", dto: "dto", mappers: "mapper",
  views: "view", validators: "validator",
});

const nodeBeingLayerByFilenameSuffix = new Map([
  ...Object.entries(nodeBeingLayerFilenameSuffixes).map(([layer, suffix]) => [suffix, layer]),
  // These plural spellings are conventional filenames in TypeScript packages,
  // not alternative layer identities.
  ["types", "types"],
  ["utils", "utils"],
]);

/** Read a conventional filename suffix into its one JSNode layer. */
export function nodeBeingLayerOfFilenameSuffix(suffix) {
  return nodeBeingLayerByFilenameSuffix.get(suffix);
}

/** The compiler-readable JSNode presentation of a stated subject decision. */
export const nodeSubjectJSDocTag = "metroplatSubject";

/** Canonical wire formula for a stated JSNode subject decision. */
export const nodeSubjectAnchorSchema = {
  type: "object",
  required: ["kind", "version", "identity", "subject", "declarations", "evidence"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.language.jsnode.subject-anchor" },
    version: { const: 1 },
    identity: nodeBeingArtifactReferenceSchema,
    subject: { type: "string", minLength: 1 },
    declarations: nodeBeingStringSequenceSchema,
    evidence: { const: "stated-domain-decision" },
  },
};

/**
 * A stated semantic-owner decision for JSNode declarations.
 *
 * `subject` is vocabulary supplied by the modeled domain; `declarations` are
 * exact root-relative `module#symbol` references witnessing that subject in
 * one observed package. The carrier location identifies the stated witness;
 * it never supplies the subject name or semantic decision itself.
 *
 * @metroplatSubject language
 */

/** Construct one exact declaration reference without granting it ownership. */
export function nodeDeclarationReference(module, symbol) {
  const canonicalModule = module.replace(/\\/gu, "/");
  const segments = canonicalModule.split("/");
  if (
    canonicalModule.length === 0
    || canonicalModule.startsWith("/")
    || segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
    || !/\.(?:[cm]?[jt]sx?)$/u.test(canonicalModule)
  ) throw new TypeError(`JSNode declaration module must be a root-relative source path: ${JSON.stringify(module)}`);
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(symbol)) {
    throw new TypeError(`JSNode declaration symbol must be an identifier: ${JSON.stringify(symbol)}`);
  }
  return `${canonicalModule}#${symbol}`;
}

function canonicalDeclarationReference(value) {
  const separator = value.lastIndexOf("#");
  if (separator <= 0 || separator === value.length - 1) {
    throw new TypeError(`JSNode subject anchor declaration must be module#symbol: ${JSON.stringify(value)}`);
  }
  return nodeDeclarationReference(value.slice(0, separator), value.slice(separator + 1));
}

function nodeSubjectAnchorMaterial(subject, declarations) {
  const canonicalSubject = subject.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(canonicalSubject)) {
    throw new TypeError(`JSNode subject must be one kebab-case package segment: ${JSON.stringify(subject)}`);
  }
  const canonicalDeclarations = Object.freeze([...new Set(declarations.map(canonicalDeclarationReference))].sort());
  if (canonicalDeclarations.length === 0) throw new TypeError("JSNode subject anchor requires at least one declaration");
  return Object.freeze({
    kind: "metroplat.language.jsnode.subject-anchor",
    version: 1,
    subject: canonicalSubject,
    declarations: canonicalDeclarations,
    evidence: "stated-domain-decision",
  });
}

/** Construct the canonical addressed form accepted by JSNode observers. */
export function nodeSubjectAnchor(subject, declarations) {
  const material = nodeSubjectAnchorMaterial(subject, declarations);
  return Object.freeze({ ...material, identity: artifactId(material) });
}

/** Verify and canonicalize an anchor received through a presentation boundary. */
export function readNodeSubjectAnchor(value) {
  const canonical = nodeSubjectAnchor(value.subject, value.declarations);
  if (
    value.kind !== canonical.kind
    || value.version !== canonical.version
    || value.evidence !== canonical.evidence
    || value.identity !== canonical.identity
  ) throw new TypeError(`JSNode subject anchor identity does not verify for ${JSON.stringify(value.subject)}`);
  return canonical;
}

/** Exact source material required to resolve an anchor identity in the journal. */
export function nodeSubjectAnchorSource(value) {
  const canonical = readNodeSubjectAnchor(value);
  const material = nodeSubjectAnchorMaterial(canonical.subject, canonical.declarations);
  return Object.freeze({ ref: canonical.identity, canonicalText: canonicalJson(material) });
}

export const nodeBeingPredicateEvidenceBasisNames = Object.freeze([
  "syntax",
  "type-system",
  "subject-anchor",
  "identifier-convention",
]);

export const nodeBeingPredicateEvidenceSchema = {
  type: "object",
  required: ["predicate", "basis", "confidence"],
  additionalProperties: false,
  properties: {
    predicate: { type: "string", minLength: 1 },
    basis: { enum: nodeBeingPredicateEvidenceBasisNames },
    confidence: { enum: ["reified", "heuristic"] },
  },
};

/** One observed FCA predicate together with the basis that warrants it. */

export const nodeBeingEffectClosureSchema = {
  type: "object",
  required: ["kind", "identity", "directPorts", "ports", "callables", "reachableCallables", "unresolved", "rounds", "recursive"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.language.jsnode.effect-closure" },
    identity: nodeBeingArtifactReferenceSchema,
    directPorts: nodeBeingStringSequenceSchema,
    ports: nodeBeingStringSequenceSchema,
    callables: nodeBeingStringSequenceSchema,
    reachableCallables: { type: "integer", minimum: 0 },
    unresolved: nodeBeingStringSequenceSchema,
    rounds: { type: "integer", minimum: 0 },
    recursive: { type: "boolean" },
  },
};

/**
 * Content-addressed molecular formula of one observed Node being.
 *
 * The formula is the FCA closure-facing part of an observation: the finite
 * attribute signature and the FOUR-valued membership of that signature in
 * every Node species. Carrier path, symbol name, and dependency edges remain
 * properties of the individual being in the source-topology relation; two
 * beings may therefore share one formula without being conflated.
 */

/** One distinct molecular formula and the number of observed beings carrying it. */

/**
 * The package-wide finite formal context of observed Node-being formulae.
 *
 * Formula identities are FCA subjects and structural predicates are FCA
 * attributes. Multiplicity remains explicit instead of being erased when
 * equal molecular formulae collapse to one formal-context subject.
 */

/** One observed taxon closed to a genuine FCA concept in a package context. */

/** Canonical presentation formulae for the addressed JSNode FCA artifacts. */
export const nodeBeingSpeciesFormulaSchema = {
  type: "object",
  required: ["kind", "identity", "taxonomy", "attributes", "held", "denied", "contested", "unknown"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.language.jsnode.species-formula" },
    identity: nodeBeingArtifactReferenceSchema,
    taxonomy: nodeBeingArtifactReferenceSchema,
    attributes: nodeBeingStringSequenceSchema,
    held: { type: "array", items: { enum: nodeBeingTaxonNames } },
    denied: { type: "array", items: { enum: nodeBeingTaxonNames } },
    contested: { type: "array", items: { enum: nodeBeingTaxonNames } },
    unknown: { type: "array", items: { enum: nodeBeingTaxonNames } },
  },
};

export const nodeBeingFormalContextSchema = {
  type: "object",
  required: ["kind", "identity", "taxonomy", "formulas", "predicates", "cells"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.language.jsnode.formal-context" },
    identity: nodeBeingArtifactReferenceSchema,
    taxonomy: nodeBeingArtifactReferenceSchema,
    formulas: {
      type: "array",
      items: {
        type: "object",
        required: ["formula", "occurrences"],
        additionalProperties: false,
        properties: {
          formula: nodeBeingArtifactReferenceSchema,
          occurrences: { type: "integer", minimum: 1 },
        },
      },
    },
    predicates: nodeBeingStringSequenceSchema,
    cells: {
      type: "array",
      items: {
        type: "object",
        required: ["subject", "predicate"],
        additionalProperties: false,
        properties: {
          subject: nodeBeingArtifactReferenceSchema,
          predicate: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

export const nodeBeingSpeciesConceptSchema = {
  type: "object",
  required: ["kind", "identity", "context", "taxon", "taxonIdentity", "layer", "extent", "intent", "population"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.language.jsnode.species-concept" },
    identity: nodeBeingArtifactReferenceSchema,
    context: nodeBeingArtifactReferenceSchema,
    taxon: { enum: nodeBeingTaxonNames },
    taxonIdentity: nodeBeingArtifactReferenceSchema,
    layer: { enum: nodeBeingLayerNames },
    extent: { type: "array", items: nodeBeingArtifactReferenceSchema },
    intent: nodeBeingStringSequenceSchema,
    population: { type: "integer", minimum: 0 },
  },
};

export const nodeBeingReadoutTaxonNames = Object.freeze([...nodeBeingTaxonNames, "unresolved"]);

/**
 * Canonical schema for one fully interpreted JSNode being. Source monitoring
 * supplies observations and consumes this formula; it does not restate it.
 */
export const nodeBeingReadoutSchema = {
  type: "object",
  required: ["kind", "subject", "predicates", "ports", "confidence", "formula", "taxon", "taxonIdentity", "taxonReading", "taxonomicDefect", "taxonSupport", "taxonMissing", "taxonObstructions"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.language.jsnode.being" },
    subject: { type: "string", minLength: 1 },
    predicates: { type: "array", items: nodeBeingPredicateEvidenceSchema },
    ports: nodeBeingStringSequenceSchema,
    effectClosure: nodeBeingEffectClosureSchema,
    confidence: { enum: ["reified", "heuristic"] },
    formula: nodeBeingSpeciesFormulaSchema,
    taxon: { enum: nodeBeingReadoutTaxonNames },
    taxonIdentity: nodeBeingArtifactReferenceSchema,
    taxonReading: { enum: ["unknown", "held", "denied", "contested"] },
    taxonomicDefect: { type: "integer", minimum: 0 },
    taxonSupport: nodeBeingStringSequenceSchema,
    taxonMissing: nodeBeingStringSequenceSchema,
    taxonObstructions: nodeBeingStringSequenceSchema,
  },
};

function taxon(
  name,
  layer,
  intent,
  obstructedBy,
) {
  const body = Object.freeze({
    kind: "metroplat.language.jsnode.taxon",
    name,
    layer,
    intent: Object.freeze([...intent].sort()),
    obstructedBy: Object.freeze([...obstructedBy].sort()),
  });
  return Object.freeze({ ...body, identity: artifactId(body) });
}

/**
 * The package-layout species licensed by the categorical Node layout model.
 * Morphisms, type objects, coalgebras, automata, and module bindings are all
 * read by the same FCA operation: a species is one addressed intent and
 * obstruction formula over the shared JSNode attribute vocabulary.
 */
export const nodeBeingTaxa = Object.freeze([
  taxon("schema", "schemas", ["being:binding", "admission:reified"], ["being:callable", "being:class", "being:type-object"]),
  taxon("domain-morphism", "domain", ["being:callable", "context:anchored", "effects:none"], ["context:unresolved", "effects:one", "effects:multiple"]),
  taxon("generic-utility", "utils", ["being:callable", "context:none", "effects:none"], ["context:anchored", "context:unresolved", "effects:one", "effects:multiple"]),
  taxon("adapter", "adapters", ["being:callable", "effects:one", "model:concrete"], ["effects:none", "effects:multiple", "model:abstract"]),
  taxon("repository-port", "repositories", ["being:callable", "effects:one", "model:abstract"], ["effects:none", "effects:multiple", "model:concrete"]),
  taxon("service", "services", ["being:callable", "effects:multiple"], ["effects:none", "effects:one"]),
  taxon("controller", "controllers", ["being:callable", "effects:one", "port:request-response"], ["effects:none", "effects:multiple"]),
  taxon("command", "commands", ["being:callable", "port:command"], []),
  taxon("middleware", "middleware", ["being:callable", "continuation:reified"], []),
  taxon("validator", "validators", ["being:callable", "admission:checking"], []),
  taxon("mapper", "mappers", ["being:callable", "mapping:reified", "effects:none"], ["effects:one", "effects:multiple"]),
  taxon("hook", "hooks", ["being:callable", "hook:reified"], []),
  taxon("error", "errors", ["being:class", "error:reified"], []),
  taxon("entity", "entities", ["being:class", "coalgebra:reified"], ["error:reified"]),
  taxon("route-table", "routes", ["being:binding", "automaton:route-table"], []),
  taxon("type-object", "types", ["being:type-object"], ["boundary:transfer"]),
  taxon("boundary-transfer-object", "dto", ["being:type-object", "boundary:transfer"], []),
  taxon("plugin", "plugins", ["being:binding", "signature:extension"], []),
  taxon("state-binding", "state", ["being:binding", "reference-cell:reified"], []),
  taxon("domain-value", "domain", ["being:binding", "context:anchored"], ["admission:reified", "automaton:route-table", "signature:extension", "reference-cell:reified"]),
  taxon("generic-value", "utils", ["being:binding", "context:none"], ["context:unresolved", "admission:reified", "automaton:route-table", "signature:extension", "reference-cell:reified"]),
]);

/** Address of the realized JSNode formal context, across every observed being. */
export const nodeBeingTaxonomyIdentity = artifactId(Object.freeze({
  kind: "metroplat.language.jsnode.taxonomy",
  scope: "beings",
  taxa: Object.freeze(nodeBeingTaxa.map((entry) => entry.identity)),
}));

const taxonByName = new Map(nodeBeingTaxa.map((entry) => [entry.name, entry]));
const taxonomicVocabulary = new Set(nodeBeingTaxa.flatMap((entry) => [...entry.intent, ...entry.obstructedBy]));
const taxonomyReadingCache = new Map();
const speciesFormulaCache = new Map();
const formalContextCache = new Map();

/** Canonical predicate names asserted by one host observation. */
export function nodeBeingPredicates(being) {
  return Object.freeze([...new Set(being.predicates.map((evidence) => evidence.predicate))].sort());
}

export function nodeBeingTaxon(name) {
  return taxonByName.get(name);
}

/** Read one observed being against one addressed taxon using SEN FCA. */
export function readNodeBeingTaxon(
  being,
  taxonValue,
) {
  const resolved = typeof taxonValue === "string" ? nodeBeingTaxon(taxonValue) : taxonValue;
  const predicates = nodeBeingPredicates(being);
  const attributes = new Set(predicates);
  // This is the one-object instance of FCA extent membership.  The former
  // executable SEN filter was a retired boolean/list program: after FOUR
  // became the canonical predicate carrier it silently produced an empty
  // extent.  Reading the finite incidence relation directly keeps the
  // taxonomy's claim exact without routing this observer through that
  // obsolete program.
  const witnessed = resolved.intent.every((attribute) => attributes.has(attribute));
  const support = Object.freeze(resolved.intent.filter((attribute) => attributes.has(attribute)));
  const missing = Object.freeze(resolved.intent.filter((attribute) => !attributes.has(attribute)));
  const obstructions = Object.freeze(resolved.obstructedBy.filter((attribute) => attributes.has(attribute)));
  const obstructed = obstructions.length > 0;
  const reading = witnessed
    ? obstructed ? "contested" : "held"
    : obstructed ? "denied" : "unknown";
  return Object.freeze({
    kind: "metroplat.language.jsnode.taxon-reading",
    taxon: resolved.name,
    taxonIdentity: resolved.identity,
    layer: resolved.layer,
    reading,
    support,
    missing,
    obstructions,
    defect: missing.length + obstructions.length,
  });
}

/**
 * Derive whether one positive species reading is executable evidence.
 *
 * FCA membership establishes which intent predicates are present; relocation
 * authority additionally requires every predicate in that exact support to
 * have at least one reified host-language witness. A contested membership or
 * an identifier-convention-only support remains heuristic.
 */
export function nodeBeingTaxonConfidence(
  being,
  taxonValue,
) {
  const reading = readNodeBeingTaxon(being, taxonValue);
  if (reading.reading !== "held") return "heuristic";
  const evidenceByPredicate = new Map();
  for (const evidence of being.predicates) {
    const current = evidenceByPredicate.get(evidence.predicate) ?? [];
    current.push(evidence);
    evidenceByPredicate.set(evidence.predicate, current);
  }
  return reading.support.every((predicate) =>
    evidenceByPredicate.get(predicate)?.some((evidence) => evidence.confidence === "reified") === true)
    ? "reified"
    : "heuristic";
}

/** Read every currently defined JSNode species for one observed being. */
export function readNodeBeingTaxonomy(being) {
  // FCA membership depends only on attributes named by the taxonomy, not on a
  // symbol's path, port names, or other descriptive predicates. Evaluate each
  // distinct formulaic species once and reuse that exact SEN reading for every
  // individual with the same taxonomic signature.
  const signature = nodeBeingPredicates(being).filter((attribute) => taxonomicVocabulary.has(attribute)).sort();
  const key = JSON.stringify(signature);
  const cached = taxonomyReadingCache.get(key);
  if (cached !== undefined) return cached;
  const probe = Object.freeze({
    kind: "metroplat.language.jsnode.being",
    subject: "metroplat.language.jsnode.taxonomic-probe",
    predicates: Object.freeze(signature.map((predicate) => Object.freeze({
      predicate,
      basis: "syntax",
      confidence: "reified",
    }))),
    ports: Object.freeze([]),
  });
  const readings = Object.freeze(nodeBeingTaxa.map((entry) => readNodeBeingTaxon(probe, entry)));
  taxonomyReadingCache.set(key, readings);
  return readings;
}

/**
 * Close one host observation to its reusable SEN/FCA species formula.
 *
 * This is the bridge from "a TypeScript declaration" to "an informational
 * molecule of a Node species": the individual stays distinct in topology,
 * while formula equality is content equality over the exact predicates which
 * the taxonomy can currently observe.
 */
export function nodeBeingSpeciesFormula(being) {
  const attributes = Object.freeze(nodeBeingPredicates(being)
    .filter((attribute) => taxonomicVocabulary.has(attribute))
    .sort());
  const key = JSON.stringify(attributes);
  const cached = speciesFormulaCache.get(key);
  if (cached !== undefined) return cached;
  const readings = readNodeBeingTaxonomy(being);
  const namesAt = (reading) => Object.freeze(
    readings.filter((reading) => reading.reading === reading).map((reading) => reading.taxon).sort(),
  );
  const material = Object.freeze({
    kind: "metroplat.language.jsnode.species-formula",
    taxonomy: nodeBeingTaxonomyIdentity,
    attributes,
    held: namesAt("held"),
    denied: namesAt("denied"),
    contested: namesAt("contested"),
    unknown: namesAt("unknown"),
  });
  const formula = Object.freeze({ ...material, identity: artifactId(material) });
  speciesFormulaCache.set(key, formula);
  return formula;
}

/**
 * Close observed molecular formulae into one content-addressed FCA context.
 *
 * This intentionally uses formula identities rather than declaration paths as
 * formal subjects: path is the carrier under judgment, while the formula is
 * the informational being being measured. No powerset is enumerated.
 */
export function nodeBeingFormalContext(
  formulas,
) {
  const byIdentity = new Map();
  for (const formula of formulas) {
    if (formula.taxonomy !== nodeBeingTaxonomyIdentity) {
      throw new TypeError(`Node-being formula belongs to another taxonomy: ${formula.identity}`);
    }
    const known = byIdentity.get(formula.identity);
    if (known === undefined) byIdentity.set(formula.identity, { formula, occurrences: 1 });
    else known.occurrences += 1;
  }
  const entries = [...byIdentity.values()].sort((left, right) => left.formula.identity.localeCompare(right.formula.identity));
  const populations = Object.freeze(entries.map(({ formula, occurrences }) => Object.freeze({
    formula: formula.identity,
    occurrences,
  })));
  const predicates = Object.freeze([...new Set(entries.flatMap(({ formula }) => formula.attributes))].sort());
  const cells = Object.freeze(entries.flatMap(({ formula }) => formula.attributes.map((predicate) => Object.freeze({
    subject: formula.identity,
    predicate,
  }))));
  const material = Object.freeze({
    kind: "metroplat.language.jsnode.formal-context",
    taxonomy: nodeBeingTaxonomyIdentity,
    formulas: populations,
    predicates,
    cells,
  });
  return Object.freeze({ ...material, identity: artifactId(material) });
}

/** Read one predefined Node taxon as a closed concept of an observed context. */
export function readNodeBeingSpeciesConcept(
  context,
  taxonValue,
) {
  const resolved = typeof taxonValue === "string" ? nodeBeingTaxon(taxonValue) : taxonValue;
  const occurrenceByFormula = new Map(context.formulas.map((entry) => [entry.formula, entry.occurrences]));
  const finite = context.cells.length === 0
    ? undefined
    : formalContextCache.get(context.identity) ?? finiteFcaContext(context.cells);
  if (finite !== undefined) formalContextCache.set(context.identity, finite);
  const extent = Object.freeze((finite === undefined ? [] : extentOfIntent(finite, resolved.intent))
    .map((formula) => formula)
    .sort());
  const intent = Object.freeze((finite === undefined ? [] : intentOfExtent(finite, extent)).slice().sort());
  const population = extent.reduce((total, formula) => total + (occurrenceByFormula.get(formula) ?? 0), 0);
  const material = Object.freeze({
    kind: "metroplat.language.jsnode.species-concept",
    context: context.identity,
    taxon: resolved.name,
    taxonIdentity: resolved.identity,
    layer: resolved.layer,
    extent,
    intent,
    population,
  });
  return Object.freeze({ ...material, identity: artifactId(material) });
}

/** Read every predefined Node taxon in the same observed formal context. */
export function readNodeBeingSpeciesConcepts(
  context,
) {
  return Object.freeze(nodeBeingTaxa.map((entry) => readNodeBeingSpeciesConcept(context, entry)));
}
