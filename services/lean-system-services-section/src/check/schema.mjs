import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { maximumLeanCheckTimeoutMs } from "./plan.mjs";
const text = { type: "string", minLength: 1 };
const names = { type: "array", items: text };
const common = { project: text, timeoutMs: { type: "integer", minimum: 1, maximum: maximumLeanCheckTimeoutMs } };
export const leanCheckRequestSchema = {
    $id: "lean/compiler-action-request", title: "LeanCompilerActionRequest",
    oneOf: [
        { type: "object", required: ["project"], additionalProperties: false,
          properties: { ...common, mode: { const: "build" }, targets: names } },
        { type: "object", required: ["project", "mode", "file"], additionalProperties: false,
          properties: { ...common, mode: { const: "file" }, file: text } },
        { type: "object", required: ["project", "mode", "module", "declaration"], additionalProperties: false,
          properties: { ...common, mode: { const: "declaration" }, module: text, declaration: text } },
    ],
};
export const leanCheckResultSchema = {
    $id: "lean/compiler-action-result", title: "LeanCompilerActionResult",
    type: "object", required: ["kind", "id", "state"],
    properties: {
        kind: { const: "metroplat.lean.check-result" }, id: text,
        state: { enum: ["succeeded", "failed", "refused", "timed-out"] },
        inspection: { type: "object", required: ["declaration", "axioms", "dependencies"], additionalProperties: false,
            properties: { declaration: text, axioms: names, dependencies: names } },
    },
};
export const leanCheckRequestContract = schemaFrom(leanCheckRequestSchema);
export const leanCheckResultContract = schemaFrom(leanCheckResultSchema);
