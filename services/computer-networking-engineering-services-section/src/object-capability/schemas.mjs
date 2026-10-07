/**
 * schemas holds the JSON-schema surfaces for capability values and protocol-facing capability records.
 * It may import values and schema, but it must not import records, logic, fixpoint, math, codecs, contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */
import { readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const jsonValueSchema = {};

/** The domain notation names (`held`/`denied`/`contested`/`unknown`) `readingOf`
 *  folds capability, principal, and authority evidence into — never the raw
 *  Belnap reading-value names (`potential`/`active`/`stable`/`absurd`), which
 *  are an internal implementation detail of the bilattice-reading algebra. */
const readingNotationNames = Object.freeze(readingFamilies.extremal);

export const objectCapabilitySchema = {
  $id: "metroplat/codecs/text/json/capability/object-capability",
  title: "ObjectCapability",
  description: "A finite object-capability: holder, resource locus, allowed actions, and caveats.",
  type: "object",
  required: ["kind", "holder", "resource", "actions", "caveats"],
  properties: {
    kind: { const: "capability.object" },
    holder: { type: "string", minLength: 1 },
    resource: { type: "string", minLength: 1 },
    actions: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    caveats: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

export const capabilityViewSchema = {
  $id: "metroplat/codecs/text/json/capability/view",
  title: "CapabilityView",
  description: "A locus-shaped object-capability view recovered from the older OCapPub/playing surface: holder, grant, id, and optional parent provenance.",
  type: "object",
  required: ["kind", "id", "grants", "holder"],
  properties: {
    kind: { const: "capability.view" },
    id: { type: "string", minLength: 1 },
    grants: { type: "string", minLength: 1 },
    holder: { type: "string", minLength: 1 },
    parent: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const capabilityDelegationSchema = {
  $id: "metroplat/codecs/text/json/capability/delegation",
  title: "CapabilityDelegation",
  description: "A UCAN-shaped finite delegation whose child capability must attenuate its parent.",
  type: "object",
  required: ["kind", "issuer", "audience", "parent", "child", "proof"],
  properties: {
    kind: { const: "capability.delegation" },
    issuer: { type: "string", minLength: 1 },
    audience: { type: "string", minLength: 1 },
    parent: objectCapabilitySchema,
    child: objectCapabilitySchema,
    proof: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const capabilityDelegationJudgmentSchema = {
  $id: "metroplat/codecs/text/json/capability/delegation-judgment",
  title: "CapabilityDelegationJudgment",
  description: "Witness or obstruction for a capability delegation attenuation check.",
  type: "object",
  required: ["kind", "delegation", "ok", "reasons"],
  properties: {
    kind: { enum: ["capability.delegation:witness", "capability.delegation-obstruction"] },
    delegation: capabilityDelegationSchema,
    ok: { type: "boolean" },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

export const ucanTokenSchema = {
  $id: "metroplat/codecs/text/json/capability/ucan/token",
  title: "UcanToken",
  description: "A portable UCAN token carrying a capability view, parent token provenance, issuance time, and structural proof material.",
  type: "object",
  required: ["kind", "id", "issuer", "audience", "authority", "issuedAt", "proof"],
  properties: {
    kind: { const: "ucan.token" },
    id: { type: "string", minLength: 1 },
    issuer: { type: "string", minLength: 1 },
    audience: { type: "string", minLength: 1 },
    authority: capabilityViewSchema,
    issuedAt: { type: "string", minLength: 1 },
    proof: { type: "string", minLength: 1 },
    parent: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const ucanVerificationSchema = {
  $id: "metroplat/codecs/text/json/capability/ucan/verification",
  title: "UcanVerification",
  description: "Witness or obstruction for a UCAN token chain: proof material and every parent-child attenuation step are checked.",
  type: "object",
  required: ["kind", "token", "checked", "ok", "reasons"],
  properties: {
    kind: { enum: ["ucan.verification:witness", "ucan.verification-obstruction"] },
    token: ucanTokenSchema,
    checked: { type: "array", items: ucanTokenSchema },
    ok: { type: "boolean" },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

export const ucanRevocationSchema = {
  $id: "metroplat/codecs/text/json/capability/ucan/revocation",
  title: "UcanRevocation",
  description: "A finite revocation reading for a UCAN token: who revoked which portable authority and when.",
  type: "object",
  required: ["kind", "token", "by", "at"],
  properties: {
    kind: { const: "ucan.revocation" },
    token: ucanTokenSchema,
    by: { type: "string", minLength: 1 },
    at: { type: "string", minLength: 1 },
    reason: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const capabilityInvocationSchema = {
  $id: "metroplat/codecs/text/json/capability/invocation",
  title: "CapabilityInvocation",
  description: "A requested action at a resource locus by an actor.",
  type: "object",
  required: ["kind", "actor", "resource", "action", "input"],
  properties: {
    kind: { const: "capability.invocation" },
    actor: { type: "string", minLength: 1 },
    resource: { type: "string", minLength: 1 },
    action: { type: "string", minLength: 1 },
    input: jsonValueSchema,
  },
  additionalProperties: false,
};

export const capabilityInvocationJudgmentSchema = {
  $id: "metroplat/codecs/text/json/capability/invocation-judgment",
  title: "CapabilityInvocationJudgment",
  description: "Witness or obstruction for invoking a capability.",
  type: "object",
  required: ["kind", "capability", "invocation", "ok", "reasons"],
  properties: {
    kind: { enum: ["capability.invocation:witness", "capability.invocation-obstruction"] },
    capability: objectCapabilitySchema,
    invocation: capabilityInvocationSchema,
    ok: { type: "boolean" },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

export const capabilityInteractionSchema = {
  $id: "metroplat/codecs/text/json/capability/interaction",
  title: "CapabilityInteraction",
  description: "An object-capability interaction reading: grant, delegation, invocation, or revocation of a capability view.",
  type: "object",
  required: ["kind", "action", "capability", "ok", "reasons"],
  properties: {
    kind: { const: "capability.interaction" },
    action: { enum: ["grant", "delegate", "invoke", "revoke"] },
    capability: capabilityViewSchema,
    actor: { type: "string", minLength: 1 },
    target: { type: "string", minLength: 1 },
    ok: { type: "boolean" },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

export const a2aAgentCardSchema = {
  $id: "metroplat/codecs/text/json/capability/a2a-agent-card",
  title: "A2AAgentCard",
  description: "An Agent2Agent-style card projected from object capabilities.",
  type: "object",
  required: ["kind", "agent", "endpoint", "capabilities"],
  properties: {
    kind: { const: "a2a.agent-card" },
    agent: { type: "string", minLength: 1 },
    endpoint: { type: "string", minLength: 1 },
    capabilities: { type: "array", items: objectCapabilitySchema },
  },
  additionalProperties: false,
};

export const a2aTaskSchema = {
  $id: "metroplat/codecs/text/json/capability/a2a-task",
  title: "A2ATask",
  description: "An Agent2Agent task read as a capability invocation boundary.",
  type: "object",
  required: ["kind", "taskId", "contextId", "capability", "input"],
  properties: {
    kind: { const: "a2a.task" },
    taskId: { type: "string", minLength: 1 },
    contextId: { type: "string", minLength: 1 },
    capability: objectCapabilitySchema,
    input: jsonValueSchema,
  },
  additionalProperties: false,
};

export * from "./captp/schema.mjs";

export const macaroonCaveatSchema = {
  $id: "metroplat/codecs/text/json/capability/macaroons/caveat",
  title: "MacaroonCaveat",
  description: "A first- or third-party caveat read as attenuation of a carried capability view.",
  type: "object",
  required: ["kind", "id", "predicate", "grants"],
  properties: {
    kind: { const: "macaroon.caveat" },
    id: { type: "string", minLength: 1 },
    predicate: { type: "string", minLength: 1 },
    grants: { type: "string", minLength: 1 },
    thirdPartyHolder: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const macaroonTokenSchema = {
  $id: "metroplat/codecs/text/json/capability/macaroons/token",
  title: "MacaroonToken",
  description: "A portable caveat-attenuated token carrying a capability view and structural signature witness.",
  type: "object",
  required: ["kind", "id", "capability", "caveats", "signature"],
  properties: {
    kind: { const: "macaroon.token" },
    id: { type: "string", minLength: 1 },
    capability: capabilityViewSchema,
    caveats: { type: "array", items: macaroonCaveatSchema },
    signature: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const macaroonDischargeSchema = {
  $id: "metroplat/codecs/text/json/capability/macaroons/discharge",
  title: "MacaroonDischarge",
  description: "A delegated discharge for a third-party caveat.",
  type: "object",
  required: ["kind", "caveat", "holder", "proof"],
  properties: {
    kind: { const: "macaroon.discharge" },
    caveat: { type: "string", minLength: 1 },
    holder: { type: "string", minLength: 1 },
    proof: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const macaroonInvocationJudgmentSchema = {
  $id: "metroplat/codecs/text/json/capability/macaroons/invocation",
  title: "MacaroonInvocationJudgment",
  description: "Witness or obstruction for invoking a caveat-attenuated macaroon token.",
  type: "object",
  required: ["kind", "token", "affordances", "discharges", "ok", "reasons", "finalGrant"],
  properties: {
    kind: { enum: ["macaroon.invocation:witness", "macaroon.invocation-obstruction"] },
    token: macaroonTokenSchema,
    affordances: { type: "array", items: { type: "string", minLength: 1 } },
    discharges: { type: "array", items: macaroonDischargeSchema },
    ok: { type: "boolean" },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
    finalGrant: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const wasiPreopenSchema = {
  $id: "metroplat/codecs/text/json/capability/wasi/preopen",
  title: "WasiPreopen",
  description: "A WASI preopened handle read as a capability view over an explicit path and rights set.",
  type: "object",
  required: ["kind", "handle", "path", "rights", "capability"],
  properties: {
    kind: { const: "wasi.preopen" },
    handle: { type: "string", minLength: 1 },
    path: { type: "string", minLength: 1 },
    rights: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    capability: capabilityViewSchema,
  },
  additionalProperties: false,
};

export const wasiInvocationSchema = {
  $id: "metroplat/codecs/text/json/capability/wasi/invocation",
  title: "WasiInvocation",
  description: "A WASI host call attempted through a preopened capability handle.",
  type: "object",
  required: ["kind", "handle", "operation", "path", "right"],
  properties: {
    kind: { const: "wasi.invocation" },
    handle: { type: "string", minLength: 1 },
    operation: { type: "string", minLength: 1 },
    path: { type: "string", minLength: 1 },
    right: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const wasiCutJudgmentSchema = {
  $id: "metroplat/codecs/text/json/capability/wasi/cut",
  title: "WasiCutJudgment",
  description: "Witness or obstruction for a WASI invocation cut against a preopened capability handle.",
  type: "object",
  required: ["kind", "preopen", "invocation", "ok", "reasons"],
  properties: {
    kind: { enum: ["wasi.cut:witness", "wasi.cut-obstruction"] },
    preopen: wasiPreopenSchema,
    invocation: wasiInvocationSchema,
    ok: { type: "boolean" },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

export const webauthnIdentityFacetSchema = {
  $id: "metroplat/codecs/text/json/capability/webauthn/identity-facet",
  title: "WebAuthnIdentityFacet",
  description: "A WebAuthn/passkey credential facet read as an identity-owned capability locus.",
  type: "object",
  required: ["kind", "id", "rpId", "publicKey", "keyId"],
  properties: {
    kind: { const: "webauthn.identity-facet" },
    id: { type: "string", minLength: 1 },
    rpId: { type: "string", minLength: 1 },
    publicKey: { type: "string", minLength: 1 },
    keyId: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const webauthnRegistrationSchema = {
  $id: "metroplat/codecs/text/json/capability/webauthn/registration",
  title: "WebAuthnRegistration",
  description: "A WebAuthn registration that grants the credential facet as a held capability view.",
  type: "object",
  required: ["kind", "credential", "capability", "registered"],
  properties: {
    kind: { const: "webauthn.registration" },
    credential: webauthnIdentityFacetSchema,
    capability: capabilityViewSchema,
    registered: { type: "boolean" },
  },
  additionalProperties: false,
};

export const webauthnChallengeSchema = {
  $id: "metroplat/codecs/text/json/capability/webauthn/challenge",
  title: "WebAuthnChallenge",
  description: "A one-shot WebAuthn challenge naming the registered relying party, credential, and grant locus.",
  type: "object",
  required: ["kind", "id", "rpId", "credential", "grants", "nonce"],
  properties: {
    kind: { const: "webauthn.challenge" },
    id: { type: "string", minLength: 1 },
    rpId: { type: "string", minLength: 1 },
    credential: { type: "string", minLength: 1 },
    grants: { type: "string", minLength: 1 },
    nonce: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const webauthnAssertionSchema = {
  $id: "metroplat/codecs/text/json/capability/webauthn/assertion",
  title: "WebAuthnAssertion",
  description: "A structural proof-of-possession assertion for a WebAuthn challenge.",
  type: "object",
  required: ["kind", "credential", "challenge", "grants", "holder", "clientDataHash", "authenticatorData", "signature", "verified", "exercisable"],
  properties: {
    kind: { const: "webauthn.assertion" },
    credential: { type: "string", minLength: 1 },
    challenge: { type: "string", minLength: 1 },
    grants: { type: "string", minLength: 1 },
    holder: { type: "string", minLength: 1 },
    clientDataHash: { type: "string", minLength: 1 },
    authenticatorData: { type: "string", minLength: 1 },
    signature: { type: "string", minLength: 1 },
    verified: { type: "boolean" },
    exercisable: { type: "boolean" },
  },
  additionalProperties: false,
};

export const webauthnCutJudgmentSchema = {
  $id: "metroplat/codecs/text/json/capability/webauthn/cut",
  title: "WebAuthnCutJudgment",
  description: "Witness or obstruction for cutting a WebAuthn challenge against a held credential assertion.",
  type: "object",
  required: ["kind", "challenge", "assertion", "ok", "reasons", "daimonLoci"],
  properties: {
    kind: { enum: ["webauthn.cut:witness", "webauthn.cut-obstruction"] },
    challenge: webauthnChallengeSchema,
    assertion: webauthnAssertionSchema,
    ok: { type: "boolean" },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
    daimonLoci: { type: "array", items: { type: "array", items: { type: "number" } } },
  },
  additionalProperties: false,
};

export const capabilityAssertionSchema = {
  $id: "metroplat/codecs/text/json/capability/memetics/assertion",
  title: "CapabilityAssertion",
  description: "A row-level object-capability assertion: grant, revoke, attenuate, delegate, or present.",
  type: "object",
  required: ["kind", "assertion", "issuer", "holder", "grants", "at"],
  properties: {
    kind: { const: "capability.assertion" },
    assertion: { enum: ["grant", "revoke", "attenuate", "delegate", "present"] },
    issuer: { type: "string", minLength: 1 },
    holder: { type: "string", minLength: 1 },
    grants: { type: "string", minLength: 1 },
    at: { type: "string", minLength: 1 },
    parent: { type: "string", minLength: 1 },
    accountable: { type: "string", minLength: 1 },
    allocation: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const capabilityStandingSchema = {
  $id: "metroplat/codecs/text/json/capability/memetics/standing",
  title: "CapabilityStanding",
  description: "A FOUR-style fold over capability assertions: granted/revoked/present evidence and the resulting reading.",
  type: "object",
  required: ["kind", "holder", "grants", "value", "granted", "revoked", "present"],
  properties: {
    kind: { const: "capability.standing" },
    holder: { type: "string", minLength: 1 },
    grants: { type: "string", minLength: 1 },
    value: { enum: readingNotationNames },
    granted: { type: "boolean" },
    revoked: { type: "boolean" },
    present: { type: "boolean" },
    // Who granted what holds: the issuers of the granting assertions (an office, an allocation, a public liberty).
    issuers: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

export const principalAssertionSchema = {
  $id: "metroplat/codecs/text/json/capability/principal/assertion",
  title: "PrincipalAssertion",
  description: "A principal identity assertion: recognition, dispute, attestation, or authentication evidence.",
  type: "object",
  required: ["kind", "assertion", "issuer", "principal", "at"],
  properties: {
    kind: { const: "capability.principal-assertion" },
    assertion: { enum: ["recognize", "dispute", "attest", "authenticate"] },
    issuer: { type: "string", minLength: 1 },
    principal: { type: "string", minLength: 1 },
    as: { type: "string", minLength: 1 },
    proof: { type: "string", minLength: 1 },
    at: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const principalStandingSchema = {
  $id: "metroplat/codecs/text/json/capability/principal/standing",
  title: "PrincipalStanding",
  description: "A folded principal identity/authentication standing with disputes held as stable evidence.",
  type: "object",
  required: ["kind", "principal", "value", "recognizedAs", "disputed", "attestations", "settled"],
  properties: {
    kind: { const: "capability.principal-standing" },
    principal: { type: "string", minLength: 1 },
    value: { enum: readingNotationNames },
    recognizedAs: { type: "array", items: { type: "string", minLength: 1 } },
    disputed: { type: "array", items: { type: "string", minLength: 1 } },
    attestations: { type: "array", items: { type: "string", minLength: 1 } },
    settled: { type: "boolean" },
    freshness: { enum: ["fresh", "stale", "withheld"] },
  },
  additionalProperties: false,
};

export const authorityAssertionSchema = {
  $id: "metroplat/codecs/text/json/capability/authority/assertion",
  title: "AuthorityAssertion",
  description: "Recognition or withholding of a principal's authority to perform an action.",
  type: "object",
  required: ["kind", "assertion", "issuer", "principal", "action", "at"],
  properties: {
    kind: { const: "capability.authority-assertion" },
    assertion: { enum: ["recognizes", "withholds"] },
    issuer: { type: "string", minLength: 1 },
    principal: { type: "string", minLength: 1 },
    action: { type: "string", minLength: 1 },
    at: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const authorityDecisionSchema = {
  $id: "metroplat/codecs/text/json/capability/authority/decision",
  title: "AuthorityDecision",
  description: "A FOUR-style authority fold over recognized/withheld authority and held capabilities.",
  type: "object",
  required: ["kind", "principal", "action", "value", "recognized", "withheld", "capability"],
  properties: {
    kind: { const: "capability.authority-decision" },
    principal: { type: "string", minLength: 1 },
    action: { type: "string", minLength: 1 },
    value: { enum: readingNotationNames },
    recognized: { type: "boolean" },
    withheld: { type: "boolean" },
    capability: capabilityStandingSchema,
  },
  additionalProperties: false,
};

export const oauthDelegatedAccessSchema = {
  $id: "metroplat/codecs/text/json/capability/authority/oauth-delegated-access",
  title: "OAuthDelegatedAccess",
  description: "An OAuth-style finite delegated-access descriptor: a client, subject, resource server, scopes, status, and evidence.",
  type: "object",
  required: ["kind", "issuer", "subject", "client", "resourceServer", "scopes", "status"],
  properties: {
    kind: { const: "authority.oauth-delegated-access" },
    issuer: { type: "string", minLength: 1 },
    subject: { type: "string", minLength: 1 },
    client: { type: "string", minLength: 1 },
    resourceServer: { type: "string", minLength: 1 },
    scopes: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    status: { enum: ["active", "revoked", "expired"] },
    evidence: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

// codexPluginAffordanceSchema/SchemaContract moved to
// src/integrations/openai/codex/schema.mts — it is Codex's
// own plugin-manifest shape, not a generic capability concept; this file
// re-imports it below only because `attenuatedAuthorityCutSchema` names
// "codex-plugin" as one of several authority-cut face kinds it can carry.

export const authorityCutRequestSchema = {
  type: "object",
  required: ["actor", "resource", "action"],
  properties: {
    actor: { type: "string", minLength: 1 },
    resource: { type: "string", minLength: 1 },
    action: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const authorityCutFaceSchema = {
  type: "object",
  required: ["kind", "name", "status", "reasons", "material"],
  properties: {
    kind: { enum: ["capability", "openai-tool", "mcp-catalog-transport", "oauth-delegation", "codex-plugin"] },
    name: { type: "string", minLength: 1 },
    status: { enum: ["admitted", "blocked", "discharged"] },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
    material: jsonValueSchema,
  },
  additionalProperties: false,
};

const authorityCutContextualityOutcomeSchema = {
  enum: ["admitted", "blocked", "discharged", "missing"],
};

const authorityCutContextualityContextSchema = {
  type: "object",
  required: ["face", "status"],
  properties: {
    face: { enum: ["capability", "openai-tool", "mcp-catalog-transport", "oauth-delegation", "codex-plugin"] },
    status: authorityCutContextualityOutcomeSchema,
  },
  additionalProperties: false,
};

const authorityCutContextualityStatusBucketSchema = {
  type: "object",
  required: ["status", "faces"],
  properties: {
    status: authorityCutContextualityOutcomeSchema,
    faces: { type: "array", items: { enum: ["capability", "openai-tool", "mcp-catalog-transport", "oauth-delegation", "codex-plugin"] } },
  },
  additionalProperties: false,
};

const authorityCutContextualityReadoutSchema = {
  type: "object",
  required: ["kind", "model", "measurement", "contexts", "classification"],
  properties: {
    kind: { const: "metroplat.authority.contextuality-readout" },
    model: { const: "Obsmetrologia.QuantumContextuality.MeasurementScenario" },
    measurement: { const: "request" },
    contexts: { type: "array", items: authorityCutContextualityContextSchema, minItems: 1 },
    classification: { enum: ["noncontextual", "strongly-contextual"] },
    globalStatus: authorityCutContextualityOutcomeSchema,
    obstruction: {
      type: "object",
      required: ["kind", "theorem", "hasNoGlobalSection", "statuses", "facesByStatus"],
      properties: {
        kind: { const: "metroplat.authority.strong-contextuality-obstruction" },
        theorem: { const: "Obsmetrologia.QuantumContextuality.stronglyContextual_iff" },
        hasNoGlobalSection: { const: true },
        statuses: { type: "array", items: authorityCutContextualityOutcomeSchema, minItems: 2 },
        facesByStatus: { type: "array", items: authorityCutContextualityStatusBucketSchema, minItems: 2 },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const attenuatedAuthorityCutSchema = {
  $id: "metroplat/codecs/text/json/capability/authority/attenuated-cut",
  title: "AttenuatedAuthorityCut",
  description: "A finite authority-cut receipt joining capability, protocol descriptor, delegated-access, and plugin affordance faces.",
  type: "object",
  required: ["kind", "locus", "request", "faces", "admitted", "blocked", "discharged", "missing", "contextuality", "ok"],
  properties: {
    kind: { const: "metroplat.authority.attenuated-cut" },
    locus: { type: "string", minLength: 1 },
    request: authorityCutRequestSchema,
    faces: { type: "array", items: authorityCutFaceSchema },
    admitted: { type: "array", items: { type: "string", minLength: 1 } },
    blocked: { type: "array", items: { type: "string", minLength: 1 } },
    discharged: { type: "array", items: { type: "string", minLength: 1 } },
    missing: { type: "array", items: { type: "string", minLength: 1 } },
    contextuality: authorityCutContextualityReadoutSchema,
    ok: { type: "boolean" },
  },
  additionalProperties: false,
};
