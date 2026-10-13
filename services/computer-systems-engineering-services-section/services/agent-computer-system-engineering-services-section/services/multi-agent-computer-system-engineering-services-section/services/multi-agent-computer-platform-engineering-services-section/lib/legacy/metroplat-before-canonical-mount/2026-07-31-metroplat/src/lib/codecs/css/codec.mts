/**
 * codecs/text/css - CSS as visual valuation closure.
 *
 * A specified CSS assignment set supplies semantic loci, predicate fibers, and FOUR
 * charges. This codec applies the T1 visual-valuation bundle to the charged
 * fibers, admits authored/profile declarations at the same boundary, and closes
 * the result under the CSS cascade. The closure stage order is CSS precedence:
 * origin/importance, layer, specificity, scope proximity, then source order.
 * Inheritance and custom-property propagation over the locus parent graph are
 * part of the same ordinal closure process.
 *
 * @packageDocumentation
 */
import { define, type Projector } from "../projector/index.mts";
import { count } from "../../math/rational/exact-number.mts";
import {
  closeOrdinalProcess,
  closureProcess,
  closureStabilizationSearchHorizon,
  stabilizingSup,
  type ClosureResult,
  type Lattice,
} from "../../fixpoint/closure.mts";
import {
  type Charge,
  type ChargeValueName,
} from "../../values/index.mts";
import type { Valuation } from "../../logic/predicating/evidence/fiber.mts";
import {
  chargeToVisual,
  chargeVisualCssBundle,
  visualChargeValueName,
  type ChargeCssBundle,
} from "../../rendering/visual-valuation/index.mts";

/** A CSS specificity vector `[ids, classes/attributes/pseudo-classes, types/pseudo-elements]`. */
export type CssSpecificity = readonly [ids: number, classes: number, types: number];

/** The cascade origins this projection models. */
export type CssCascadeOrigin = "user-agent" | "user" | "author" | "animation" | "transition";

/** Conditional CSS contexts kept separate until browser evaluation time. */
export interface CssCondition {
  readonly media?: string;
  readonly supports?: string;
}

/** A settled semantic locus to be valued visually. */
export interface CssLocus {
  readonly id: string;
  readonly selector?: string;
  readonly parent?: string;
}

/** Shared cascade placement fields for T1 and authored declarations. */
export interface CssCascadePlacement {
  readonly origin?: CssCascadeOrigin;
  readonly important?: boolean;
  /** `undefined` uses the profile default layer; `null` emits unlayered CSS. */
  readonly layer?: string | null;
  readonly sourceOrder?: number;
  readonly specificity?: CssSpecificity;
  readonly scopeDistance?: number;
  readonly condition?: CssCondition;
  readonly priority?: number;
}

/** One charged assignment in an assignment fiber. */
export interface CssAssignment extends CssCascadePlacement {
  readonly id?: string;
  readonly locus?: string;
  readonly selector?: string;
  readonly charge: Charge | ChargeValueName;
  readonly declarations?: Readonly<Record<string, string>>;
}

/** An assignment fiber whose assignments are projected by the T1 visual bundle. */
export interface CssAssignmentFiber {
  readonly id: string;
  readonly assignments: readonly CssAssignment[];
}

/** An authored declaration rule admitted alongside the visual valuation bundle. */
export interface CssAuthoredRule extends CssCascadePlacement {
  readonly id?: string;
  readonly locus?: string;
  readonly selector: string;
  readonly declarations: Readonly<Record<string, string>>;
  readonly charge?: Charge | ChargeValueName;
  readonly fiber?: string;
}

/** The specified CSS assignment set expected by this codec. */
export interface CssAssignmentSet {
  readonly kind?: "rendering.css.assignmentSet";
  readonly loci: readonly (string | CssLocus)[];
  readonly fibers: readonly CssAssignmentFiber[];
  readonly rules?: readonly CssAuthoredRule[];
}

/** Input accepted by the CSS projection. */
export type CssProjectionInput = CssAssignmentSet | Valuation;

