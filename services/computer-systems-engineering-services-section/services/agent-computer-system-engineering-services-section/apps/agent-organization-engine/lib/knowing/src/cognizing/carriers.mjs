/**
 * cognizing/carriers — knowing's cognizing carriers, single-source JSON Schema
 * literals, no TypeBox and no codegen. Each carrier is one `as const` schema:
 * `FromSchema` reads it at compile time and `schemaFrom` registers the same
 * literal as the runtime validation law and bare `$id` identity.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { memeCarrier } from "@red-cup-engineering/relating";
import { readingSchema } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { closureRegimeNames, spineStages } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { orbitRegimeSchema } from "./section.mjs";

const heldMemeSchema = { $ref: memeCarrier.id };

const standingSchema = {
  ...readingSchema("knowledge"),
  description: "the meme's knowledge reading: where its evidence sits in the knowledge order <=_k (absurd bottom to stable top)",
};

const closureRegimeSchema = {
  enum: closureRegimeNames,
  description: "the closure-orbit class (Obsmetrologia ClosureRegime): strict, scott, transfinite-bounded, or aperiodic",
};

const recallRegimeSchema = {
  ...orbitRegimeSchema,
  description: "the recall-orbit class: the regime of the recall's knowledge orbit",
};

export const knowledgeStandingSchema = {
  $id: "knowing/knowledge-standing",
  title: "KnowledgeStanding",
  description: "knowing's read-out of a cognized meme's <=_k standing by the comonad counit: the FOUR value, whether settled, whether reflexive, and the per-side evidence-witness depth. $id is the bare package-rooted path.",
  type: "object",
  required: ["kind", "standing", "settled", "reflexive", "positiveEvidence", "negativeEvidence"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.knowledge-standing" },
    standing: standingSchema,
    settled: { type: "boolean", description: "true iff standing === 'stable' — the <=_k fixpoint is reached" },
    reflexive: { type: "boolean", description: "true iff the meme's subject or object is itself a meme" },
    positiveEvidence: { type: "integer", minimum: 0, description: "count of truth-side witness Marks" },
    negativeEvidence: { type: "integer", minimum: 0, description: "count of falsity-side witness Marks" },
  },
};
export const knowledgeStandingCarrier = schemaFrom(knowledgeStandingSchema);

export const knowledgeStateSchema = {
  $id: "knowing/knowledge-state",
  title: "KnowledgeState",
  description: "knowing's comonad context C(Meme): a held section of memes, the knower's whole standing body of knowledge. $id is the bare package-rooted path.",
  type: "object",
  required: ["kind", "base", "memes", "held", "settled", "contested", "glues"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.knowledge-state" },
    base: { type: "string", description: "a label for the base region the section is held over" },
    memes: { type: "array", items: heldMemeSchema, description: "the held section: the <=_k-folded memes" },
    held: { type: "integer", minimum: 0, description: "count of distinct cells held in the section" },
    settled: { type: "integer", minimum: 0, description: "count of held cells at the <=_k top" },
    contested: { type: "integer", minimum: 0, description: "count of held contradictions" },
    glues: { type: "boolean", description: "whether the section glues into a sheaf" },
  },
};
export const knowledgeStateCarrier = schemaFrom(knowledgeStateSchema);
/** A held meme (relating's meme carrier), kept structurally so the section is self-typing. */

export const memeCollectionSchema = {
  $id: "knowing/cognizing/meme-collection",
  title: "MemeCollection",
  description: "A cue or section seed admitted as either an array of relating meme carriers or { memes: [...] }.",
  anyOf: [
    { type: "array", items: { $ref: memeCarrier.id } },
    {
      type: "object",
      required: ["memes"],
      additionalProperties: true,
      properties: {
        memes: { type: "array", items: { $ref: memeCarrier.id } },
      },
    },
  ],
};
export const memeCollectionCarrier = schemaFrom(memeCollectionSchema);

