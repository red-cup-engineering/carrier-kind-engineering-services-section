/**
 * Language presentations, addressed artifacts, and checked translations.
 *
 * A presentation owns the pure judgments for one language surface. Artifacts
 * are addressed from that presentation's canonical expression; translation
 * witnesses retain both artifact addresses and the assertions they preserve.
 */

import { addressTextDocument, artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { samePoint } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { canonicalJsonValue } from "@red-cup-engineering/json-services-section/canonical-json";
import { isDecidable } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";

function bundleReport(spec, ok, message) {
  return Object.freeze({
    kind: "metroplat.language-bundle.report",
    bundle: spec.manifest.id,
    law: "decidable-read",
    ok,
    corner: spec.corner,
    rung: spec.rung,
    message,
  });
}

export function conformanceOfLanguageBundleSpec(spec) {
  const hasCompletingRead = spec.readings?.read !== undefined;
  const reports = Object.freeze([
    bundleReport(
      spec,
      !hasCompletingRead || isDecidable(spec.rung),
      hasCompletingRead && !isDecidable(spec.rung)
        ? `bundle ${spec.manifest.id} has rung ${spec.rung}; a non-decidable bundle must not expose a completing read`
        : `bundle ${spec.manifest.id} satisfies the decidable-read law`,
    ),
  ]);
  return Object.freeze({
    kind: "metroplat.language-bundle.conformance",
    bundle: spec.manifest.id,
    reports,
    ok: reports.every((report) => report.ok),
  });
}

export function bundleFromLanguageManifest(spec) {
  const conformance = conformanceOfLanguageBundleSpec(spec);
  if (!conformance.ok) return Object.freeze({ ok: false, report: conformance });

  const readings = Object.freeze({ ...spec.readings });
  const writings = Object.freeze({ ...spec.writings });
  return Object.freeze({
    ok: true,
    report: conformance,
    bundle: Object.freeze({
      kind: "metroplat.language-bundle.compiled",
      manifest: Object.freeze({ ...spec.manifest }),
      corner: spec.corner,
      rung: spec.rung,
      readings,
      writings,
      conformance,
      read: readings.read,
      write: writings.write,
    }),
  });
}

export function compiledBundleFromLanguageManifest(spec) {
  const construction = bundleFromLanguageManifest(spec);
  if (construction.ok) return construction.bundle;
  const first = construction.report.reports[0];
  throw new TypeError(first?.message ?? `language bundle ${spec.manifest.id} failed conformance`);
}

function canonicalAssertions(assertions) {
  return Object.freeze([...assertions]
    .map((assertion) => Object.freeze({ claim: assertion.claim, reading: assertion.reading }))
    .sort((left, right) => left.claim.localeCompare(right.claim) || left.reading.localeCompare(right.reading)));
}

function canonicalStrings(values) { return Object.freeze([...new Set(values)].sort()); }

function presentationBody(presentation) {
  return Object.freeze({ kind: presentation.kind, id: presentation.id, name: presentation.name, version: presentation.version, corner: presentation.corner, rung: presentation.rung, validationScope: presentation.validationScope, contract: presentation.contract });
}

export function defineLanguagePresentation(spec) {
  const body = Object.freeze({ kind: "metroplat.language.presentation", id: spec.id, name: spec.name, version: spec.version, corner: spec.corner, rung: spec.rung, validationScope: canonicalStrings(spec.validationScope), contract: canonicalJsonValue(spec.contract) });
  if (body.id.trim() === "" || body.name.trim() === "" || body.version.trim() === "") throw new TypeError("language presentation requires non-empty id, name, and version");
  return Object.freeze({ ...body, address: artifactId(presentationBody(body)), canonicalExpression: spec.canonicalExpression, accepts: spec.accepts, semantics: spec.semantics });
}

export function languagePresentationIsValid(presentation) {
  try { return presentation.kind === "metroplat.language.presentation" && presentation.address === artifactId(presentationBody(presentation)); } catch { return false; }
}

function artifactIdentity(presentation, expression) {
  const envelope = Object.freeze({
    kind: "metroplat.language.expression",
    version: 2,
    presentation,
    encoding: "rfc8785-jcs",
    expression,
  });
  try {
    return artifactId(envelope);
  } catch (error) {
    if (!(error instanceof TypeError) || !error.message.includes("canonical-limit")) throw error;
    return addressTextDocument(JSON.stringify(envelope)).ref;
  }
}

export function languageArtifactOf(
  presentation,
  expression,
  options = {},
) {
  if (!languagePresentationIsValid(presentation)) throw new TypeError(`language presentation ${presentation.id}: contract address does not verify`);
  const canonical = presentation.canonicalExpression(expression);
  if (!presentation.accepts(canonical, options.type)) {
    throw new TypeError(`language artifact ${presentation.id}: expression is not admitted by the presentation`);
  }
  return Object.freeze({
    kind: "metroplat.language.artifact",
    version: 2,
    language: presentation.id,
    presentation: presentation.address,
    expression: canonical,
    ...(options.type === undefined ? {} : { type: options.type }),
    semanticAddress: artifactId(presentation.semantics(canonical)),
    assertions: canonicalAssertions(options.assertions ?? []),
    address: artifactIdentity(presentation.address, canonical),
  });
}

export function languageArtifactIsValid(artifact) {
  if (artifact.kind !== "metroplat.language.artifact" || artifact.version !== 2) return false;
  if (artifact.address !== artifactIdentity(artifact.presentation, artifact.expression)) return false;
  return canonicalJson(artifact.assertions) === canonicalJson(canonicalAssertions(artifact.assertions));
}

export function languageArtifactConformsToPresentation(artifact, presentation) {
  try {
    if (!languageArtifactIsValid(artifact) || !languagePresentationIsValid(presentation) || artifact.language !== presentation.id || artifact.presentation !== presentation.address) return false;
    const expression = presentation.canonicalExpression(artifact.expression);
    return canonicalJson(expression) === canonicalJson(artifact.expression) && presentation.accepts(expression, artifact.type) && artifact.semanticAddress === artifactId(presentation.semantics(expression));
  } catch { return false; }
}

function obstruction(
  request,
  code,
  message,
) {
  return translationObstruction(request.source, request.sourcePresentation.id, request.targetPresentation.id, code, message);
}

function translationObstruction(
  source,
  sourceLanguage,
  targetLanguage,
  code,
  message,
) {
  return Object.freeze({
    ok: false,
    obstruction: Object.freeze({
      kind: "metroplat.language.translation-obstruction",
      code,
      source: source.address,
      sourceLanguage,
      targetLanguage,
      message,
    }),
  });
}

function translationAddressOf(witness) {
  return artifactId(witness);
}

function translateLanguageArtifactStep(request) {
  if (request.source.language !== request.sourcePresentation.id || request.source.presentation !== request.sourcePresentation.address || !languagePresentationIsValid(request.sourcePresentation)) {
    return obstruction(request, "unrecognized-language", "source artifact does not belong to the declared source presentation");
  }
  if (!languageArtifactConformsToPresentation(request.source, request.sourcePresentation)) return obstruction(request, "semantic-drift", "source artifact does not conform to its addressed presentation");
  if (!languagePresentationIsValid(request.targetPresentation)) return obstruction(request, "unrecognized-language", "target presentation contract address does not verify");
  if (request.resourceAvailable === false) {
    return obstruction(request, "exhausted-resource", "the declared translation resource bound is exhausted");
  }
  let expression;
  try {
    expression = request.targetPresentation.canonicalExpression(request.translate(request.source.expression));
  } catch (error) {
    return obstruction(request, "unrepresentable-form", error instanceof Error ? error.message : String(error));
  }
  if (!request.targetPresentation.accepts(expression, request.targetType)) {
    return obstruction(request, "ill-typed-translation", "target expression is not admitted by the target presentation");
  }
  const sourceSemantics = request.sourcePresentation.semantics(request.source.expression);
  const targetSemantics = request.targetPresentation.semantics(expression);
  if (canonicalJson(sourceSemantics) !== canonicalJson(targetSemantics)) {
    return obstruction(request, "semantic-drift", "source and target presentations do not agree on the translated semantics");
  }
  const artifact = languageArtifactOf(request.targetPresentation, expression, {
    ...(request.targetType === undefined ? {} : { type: request.targetType }),
    assertions: request.targetAssertions ?? request.source.assertions,
  });
  for (const assertion of request.source.assertions) {
    if (!artifact.assertions.some((candidate) => candidate.claim === assertion.claim && samePoint(candidate.reading, assertion.reading))) {
      return obstruction(request, "semantic-drift", `target translation did not preserve assertion ${assertion.claim}`);
    }
  }
  return Object.freeze({ ok: true, artifact });
}

function canonicalLossProfile(profile) {
  return profile.kind === "lossless"
    ? Object.freeze({ kind: "lossless" })
    : Object.freeze({ kind: "lossy", omits: canonicalStrings(profile.omits) });
}

function translationDeclarationBody(translation) {
  return Object.freeze({ kind: translation.kind, version: translation.version, source: translation.source, target: translation.target, contract: translation.contract, lossProfile: translation.lossProfile });
}

export function defineLanguageTranslation(spec) {
  const body = Object.freeze({ kind: "metroplat.language.translation-declaration", version: 1, source: spec.source, target: spec.target, contract: canonicalJsonValue(spec.contract), lossProfile: canonicalLossProfile(spec.lossProfile) });
  if (body.source === body.target) throw new TypeError("language translation must connect distinct presentations");
  return Object.freeze({ ...body, address: artifactId(translationDeclarationBody(body)), translate: spec.translate });
}

export function defineLanguageFamily(spec) {
  const presentations = Object.freeze([...spec.presentations].sort((left, right) => left.address.localeCompare(right.address)));
  const translations = Object.freeze([...spec.translations].sort((left, right) => left.address.localeCompare(right.address)));
  const members = new Set(presentations.map((presentation) => presentation.address));
  if (spec.id.trim() === "" || spec.name.trim() === "" || presentations.length === 0 || members.size !== presentations.length) throw new TypeError("language family requires identity and unique presentations");
  for (const presentation of presentations) if (!languagePresentationIsValid(presentation)) throw new TypeError(`invalid family presentation ${presentation.id}`);
  const edges = new Set();
  for (const translation of translations) {
    const edge = `${translation.source}\u0000${translation.target}`;
    if (!members.has(translation.source) || !members.has(translation.target) || edges.has(edge) || translation.address !== artifactId(translationDeclarationBody(translation))) throw new TypeError("invalid or duplicate language-family translation");
    edges.add(edge);
  }
  const body = Object.freeze({ kind: "metroplat.language.family", version: 1, id: spec.id, name: spec.name, sharedSemantics: canonicalJsonValue(spec.sharedSemantics), presentations: Object.freeze(presentations.map((presentation) => presentation.address)), translations: Object.freeze(translations.map((translation) => translation.address)) });
  return Object.freeze({ ...body, presentations, translations, address: artifactId(body) });
}

export function languageFamilyIsValid(family) {
  try { return defineLanguageFamily(family).address === family.address; } catch { return false; }
}

function routeOf(family, source, target) {
  if (source === target) return Object.freeze([]);
  const queue = [{ at: source, route: [] }];
  const seen = new Set([source]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const outgoing = family.translations.filter((translation) => translation.source === current.at).sort((left, right) => left.address.localeCompare(right.address));
    for (const translation of outgoing) {
      const route = Object.freeze([...current.route, translation]);
      if (translation.target === target) return route;
      if (!seen.has(translation.target)) { seen.add(translation.target); queue.push({ at: translation.target, route }); }
    }
  }
  return undefined;
}

export function translateInLanguageFamily(request) {
  const sourcePresentation = request.family.presentations.find((presentation) => presentation.address === request.source.presentation);
  const targetPresentation = request.family.presentations.find((presentation) => presentation.address === request.targetPresentation);
  if (!languageFamilyIsValid(request.family) || sourcePresentation === undefined || targetPresentation === undefined) {
    return translationObstruction(
      request.source,
      sourcePresentation?.id ?? request.source.language,
      targetPresentation?.id ?? request.targetPresentation,
      "unrecognized-language",
      "source or target presentation is not a valid family member",
    );
  }
  const route = routeOf(request.family, sourcePresentation.address, targetPresentation.address);
  if (route === undefined) return obstruction({ source: request.source, sourcePresentation, targetPresentation, translate: (expression) => expression }, "unrepresentable-form", "no directed translation route exists in the language family");
  let artifact = request.source;
  let current = sourcePresentation;
  for (let index = 0; index < route.length; index += 1) {
    const translation = route[index];
    const next = request.family.presentations.find((presentation) => presentation.address === translation.target);
    const result = translateLanguageArtifactStep({ source: artifact, sourcePresentation: current, targetPresentation: next, translate: translation.translate, lossProfile: translation.lossProfile, ...(request.resourceAvailable === undefined ? {} : { resourceAvailable: request.resourceAvailable }), ...(index === route.length - 1 && request.targetType !== undefined ? { targetType: request.targetType } : {}), ...(index === route.length - 1 && request.targetAssertions !== undefined ? { targetAssertions: request.targetAssertions } : {}) });
    if (!result.ok) return result;
    artifact = result.artifact;
    current = next;
  }
  const omissions = canonicalStrings(route.flatMap((translation) => translation.lossProfile.kind === "lossy" ? translation.lossProfile.omits : []));
  const body = Object.freeze({ kind: "metroplat.language.translation", version: 3, family: request.family.address, route: Object.freeze(route.map((translation) => translation.address)), source: request.source.address, target: artifact.address, sourceLanguage: sourcePresentation.id, targetLanguage: targetPresentation.id, sourcePresentation: sourcePresentation.address, targetPresentation: targetPresentation.address, semanticAddress: request.source.semanticAddress, assertions: artifact.assertions, validationScope: canonicalStrings(targetPresentation.validationScope), lossProfile: omissions.length === 0 ? Object.freeze({ kind: "lossless" }) : Object.freeze({ kind: "lossy", omits: omissions }) });
  return Object.freeze({ ok: true, artifact, witness: Object.freeze({ ...body, address: translationAddressOf(body) }) });
}

export function translationWitnessIsValid(
  witness,
  source,
  target,
  family,
) {
  if (witness.kind !== "metroplat.language.translation" || witness.version !== 3 || !languageArtifactIsValid(source) || !languageArtifactIsValid(target)) return false;
  if (witness.source !== source.address || witness.target !== target.address) return false;
  if (witness.sourceLanguage !== source.language || witness.targetLanguage !== target.language) return false;
  if (witness.sourcePresentation !== source.presentation || witness.targetPresentation !== target.presentation || witness.semanticAddress !== source.semanticAddress || witness.semanticAddress !== target.semanticAddress) return false;
  if (canonicalJson(witness.assertions) !== canonicalJson(target.assertions)) return false;
  for (const assertion of source.assertions) {
    if (!target.assertions.some((candidate) => candidate.claim === assertion.claim && samePoint(candidate.reading, assertion.reading))) return false;
  }
  const { address: _address, ...body } = witness;
  if (translationAddressOf(body) !== witness.address) return false;
  if (family === undefined) return true;
  const route = routeOf(family, witness.sourcePresentation, witness.targetPresentation);
  if (!languageFamilyIsValid(family) || witness.family !== family.address || route === undefined) return false;
  const omissions = canonicalStrings(route.flatMap((translation) => translation.lossProfile.kind === "lossy" ? translation.lossProfile.omits : []));
  const lossProfile = omissions.length === 0
    ? Object.freeze({ kind: "lossless" })
    : Object.freeze({ kind: "lossy", omits: omissions });
  return canonicalJson(witness.route) === canonicalJson(route.map((translation) => translation.address))
    && canonicalJson(witness.lossProfile) === canonicalJson(lossProfile);
}

