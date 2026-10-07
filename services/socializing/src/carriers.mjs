/**
 * carriers — socializing's single-source JSON-Schema carriers (relation-model notation), replacing
 * the former `*.schema.json` + `realize` codegen. Each `schemaFrom(schema)` registers a bare
 * package-rooted $id in relating's category and yields its type by `FromSchema<typeof schema>`.
 *
 * The CROSS-PACKAGE reused carriers — `agent` (animating), `meme` (a SignCell) and its evidence (SignChain),
 * `channel` (communicating) — are kept as loose unknown slots (exactly what `realize`
 * emitted: it cannot resolve cross-package `$ref`s); `field.mts` refines them to the reused-carrier
 * runtime shape (`JsonRecord`). The carriers are referenced, never redefined here.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { evidenceSchema } from "@red-cup-engineering/signchain/bilattice";
import { closureRegimeNames } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";

const regimeSchema = {
  enum: [...closureRegimeNames],
  description: "the joint closure regime: the costliest of the observers' knowledge-orbit regimes",
};

const memberSchema = {
  type: "object",
  description: "one observer o in O: an agent carrying its local memes (the valuation of its settling V(o)).",
  required: ["kind", "agent", "memes"],
  properties: {
    kind: { const: "socializing.member" },
    agent: { description: "the observer's agent (reused from animating; referenced, never redefined)" },
    memes: {
      type: "array",
      items: {},
      description: "the observer's local memes - the valuation of its settling V(o) (reused from relating)",
    },
  },
  additionalProperties: false,
};

const translationSchema = {
  type: "object",
  description: "a translation settling-morphism alpha: source -> target in the observer category O - the directed perspective map V(alpha): V(source) -> V(target).",
  required: ["kind", "source", "target", "channel"],
  properties: {
    kind: { const: "socializing.translation" },
    source: { type: "integer", minimum: 0 },
    target: { type: "integer", minimum: 0 },
    channel: { description: "the medium the translation travels (reused from communicating)" },
    basis: { type: "string", description: "the optional warrant for the <=_k refinement (the CommonGroundBasis lineage)" },
  },
  additionalProperties: false,
};

const componentSchema = {
  type: "object",
  required: ["members", "pooled", "common"],
  properties: {
    members: { type: "array", items: { type: "integer" } },
    pooled: { allOf: [evidenceSchema], description: "knowledge-join (the CRDT join_k merge fixpoint over the component): an evidence pair" },
    common: { allOf: [evidenceSchema], description: "knowledge-meet (the consensus limit over the component): an evidence pair" },
  },
  additionalProperties: false,
};

const commonGroundSchema = {
  type: "object",
  description: "the glued global section (the apex) and its obstruction, plus the regime stratification - two orthogonal axes (static opinion + dynamic regime).",
  required: ["kind", "glued", "obstruction", "coordinationFree", "regime", "regimeCoordinationFree", "federationDiscipline", "components"],
  properties: {
    kind: { const: "socializing.common-ground" },
    glued: { type: "boolean", description: "obstruction=0: the observers' opinions glue into a global section (static consensus)" },
    obstruction: { type: "integer", minimum: 0, description: "H1 of the opposition subgraph (first Betti number) - the static opinion-disagreement" },
    coordinationFree: { type: "boolean", description: "opinion axis: obstruction = 0 (the fixed opinions glue)" },
    cohomology: { description: "finite relating cohomology receipt for the opposition subgraph: H0/H1, vanishing judgment, and normalized SEN carrier" },
    regime: regimeSchema,
    regimeCoordinationFree: { type: "boolean", description: "dynamic axis: the CRDT merge is coordination-free BY REGIME (true iff the settling sheaf H1 vanishes in the regime: strict or scott)" },
    federationDiscipline: {
      enum: ["endpoint-state", "trajectory"],
      description: "endpoint-state (strict/scott) or trajectory (transfinite-bounded/aperiodic) - what a merge/exchange must ship to preserve the H1 invariant",
    },
    closureOrdinal: { type: "integer", minimum: 0, description: "the settling depth k - gossip-merge rounds to quiesce to v-infinity; written by settle, absent on an unsettled snapshot" },
    components: { type: "array", items: componentSchema },
  },
  additionalProperties: false,
};

export const SocialFieldSchema = {
  $id: "socializing/social-field",
  type: "object",
  title: "SocialField",
  description:
    "The primary carrier socializing works over - its core morphisms transform it (SocialField -> SocialField); readings project it into derived carriers. A MULTI-OBSERVER SYSTEM: a functor V: O -> Settlings_B assigning each observer a settling over a shared base. Consensus is the limit lim_O V(o) (knowledge-meet); disagreement is its cohomological obstruction H1(O, V). The richer structure lives off-diagonal, in the translations among distinct observers. $id is the bare package-rooted path.",
  required: ["kind", "members", "base", "section"],
  properties: {
    kind: { const: "socializing.social-field" },
    members: {
      type: "array",
      items: memberSchema,
      description: "the sheaf of agents-with-local-memes (the observers o in O)",
    },
    base: {
      type: "object",
      description: "the social base = the OBSERVER CATEGORY O: objects are the members (by index), non-identity morphisms the directed translations. A base with no translations is a DISCRETE O (the degenerate diagonal case).",
      required: ["kind", "translations"],
      properties: {
        kind: { const: "socializing.social-base" },
        translations: { type: "array", items: translationSchema },
      },
      additionalProperties: false,
    },
    section: commonGroundSchema,
  },
  additionalProperties: false,
};

export const socialFieldCarrier = schemaFrom(SocialFieldSchema);

const disagreementSchema = {
  type: "object",
  required: ["subject", "predicate", "object", "observers", "contraryObservers", "reading"],
  properties: {
    subject: {},
    predicate: { type: "string", minLength: 1 },
    contrary: { type: "string", minLength: 1 },
    object: {},
    observers: { type: "array", items: { type: "integer", minimum: 0 } },
    contraryObservers: { type: "array", items: { type: "integer", minimum: 0 } },
    reading: { const: "stable" },
  },
  additionalProperties: false,
};

export const AssertionDisagreementsSchema = {
  $id: "socializing/assertion-disagreements",
  type: "object",
  title: "AssertionDisagreements",
  description:
    "A derived read over a social field's observer-local assertion cells: a disagreement is a cell some observers tell for and others against — told against directly, or by holding a declared contrary predicate over the same subject and object — and so reads stable. $id is the bare package-rooted path.",
  required: ["kind", "disagreements"],
  properties: {
    kind: { const: "socializing.assertion-disagreements" },
    disagreements: { type: "array", items: disagreementSchema },
  },
  additionalProperties: false,
};

export const assertionDisagreementsCarrier = schemaFrom(AssertionDisagreementsSchema);