export const knowledgeStatePairSchema = {
  $id: "knowing/knowledge-state-pair",
  title: "KnowledgeStatePair",
  description: "A pair of held knowledge-state carriers compared as mutually locally derivable sections.",
  type: "object",
  required: ["left", "right"],
  additionalProperties: false,
  properties: {
    left: { $ref: knowledgeStateCarrier.id },
    right: { $ref: knowledgeStateCarrier.id },
  },
};
export const knowledgeStatePairCarrier = schemaFrom(knowledgeStatePairSchema);

export const regimeSchema = {
  $id: "knowing/regime",
  title: "Regime",
  description: "INTELLIGENCE as the closure regime of a meme's knowledge orbit, and the stage of the language whose work that orbit is doing. reflect/ruminate are two values of this faculty. $id is the bare package-rooted path.",
  type: "object",
  required: ["kind", "regime", "stage", "converges", "monotone", "settled"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.regime" },
    regime: closureRegimeSchema,
    stage: { enum: [...spineStages], description: "the stage whose regime this is: aperiodic articulating, transfinite-bounded predicating, scott positing, strict settling" },
    converges: { type: "boolean", description: "whether the <=_k orbit reaches a fixpoint at all" },
    monotone: { type: "boolean", description: "the orbit is knowledge-monotone" },
    settled: { type: "boolean", description: "whether the meme already sits at its <=_k fixpoint" },
  },
};
export const regimeCarrier = schemaFrom(regimeSchema);

export const attractorSchema = {
  $id: "knowing/attractor",
  title: "Attractor",
  description: "knowing's read of MEMORY RECALL as ATTRACTOR DYNAMICS. A cue settles to the fixed-point attractor it lies in the basin of; the orbit never cycles, and the open question is the regime and whether the attractor is spurious. $id is the bare package-rooted path.",
  type: "object",
  required: ["kind", "cue", "attractor", "settled", "spurious", "regime", "terminates", "cycleFree", "recallable"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.attractor" },
    cue: { type: "integer", minimum: 0, description: "the cells presented in the recall cue" },
    attractor: { type: "integer", minimum: 0, description: "the cells of the fixed point the cue settles to" },
    settled: { type: "integer", minimum: 0, description: "cells committed to a definite for/against recall" },
    spurious: { type: "integer", minimum: 0, description: "the <=_k-top told-both cells in the attractor" },
    regime: recallRegimeSchema,
    terminates: { type: "boolean", description: "whether the recall orbit reaches its attractor at a bounded ordinal" },
    cycleFree: { type: "boolean", description: "the no-non-trivial-periodic-orbit guarantee" },
    recallable: { type: "boolean", description: "true iff terminates and spurious === 0" },
  },
};
export const attractorCarrier = schemaFrom(attractorSchema);

export const contextualitySchema = {
  $id: "knowing/contextuality",
  title: "Contextuality",
  description: "knowing's read of sheaf-theoretic contextuality: signed gluing of agree/disagree constraints across measurement contexts. $id is the bare package-rooted path.",
  type: "object",
  required: ["kind", "variables", "constraints", "contextual", "globalSection", "frustration"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.contextuality" },
    variables: { type: "integer", minimum: 0, description: "the distinct cells/propositions constrained across contexts" },
    constraints: { type: "integer", minimum: 0, description: "the agree/disagree constraints between cells" },
    contextual: { type: "boolean", description: "true when no global consistent assignment exists" },
    globalSection: { type: "boolean", description: "true when a global section exists" },
    frustration: { type: "integer", minimum: 0, description: "the count of constraints conflicting with the global coloring" },
  },
};
export const contextualityCarrier = schemaFrom(contextualitySchema);

export const contextualityConstraintSetSchema = {
  $id: "knowing/contextuality/constraint-set",
  title: "ContextualityConstraintSet",
  description: "The signed contextuality cover admitted either as an array of constraint strings or { constraints: [...] }.",
  anyOf: [
    { type: "array", items: { type: "string" } },
    {
      type: "object",
      required: ["constraints"],
      additionalProperties: true,
      properties: {
        constraints: { type: "array", items: { type: "string" } },
      },
    },
  ],
};
export const contextualityConstraintSetCarrier = schemaFrom(contextualityConstraintSetSchema);