/** A thin target-regime profile for the projection lens. */
export interface CssProjectionProfile {
  readonly kind?: "rendering.css.profile";
  readonly regime?: string;
  readonly bundle?: Partial<ChargeCssBundle>;
  readonly selectorForLocus?: (locus: string) => string;
  readonly rootSelector?: string;
  readonly layers?: readonly string[];
  readonly defaultLayer?: string;
  readonly emitLayerPrelude?: boolean;
  readonly inheritedProperties?: readonly string[];
  readonly rules?: readonly CssAuthoredRule[];
}

/** One visual declaration before and during cascade closure. */
export interface CssVisualDeclaration {
  readonly kind: "rendering.css.visualDeclaration";
  readonly id: string;
  readonly locus: string;
  readonly fiber: string;
  readonly selector: string;
  readonly property: string;
  readonly value: string;
  readonly charge: ChargeValueName | "authored";
  readonly specificity: CssSpecificity;
  readonly sourceOrder: number;
  readonly origin: CssCascadeOrigin;
  readonly important: boolean;
  readonly scopeDistance: number;
  readonly priority: number;
  readonly inherited: boolean;
  readonly layer?: string;
  readonly condition?: CssCondition;
  readonly inheritedFrom?: string;
}

/** The cascade closure state used as the ordinal closure value. */
export interface CssCascadeState {
  readonly kind: "rendering.css.cascadeState";
  readonly processed: number;
  readonly declarations: readonly CssVisualDeclaration[];
}

/** The closed stylesheet. */
export interface CssStylesheet {
  readonly kind: "rendering.css.stylesheet";
  readonly input: CssProjectionInput;
  readonly profile?: CssProjectionProfile;
}

const defaultRegime = "living-Web/IndieWeb";
const defaultLayers = Object.freeze(["base", "relations", "overrides"] as const);
const defaultInheritedProperties = Object.freeze([
  "color",
  "cursor",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "letter-spacing",
  "line-height",
  "text-align",
  "text-decoration-color",
  "text-decoration-style",
  "visibility",
] as const);

/** Living-Web / IndieWeb defaults for the target regime. */
export const livingWebIndieWebProfile: CssProjectionProfile = Object.freeze({
  kind: "rendering.css.profile" as const,
  regime: defaultRegime,
  rootSelector: ":root",
  layers: defaultLayers,
  defaultLayer: "relations",
  emitLayerPrelude: true,
  inheritedProperties: defaultInheritedProperties,
});

const CSS_IDENTIFIER = /^-?[_a-zA-Z][-_a-zA-Z0-9]*$/u;
const CSS_LAYER_NAME = /^[_a-zA-Z][-_a-zA-Z0-9]*(?:\.[_a-zA-Z][-_a-zA-Z0-9]*)*$/u;

const cssString = (value: string): string =>
  `"${value.replace(/\\/gu, "\\\\").replace(/"/gu, "\\\"").replace(/\n/gu, "\\a ")}"`;

const defaultSelectorForLocus = (locus: string): string => `[data-metroplat-locus=${cssString(locus)}]`;

const normalizeLocus = (locus: string | CssLocus): CssLocus =>
  typeof locus === "string" ? Object.freeze({ id: locus }) : locus;

const locusKey = (locus: CssLocus): string => locus.id;
const labelOf = (value: { readonly mark: { readonly value: unknown } }): string => String(value.mark.value);
const isValuation = (value: CssProjectionInput): value is Valuation => value.kind === "predication.fiber.valuation";

const assignmentSetFromValuation = (valuation: Valuation): CssAssignmentSet => {
  const loci = new Map<string, CssLocus>();
  const fibers = valuation.fibers.map((fiber): CssAssignmentFiber => {
    const id = String(fiber.predicate.claim.mark.value);
    const assignments = fiber.assignments.map((assignment): CssAssignment => {
      const locus = labelOf(assignment.cell.subject);
      loci.set(locus, Object.freeze({ id: locus }));
      return Object.freeze({ locus, charge: assignment.charge });
    });
    return Object.freeze({ id, assignments: Object.freeze(assignments) });
  });
  return Object.freeze({
    kind: "rendering.css.assignmentSet" as const,
    loci: Object.freeze([...loci.values()].sort((left, right) => left.id.localeCompare(right.id))),
    fibers: Object.freeze(fibers),
  });
};

