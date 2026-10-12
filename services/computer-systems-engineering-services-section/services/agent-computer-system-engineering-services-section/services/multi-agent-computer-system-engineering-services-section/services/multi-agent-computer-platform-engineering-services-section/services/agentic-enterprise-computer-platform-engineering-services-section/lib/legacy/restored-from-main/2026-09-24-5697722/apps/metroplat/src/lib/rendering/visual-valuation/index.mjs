/**
 * visual-valuation holds pure visual channel reads of FOUR charge values and charge orders.
 * It may import values, schema, records, logic, fixpoint, math, codecs, capability, contracts, and sibling rendering modules, but it must not import search, runtime, integrations, interfaces, or apps.
 */
import {
  asChargeValue,
  chargeSideName,
  chargeValue,
  chargeValueName,
  chargeValueNameOfNotationName,
  isCharge,
  notationNameOfChargeValueName,
  valueOf,

} from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";

const slot = (
  fill,
  text,
  border,
  outline,
  decorationStyle,
) => Object.freeze({ fill, text, border, outline, decorationStyle });

/** Living-Web / IndieWeb defaults shared by SVG, CSS, and other visual codecs. */
export const livingWebIndieWebVisualTheme = Object.freeze({
  kind: "visual-valuation.theme",
  name: "living-Web/IndieWeb",
  colors: Object.freeze({
    contested: slot("#4b5563", "#4b5563", "#9ca3af", "#9ca3af", "dotted"),
    unknown: slot("#2f7dd1", "#1d4ed8", "#2563eb", "#60a5fa", "solid"),
    held: slot("#d98a2b", "#9f1239", "#c0262d", "#f87171", "wavy"),
    denied: slot("#b3202c", "#166534", "#15803d", "#4ade80", "double"),
  }),
  hueByTruthRank: Object.freeze([32, 215, 209]),
  saturationByKnowledgeRank: Object.freeze([14, 64, 70]),
  lightnessByKnowledgeRank: Object.freeze([34, 50, 56]),
  opacityByKnowledgeRank: Object.freeze([0.38, 0.76, 0.96]),
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
export const chargeVisualColorPalette = Object.freeze({
  contested: livingWebIndieWebVisualTheme.colors.contested.fill,
  unknown: livingWebIndieWebVisualTheme.colors.unknown.fill,
  held: livingWebIndieWebVisualTheme.colors.held.fill,
  denied: livingWebIndieWebVisualTheme.colors.denied.fill,
});

/** This module's own visual theme is keyed by the relation model notation's
 *  vocabulary (`contested`/`unknown`/`held`/`denied`, matching `theme.colors`
 *  below), not the computer-data-engine's — so every read of the actual FOUR
 *  bilattice (`chargeValue`/`chargeValueName`) crosses that boundary. */
const sideSemantics = (value) => {
  const [truth, falsity] = chargeValue(chargeValueNameOfNotationName(value)).coordinates;
  return Object.freeze([chargeSideName(truth) === "present", chargeSideName(falsity) === "present"]);
};

/** Resolve a charge carrier, charge value, or value name to the FOUR value
 *  name in this module's own (notation) vocabulary. */
export function visualChargeValueName(charge) {
  if (typeof charge === "string") return charge;
  if (isCharge(charge)) return notationNameOfChargeValueName(chargeValueName(valueOf(charge)));
  return notationNameOfChargeValueName(chargeValueName(asChargeValue(charge)));
}

/** Read both bilattice orders as explicit visual semantics. */
export function chargeOrderVisualSemantics(charge) {
  const value = visualChargeValueName(charge);
  const [truthPresent, falsityPresent] = sideSemantics(value);
  const knowledgeRank = (Number(truthPresent) + Number(falsityPresent));
  const truthRank = (truthPresent && !falsityPresent ? 2 : !truthPresent && falsityPresent ? 0 : 1);
  const truthLean = truthRank === 2 ? "for" : truthRank === 0 ? "against" : "underdetermined";
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
  charge,
  palette = chargeVisualColorPalette,
) {
  return palette[visualChargeValueName(charge)];
}

export function chargeToSvgPattern(
  charge,
  theme = defaultVisualValuationTheme,
) {
  return chargeOrderVisualSemantics(charge).contradictory ? theme.contradictionPattern : undefined;
}

export function visualCssDeclarations(visual) {
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
  charge,
  theme = defaultVisualValuationTheme,
) {
  const semantics = chargeOrderVisualSemantics(charge);
  const slot = theme.colors[semantics.value];
  const contradictory = semantics.contradictory;
  const visualBase = Object.freeze({
    kind: "visual-valuation.charge",
    value: semantics.value,
    hue: contradictory ? theme.contradictionHue : theme.hueByTruthRank[semantics.truthRank],
    lightness: theme.lightnessByKnowledgeRank[semantics.knowledgeRank],
    opacity: theme.opacityByKnowledgeRank[semantics.knowledgeRank],
    saturation: contradictory ? theme.contradictionSaturation : theme.saturationByKnowledgeRank[semantics.knowledgeRank],
    pattern: contradictory ? "contradiction-hatch" : "solid",
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
  theme = defaultVisualValuationTheme,
) {
  return Object.freeze({
    contested: chargeToVisual("contested", theme).cssDeclarations,
    unknown: chargeToVisual("unknown", theme).cssDeclarations,
    held: chargeToVisual("held", theme).cssDeclarations,
    denied: chargeToVisual("denied", theme).cssDeclarations,
  });
}