export const consolidationSchema = {
  $id: "knowing/consolidation",
  title: "Consolidation",
  description: "the verdict of consolidating a held knowledge-state into a sheaf. $id is the bare package-rooted path.",
  type: "object",
  required: ["kind", "held", "settled", "contested", "glues", "consistent", "settledFraction"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.consolidation" },
    held: { type: "integer", minimum: 0, description: "count of distinct held cells in the section" },
    settled: { type: "integer", minimum: 0, description: "count of held cells at the <=_k top" },
    contested: { type: "integer", minimum: 0, description: "count of held both-sides-witnessed contradictions" },
    glues: { type: "boolean", description: "the sheaf-gluing condition" },
    consistent: { type: "boolean", description: "whether the section holds no contested cell" },
    settledFraction: { type: "number", minimum: 0, maximum: 1, description: "settled / held" },
  },
};
export const consolidationCarrier = schemaFrom(consolidationSchema);

export const derivabilitySchema = {
  $id: "knowing/derivability",
  title: "Derivability",
  description: "the verdict of judging two held knowledge-states mutually locally derivable. $id is the bare package-rooted path.",
  type: "object",
  required: ["kind", "equivalent", "leftSignature", "rightSignature", "sharedInvariant"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.derivability" },
    equivalent: { type: "boolean", description: "whether the two sections are mutually locally derivable" },
    leftSignature: { type: "string", description: "the canonical structural fingerprint of the left section" },
    rightSignature: { type: "string", description: "the canonical structural fingerprint of the right section" },
    sharedInvariant: { type: "boolean", description: "whether the classifying invariants agree" },
  },
};
export const derivabilityCarrier = schemaFrom(derivabilitySchema);

export const knowledgeIdentitySchema = {
  $id: "knowing/identity",
  title: "KnowledgeIdentity",
  description: "the identity of a meme's cell through memory's classical and paraconsistent equality predicates. $id is the bare package-rooted path.",
  type: "object",
  required: ["kind", "onDiagonal", "classical", "paraconsistent", "mergeStable"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.identity" },
    onDiagonal: { type: "boolean", description: "whether the meme's cell sits on the diagonal" },
    classical: { enum: ["t", "f"], description: "the classical two-valued equality" },
    paraconsistent: { enum: ["top", "bottom"], description: "the paraconsistent knowledge-order equality" },
    mergeStable: { type: "boolean", description: "the paraconsistent equality is stable under <=_k join-merge" },
  },
};
export const knowledgeIdentityCarrier = schemaFrom(knowledgeIdentitySchema);

export const modalStandingSchema = {
  $id: "knowing/modal-standing",
  title: "ModalStanding",
  description: "the modal standing of a meme across a world-set. $id is the bare package-rooted path.",
  type: "object",
  required: ["kind", "modality", "value", "worlds", "heldIn"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.modal-standing" },
    modality: { enum: ["necessity", "possibility"], description: "the modal operator taken" },
    value: standingSchema,
    worlds: { type: "integer", minimum: 0, description: "the number of worlds the modal operator ranged over" },
    heldIn: { type: "integer", minimum: 0, description: "count of worlds where the meme's cell is held non-absurd" },
  },
};
export const modalStandingCarrier = schemaFrom(modalStandingSchema);

export const modalWorldSetSchema = {
  $id: "knowing/modal-world-set",
  title: "ModalWorldSet",
  description: "The modal lift input: one relating meme and a world-set of knowing knowledge-state fibers.",
  type: "object",
  required: ["meme", "worlds"],
  additionalProperties: true,
  properties: {
    meme: { $ref: memeCarrier.id },
    worlds: { type: "array", items: { $ref: knowledgeStateCarrier.id } },
  },
};
export const modalWorldSetCarrier = schemaFrom(modalWorldSetSchema);

