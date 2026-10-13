/**
 * visual-valuation holds pure visual channel reads of FOUR charge values and charge orders.
 * It may import values, schema, records, logic, fixpoint, math, codecs, capability, contracts, and sibling rendering modules, but it must not import search, runtime, integrations, interfaces, or apps.
 */
import {
  asChargeValue,
  chargeSideName,
  chargeValue,
  chargeValueName,
  valueOf,
  type Charge,
  type ChargeValue,
  type ChargeValueName,
} from "../../values/index.mts";

export type VisualCharge = Charge | ChargeValue | ChargeValueName;
export type VisualPattern = "solid" | "contradiction-hatch";
export type TruthLean = "against" | "underdetermined" | "for";

export interface ChargeOrderVisualSemantics {
  readonly value: ChargeValueName;
  readonly truthPresent: boolean;
  readonly falsityPresent: boolean;
  readonly knowledgeRank: 0 | 1 | 2;
  readonly truthRank: 0 | 1 | 2;
  readonly truthLean: TruthLean;
  readonly contradictory: boolean;
}

export interface ChargeVisualSlot {
  readonly fill: string;
  readonly text: string;
  readonly border: string;
  readonly outline: string;
  readonly decorationStyle: "dotted" | "solid" | "wavy" | "double";
}

export type ChargeVisualSlots = { readonly [name in ChargeValueName]: ChargeVisualSlot };
export type ChargeVisualColorPalette = { readonly [name in ChargeValueName]: string };
export type ChargeCssBundle = { readonly [name in ChargeValueName]: Readonly<Record<string, string>> };

export interface ChargeVisualPatternDefinition {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly background: string;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly strokeOpacity: number;
  readonly path: string;
}

export interface VisualValuationTheme {
  readonly kind: "visual-valuation.theme";
  readonly name: string;
  readonly colors: ChargeVisualSlots;
  readonly hueByTruthRank: readonly [against: number, underdetermined: number, truth: number];
  readonly saturationByKnowledgeRank: readonly [none: number, oneSide: number, bothSides: number];
  readonly lightnessByKnowledgeRank: readonly [none: number, oneSide: number, bothSides: number];
  readonly opacityByKnowledgeRank: readonly [none: number, oneSide: number, bothSides: number];
  readonly contradictionSaturation: number;
  readonly contradictionHue: number;
  readonly contradictionPattern: ChargeVisualPatternDefinition;
}

export interface VisualValuation {
  readonly kind: "visual-valuation.charge";
  readonly value: ChargeValueName;
  readonly hue: number;
  readonly lightness: number;
  readonly opacity: number;
  readonly saturation: number;
  readonly pattern: VisualPattern;
  readonly color: string;
  readonly textColor: string;
  readonly borderColor: string;
  readonly outlineColor: string;
  readonly decorationStyle: ChargeVisualSlot["decorationStyle"];
  readonly semantics: ChargeOrderVisualSemantics;
  readonly cssDeclarations: Readonly<Record<string, string>>;
}

const slot = (
  fill: string,
  text: string,
  border: string,
  outline: string,
  decorationStyle: ChargeVisualSlot["decorationStyle"],
): ChargeVisualSlot => Object.freeze({ fill, text, border, outline, decorationStyle });

/** Living-Web / IndieWeb defaults shared by SVG, CSS, and other visual codecs. */
export const livingWebIndieWebVisualTheme: VisualValuationTheme = Object.freeze({
  kind: "visual-valuation.theme" as const,
  name: "living-Web/IndieWeb",
  colors: Object.freeze({
    contested: slot("#4b5563", "#4b5563", "#9ca3af", "#9ca3af", "dotted"),
    unknown: slot("#2f7dd1", "#1d4ed8", "#2563eb", "#60a5fa", "solid"),
    held: slot("#d98a2b", "#9f1239", "#c0262d", "#f87171", "wavy"),
    denied: slot("#b3202c", "#166534", "#15803d", "#4ade80", "double"),
  }),
  hueByTruthRank: Object.freeze([32, 215, 209] as const),
  saturationByKnowledgeRank: Object.freeze([14, 64, 70] as const),
  lightnessByKnowledgeRank: Object.freeze([34, 50, 56] as const),
  opacityByKnowledgeRank: Object.freeze([0.38, 0.76, 0.96] as const),
  contradictionHue: 356,
  contradictionSaturation: 78,
  contradictionPattern: Object.freeze({
    id: "metroplat-charge-contradiction-hatch",
    width: 6,
    height: 6,
    background: "#b3202c",
    stroke: "#ffffff",
    strokeWidth: 1.2,
    strokeOpacity: 0.42,
    path: "M0 6 L6 0 M-1 1 L1 -1 M5 7 L7 5",
  }),
});

export const defaultVisualValuationTheme = livingWebIndieWebVisualTheme;

/** The lifted radial charge colors, owned here so codecs do not copy them. */
export const chargeVisualColorPalette: ChargeVisualColorPalette = Object.freeze({
  contested: livingWebIndieWebVisualTheme.colors.contested.fill,
  unknown: livingWebIndieWebVisualTheme.colors.unknown.fill,
  held: livingWebIndieWebVisualTheme.colors.held.fill,
  denied: livingWebIndieWebVisualTheme.colors.denied.fill,
});

