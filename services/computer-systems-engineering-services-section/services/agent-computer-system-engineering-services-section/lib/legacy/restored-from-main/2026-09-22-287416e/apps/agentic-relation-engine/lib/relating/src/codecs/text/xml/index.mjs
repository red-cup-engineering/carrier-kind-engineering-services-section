/**
 * codecs/text/xml - the XML serialization branch.
 *
 * Core XML primitives come from the shared XML rendering service; HTML and SVG are refinements
 * below this textual XML boundary.
 */
export * from "@red-cup-engineering/xml-document-rendering-service";
export * as html from "./html/index.mjs";
export * as svg from "./svg/index.mjs";
