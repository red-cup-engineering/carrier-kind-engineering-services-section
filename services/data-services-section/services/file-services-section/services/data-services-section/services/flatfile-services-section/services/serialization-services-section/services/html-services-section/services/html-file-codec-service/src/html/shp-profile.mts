/** Declarative conformance profile for finite semantic-hypertext packets. */

export interface ShpProfileViolation {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface ShpObjectDeclaration {
  readonly id: string;
  readonly role: "semantic-hypertext-packet";
  readonly carrier: "html-document";
  readonly finite: true;
  readonly sourceTrace: string;
  readonly traceFrontier: readonly string[];
  readonly settlementEvidence: readonly string[];
  readonly projectionMorphism: string;
  readonly evidence: readonly string[];
}

export interface ShpDirectionDeclaration {
  readonly kind: "projection" | "markup";
  readonly inputCarrier: string;
  readonly outputCarrier: string;
  readonly morphism: string;
  readonly deterministic: true;
  readonly monotone: true;
  readonly evidence: readonly string[];
}

export interface ShpMorphismIdentityDeclaration {
  readonly className: string;
  readonly morphism: string;
  readonly source: "spotcomp" | "rfc7992";
  readonly carrierAttributes?: readonly string[];
  readonly evidence: readonly string[];
}

export interface ShpPacketGrammarDeclaration {
  readonly classNamesAreMorphismIdentities: true;
  readonly dataAttributesCarryInputCarrierElements: true;
  readonly carrierOfCarriers: true;
  readonly alternatePlainTextPacketProfile: false;
  readonly carrierAttributes: readonly string[];
  readonly morphismIdentities: readonly ShpMorphismIdentityDeclaration[];
  readonly evidence: readonly string[];
}

export interface Rfc7992InhabitantDeclaration {
  readonly enabled: true;
  readonly status: "inhabitant-profile";
  readonly doctype: "<!DOCTYPE html>";
  readonly rootLang: "en";
  readonly rootClassSource: "seriesInfo";
  readonly charset: "utf-8";
  readonly lineEndings: "LF";
  readonly attributeQuoting: "double";
  readonly requiredExternalResources: false;
  readonly executableScripts: false;
  readonly structuralClasses: readonly string[];
  readonly evidence: readonly string[];
}

export interface ShpSafetyDeclaration {
  readonly parseAsUntrusted: true;
  readonly noScriptExecution: true;
  readonly noRequiredExternalResources: true;
  readonly evidence: readonly string[];
}

export interface ShpProfileDeclaration {
  readonly profileId: string;
  readonly object: ShpObjectDeclaration;
  readonly directions: readonly ShpDirectionDeclaration[];
  readonly packetGrammar: ShpPacketGrammarDeclaration;
  readonly rfc7992Inhabitant: Rfc7992InhabitantDeclaration;
  readonly safety: ShpSafetyDeclaration;
  readonly evidence: readonly string[];
  readonly openObligations?: readonly string[];
}

const DATA_ATTRIBUTE = /^data-[a-z0-9][a-z0-9-]*$/u;
const STRUCTURAL_CLASS = /^[A-Za-z][A-Za-z0-9_-]*$/u;
const REQUIRED_RFC7992_CLASSES = ["bcp14", "xref", "eref", "relref", "selfRef", "artwork", "sourcecode"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const strings = (value: unknown): readonly string[] | null =>
  Array.isArray(value) && value.length > 0 && value.every(nonEmpty) && new Set(value).size === value.length
    ? value
    : null;

/** Validate the finite-frontier, morphism-identity, RFC 7992, and safety declarations of an SHP profile. */
export function validateShpProfile(value: unknown): readonly ShpProfileViolation[] {
  const violations: ShpProfileViolation[] = [];
  const fail = (code: string, path: string, message: string): void => {
    violations.push(Object.freeze({ code, path, message }));
  };
  const evidence = (candidate: unknown, path: string, code: string): void => {
    if (strings(candidate) === null) fail(code, path, "must cite unique non-empty evidence");
  };
  if (!isRecord(value)) return [Object.freeze({ code: "SHP-PROFILE-001", path: "<profile>", message: "profile must be an object" })];
  const profilePath = nonEmpty(value.profileId) ? value.profileId : "<profile>";
  if (!nonEmpty(value.profileId)) fail("SHP-PROFILE-002", profilePath, "profileId must be non-empty");
  evidence(value.evidence, profilePath, "SHP-PROFILE-003");

  if (!isRecord(value.object)) {
    fail("SHP-OBJECT-001", profilePath, "object declaration is required");
  } else {
    const object = value.object;
    const path = nonEmpty(object.id) ? object.id : "object";
    if (!nonEmpty(object.id) || !nonEmpty(object.sourceTrace) || !nonEmpty(object.projectionMorphism)) {
      fail("SHP-OBJECT-002", path, "id, sourceTrace, and projectionMorphism must be non-empty");
    }
    if (object.role !== "semantic-hypertext-packet" || object.carrier !== "html-document" || object.finite !== true) {
      fail("SHP-OBJECT-003", path, "object must be a finite semantic-hypertext-packet HTML document");
    }
    if (strings(object.traceFrontier) === null) fail("SHP-OBJECT-004", path, "traceFrontier must be finite, unique, and non-empty");
    if (strings(object.settlementEvidence) === null) fail("SHP-OBJECT-005", path, "settlementEvidence must be unique and non-empty");
    evidence(object.evidence, path, "SHP-OBJECT-006");
  }

  if (!Array.isArray(value.directions) || value.directions.length === 0) {
    fail("SHP-DIR-001", profilePath, "directions must be non-empty");
  } else {
    let projection = false;
    value.directions.forEach((candidate, index) => {
      const path = `directions[${index}]`;
      if (!isRecord(candidate)) return fail("SHP-DIR-002", path, "direction must be an object");
      if (candidate.kind === "projection") projection = true;
      if (candidate.kind !== "projection" && candidate.kind !== "markup") fail("SHP-DIR-003", path, "kind must be projection or markup");
      if (![candidate.inputCarrier, candidate.outputCarrier, candidate.morphism].every(nonEmpty)) fail("SHP-DIR-004", path, "carrier and morphism names must be non-empty");
      if (candidate.deterministic !== true || candidate.monotone !== true) fail("SHP-DIR-005", path, "direction must be deterministic and monotone");
      evidence(candidate.evidence, path, "SHP-DIR-006");
    });
    if (!projection) fail("SHP-DIR-007", profilePath, "a projection direction is required");
  }

  if (!isRecord(value.packetGrammar)) {
    fail("SHP-GRAMMAR-001", profilePath, "packetGrammar declaration is required");
  } else {
    const grammar = value.packetGrammar;
    if (grammar.classNamesAreMorphismIdentities !== true || grammar.dataAttributesCarryInputCarrierElements !== true || grammar.carrierOfCarriers !== true || grammar.alternatePlainTextPacketProfile !== false) {
      fail("SHP-GRAMMAR-002", "packetGrammar", "packet carrier and morphism identity laws must be declared");
    }
    const carrierAttributes = strings(grammar.carrierAttributes);
    if (carrierAttributes === null || !carrierAttributes.every((name) => DATA_ATTRIBUTE.test(name))) fail("SHP-GRAMMAR-003", "packetGrammar", "carrierAttributes must be unique data-* names");
    if (!Array.isArray(grammar.morphismIdentities) || grammar.morphismIdentities.length === 0) {
      fail("SHP-GRAMMAR-004", "packetGrammar", "morphismIdentities must be non-empty");
    } else {
      const seen = new Set<string>();
      grammar.morphismIdentities.forEach((candidate, index) => {
        const path = `packetGrammar.morphismIdentities[${index}]`;
        if (!isRecord(candidate)) return fail("SHP-GRAMMAR-005", path, "identity must be an object");
        if (!nonEmpty(candidate.className) || !STRUCTURAL_CLASS.test(candidate.className)) fail("SHP-GRAMMAR-006", path, "className must be a structural class token");
        else if (seen.has(candidate.className)) fail("SHP-GRAMMAR-007", path, "className must be unique");
        else seen.add(candidate.className);
        if (!nonEmpty(candidate.morphism) || (candidate.source !== "spotcomp" && candidate.source !== "rfc7992")) fail("SHP-GRAMMAR-008", path, "morphism and recognized source are required");
        if (candidate.carrierAttributes !== undefined && (!Array.isArray(candidate.carrierAttributes) || !candidate.carrierAttributes.every((name) => typeof name === "string" && DATA_ATTRIBUTE.test(name)))) fail("SHP-GRAMMAR-009", path, "identity carrierAttributes must be data-* names");
        if (candidate.source === "spotcomp" && (!Array.isArray(candidate.carrierAttributes) || candidate.carrierAttributes.length === 0)) fail("SHP-GRAMMAR-010", path, "SPOTCOMP identities must cite carrier attributes");
        evidence(candidate.evidence, path, "SHP-GRAMMAR-011");
      });
    }
    evidence(grammar.evidence, "packetGrammar", "SHP-GRAMMAR-012");
  }

  if (!isRecord(value.rfc7992Inhabitant)) {
    fail("SHP-RFC7992-001", profilePath, "rfc7992Inhabitant declaration is required");
  } else {
    const inhabitant = value.rfc7992Inhabitant;
    const exact: Readonly<Record<string, unknown>> = {
      enabled: true, status: "inhabitant-profile", doctype: "<!DOCTYPE html>", rootLang: "en",
      rootClassSource: "seriesInfo", charset: "utf-8", lineEndings: "LF", attributeQuoting: "double",
      requiredExternalResources: false, executableScripts: false,
    };
    for (const [key, expected] of Object.entries(exact)) if (inhabitant[key] !== expected) fail("SHP-RFC7992-002", "rfc7992Inhabitant", `${key} must be ${String(expected)}`);
    const classes = strings(inhabitant.structuralClasses);
    if (classes === null || REQUIRED_RFC7992_CLASSES.some((name) => !classes.includes(name))) fail("SHP-RFC7992-003", "rfc7992Inhabitant", "required RFC 7992 structural classes are missing");
    evidence(inhabitant.evidence, "rfc7992Inhabitant", "SHP-RFC7992-004");
  }

  if (!isRecord(value.safety)) {
    fail("SHP-SAFETY-001", profilePath, "safety declaration is required");
  } else {
    if (value.safety.parseAsUntrusted !== true || value.safety.noScriptExecution !== true || value.safety.noRequiredExternalResources !== true) fail("SHP-SAFETY-002", "safety", "untrusted parsing, script refusal, and external-resource independence are required");
    evidence(value.safety.evidence, "safety", "SHP-SAFETY-003");
  }
  return Object.freeze(violations);
}

/** Assert and narrow a declarative SHP profile. */
export function assertValidShpProfile(value: unknown): asserts value is ShpProfileDeclaration {
  const violations = validateShpProfile(value);
  if (violations.length > 0) throw new TypeError(violations.map(({ code, path, message }) => `${code} ${path}: ${message}`).join("\n"));
}

/** Validate byte-level invariants required by the declarative RFC 7992 inhabitant. */
export function validateShpDocumentBytes(value: unknown): readonly ShpProfileViolation[] {
  if (typeof value !== "string" || value.length === 0) return [Object.freeze({ code: "SHP-DOC-001", path: "<document>", message: "document bytes must be a non-empty string" })];
  const violations: ShpProfileViolation[] = [];
  const fail = (code: string, message: string): void => { violations.push(Object.freeze({ code, path: "<document>", message })); };
  if (!/^<!doctype html>/i.test(value)) fail("SHP-DOC-002", "document must start with an HTML doctype");
  if (!/<html\b[^>]*\blang="en"/i.test(value)) fail("SHP-DOC-003", "root html element must declare lang=en");
  if (!/<meta\b[^>]*\bcharset="utf-8"/i.test(value)) fail("SHP-DOC-004", "document must declare utf-8 charset");
  if (/<script\b/i.test(value)) fail("SHP-DOC-005", "document must not contain scripts");
  if (/<(?:img|script|link)\b[^>]*(?:src|href)="https?:\/\//i.test(value)) fail("SHP-DOC-006", "document must not require external network resources");
  if (!/\bclass="/i.test(value)) fail("SHP-DOC-007", "document must carry structural classes");
  if (!/\bdata-[a-z0-9][a-z0-9-]*="/i.test(value)) fail("SHP-DOC-008", "document must carry data-* coordinates");
  if (/\r/.test(value)) fail("SHP-DOC-009", "document must use LF line endings");
  return Object.freeze(violations);
}