const chargeNameOf = (charge: Charge | ChargeValueName): ChargeValueName =>
  visualChargeValueName(charge);

/** T1 visual valuation for one FOUR charge as CSS declarations. */
export function t1VisualValuationBundle(charge: ChargeValueName): Readonly<Record<string, string>> {
  return chargeToVisual(charge).cssDeclarations;
}

/**
 * T1 visual valuation: one compact, inspectable visual bundle per FOUR charge.
 *
 * The custom properties carry the valuation witness; ordinary properties give a
 * browser-readable default without forcing a full design system on callers.
 */
export const T1_VISUAL_VALUATION_BUNDLE: ChargeCssBundle = chargeVisualCssBundle();

const normalizeProfile = (profile: CssProjectionProfile = livingWebIndieWebProfile): Required<
  Pick<CssProjectionProfile, "regime" | "rootSelector" | "layers" | "defaultLayer" | "emitLayerPrelude" | "inheritedProperties">
> & CssProjectionProfile => {
  const layers = Object.freeze([...(profile.layers ?? defaultLayers)]);
  return Object.freeze({
    kind: "rendering.css.profile" as const,
    regime: profile.regime ?? defaultRegime,
    rootSelector: profile.rootSelector ?? ":root",
    layers,
    defaultLayer: profile.defaultLayer ?? "relations",
    emitLayerPrelude: profile.emitLayerPrelude ?? true,
    inheritedProperties: Object.freeze([...(profile.inheritedProperties ?? defaultInheritedProperties)]),
    ...(profile.bundle === undefined ? {} : { bundle: profile.bundle }),
    ...(profile.selectorForLocus === undefined ? {} : { selectorForLocus: profile.selectorForLocus }),
    ...(profile.rules === undefined ? {} : { rules: profile.rules }),
  });
};

const visualBundle = (profile: CssProjectionProfile): ChargeCssBundle => {
  const overlay = profile.bundle ?? {};
  return Object.freeze({
    contested: Object.freeze({ ...T1_VISUAL_VALUATION_BUNDLE.contested, ...overlay.contested }),
    unknown: Object.freeze({ ...T1_VISUAL_VALUATION_BUNDLE.unknown, ...overlay.unknown }),
    held: Object.freeze({ ...T1_VISUAL_VALUATION_BUNDLE.held, ...overlay.held }),
    denied: Object.freeze({ ...T1_VISUAL_VALUATION_BUNDLE.denied, ...overlay.denied }),
  });
};

/** Compute CSS selector specificity for the selector subset this codec emits. */
export function cssSpecificity(selector: string): CssSpecificity {
  const stripped = selector
    .replace(/:where\([^)]*\)/gu, "")
    .replace(/"[^"]*"|'[^']*'/gu, "");
  const ids = stripped.match(/#[\w-]+/gu)?.length ?? 0;
  const classes = (stripped.match(/\.[\w-]+/gu)?.length ?? 0)
    + (stripped.match(/\[[^\]]+\]/gu)?.length ?? 0)
    + (stripped.match(/:(?!:)[\w-]+(?:\([^)]*\))?/gu)?.length ?? 0);
  const typeTokens = stripped
    .replace(/#[\w-]+/gu, " ")
    .replace(/\.[\w-]+/gu, " ")
    .replace(/\[[^\]]+\]/gu, " ")
    .replace(/::[\w-]+/gu, " type ")
    .split(/[\s>+~*,]+/u)
    .filter((token) => /^[A-Za-z][\w-]*$/u.test(token) && token !== "type");
  const pseudoElements = stripped.match(/::[\w-]+/gu)?.length ?? 0;
  return Object.freeze([ids, classes, typeTokens.length + pseudoElements] as const);
}

