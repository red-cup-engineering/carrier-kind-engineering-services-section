/**
 * @packageDocumentation
 *
 * apps/infograph/operations/realization — package self-reads: canonical form, schema realization,
 * and operation-object introspection.
 */
import { tm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";
import { operation } from "../../../rpc/operation.mjs";

import { isClosed, termSize, termUses } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/typing";
import { isJsonValue } from "@red-cup-engineering/json-services-section";
import { generateDeclaration } from "@red-cup-engineering/relating/typing";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const inspectionReportContract = schemaFrom({
  $id: "metroplat.program.inspection",
  type: "object",
  required: ["kind", "verb", "hasRunTerm"],
  properties: {
    kind: { const: "metroplat.program.inspection" },
    verb: { type: "string", minLength: 1 },
    hasRunTerm: { type: "boolean" },
    domain: { type: "string" },
    codomain: { type: "string" },
    termClosed: { type: "boolean" },
    termSize: { type: "number" },
    termUses: { type: "array", items: { type: "string" } },
  },
  title: "ProgramInspection",
  description: "RMN inspection report for a program schema.",
  additionalProperties: false,
});

const jsonValueSchema = {
  $id: "metroplat/formats/json/value",
  title: "JsonValue",
  description: "Any finite JSON value admitted by the package JSON boundary.",
  anyOf: [
    { type: "null" },
    { type: "boolean" },
    { type: "number" },
    { type: "string" },
    { type: "array", items: { $ref: "#" } },
    { type: "object", additionalProperties: { $ref: "#" } },
  ],
};

const jsonValueContract = Object.freeze({
  kind: "schema-contract",
  id: jsonValueSchema.$id,
  schema: jsonValueSchema,
  references: Object.freeze([]),
  validate: (value) => isJsonValue(value),
  assert: (value, context = jsonValueSchema.$id) => {
    if (isJsonValue(value)) return value;
    throw new TypeError(`${context}: not a JSON value`);
  },
  errors: (value) => isJsonValue(value) ? Object.freeze([]) : Object.freeze(["/ not a JSON value"]),
});

/** canonicalize — a JSON value to its canonical form: the identity endomorphism
 *  on the JSON wire, witnessing idempotence and representation-independence. */
export const canonicalizeOperation = operation({
  verb: "canonicalize",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Re-encode a JSON value in canonical form (identity on the JSON wire).",
  domain: jsonValueContract,
  codomain: jsonValueContract,
  runTerm: tm.lam(tm.var(0)),
});

/** realize — the forgetful functor as a boundary operation: a JSON Schema in,
 *  its TypeScript declaration out. `--name` sets the root type name. */
export const realizeOperation = operation({
  verb: "realize",
  inputFormat: "json",
  outputFormat: "string",
  options: ["name"],
  summary: "Generate a TypeScript declaration from a JSON Schema (realize: Sub(J) → StructuralTypes).",
  description: "Domain: a JSON Schema document. Codomain: TypeScript declaration text; refinements are forgotten and remain the schema's runtime law.",
  run: (input, args) => {
    const name = typeof args["name"] === "string" ? args["name"] : "Root";
    return generateDeclaration(input, name);
  },
});

/** inspect — boundary introspection over a operation object.
 *
 *  Input: the JSON produced by `programObject(operation)`. Output: an inspection
 *  report. This deliberately remains an untyped boundary operation until RMN grows
 *  structural metadata primitives for `isClosed`, `termSize`, and `termUses`.
 */
export const inspectOperation = operation({
  verb: "inspect",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Inspect a operation object: report its domain, codomain, and RMN body structure.",
  description: "Boundary introspection: input is a ProgramObject JSON (the output of programObject()). Output is an ProgramInspection report. This is not yet an IR operation because term metadata reads are host-level.",
  codomain: inspectionReportContract,
  run: (input) => {
    const mc = input;
    const report = {
      kind: "metroplat.program.inspection",
      verb: mc.verb,
      hasRunTerm: mc.runTerm !== undefined,
    };
    if (mc.domain !== undefined) report["domain"] = mc.domain;
    if (mc.codomain !== undefined) report["codomain"] = mc.codomain;
    if (mc.runTerm !== undefined) {
      try {
        const t = mc.runTerm;
        report["termClosed"] = isClosed(t);
        report["termSize"] = termSize(t);
        report["termUses"] = [...termUses(t)];
      } catch {
        // runTerm present but structurally malformed — report hasRunTerm only
      }
    }
    return report;
  },
});

/** The realization module's operation family. */
export const realizationOperations = Object.freeze([
  canonicalizeOperation,
  realizeOperation,
  inspectOperation,
]);