const sideSemantics = (value: ChargeValueName): readonly [truth: boolean, falsity: boolean] => {
  const [truth, falsity] = chargeValue(value).coordinates;
  return Object.freeze([chargeSideName(truth) === "present", chargeSideName(falsity) === "present"] as const);
};

/** Resolve a charge, charge value, or value name to the FOUR value name. */
export function visualChargeValueName(charge: VisualCharge): ChargeValueName {
  if (typeof charge === "string") return charge;
  if (charge.kind === "charge") return chargeValueName(valueOf(charge));
  return chargeValueName(asChargeValue(charge));
}

/** Read both bilattice orders as explicit visual semantics. */
export function chargeOrderVisualSemantics(charge: VisualCharge): ChargeOrderVisualSemantics {
  const value = visualChargeValueName(charge);
  const [truthPresent, falsityPresent] = sideSemantics(value);
  const knowledgeRank = (Number(truthPresent) + Number(falsityPresent)) as 0 | 1 | 2;
  const truthRank = (truthPresent && !falsityPresent ? 2 : !truthPresent && falsityPresent ? 0 : 1) as 0 | 1 | 2;
  const truthLean: TruthLean = truthRank === 2 ? "for" : truthRank === 0 ? "against" : "underdetermined";
  return Object.freeze({
    value,
    truthPresent,
    falsityPresent,
    knowledgeRank,
    truthRank,
    truthLean,
    contradictory: truthPresent && falsityPresent,
  });
}

/** Read the default fill color associated with a FOUR charge value. */
export function chargeToColor(
  charge: VisualCharge,
  palette: ChargeVisualColorPalette = chargeVisualColorPalette,
): string {
  return palette[visualChargeValueName(charge)];
}

export function chargeToSvgPattern(
  charge: VisualCharge,
  theme: VisualValuationTheme = defaultVisualValuationTheme,
): ChargeVisualPatternDefinition | undefined {
  return chargeOrderVisualSemantics(charge).contradictory ? theme.contradictionPattern : undefined;
}

export function visualCssDeclarations(visual: Omit<VisualValuation, "cssDeclarations">): Readonly<Record<string, string>> {
  return Object.freeze({
    "--metroplat-charge": `"${visual.value}"`,
    "--metroplat-charge-color": visual.color,
    "--metroplat-charge-hue": String(visual.hue),
    "--metroplat-charge-knowledge-rank": String(visual.semantics.knowledgeRank),
    "--metroplat-charge-lightness": `${visual.lightness}%`,
    "--metroplat-charge-opacity": String(visual.opacity),
    "--metroplat-charge-pattern": `"${visual.pattern}"`,
    "--metroplat-charge-saturation": `${visual.saturation}%`,
    "--metroplat-charge-truth-lean": `"${visual.semantics.truthLean}"`,
    "--metroplat-charge-truth-rank": String(visual.semantics.truthRank),
    "border-color": visual.borderColor,
    "color": visual.textColor,
    "outline-color": visual.outlineColor,
    "text-decoration-style": visual.decorationStyle,
  });
}

/**
 * Project a FOUR charge to visual channels.
 *
 * Truth-order lean is represented by hue/saturation. Knowledge-order amount is
 * represented by opacity/lightness. The paraconsistent top value keeps both
 * sides visible through a contradiction hatch pattern.
 */
export function chargeToVisual(
  charge: VisualCharge,
  theme: VisualValuationTheme = defaultVisualValuationTheme,
): VisualValuation {
  const semantics = chargeOrderVisualSemantics(charge);
  const slot = theme.colors[semantics.value];
  const contradictory = semantics.contradictory;
  const visualBase = Object.freeze({
    kind: "visual-valuation.charge" as const,
    value: semantics.value,
    hue: contradictory ? theme.contradictionHue : theme.hueByTruthRank[semantics.truthRank],
    lightness: theme.lightnessByKnowledgeRank[semantics.knowledgeRank],
    opacity: theme.opacityByKnowledgeRank[semantics.knowledgeRank],
    saturation: contradictory ? theme.contradictionSaturation : theme.saturationByKnowledgeRank[semantics.knowledgeRank],
    pattern: contradictory ? "contradiction-hatch" as const : "solid" as const,
    color: slot.fill,
    textColor: slot.text,
    borderColor: slot.border,
    outlineColor: slot.outline,
    decorationStyle: slot.decorationStyle,
    semantics,
  });
  return Object.freeze({
    ...visualBase,
    cssDeclarations: visualCssDeclarations(visualBase),
  });
}

/** Build one CSS declaration bundle per FOUR value from the visual theme. */
export function chargeVisualCssBundle(
  theme: VisualValuationTheme = defaultVisualValuationTheme,
): ChargeCssBundle {
  return Object.freeze({
    contested: chargeToVisual("contested", theme).cssDeclarations,
    unknown: chargeToVisual("unknown", theme).cssDeclarations,
    held: chargeToVisual("held", theme).cssDeclarations,
    denied: chargeToVisual("denied", theme).cssDeclarations,
  });
}
