import { restrict, type Projector } from "../../../../../../../../../../../../computer-data-engineering-services-section/services/typed-resource-classification-kernel-service/src/index.mjs";
import { diagramPalette, diagramToSvgDataform, isPresentedCategoryDiagram } from '../../../../writing/diagram.mjs';
import { serialize, xmlProjector, type XmlNode } from '@red-cup-engineering/xml-document-rendering-service';
import { projectSvg as renderSvg, shapeMorphismRegistry, type ShapeMorphismRegistry, type SvgDataform, type ProjectSvgOptions } from '@red-cup-engineering/xml-document-rendering-service/svg';
export * from '@red-cup-engineering/xml-document-rendering-service/svg';


export function defaultShapeMorphisms(): ShapeMorphismRegistry {
  return shapeMorphismRegistry({ shapes: diagramPalette });
}

export function projectSvg(dataform: SvgDataform, options: ProjectSvgOptions = {}): string {
  return renderSvg(dataform, { ...options, registry: options.registry ?? defaultShapeMorphisms() });
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