const compareSpecificity = (left: CssSpecificity, right: CssSpecificity): number =>
  left[0] - right[0] || left[1] - right[1] || left[2] - right[2];

const normalizeCondition = (condition: CssCondition | undefined): CssCondition | undefined => {
  const media = condition?.media?.trim();
  const supports = condition?.supports?.trim();
  if (!media && !supports) return undefined;
  return Object.freeze({
    ...(media ? { media } : {}),
    ...(supports ? { supports } : {}),
  });
};

const conditionKey = (condition: CssCondition | undefined): string => {
  const normalized = normalizeCondition(condition);
  return normalized === undefined ? "" : `${normalized.media ?? ""}\u0000${normalized.supports ?? ""}`;
};

const declarationSlotKey = (declaration: Pick<CssVisualDeclaration, "locus" | "property" | "condition">): string =>
  `${declaration.locus}\u0000${declaration.property}\u0000${conditionKey(declaration.condition)}`;

const declarationSortKey = (declaration: CssVisualDeclaration): string =>
  [
    declarationSlotKey(declaration),
    declaration.selector,
    declaration.layer ?? "",
    declaration.fiber,
    declaration.charge,
    declaration.inherited ? "1" : "0",
    declaration.inheritedFrom ?? "",
    String(declaration.priority).padStart(8, "0"),
    declaration.specificity.map((part) => String(part).padStart(8, "0")).join("."),
    String(declaration.scopeDistance).padStart(8, "0"),
    String(declaration.sourceOrder).padStart(8, "0"),
    declaration.value,
  ].join("\u0000");

const originRank = (origin: CssCascadeOrigin, important: boolean): number => {
  if (origin === "transition") return 7;
  if (origin === "animation") return important ? 4 : 3;
  if (!important) {
    if (origin === "user-agent") return 0;
    if (origin === "user") return 1;
    return 2;
  }
  if (origin === "author") return 4;
  if (origin === "user") return 5;
  return 6;
};

const layerRank = (layer: string | undefined, important: boolean, profile: ReturnType<typeof normalizeProfile>): number => {
  const index = layer === undefined ? -1 : profile.layers.indexOf(layer);
  if (!important) {
    if (layer === undefined) return profile.layers.length + 2;
    return index < 0 ? profile.layers.length + 1 : index + 1;
  }
  if (layer === undefined) return 0;
  return index < 0 ? 1 : profile.layers.length - index + 1;
};

const cascadeRank = (
  declaration: CssVisualDeclaration,
  profile: ReturnType<typeof normalizeProfile>,
): readonly [number, number, number, number, number, number, number, number] =>
  Object.freeze([
    originRank(declaration.origin, declaration.important),
    layerRank(declaration.layer, declaration.important, profile),
    declaration.priority,
    declaration.specificity[0],
    declaration.specificity[1],
    declaration.specificity[2],
    -declaration.scopeDistance,
    declaration.sourceOrder,
  ] as const);

const compareCascadeRank = (
  left: CssVisualDeclaration,
  right: CssVisualDeclaration,
  profile: ReturnType<typeof normalizeProfile>,
): number => {
  const l = cascadeRank(left, profile);
  const r = cascadeRank(right, profile);
  return l[0] - r[0] || l[1] - r[1] || l[2] - r[2] || l[3] - r[3] || l[4] - r[4]
    || l[5] - r[5] || l[6] - r[6] || l[7] - r[7]
    || declarationSortKey(left).localeCompare(declarationSortKey(right));
};

const chooseDeclaration = (
  left: CssVisualDeclaration,
  right: CssVisualDeclaration,
  profile: ReturnType<typeof normalizeProfile>,
): CssVisualDeclaration => {
  if (left.inherited !== right.inherited) return left.inherited ? right : left;
  return compareCascadeRank(left, right, profile) <= 0 ? right : left;
};

