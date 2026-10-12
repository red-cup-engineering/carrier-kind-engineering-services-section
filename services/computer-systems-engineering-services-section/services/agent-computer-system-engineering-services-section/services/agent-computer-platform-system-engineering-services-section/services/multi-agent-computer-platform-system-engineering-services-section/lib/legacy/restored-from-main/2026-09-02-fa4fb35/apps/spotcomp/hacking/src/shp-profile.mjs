import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const REQUIRED_RFC7992_CLASSES = new Set(['bcp14', 'xref', 'eref', 'relref', 'selfRef', 'artwork', 'sourcecode']);
const DATA_ATTR = /^data-[a-z0-9][a-z0-9-]*$/;
const CLASS_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;

import { isObject } from "./object-record.mjs";

export function validateShpProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'SHP-PROFILE-001', path: '<profile>', message: 'SHP profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'SHP-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'SHP-PROFILE-003');

  if (!isObject(profile.object)) {
    push(errors, 'SHP-OBJECT-001', path, 'object must be declared');
  } else {
    const object = profile.object;
    const objectPath = hasString(object, 'id') ? object.id : 'object';
    if (object.role !== 'semantic-hypertext-packet') {
      push(errors, 'SHP-OBJECT-002', objectPath, 'object role must be semantic-hypertext-packet');
    }
    if (object.carrier !== 'html-document') {
      push(errors, 'SHP-OBJECT-003', objectPath, 'SHP carrier must be html-document');
    }
    if (object.finite !== true) {
      push(errors, 'SHP-OBJECT-004', objectPath, 'SHP object must be finite');
    }
    for (const key of ['sourceTrace', 'projectionMorphism']) {
      if (!hasString(object, key)) {
        push(errors, 'SHP-OBJECT-005', objectPath, `${key} must be declared`);
      }
    }
    if (!nonEmptyStringArray(object.traceFrontier)) {
      push(errors, 'SHP-OBJECT-006', objectPath, 'traceFrontier must be non-empty');
    }
    if (!nonEmptyStringArray(object.settlementEvidence)) {
      push(errors, 'SHP-OBJECT-007', objectPath, 'settlementEvidence must be non-empty');
    }
    checkEvidence(errors, object.evidence, objectPath, 'SHP-OBJECT-008');
  }

  if (!Array.isArray(profile.directions) || profile.directions.length === 0) {
    push(errors, 'SHP-DIR-001', path, 'directions must be a non-empty array');
  } else {
    let hasProjection = false;
    for (const direction of profile.directions) {
      const dirPath = isObject(direction) && hasString(direction, 'morphism') ? direction.morphism : '<direction>';
      if (!isObject(direction)) {
        push(errors, 'SHP-DIR-002', dirPath, 'direction must be an object');
        continue;
      }
      if (!['projection', 'markup'].includes(direction.kind)) {
        push(errors, 'SHP-DIR-003', dirPath, 'direction kind must be projection or markup');
      }
      if (direction.kind === 'projection') {
        hasProjection = true;
      }
      for (const key of ['inputCarrier', 'outputCarrier', 'morphism']) {
        if (!hasString(direction, key)) {
          push(errors, 'SHP-DIR-004', dirPath, `${key} must be declared`);
        }
      }
      if (direction.deterministic !== true) {
        push(errors, 'SHP-DIR-005', dirPath, 'SHP direction must be deterministic');
      }
      if (direction.monotone !== true) {
        push(errors, 'SHP-DIR-006', dirPath, 'SHP direction must be monotone');
      }
      checkEvidence(errors, direction.evidence, dirPath, 'SHP-DIR-007');
    }
    if (!hasProjection) {
      push(errors, 'SHP-DIR-008', path, 'SHP profile must include the projection direction');
    }
  }

  if (!isObject(profile.packetGrammar)) {
    push(errors, 'SHP-GRAMMAR-001', path, 'packetGrammar must be declared');
  } else {
    const grammar = profile.packetGrammar;
    for (const [key, code] of [
      ['classNamesAreMorphismIdentities', 'SHP-GRAMMAR-002'],
      ['dataAttributesCarryInputCarrierElements', 'SHP-GRAMMAR-003'],
      ['carrierOfCarriers', 'SHP-GRAMMAR-004'],
    ]) {
      if (grammar[key] !== true) {
        push(errors, code, 'packetGrammar', `${key} must be true`);
      }
    }
    if (grammar.alternatePlainTextPacketProfile !== false) {
      push(errors, 'SHP-GRAMMAR-005', 'packetGrammar', 'SHP must not declare an alternate plain text packet profile');
    }
    if (!nonEmptyStringArray(grammar.carrierAttributes) || grammar.carrierAttributes.some((attr) => !DATA_ATTR.test(attr))) {
      push(errors, 'SHP-GRAMMAR-006', 'packetGrammar', 'carrierAttributes must be non-empty data-* names');
    }
    const identities = new Map();
    if (!Array.isArray(grammar.morphismIdentities) || grammar.morphismIdentities.length === 0) {
      push(errors, 'SHP-GRAMMAR-007', 'packetGrammar', 'morphismIdentities must be non-empty');
    } else {
      for (const identity of grammar.morphismIdentities) {
        const idPath = isObject(identity) && hasString(identity, 'className') ? identity.className : '<morphism-identity>';
        if (!isObject(identity)) {
          push(errors, 'SHP-GRAMMAR-008', idPath, 'morphism identity must be an object');
          continue;
        }
        if (!hasString(identity, 'className') || !CLASS_NAME.test(identity.className)) {
          push(errors, 'SHP-GRAMMAR-009', idPath, 'className must be a valid structural class token');
        } else if (identities.has(identity.className)) {
          push(errors, 'SHP-GRAMMAR-010', identity.className, 'className declarations must be unique');
        } else {
          identities.set(identity.className, identity);
        }
        if (!hasString(identity, 'morphism')) {
          push(errors, 'SHP-GRAMMAR-011', idPath, 'morphism must be declared');
        }
        if (!['spotcomp', 'rfc7992'].includes(identity.source)) {
          push(errors, 'SHP-GRAMMAR-012', idPath, 'source must be spotcomp or rfc7992');
        }
        if (identity.carrierAttributes !== undefined && (!Array.isArray(identity.carrierAttributes) || identity.carrierAttributes.some((attr) => !DATA_ATTR.test(attr)))) {
          push(errors, 'SHP-GRAMMAR-013', idPath, 'carrierAttributes must be data-* names');
        }
        if (identity.source === 'spotcomp' && !nonEmptyStringArray(identity.carrierAttributes)) {
          push(errors, 'SHP-GRAMMAR-014', idPath, 'SPOTCOMP morphism identity must cite carrier data-* attributes');
        }
        checkEvidence(errors, identity.evidence, idPath, 'SHP-GRAMMAR-015');
      }
    }
    checkEvidence(errors, grammar.evidence, 'packetGrammar', 'SHP-GRAMMAR-016');
  }

  if (!isObject(profile.rfc7992Inhabitant)) {
    push(errors, 'SHP-RFC7992-001', path, 'rfc7992Inhabitant must be declared');
  } else {
    const inhabitant = profile.rfc7992Inhabitant;
    const expected = {
      enabled: true,
      status: 'inhabitant-profile',
      doctype: '<!DOCTYPE html>',
      rootLang: 'en',
      rootClassSource: 'seriesInfo',
      charset: 'utf-8',
      lineEndings: 'LF',
      attributeQuoting: 'double',
      requiredExternalResources: false,
      executableScripts: false,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (inhabitant[key] !== value) {
        push(errors, 'SHP-RFC7992-002', 'rfc7992Inhabitant', `${key} must be ${String(value)}`);
      }
    }
    if (!nonEmptyStringArray(inhabitant.structuralClasses)) {
      push(errors, 'SHP-RFC7992-003', 'rfc7992Inhabitant', 'structuralClasses must be non-empty');
    } else {
      const classes = new Set(inhabitant.structuralClasses);
      for (const className of REQUIRED_RFC7992_CLASSES) {
        if (!classes.has(className)) {
          push(errors, 'SHP-RFC7992-004', 'rfc7992Inhabitant', `missing RFC 7992 structural class ${className}`);
        }
      }
    }
    checkEvidence(errors, inhabitant.evidence, 'rfc7992Inhabitant', 'SHP-RFC7992-005');
  }

  if (!isObject(profile.safety)) {
    push(errors, 'SHP-SAFETY-001', path, 'safety must be declared');
  } else {
    for (const key of ['parseAsUntrusted', 'noScriptExecution', 'noRequiredExternalResources']) {
      if (profile.safety[key] !== true) {
        push(errors, 'SHP-SAFETY-002', 'safety', `${key} must be true`);
      }
    }
    checkEvidence(errors, profile.safety.evidence, 'safety', 'SHP-SAFETY-003');
  }

  return errors;
}