export const spectralBindingSchema = {
  $id: "knowing/spectral-binding",
  title: "SpectralBinding",
  description: "Knowing's spectral read of binding: feature count, percept components, and Matrix-Tree spanning-tree robustness.",
  type: "object",
  required: ["kind", "features", "percepts", "bound", "spanningTrees", "rigid", "redundant"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.spectral-binding" },
    features: { type: "integer", minimum: 0 },
    percepts: { type: "integer", minimum: 0 },
    bound: { type: "boolean" },
    spanningTrees: { type: "integer", minimum: 0 },
    rigid: { type: "boolean" },
    redundant: { type: "boolean" },
  },
};
export const spectralBindingCarrier = schemaFrom(spectralBindingSchema);

export const hodgeBindingSchema = {
  $id: "knowing/hodge-binding",
  title: "HodgeBinding",
  description: "Knowing's Hodge read of binding: feature count, edge-flow bindings, exact derivable flows, and harmonic irreducible flows.",
  type: "object",
  required: ["kind", "features", "bindings", "derivable", "irreducible"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.hodge-binding" },
    features: { type: "integer", minimum: 0 },
    bindings: { type: "integer", minimum: 0 },
    derivable: { type: "integer", minimum: 0 },
    irreducible: { type: "integer", minimum: 0 },
  },
};
export const hodgeBindingCarrier = schemaFrom(hodgeBindingSchema);

export const contextualSpectrumInputSchema = {
  $id: "knowing/contextual-spectrum/input",
  title: "ContextualSpectrumInput",
  description: "A held meme collection plus optional signed contextuality constraints.",
  type: "object",
  required: ["memes"],
  additionalProperties: true,
  properties: {
    memes: { type: "array", items: { $ref: memeCarrier.id } },
    constraints: { type: "array", items: { type: "string" } },
  },
};
export const contextualSpectrumInputCarrier = schemaFrom(contextualSpectrumInputSchema);

export const contextualSpectrumSchema = {
  $id: "knowing/contextual-spectrum",
  title: "ContextualSpectrum",
  description: "The phase bridge joining spectral/Hodge residue to signed contextuality obstruction.",
  type: "object",
  required: ["kind", "spectral", "hodge", "contextuality", "obstruction", "praxis", "theory"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.contextual-spectrum" },
    spectral: { $ref: spectralBindingCarrier.id },
    hodge: { $ref: hodgeBindingCarrier.id },
    contextuality: { $ref: contextualityCarrier.id },
    obstruction: { type: "object" },
    praxis: { type: "object" },
    theory: { type: "object" },
  },
};
export const contextualSpectrumCarrier = schemaFrom(contextualSpectrumSchema);

export const contextualDreamFrontierInputSchema = {
  $id: "knowing/contextual-dream-frontier/input",
  title: "ContextualDreamFrontierInput",
  description: "A contextual-spectrum input with an optional finite exploration limit.",
  type: "object",
  required: ["memes"],
  additionalProperties: true,
  properties: {
    memes: { type: "array", items: { $ref: memeCarrier.id } },
    constraints: { type: "array", items: { type: "string" } },
    limit: { type: "integer", minimum: 0 },
  },
};
export const contextualDreamFrontierInputCarrier = schemaFrom(contextualDreamFrontierInputSchema);

export const contextualDreamFrontierSchema = {
  $id: "knowing/contextual-dream-frontier",
  title: "ContextualDreamFrontier",
  description: "A contextual/spectral obstruction promoted into a finite-excluded aperiodic dream frontier.",
  type: "object",
  required: ["kind", "regime", "spectrum", "observations", "residue", "dream", "praxis", "bridge", "theory"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.contextual-dream-frontier" },
    regime: { const: "aperiodic" },
    spectrum: { $ref: contextualSpectrumCarrier.id },
    observations: { type: "array" },
    residue: { type: "object" },
    dream: { type: "object" },
    praxis: { type: "object" },
    bridge: { type: "object" },
    theory: { type: "object" },
  },
};
export const contextualDreamFrontierCarrier = schemaFrom(contextualDreamFrontierSchema);