const sortedDeclarations = (declarations: readonly CssVisualDeclaration[]): readonly CssVisualDeclaration[] =>
  Object.freeze([...declarations].sort((left, right) => declarationSortKey(left).localeCompare(declarationSortKey(right))));

const sameDeclarations = (left: readonly CssVisualDeclaration[], right: readonly CssVisualDeclaration[]): boolean => {
  if (left.length !== right.length) return false;
  return left.every((declaration, index) => {
    const other = right[index];
    return other !== undefined
      && declaration.id === other.id
      && declaration.locus === other.locus
      && declaration.fiber === other.fiber
      && declaration.selector === other.selector
      && declaration.property === other.property
      && declaration.value === other.value
      && declaration.charge === other.charge
      && declaration.origin === other.origin
      && declaration.important === other.important
      && declaration.inherited === other.inherited
      && declaration.layer === other.layer
      && declaration.scopeDistance === other.scopeDistance
      && declaration.priority === other.priority
      && declaration.sourceOrder === other.sourceOrder
      && declaration.inheritedFrom === other.inheritedFrom
      && conditionKey(declaration.condition) === conditionKey(other.condition)
      && compareSpecificity(declaration.specificity, other.specificity) === 0;
  });
};

const sameState = (left: CssCascadeState, right: CssCascadeState): boolean =>
  left.processed === right.processed && sameDeclarations(left.declarations, right.declarations);

const state = (processed: number, declarations: readonly CssVisualDeclaration[]): CssCascadeState =>
  Object.freeze({
    kind: "rendering.css.cascadeState" as const,
    processed,
    declarations: sortedDeclarations(declarations),
  });

const joinState = (
  left: CssCascadeState,
  right: CssCascadeState,
  profile: ReturnType<typeof normalizeProfile>,
): CssCascadeState => {
  const bySlot = new Map<string, CssVisualDeclaration>();
  for (const declaration of [...left.declarations, ...right.declarations]) {
    const key = declarationSlotKey(declaration);
    const prior = bySlot.get(key);
    bySlot.set(key, prior === undefined ? declaration : chooseDeclaration(prior, declaration, profile));
  }
  return state(Math.max(left.processed, right.processed), [...bySlot.values()]);
};

const leqState = (
  left: CssCascadeState,
  right: CssCascadeState,
  profile: ReturnType<typeof normalizeProfile>,
): boolean =>
  left.processed <= right.processed
  && left.declarations.every((declaration) => {
    const other = right.declarations.find((candidate) => declarationSlotKey(candidate) === declarationSlotKey(declaration));
    return other !== undefined && chooseDeclaration(declaration, other, profile) === other;
  });

const toNatural = (value: number) => count(Array.from({ length: Math.max(0, value) }));

const cssPropertyName = (property: string): string => {
  if (!/^--[-_a-zA-Z0-9]+$/u.test(property) && !/^-?[_a-zA-Z][-_a-zA-Z0-9]*$/u.test(property)) {
    throw new TypeError(`css: invalid property name ${JSON.stringify(property)}`);
  }
  return property;
};

const cssLayerName = (layer: string): string => {
  if (!CSS_LAYER_NAME.test(layer)) throw new TypeError(`css: invalid layer name ${JSON.stringify(layer)}`);
  return layer;
};

const isInheritedProperty = (property: string, profile: ReturnType<typeof normalizeProfile>): boolean =>
  property.startsWith("--") || profile.inheritedProperties.includes(property);

const normalizeAssignmentSet = (input: CssProjectionInput): CssAssignmentSet =>
  isValuation(input) ? assignmentSetFromValuation(input) : input;

const isLocusList = (
  value: CssProjectionInput | readonly (string | CssLocus)[],
): value is readonly (string | CssLocus)[] => Array.isArray(value);

const normalizedLoci = (assignmentSet: CssAssignmentSet): readonly CssLocus[] =>
  Object.freeze([...assignmentSet.loci].map(normalizeLocus).sort((left, right) => locusKey(left).localeCompare(locusKey(right))));

