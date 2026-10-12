import { restrict } from '@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification';
import { diagramPalette, isPresentedCategoryDiagram, diagramToSvgDataform } from "@red-cup-engineering/relating/writing/diagram";
import { charge, chargeValue, valueOf, chargeValueName, notationNameOfChargeValueName } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { serialize, xmlProjector } from '@red-cup-engineering/xml-document-rendering-service';
import { projectSvg as renderSvg, shapeMorphismRegistry } from '@red-cup-engineering/xml-document-rendering-service/svg';
export * from '@red-cup-engineering/xml-document-rendering-service/svg';

export function affirmedCharge() {
  return charge(chargeValue("potential"));
}

const present = (c, side) => c.value[side].name === "present";

/** The bilattice value-name of a charge, in this codec's own (notation)
 *  vocabulary (unknown | held | denied | contested). */
export const chargeValueOf = (c) => notationNameOfChargeValueName(chargeValueName(valueOf(c)));

/** A compact charge glyph: ⊤ both, ⊥ neither, t truth-only, f falsity-only. */
export function chargeMark(c)   {
  const value = chargeValueOf(c);
  if (value === "contested") return "⊤";
  if (value === "unknown") return "⊥";
  return value === "held" ? "t" : "f";
}

/** A contested charge projected to one side; otherwise the value itself. */
export function calmChargeOf(c, projection = "supported") {
  const value = chargeValueOf(c);
  if (value !== "contested") return value;
  return projection === "negated" ? "denied" : "held";
}

/** The bilattice charge attributes for a cell or edge (data-positive/.../mark). */
export function chargeAttributes(c) {
  return {
    "data-positive": String(present(c, 0)),
    "data-negative": String(present(c, 1)),
    "data-value": chargeValueOf(c),
    "data-calm": calmChargeOf(c),
    "data-mark": chargeMark(c),
  };
}

export function defaultShapeMorphisms() {
  return shapeMorphismRegistry({ shapes: diagramPalette });
}

export function projectSvg(dataform, options = {}) {
  return renderSvg(dataform, { ...options, registry: options.registry ?? defaultShapeMorphisms(), chargeAttributes: options.chargeAttributes ?? chargeAttributes });
}

export const svgProjector = restrict(xmlProjector, {
  type: "svg.xml",
  corner: "assertion",
  rung: "identity",
  recognize: (resource) => /<svg[\s>]/.test(resource.content),
  write: (items) => items.map((item) => {
    if (isPresentedCategoryDiagram(item)) return projectSvg(diagramToSvgDataform(item));
    return serialize(item);
  }).join(""),
});
