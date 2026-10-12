import { restrict, type Projector } from '../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/typed-resource-classification-kernel-service/src/index.mjs';
import { diagramPalette, diagramToSvgDataform, isPresentedCategoryDiagram } from '../../diagram/index.mts';
import { charge, chargeValue, valueOf, chargeValueName, type Charge, type ChargeValueName } from '@red-cup-engineering/computer-data-engine/bilattice-charge';
import { serialize, xmlProjector, type XmlNode } from '@red-cup-engineering/xml-document-rendering-service';
import { projectSvg as renderSvg, shapeMorphismRegistry, type ShapeMorphismRegistry, type PlacedCell as OwnerPlacedCell, type PlacedEdge as OwnerPlacedEdge, type SvgDataform as OwnerSvgDataform, type ProjectSvgOptions as OwnerProjectSvgOptions } from '@red-cup-engineering/xml-document-rendering-service/svg';
export * from '@red-cup-engineering/xml-document-rendering-service/svg';

export type PlacedCell = OwnerPlacedCell<Charge>;
export type PlacedEdge = OwnerPlacedEdge<Charge>;
export type SvgDataform = OwnerSvgDataform<Charge>;
export type ProjectSvgOptions = OwnerProjectSvgOptions<Charge>;

export function affirmedCharge(): Charge {
  return charge(chargeValue("held"));
}

const present = (c: Charge, side: 0 | 1): boolean => c.value[side].name === "present";

/** The bilattice value-name of a charge (unknown | held | denied | contested). */
export const chargeValueOf = (c: Charge): ChargeValueName => chargeValueName(valueOf(c));

/** A compact charge glyph: ⊤ both, ⊥ neither, t truth-only, f falsity-only. */
export function chargeMark(c: Charge): "t" | "f" | "⊥" | "⊤" {
  const value = chargeValueOf(c);
  if (value === "contested") return "⊤";
  if (value === "unknown") return "⊥";
  return value === "held" ? "t" : "f";
}

/** A contested charge projected to one side; otherwise the value itself. */
export function calmChargeOf(c: Charge, projection: "supported" | "negated" = "supported"): ChargeValueName {
  const value = chargeValueOf(c);
  if (value !== "contested") return value;
  return projection === "negated" ? "denied" : "held";
}

/** The bilattice charge attributes for a cell or edge (data-positive/.../mark). */
export function chargeAttributes(c: Charge): Record<string, string> {
  return {
    "data-positive": String(present(c, 0)),
    "data-negative": String(present(c, 1)),
    "data-value": chargeValueOf(c),
    "data-calm": calmChargeOf(c),
    "data-mark": chargeMark(c),
  };
}

export function defaultShapeMorphisms(): ShapeMorphismRegistry {
  return shapeMorphismRegistry({ shapes: diagramPalette });
}

export function projectSvg(dataform: SvgDataform, options: ProjectSvgOptions = {}): string {
  return renderSvg(dataform, { ...options, registry: options.registry ?? defaultShapeMorphisms(), chargeAttributes: options.chargeAttributes ?? chargeAttributes });
}

export const svgProjector: Projector<any> = restrict<any>(xmlProjector as Projector<any>, {
  type: "svg.xml",
  corner: "assertion",
  rung: "identity",
  recognize: (resource) => /<svg[\s>]/.test(resource.content),
  write: (items) => items.map((item) => {
    if (isPresentedCategoryDiagram(item)) return projectSvg(diagramToSvgDataform(item));
    return serialize(item as XmlNode);
  }).join(""),
});