const selectorByLocus = (
  loci: readonly CssLocus[],
  profile: ReturnType<typeof normalizeProfile>,
): ReadonlyMap<string, string> => {
  const selectorForLocus = profile.selectorForLocus ?? defaultSelectorForLocus;
  return new Map(loci.map((locus) => [locus.id, locus.selector ?? selectorForLocus(locus.id)] as const));
};

const assignmentSortKey = (assignment: CssAssignment): string =>
  [
    assignment.id ?? "",
    assignment.locus ?? "",
    assignment.selector ?? "",
    chargeNameOf(assignment.charge),
    String(assignment.sourceOrder ?? -1).padStart(8, "0"),
    conditionKey(assignment.condition),
  ].join("\u0000");

const ruleSortKey = (rule: CssAuthoredRule): string =>
  [
    rule.id ?? "",
    rule.locus ?? "",
    rule.selector,
    rule.fiber ?? "",
    rule.charge === undefined ? "" : chargeNameOf(rule.charge),
    String(rule.sourceOrder ?? -1).padStart(8, "0"),
    conditionKey(rule.condition),
  ].join("\u0000");

type DeclarationSeed = CssCascadePlacement & {
  readonly id?: string;
  readonly locus: string;
  readonly selector: string;
  readonly fiber: string;
  readonly charge: ChargeValueName | "authored";
  readonly declarations: Readonly<Record<string, string>>;
};

const declarationFromSeed = (
  seed: DeclarationSeed,
  property: string,
  value: string,
  generatedOrder: number,
  profile: ReturnType<typeof normalizeProfile>,
): CssVisualDeclaration => {
  const condition = normalizeCondition(seed.condition);
  const layer = seed.layer === undefined ? profile.defaultLayer : seed.layer === null ? undefined : seed.layer;
  return Object.freeze({
    kind: "rendering.css.visualDeclaration" as const,
    id: seed.id ?? `${seed.locus}:${seed.fiber}:${property}:${generatedOrder}`,
    locus: seed.locus,
    fiber: seed.fiber,
    selector: seed.selector,
    property: cssPropertyName(property),
    value,
    charge: seed.charge,
    specificity: seed.specificity ?? cssSpecificity(seed.selector),
    sourceOrder: seed.sourceOrder ?? generatedOrder,
    origin: seed.origin ?? "author",
    important: seed.important ?? false,
    scopeDistance: seed.scopeDistance ?? 0,
    priority: seed.priority ?? 0,
    inherited: false,
    ...(layer === undefined ? {} : { layer }),
    ...(condition === undefined ? {} : { condition }),
  });
};

/** Apply the T1 visual-valuation bundle to assignment fibers before cascade closure. */
export function visualValuationDeclarations(
  input: CssProjectionInput,
  profile: CssProjectionProfile = livingWebIndieWebProfile,
): readonly CssVisualDeclaration[] {
  const normalizedProfile = normalizeProfile(profile);
  const assignmentSet = normalizeAssignmentSet(input);
  const loci = normalizedLoci(assignmentSet);
  const selectors = selectorByLocus(loci, normalizedProfile);
  const bundle = visualBundle(normalizedProfile);
  const declarations: CssVisualDeclaration[] = [];
  let generatedOrder = 0;

  for (const fiber of [...assignmentSet.fibers].sort((left, right) => left.id.localeCompare(right.id))) {
    for (const assignment of [...fiber.assignments].sort((left, right) => assignmentSortKey(left).localeCompare(assignmentSortKey(right)))) {
      const locus = assignment.locus ?? fiber.id;
      const selector = assignment.selector ?? selectors.get(locus) ?? (normalizedProfile.selectorForLocus ?? defaultSelectorForLocus)(locus);
      const charge = chargeNameOf(assignment.charge);
      const seed: DeclarationSeed = {
        ...assignment,
        locus,
        selector,
        fiber: fiber.id,
        charge,
        declarations: assignment.declarations ?? bundle[charge],
      };
      for (const [property, value] of Object.entries(seed.declarations).sort(([left], [right]) => left.localeCompare(right))) {
        declarations.push(declarationFromSeed(seed, property, value, generatedOrder, normalizedProfile));
        generatedOrder += 1;
      }
    }
  }

  for (const rule of [...(assignmentSet.rules ?? []), ...(normalizedProfile.rules ?? [])].sort((left, right) => ruleSortKey(left).localeCompare(ruleSortKey(right)))) {
    const locus = rule.locus ?? rule.selector;
    const seed: DeclarationSeed = {
      ...rule,
      locus,
      selector: rule.selector,
      fiber: rule.fiber ?? "authored",
      charge: rule.charge === undefined ? "authored" : chargeNameOf(rule.charge),
      declarations: rule.declarations,
    };
    for (const [property, value] of Object.entries(rule.declarations).sort(([left], [right]) => left.localeCompare(right))) {
      declarations.push(declarationFromSeed(seed, property, value, generatedOrder, normalizedProfile));
      generatedOrder += 1;
    }
  }

  return sortedDeclarations(declarations);
}

