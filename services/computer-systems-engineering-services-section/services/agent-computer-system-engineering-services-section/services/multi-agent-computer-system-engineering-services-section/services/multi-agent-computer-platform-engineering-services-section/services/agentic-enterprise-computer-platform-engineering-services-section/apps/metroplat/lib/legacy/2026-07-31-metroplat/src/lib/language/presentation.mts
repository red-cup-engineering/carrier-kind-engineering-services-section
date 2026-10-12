/**
 * Language presentations, addressed artifacts, and checked translations.
 *
 * A presentation owns the pure judgments for one language surface. Artifacts
 * are addressed from that presentation's canonical expression; translation
 * witnesses retain both artifact addresses and the assertions they preserve.
 */
import type { JsonValue } from "../codecs/json/core.mts";
import { addressTextDocument, canonicalBytes, contentAddress, type ArtifactRef } from "../identity/index.mts";
import { isDecidable, type Corner, type Rung } from "../codecs/projector/index.mts";
import type { Meme } from "../logic/predicating/evidence/fiber.mts";
import type { ChargeValueName } from "../values/index.mts";

export interface LanguageBundleManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
}

export type CompletingLanguageRead = (text: string) => readonly Meme[];
export type LanguageWrite = (memes: readonly Meme[]) => string;

export interface LanguageBundleReadings {
  readonly read?: CompletingLanguageRead | undefined;
}

export interface LanguageBundleWritings {
  readonly write?: LanguageWrite | undefined;
}

export type LanguageBundleLaw = "decidable-read";

export interface LanguageBundleReport {
  readonly kind: "metroplat.language-bundle.report";
  readonly bundle: string;
  readonly law: LanguageBundleLaw;
  readonly ok: boolean;
  readonly corner: Corner;
  readonly rung: Rung;
  readonly message: string;
}

export interface LanguageBundleConformance {
  readonly kind: "metroplat.language-bundle.conformance";
  readonly bundle: string;
  readonly reports: readonly LanguageBundleReport[];
  readonly ok: boolean;
}

export interface LanguageBundleSpec {
  readonly manifest: LanguageBundleManifest;
  readonly corner: Corner;
  readonly rung: Rung;
  readonly readings?: LanguageBundleReadings | undefined;
  readonly writings?: LanguageBundleWritings | undefined;
}

export interface CompiledLanguageBundle {
  readonly kind: "metroplat.language-bundle.compiled";
  readonly manifest: LanguageBundleManifest;
  readonly corner: Corner;
  readonly rung: Rung;
  readonly readings: LanguageBundleReadings;
  readonly writings: LanguageBundleWritings;
  readonly conformance: LanguageBundleConformance;
  readonly read?: CompletingLanguageRead | undefined;
  readonly write?: LanguageWrite | undefined;
}

export type LanguageBundleConstruction =
  | { readonly ok: true; readonly bundle: CompiledLanguageBundle; readonly report: LanguageBundleConformance }
  | { readonly ok: false; readonly report: LanguageBundleConformance };

function bundleReport(spec: LanguageBundleSpec, ok: boolean, message: string): LanguageBundleReport {
  return Object.freeze({
    kind: "metroplat.language-bundle.report" as const,
    bundle: spec.manifest.id,
    law: "decidable-read" as const,
    ok,
    corner: spec.corner,
    rung: spec.rung,
    message,
  });
}

export function conformanceOfLanguageBundleSpec(spec: LanguageBundleSpec): LanguageBundleConformance {
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
    kind: "metroplat.language-bundle.conformance" as const,
    bundle: spec.manifest.id,
    reports,
    ok: reports.every((report) => report.ok),
  });
}

