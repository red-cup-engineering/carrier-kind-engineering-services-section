// The typed-operation message types live in the data layer and their invocation in the code layer
// (javascript-node); this subpath re-exports both so existing importers are untouched.
export * from "@red-cup-engineering/computer-data-engineering-services-section/typed-operation-message";
export { invokeTypedOperation } from "@red-cup-engineering/javascript-node-services-section/invoke-typed-operation";