const inheritedDeclaration = (
  declaration: CssVisualDeclaration,
  child: CssLocus,
  childSelector: string,
): CssVisualDeclaration => Object.freeze({
  ...declaration,
  id: `inherit:${child.id}:${declaration.id}`,
  locus: child.id,
  selector: childSelector,
  specificity: cssSpecificity(childSelector),
  inherited: true,
  inheritedFrom: declaration.locus,
});

const inheritOnce = (
  current: CssCascadeState,
  loci: readonly CssLocus[],
  selectors: ReadonlyMap<string, string>,
  profile: ReturnType<typeof normalizeProfile>,
): CssCascadeState => {
  const inherited: CssVisualDeclaration[] = [];
  for (const child of loci) {
    if (child.parent === undefined) continue;
    const childSelector = selectors.get(child.id) ?? defaultSelectorForLocus(child.id);
    for (const declaration of current.declarations) {
      if (declaration.locus !== child.parent) continue;
      if (!isInheritedProperty(declaration.property, profile)) continue;
      inherited.push(inheritedDeclaration(declaration, child, childSelector));
    }
  }
  return inherited.length === 0 ? current : joinState(current, state(current.processed, inherited), profile);
};

/** Close visual declarations under the CSS cascade using the ordinal closure workbench. */
export function closeCascade(
  declarations: readonly CssVisualDeclaration[],
  input: CssProjectionInput | readonly (string | CssLocus)[] = Object.freeze([]),
  profile: CssProjectionProfile = livingWebIndieWebProfile,
): ClosureResult<CssCascadeState> {
  const normalizedProfile = normalizeProfile(profile);
  const assignmentSet = isLocusList(input)
    ? Object.freeze({ kind: "rendering.css.assignmentSet" as const, loci: input, fibers: Object.freeze([]) })
    : normalizeAssignmentSet(input);
  const loci = normalizedLoci(assignmentSet);
  const selectors = selectorByLocus(loci, normalizedProfile);
  const ordered = [...declarations].sort((left, right) => compareCascadeRank(left, right, normalizedProfile));
  const bottom = state(0, []);
  const lattice: Lattice<CssCascadeState> = {
    bottom,
    leq: (left, right) => leqState(left, right, normalizedProfile),
    join: (left, right) => joinState(left, right, normalizedProfile),
    eq: sameState,
    sup: stabilizingSup({ eq: sameState }),
  };
  const endomorphism = (current: CssCascadeState): CssCascadeState => {
    const next = ordered[current.processed];
    const stepped = next === undefined
      ? current
      : joinState(current, state(current.processed + 1, [next]), normalizedProfile);
    return inheritOnce(stepped, loci, selectors, normalizedProfile);
  };
  const inheritanceBound = Math.max(1, loci.length) * Math.max(1, normalizedProfile.inheritedProperties.length + 8);
  return closeOrdinalProcess(closureProcess(
    lattice,
    endomorphism,
    closureStabilizationSearchHorizon(toNatural(ordered.length + inheritanceBound + 2), toNatural(0)),
  ));
}

