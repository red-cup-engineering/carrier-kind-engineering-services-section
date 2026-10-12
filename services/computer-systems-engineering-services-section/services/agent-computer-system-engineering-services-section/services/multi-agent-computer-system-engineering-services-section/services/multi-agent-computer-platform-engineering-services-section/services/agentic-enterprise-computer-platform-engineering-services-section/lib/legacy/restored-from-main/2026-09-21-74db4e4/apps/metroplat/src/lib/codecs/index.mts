/**
 * codecs holds pure representation boundary readers and writers, one family per concrete format.
 * It may import values, schema, records, logic, fixpoint, and math, but it must not import capability, contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */
export * as arc42 from "./arc42/index.mts";
export * as specification from "./specification/index.mts";
export * as cloudevents from "./cloudevents/index.mts";
export * as csl from "./csl/index.mts";
export * as css from "./css/index.mts";
export * as diagram from "./diagram/index.mts";
export * as english from "./english/index.mts";
export * as html from "@red-cup-engineering/html-structural-projection-service";
export * as javascript from "./javascript/index.mts";
export * as json from "./json/index.mts";
export * as jsonSchema from "./json-schema/index.mts";
export * as legibility from "./legibility.mts";
export * as markdown from "./markdown/index.mts";
export * as provenance from "./provenance/index.mts";
export * as projector from "@red-cup-engineering/computer-data-engineering-services-section/typed-resource-classification";
export * as path from "./path/index.mts";
export * as text from "./text/index.mts";
export * as timeAnchor from "./time-anchor/index.mts";
export * as toml from "@red-cup-engineering/toml-codec-service";
export * as turtle from "./turtle/index.mts";
export * as typescript from "./typescript/index.mts";
export * as wire from "./wire/index.mts";
export * as xmlSvg from "./xml-svg/index.mts";
export * as yaml from "./yaml/index.mts";
export * from "./javascript/evidence.mts";
export { polyFromInts, polyToInts, quadraticToNumber } from "./javascript/numbers/index.mts";
