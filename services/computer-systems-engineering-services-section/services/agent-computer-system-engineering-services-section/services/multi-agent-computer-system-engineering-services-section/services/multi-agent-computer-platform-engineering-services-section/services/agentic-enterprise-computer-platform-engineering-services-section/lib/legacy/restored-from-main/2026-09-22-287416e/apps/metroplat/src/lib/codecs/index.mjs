/**
 * codecs holds pure representation boundary readers and writers, one family per concrete format.
 * It may import values, schema, records, logic, fixpoint, and math, but it must not import capability, contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */
export * as arc42 from "./arc42/index.mjs";
export * as specification from "./specification/index.mjs";
export * as cloudevents from "./cloudevents/index.mjs";
export * as csl from "./csl/index.mjs";
export * as css from "./css/index.mjs";
export * as diagram from "./diagram/index.mjs";
export * as english from "./english/index.mjs";
export * as html from "@red-cup-engineering/html-structural-projection-service";
export * as javascript from "./javascript/index.mjs";
export * as json from "./json/index.mjs";
export * as jsonSchema from "./json-schema/index.mjs";
export * as legibility from "./legibility.mjs";
export * as markdown from "./markdown/index.mjs";
export * as projector from "@red-cup-engineering/computer-data-engineering-services-section/typed-resource-classification";
export * as path from "./path/index.mjs";
export * as text from "./text/index.mjs";
export * as timeAnchor from "./time-anchor/index.mjs";
export * as toml from "@red-cup-engineering/toml-services-section/toml-codec";
export * as turtle from "./turtle/index.mjs";
export * as typescript from "./typescript/index.mjs";
export * as wire from "./wire/index.mjs";
export * as xmlSvg from "./xml-svg/index.mjs";
export * as yaml from "./yaml/index.mjs";
export * from "./javascript/evidence.mjs";
export { polyFromInts, polyToInts, quadraticToNumber } from "./javascript/numbers/index.mjs";