const emitDeclaration = (declaration: CssVisualDeclaration): string => {
  const important = declaration.important && !declaration.inherited ? " !important" : "";
  return `  ${cssPropertyName(declaration.property)}: ${declaration.value}${important};`;
};

const emitRule = (selector: string, declarations: readonly CssVisualDeclaration[], indent = ""): string => {
  const body = [...declarations]
    .sort((left, right) => left.property.localeCompare(right.property))
    .map((declaration) => `${indent}${emitDeclaration(declaration)}`)
    .join("\n");
  return `${indent}${selector} {\n${body}\n${indent}}`;
};

const indentBlock = (body: string): string => body.split("\n").map((line) => line === "" ? line : `  ${line}`).join("\n");

const wrapCondition = (condition: CssCondition | undefined, body: string): string => {
  const normalized = normalizeCondition(condition);
  if (normalized === undefined) return body;
  let out = body;
  if (normalized.supports !== undefined) out = `@supports ${normalized.supports} {\n${indentBlock(out)}\n}`;
  if (normalized.media !== undefined) out = `@media ${normalized.media} {\n${indentBlock(out)}\n}`;
  return out;
};

const emitLayer = (layer: string | undefined, body: string): string =>
  layer === undefined ? body : `@layer ${cssLayerName(layer)} {\n${indentBlock(body)}\n}`;

const groupKey = (condition: CssCondition | undefined, layer: string | undefined, selector: string): string =>
  `${conditionKey(condition)}\u0000${layer ?? ""}\u0000${selector}`;

const emitStylesheet = (
  declarations: readonly CssVisualDeclaration[],
  profile: ReturnType<typeof normalizeProfile>,
): string => {
  const byRule = new Map<string, { condition: CssCondition | undefined; layer: string | undefined; selector: string; declarations: CssVisualDeclaration[] }>();
  for (const declaration of declarations) {
    const key = groupKey(declaration.condition, declaration.layer, declaration.selector);
    const bucket = byRule.get(key);
    if (bucket === undefined) {
      byRule.set(key, {
        condition: declaration.condition,
        layer: declaration.layer,
        selector: declaration.selector,
        declarations: [declaration],
      });
    } else {
      bucket.declarations.push(declaration);
    }
  }

  const chunks: string[] = [
    `${profile.rootSelector} {\n  --metroplat-css-profile: ${cssString(profile.regime)};\n}`,
  ];
  if (profile.emitLayerPrelude && profile.layers.length > 0) {
    chunks.push(`@layer ${profile.layers.map(cssLayerName).join(", ")};`);
  }
  for (const bucket of [...byRule.values()].sort((left, right) =>
    groupKey(left.condition, left.layer, left.selector).localeCompare(groupKey(right.condition, right.layer, right.selector)))) {
    chunks.push(wrapCondition(bucket.condition, emitLayer(bucket.layer, emitRule(bucket.selector, bucket.declarations))));
  }
  return `${chunks.join("\n\n")}\n`;
};

/** Project settled input to deterministic CSS text: CSS = visual valuation closure. */
export function assignmentSetToStylesheet(
  input: CssProjectionInput,
  profile: CssProjectionProfile = livingWebIndieWebProfile,
): string {
  const normalizedProfile = normalizeProfile(profile);
  const assignmentSet = normalizeAssignmentSet(input);
  const declarations = visualValuationDeclarations(assignmentSet, normalizedProfile);
  const closure = closeCascade(declarations, assignmentSet, normalizedProfile);
  return emitStylesheet(closure.value.declarations, normalizedProfile);
}

/** The CSS textual boundary as a filesystem projector. */
export const cssProjector: Projector<CssStylesheet> = define<CssStylesheet>({
  type: "css",
  corner: "data",
  rung: "scott",
  recognize: (resource) => resource.path.endsWith(".css") || /--metroplat-css-profile:/u.test(resource.content),
  write: (items) => items.map((item) => assignmentSetToStylesheet(item.input, item.profile)).join("\n"),
});
