import { restrict,                } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { diagramPalette, diagramToSvgDataform, isPresentedCategoryDiagram } from './diagram.mjs';
import { serialize, xmlProjector,              } from '@red-cup-engineering/xml-document-rendering-service';
import { projectSvg as renderSvg, shapeMorphismRegistry,                                                                      } from '@red-cup-engineering/xml-document-rendering-service/svg';
export * from '@red-cup-engineering/xml-document-rendering-service/svg';

export function defaultShapeMorphisms()                        {
  return shapeMorphismRegistry({ shapes: diagramPalette });
}

export function projectSvg(dataform             , options                    = {})         {
  return renderSvg(dataform, { ...options, registry: options.registry ?? defaultShapeMorphisms() });
}

export const svgProjector                 = restrict     (xmlProjector                  , {
  type: "svg.xml",
  corner: "assertion",
  rung: "strict",
  recognize: (resource) => /<svg[\s>]/.test(resource.content),
  write: (items) => items.map((item) => {
    if (isPresentedCategoryDiagram(item)) return projectSvg(diagramToSvgDataform(item));
    return serialize(item           );
  }).join(""),
});