export function bundleFromLanguageManifest(spec: LanguageBundleSpec): LanguageBundleConstruction {
  const conformance = conformanceOfLanguageBundleSpec(spec);
  if (!conformance.ok) return Object.freeze({ ok: false as const, report: conformance });

  const readings = Object.freeze({ ...spec.readings });
  const writings = Object.freeze({ ...spec.writings });
  return Object.freeze({
    ok: true as const,
    report: conformance,
    bundle: Object.freeze({
      kind: "metroplat.language-bundle.compiled" as const,
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

export function compiledBundleFromLanguageManifest(spec: LanguageBundleSpec): CompiledLanguageBundle {
  const construction = bundleFromLanguageManifest(spec);
  if (construction.ok) return construction.bundle;
  const first = construction.report.reports[0];
  throw new TypeError(first?.message ?? `language bundle ${spec.manifest.id} failed conformance`);
}

export interface LanguageAssertion {
  readonly claim: ArtifactRef;
  readonly charge: ChargeValueName;
}

export interface LanguagePresentationContract {
  readonly grammar: JsonValue;
  readonly judgments: JsonValue;
  readonly reduction: JsonValue;
  readonly semantics: JsonValue;
  readonly canonicalEncoding: JsonValue;
}

export interface LanguagePresentation {
  readonly kind: "metroplat.language.presentation";
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly corner: Corner;
  readonly rung: Rung;
  readonly validationScope: readonly string[];
  readonly contract: LanguagePresentationContract;
  readonly address: ArtifactRef;
  canonicalExpression(expression: JsonValue): JsonValue;
  accepts(expression: JsonValue, type?: JsonValue): boolean;
  semantics(expression: JsonValue): JsonValue;
}

export type LanguagePresentationSpec = Omit<LanguagePresentation, "kind" | "address">;

export interface LanguageArtifact {
  readonly kind: "metroplat.language.artifact";
  readonly version: 2;
  readonly language: string;
  readonly presentation: ArtifactRef;
  readonly expression: JsonValue;
  readonly type?: JsonValue;
  readonly semanticAddress: ArtifactRef;
  readonly assertions: readonly LanguageAssertion[];
  readonly address: ArtifactRef;
}

export type TranslationLossProfile =
  | Readonly<{ readonly kind: "lossless" }>
  | Readonly<{ readonly kind: "lossy"; readonly omits: readonly string[] }>;

export interface LanguageTranslationWitness {
  readonly kind: "metroplat.language.translation";
  readonly version: 3;
  readonly family: ArtifactRef;
  readonly route: readonly ArtifactRef[];
  readonly source: ArtifactRef;
  readonly target: ArtifactRef;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly sourcePresentation: ArtifactRef;
  readonly targetPresentation: ArtifactRef;
  readonly semanticAddress: ArtifactRef;
  readonly assertions: readonly LanguageAssertion[];
  readonly validationScope: readonly string[];
  readonly lossProfile: TranslationLossProfile;
  readonly address: ArtifactRef;
}

export type LanguageTranslationObstructionCode =
  | "unrecognized-language"
  | "unrepresentable-form"
  | "ill-typed-translation"
  | "semantic-drift"
  | "exhausted-resource";

export interface LanguageTranslationObstruction {
  readonly kind: "metroplat.language.translation-obstruction";
  readonly code: LanguageTranslationObstructionCode;
  readonly source: ArtifactRef;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly message: string;
}

export type LanguageTranslationJudgment =
  | Readonly<{ readonly ok: true; readonly artifact: LanguageArtifact; readonly witness: LanguageTranslationWitness }>
  | Readonly<{ readonly ok: false; readonly obstruction: LanguageTranslationObstruction }>;

interface LanguageTranslationStepRequest {
  readonly source: LanguageArtifact;
  readonly sourcePresentation: LanguagePresentation;
  readonly targetPresentation: LanguagePresentation;
  readonly translate: (expression: JsonValue) => JsonValue;
  readonly targetType?: JsonValue;
  readonly targetAssertions?: readonly LanguageAssertion[];
  readonly lossProfile?: TranslationLossProfile;
  readonly resourceAvailable?: boolean;
}

export interface LanguageTranslation {
  readonly kind: "metroplat.language.translation-declaration";
  readonly version: 1;
  readonly source: ArtifactRef;
  readonly target: ArtifactRef;
  readonly contract: JsonValue;
  readonly lossProfile: TranslationLossProfile;
  readonly address: ArtifactRef;
  translate(expression: JsonValue): JsonValue;
}

export type LanguageTranslationSpec = Omit<LanguageTranslation, "kind" | "version" | "address">;

export interface LanguageFamily {
  readonly kind: "metroplat.language.family";
  readonly version: 1;
  readonly id: string;
  readonly name: string;
  readonly sharedSemantics: JsonValue;
  readonly presentations: readonly LanguagePresentation[];
  readonly translations: readonly LanguageTranslation[];
  readonly address: ArtifactRef;
}

export interface LanguageFamilySpec {
  readonly id: string;
  readonly name: string;
  readonly sharedSemantics: JsonValue;
  readonly presentations: readonly LanguagePresentation[];
  readonly translations: readonly LanguageTranslation[];
}

export interface LanguageFamilyTranslationRequest {
  readonly family: LanguageFamily;
  readonly source: LanguageArtifact;
  readonly targetPresentation: ArtifactRef;
  readonly targetType?: JsonValue;
  readonly targetAssertions?: readonly LanguageAssertion[];
  readonly resourceAvailable?: boolean;
}

function canonicalAssertions(assertions: readonly LanguageAssertion[]): readonly LanguageAssertion[] {
  return Object.freeze([...assertions]
    .map((assertion) => Object.freeze({ claim: assertion.claim, charge: assertion.charge }))
    .sort((left, right) => left.claim.localeCompare(right.claim) || left.charge.localeCompare(right.charge)));
}

function canonicalJson(value: JsonValue): JsonValue { return JSON.parse(canonicalBytes(value)) as JsonValue; }
function canonicalStrings(values: readonly string[]): readonly string[] { return Object.freeze([...new Set(values)].sort()); }

function presentationBody(presentation: Omit<LanguagePresentation, "address" | "canonicalExpression" | "accepts" | "semantics">): JsonValue {
  return Object.freeze({ kind: presentation.kind, id: presentation.id, name: presentation.name, version: presentation.version, corner: presentation.corner, rung: presentation.rung, validationScope: presentation.validationScope, contract: presentation.contract }) as unknown as JsonValue;
}

export function defineLanguagePresentation(spec: LanguagePresentationSpec): LanguagePresentation {
  const body = Object.freeze({ kind: "metroplat.language.presentation" as const, id: spec.id, name: spec.name, version: spec.version, corner: spec.corner, rung: spec.rung, validationScope: canonicalStrings(spec.validationScope), contract: canonicalJson(spec.contract as unknown as JsonValue) as unknown as LanguagePresentationContract });
  if (body.id.trim() === "" || body.name.trim() === "" || body.version.trim() === "") throw new TypeError("language presentation requires non-empty id, name, and version");
  return Object.freeze({ ...body, address: contentAddress(presentationBody(body)), canonicalExpression: spec.canonicalExpression, accepts: spec.accepts, semantics: spec.semantics });
}

export function languagePresentationIsValid(presentation: LanguagePresentation): boolean {
  try { return presentation.kind === "metroplat.language.presentation" && presentation.address === contentAddress(presentationBody(presentation)); } catch { return false; }
}

function artifactIdentity(presentation: ArtifactRef, expression: JsonValue): ArtifactRef {
  const envelope = Object.freeze({
    kind: "metroplat.language.expression" as const,
    version: 2 as const,
    presentation,
    encoding: "rfc8785-jcs" as const,
    expression,
  });
  try {
    return contentAddress(envelope);
  } catch (error) {
    if (!(error instanceof TypeError) || !error.message.includes("canonical-limit")) throw error;
    return addressTextDocument(JSON.stringify(envelope)).ref;
  }
}

export function languageArtifactOf(
  presentation: LanguagePresentation,
  expression: JsonValue,
  options: Readonly<{ readonly type?: JsonValue; readonly assertions?: readonly LanguageAssertion[] }> = {},
): LanguageArtifact {
  if (!languagePresentationIsValid(presentation)) throw new TypeError(`language presentation ${presentation.id}: contract address does not verify`);
  const canonical = presentation.canonicalExpression(expression);
  if (!presentation.accepts(canonical, options.type)) {
    throw new TypeError(`language artifact ${presentation.id}: expression is not admitted by the presentation`);
  }
  return Object.freeze({
    kind: "metroplat.language.artifact" as const,
    version: 2 as const,
    language: presentation.id,
    presentation: presentation.address,
    expression: canonical,
    ...(options.type === undefined ? {} : { type: options.type }),
    semanticAddress: contentAddress(presentation.semantics(canonical)),
    assertions: canonicalAssertions(options.assertions ?? []),
    address: artifactIdentity(presentation.address, canonical),
  });
}

export function languageArtifactIsValid(artifact: LanguageArtifact): boolean {
  if (artifact.kind !== "metroplat.language.artifact" || artifact.version !== 2) return false;
  if (artifact.address !== artifactIdentity(artifact.presentation, artifact.expression)) return false;
  return canonicalBytes(artifact.assertions) === canonicalBytes(canonicalAssertions(artifact.assertions));
}

export function languageArtifactConformsToPresentation(artifact: LanguageArtifact, presentation: LanguagePresentation): boolean {
  try {
    if (!languageArtifactIsValid(artifact) || !languagePresentationIsValid(presentation) || artifact.language !== presentation.id || artifact.presentation !== presentation.address) return false;
    const expression = presentation.canonicalExpression(artifact.expression);
    return canonicalBytes(expression) === canonicalBytes(artifact.expression) && presentation.accepts(expression, artifact.type) && artifact.semanticAddress === contentAddress(presentation.semantics(expression));
  } catch { return false; }
}

function obstruction(
  request: LanguageTranslationStepRequest,
  code: LanguageTranslationObstructionCode,
  message: string,
): LanguageTranslationJudgment {
  return translationObstruction(request.source, request.sourcePresentation.id, request.targetPresentation.id, code, message);
}

function translationObstruction(
  source: LanguageArtifact,
  sourceLanguage: string,
  targetLanguage: string,
  code: LanguageTranslationObstructionCode,
  message: string,
): LanguageTranslationJudgment {
  return Object.freeze({
    ok: false as const,
    obstruction: Object.freeze({
      kind: "metroplat.language.translation-obstruction" as const,
      code,
      source: source.address,
      sourceLanguage,
      targetLanguage,
      message,
    }),
  });
}

function translationAddressOf(witness: Omit<LanguageTranslationWitness, "address">): ArtifactRef {
  return contentAddress(witness);
}

type LanguageTranslationStepJudgment =
  | Readonly<{ readonly ok: true; readonly artifact: LanguageArtifact }>
  | Readonly<{ readonly ok: false; readonly obstruction: LanguageTranslationObstruction }>;

function translateLanguageArtifactStep(request: LanguageTranslationStepRequest): LanguageTranslationStepJudgment {
  if (request.source.language !== request.sourcePresentation.id || request.source.presentation !== request.sourcePresentation.address || !languagePresentationIsValid(request.sourcePresentation)) {
    return obstruction(request, "unrecognized-language", "source artifact does not belong to the declared source presentation");
  }
  if (!languageArtifactConformsToPresentation(request.source, request.sourcePresentation)) return obstruction(request, "semantic-drift", "source artifact does not conform to its addressed presentation");
  if (!languagePresentationIsValid(request.targetPresentation)) return obstruction(request, "unrecognized-language", "target presentation contract address does not verify");
  if (request.resourceAvailable === false) {
    return obstruction(request, "exhausted-resource", "the declared translation resource bound is exhausted");
  }
  let expression: JsonValue;
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
  if (canonicalBytes(sourceSemantics) !== canonicalBytes(targetSemantics)) {
    return obstruction(request, "semantic-drift", "source and target presentations do not agree on the translated semantics");
  }
  const artifact = languageArtifactOf(request.targetPresentation, expression, {
    ...(request.targetType === undefined ? {} : { type: request.targetType }),
    assertions: request.targetAssertions ?? request.source.assertions,
  });
  for (const assertion of request.source.assertions) {
    if (!artifact.assertions.some((candidate) => candidate.claim === assertion.claim && candidate.charge === assertion.charge)) {
      return obstruction(request, "semantic-drift", `target translation did not preserve assertion ${assertion.claim}`);
    }
  }
  return Object.freeze({ ok: true as const, artifact });
}

function canonicalLossProfile(profile: TranslationLossProfile): TranslationLossProfile {
  return profile.kind === "lossless"
    ? Object.freeze({ kind: "lossless" as const })
    : Object.freeze({ kind: "lossy" as const, omits: canonicalStrings(profile.omits) });
}

function translationDeclarationBody(translation: Omit<LanguageTranslation, "address" | "translate">): JsonValue {
  return Object.freeze({ kind: translation.kind, version: translation.version, source: translation.source, target: translation.target, contract: translation.contract, lossProfile: translation.lossProfile }) as unknown as JsonValue;
}

export function defineLanguageTranslation(spec: LanguageTranslationSpec): LanguageTranslation {
  const body = Object.freeze({ kind: "metroplat.language.translation-declaration" as const, version: 1 as const, source: spec.source, target: spec.target, contract: canonicalJson(spec.contract), lossProfile: canonicalLossProfile(spec.lossProfile) });
  if (body.source === body.target) throw new TypeError("language translation must connect distinct presentations");
  return Object.freeze({ ...body, address: contentAddress(translationDeclarationBody(body)), translate: spec.translate });
}

export function defineLanguageFamily(spec: LanguageFamilySpec): LanguageFamily {
  const presentations = Object.freeze([...spec.presentations].sort((left, right) => left.address.localeCompare(right.address)));
  const translations = Object.freeze([...spec.translations].sort((left, right) => left.address.localeCompare(right.address)));
  const members = new Set(presentations.map((presentation) => presentation.address));
  if (spec.id.trim() === "" || spec.name.trim() === "" || presentations.length === 0 || members.size !== presentations.length) throw new TypeError("language family requires identity and unique presentations");
  for (const presentation of presentations) if (!languagePresentationIsValid(presentation)) throw new TypeError(`invalid family presentation ${presentation.id}`);
  const edges = new Set<string>();
  for (const translation of translations) {
    const edge = `${translation.source}\u0000${translation.target}`;
    if (!members.has(translation.source) || !members.has(translation.target) || edges.has(edge) || translation.address !== contentAddress(translationDeclarationBody(translation))) throw new TypeError("invalid or duplicate language-family translation");
    edges.add(edge);
  }
  const body = Object.freeze({ kind: "metroplat.language.family" as const, version: 1 as const, id: spec.id, name: spec.name, sharedSemantics: canonicalJson(spec.sharedSemantics), presentations: Object.freeze(presentations.map((presentation) => presentation.address)), translations: Object.freeze(translations.map((translation) => translation.address)) });
  return Object.freeze({ ...body, presentations, translations, address: contentAddress(body) });
}

export function languageFamilyIsValid(family: LanguageFamily): boolean {
  try { return defineLanguageFamily(family).address === family.address; } catch { return false; }
}

function routeOf(family: LanguageFamily, source: ArtifactRef, target: ArtifactRef): readonly LanguageTranslation[] | undefined {
  if (source === target) return Object.freeze([]);
  const queue: Array<Readonly<{ at: ArtifactRef; route: readonly LanguageTranslation[] }>> = [{ at: source, route: [] }];
  const seen = new Set<ArtifactRef>([source]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    const outgoing = family.translations.filter((translation) => translation.source === current.at).sort((left, right) => left.address.localeCompare(right.address));
    for (const translation of outgoing) {
      const route = Object.freeze([...current.route, translation]);
      if (translation.target === target) return route;
      if (!seen.has(translation.target)) { seen.add(translation.target); queue.push({ at: translation.target, route }); }
    }
  }
  return undefined;
}

export function translateInLanguageFamily(request: LanguageFamilyTranslationRequest): LanguageTranslationJudgment {
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
  if (route === undefined) return obstruction({ source: request.source, sourcePresentation, targetPresentation, translate: (expression: JsonValue) => expression }, "unrepresentable-form", "no directed translation route exists in the language family");
  let artifact = request.source;
  let current = sourcePresentation;
  for (let index = 0; index < route.length; index += 1) {
    const translation = route[index]!;
    const next = request.family.presentations.find((presentation) => presentation.address === translation.target)!;
    const result = translateLanguageArtifactStep({ source: artifact, sourcePresentation: current, targetPresentation: next, translate: translation.translate, lossProfile: translation.lossProfile, ...(request.resourceAvailable === undefined ? {} : { resourceAvailable: request.resourceAvailable }), ...(index === route.length - 1 && request.targetType !== undefined ? { targetType: request.targetType } : {}), ...(index === route.length - 1 && request.targetAssertions !== undefined ? { targetAssertions: request.targetAssertions } : {}) });
    if (!result.ok) return result;
    artifact = result.artifact;
    current = next;
  }
  const omissions = canonicalStrings(route.flatMap((translation) => translation.lossProfile.kind === "lossy" ? translation.lossProfile.omits : []));
  const body = Object.freeze({ kind: "metroplat.language.translation" as const, version: 3 as const, family: request.family.address, route: Object.freeze(route.map((translation) => translation.address)), source: request.source.address, target: artifact.address, sourceLanguage: sourcePresentation.id, targetLanguage: targetPresentation.id, sourcePresentation: sourcePresentation.address, targetPresentation: targetPresentation.address, semanticAddress: request.source.semanticAddress, assertions: artifact.assertions, validationScope: canonicalStrings(targetPresentation.validationScope), lossProfile: omissions.length === 0 ? Object.freeze({ kind: "lossless" as const }) : Object.freeze({ kind: "lossy" as const, omits: omissions }) });
  return Object.freeze({ ok: true as const, artifact, witness: Object.freeze({ ...body, address: translationAddressOf(body) }) });
}

export function translationWitnessIsValid(
  witness: LanguageTranslationWitness,
  source: LanguageArtifact,
  target: LanguageArtifact,
  family?: LanguageFamily,
): boolean {
  if (witness.kind !== "metroplat.language.translation" || witness.version !== 3 || !languageArtifactIsValid(source) || !languageArtifactIsValid(target)) return false;
  if (witness.source !== source.address || witness.target !== target.address) return false;
  if (witness.sourceLanguage !== source.language || witness.targetLanguage !== target.language) return false;
  if (witness.sourcePresentation !== source.presentation || witness.targetPresentation !== target.presentation || witness.semanticAddress !== source.semanticAddress || witness.semanticAddress !== target.semanticAddress) return false;
  if (canonicalBytes(witness.assertions) !== canonicalBytes(target.assertions)) return false;
  for (const assertion of source.assertions) {
    if (!target.assertions.some((candidate) => candidate.claim === assertion.claim && candidate.charge === assertion.charge)) return false;
  }
  const { address: _address, ...body } = witness;
  if (translationAddressOf(body) !== witness.address) return false;
  if (family === undefined) return true;
  const route = routeOf(family, witness.sourcePresentation, witness.targetPresentation);
  if (!languageFamilyIsValid(family) || witness.family !== family.address || route === undefined) return false;
  const omissions = canonicalStrings(route.flatMap((translation) => translation.lossProfile.kind === "lossy" ? translation.lossProfile.omits : []));
  const lossProfile: TranslationLossProfile = omissions.length === 0
    ? Object.freeze({ kind: "lossless" as const })
    : Object.freeze({ kind: "lossy" as const, omits: omissions });
  return canonicalBytes(witness.route) === canonicalBytes(route.map((translation) => translation.address))
    && canonicalBytes(witness.lossProfile) === canonicalBytes(lossProfile);
}

export type { Corner, Rung } from "../codecs/projector/index.mts";