export const assertValidShpProfile = createProfileAssertion(validateShpProfile);

export function validateShpDocumentBytes(html) {
  const errors = [];
  if (typeof html !== 'string' || html.length === 0) {
    return [{ code: 'SHP-DOC-001', path: '<document>', message: 'SHP document bytes must be a non-empty string' }];
  }
  if (!/^<!doctype html>/i.test(html)) {
    push(errors, 'SHP-DOC-002', '<document>', 'document must start with an HTML doctype');
  }
  if (!/<html\b[^>]*\blang="en"/i.test(html)) {
    push(errors, 'SHP-DOC-003', '<document>', 'root html element must declare lang="en"');
  }
  if (!/<meta\b[^>]*\bcharset="utf-8"/i.test(html)) {
    push(errors, 'SHP-DOC-004', '<document>', 'document must declare utf-8 charset');
  }
  if (/<script\b/i.test(html)) {
    push(errors, 'SHP-DOC-005', '<document>', 'SHP document must not contain script elements');
  }
  if (/<(?:img|script|link)\b[^>]*(?:src|href)="https?:\/\//i.test(html)) {
    push(errors, 'SHP-DOC-006', '<document>', 'SHP document must not require external network resources');
  }
  if (!/\bclass="/i.test(html)) {
    push(errors, 'SHP-DOC-007', '<document>', 'SHP document must carry structural class attributes');
  }
  if (!/\bdata-[a-z0-9][a-z0-9-]*="/i.test(html)) {
    push(errors, 'SHP-DOC-008', '<document>', 'SHP document must carry data-* carrier attributes');
  }
  if (/\r/.test(html)) {
    push(errors, 'SHP-DOC-009', '<document>', 'SHP document must use LF line endings');
  }
  return errors;
}
