// src/tools/registry.mjs
//
// Generic model-agnostic tool registry. Bundles no tool sets of its own —
// each domain (EVE Assist, Gig Assist, ...) builds its own registry via
// buildRegistry(...its own tool-set arrays). Moved upstream 2026-09-05 from
// @red-cup-engineering/eve-online-services-section (Gig Assist spec §i).
// No node:fs/node:http; Web-standard globals only.

import { ToolError } from "./tool-error.mjs";

export { ToolError };

function invalidArgsError(field, reason) {
  const label = field && field.length > 0 ? field : "(root)";
  return new ToolError(`Invalid args: field "${label}" ${reason}`, "invalid_args");
}

// Distinguishes {} (object, not array) from arrays and null, since typeof
// null === "object" and typeof [] === "object" would otherwise both pass an
// unqualified "object" type check.
function jsonTypeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function checkType(schemaType, value, path) {
  switch (schemaType) {
    case "object":
      if (jsonTypeOf(value) !== "object") throw invalidArgsError(path, "must be an object");
      return;
    case "array":
      if (!Array.isArray(value)) throw invalidArgsError(path, "must be an array");
      return;
    case "string":
      if (typeof value !== "string") throw invalidArgsError(path, "must be a string");
      return;
    case "boolean":
      if (typeof value !== "boolean") throw invalidArgsError(path, "must be a boolean");
      return;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw invalidArgsError(path, "must be a number");
      }
      return;
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) {
        throw invalidArgsError(path, "must be an integer");
      }
      return;
    default:
      // A tool defined an unsupported schema `type` — a bug in the tool
      // definition itself, not in caller-supplied args, so it is not a
      // ToolError: it should fail loudly at development time, not be reported
      // to a user as "invalid_args".
      throw new TypeError(`Unsupported JSON-Schema type "${schemaType}" in tool schema at "${path || "(root)"}"`);
  }
}

function joinPath(path, key) {
  return path ? `${path}.${key}` : key;
}

/**
 * Minimal JSON-Schema subset validator. Supports: type (object, array,
 * string, number, integer, boolean), required, properties, enum, and — for
 * arrays — items (recursively). Anything not covered by this subset (e.g.
 * pattern, minimum, oneOf) is simply not enforced.
 */
function validateAgainstSchema(schema, value, path) {
  if (schema === null || typeof schema !== "object") return;
  if (value === undefined) return; // presence is enforced by the parent's `required`, not here

  if (typeof schema.type === "string") {
    checkType(schema.type, value, path);
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((allowed) => allowed === value)) {
    throw invalidArgsError(path, `must be one of ${JSON.stringify(schema.enum)}`);
  }

  if (schema.type === "object" && schema.properties && typeof schema.properties === "object") {
    for (const requiredField of schema.required ?? []) {
      if (value[requiredField] === undefined) {
        throw invalidArgsError(joinPath(path, requiredField), "is required");
      }
    }
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (value[key] !== undefined) {
        validateAgainstSchema(propSchema, value[key], joinPath(path, key));
      }
    }
  }

  if (schema.type === "array" && schema.items) {
    value.forEach((item, index) => {
      validateAgainstSchema(schema.items, item, `${path}[${index}]`);
    });
  }
}

/**
 * Validates `args` against `tool.parameters`. Throws ToolError code
 * "invalid_args" naming the offending field on failure; returns undefined on
 * success.
 * @param {{name: string, parameters?: object}} tool
 * @param {object} args
 */
export function validateArgs(tool, args) {
  if (!tool || typeof tool !== "object" || typeof tool.name !== "string" || tool.name.length === 0) {
    throw new TypeError("validateArgs requires a tool object with a string name");
  }
  const schema = tool.parameters && typeof tool.parameters === "object"
    ? tool.parameters
    : { type: "object", properties: {} };
  const value = args ?? {};
  if (jsonTypeOf(value) !== "object") {
    throw invalidArgsError("", "must be an object");
  }
  validateAgainstSchema(schema, value, "");
}

/**
 * Merges one or more tool-set arrays into a single flat registry, validating
 * every tool definition and rejecting duplicate names across sets.
 * @param {...Array<{name: string, description: string, parameters?: object, handler: Function}>} toolSets
 * @returns {Array<{name: string, description: string, parameters: object, handler: Function}>}
 */
export function buildRegistry(...toolSets) {
  const merged = [];
  const seen = new Set();
  for (const tools of toolSets) {
    if (!Array.isArray(tools)) {
      throw new TypeError("Each tool set must be an array of tool definitions");
    }
    for (const tool of tools) {
      if (!tool || typeof tool !== "object") {
        throw new TypeError("Tool definitions must be objects");
      }
      if (typeof tool.name !== "string" || tool.name.length === 0) {
        throw new TypeError("Tool definition is missing a valid string name");
      }
      if (typeof tool.description !== "string" || tool.description.length === 0) {
        throw new TypeError(`Tool "${tool.name}" is missing a string description`);
      }
      if (typeof tool.handler !== "function") {
        throw new TypeError(`Tool "${tool.name}" is missing a handler function`);
      }
      // Duplicate names across sibling tool sets would silently shadow one
      // tool with another in getTool() lookups; fail loudly at build time.
      if (seen.has(tool.name)) {
        throw new TypeError(`Duplicate tool name in registry: "${tool.name}"`);
      }
      seen.add(tool.name);
      merged.push(tool);
    }
  }
  return merged;
}

/**
 * Looks up a tool by name in a caller-supplied registry array.
 * @param {Array<{name: string}>} registry
 * @param {string} name
 * @returns {{name: string, description: string, parameters: object, handler: Function}}
 * @throws {ToolError} code "unknown_tool" if no tool with that name is registered.
 */
export function getTool(registry, name) {
  if (!Array.isArray(registry)) {
    throw new TypeError("getTool requires a registry array as its first argument");
  }
  if (typeof name !== "string" || name.length === 0) {
    throw new TypeError("getTool requires a non-empty string name");
  }
  const tool = registry.find((candidate) => candidate.name === name);
  if (!tool) {
    throw new ToolError(`Unknown tool: "${name}"`, "unknown_tool");
  }
  return tool;
}

// JSON-Schema keys Gemini's function-calling schema rejects outright.
const GEMINI_UNSUPPORTED_SCHEMA_KEYS = new Set(["$schema", "additionalProperties"]);

function stripForGemini(node) {
  if (Array.isArray(node)) {
    return node.map(stripForGemini);
  }
  if (node !== null && typeof node === "object") {
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      if (GEMINI_UNSUPPORTED_SCHEMA_KEYS.has(key)) continue;
      out[key] = stripForGemini(value);
    }
    return out;
  }
  return node;
}

/**
 * Projects a tool registry into Gemini functionDeclarations shape:
 * [{ name, description, parameters }], with schema keys Gemini rejects
 * ($schema, additionalProperties) stripped recursively.
 * @param {Array<object>} registry
 * @returns {Array<{name: string, description: string, parameters: object}>}
 */
export function toGeminiFunctionDeclarations(registry) {
  if (!Array.isArray(registry)) {
    throw new TypeError("toGeminiFunctionDeclarations requires an array of tools");
  }
  return registry.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: stripForGemini(tool.parameters ?? { type: "object", properties: {} }),
  }));
}

/**
 * Projects a tool registry into MCP tools/list shape:
 * [{ name, description, inputSchema }].
 * @param {Array<object>} registry
 * @returns {Array<{name: string, description: string, inputSchema: object}>}
 */
export function toMcpToolList(registry) {
  if (!Array.isArray(registry)) {
    throw new TypeError("toMcpToolList requires an array of tools");
  }
  return registry.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: structuredClone(tool.parameters ?? { type: "object", properties: {} }),
  }));
}

/**
 * Looks up, validates, and dispatches a tool call against a caller-supplied
 * registry. Resolves to whatever the handler resolves to (contractually
 * { data, observations }).
 *
 * Handler-thrown ToolError (e.g. a missing-scope check) is rethrown as-is so
 * its specific `code` reaches the caller. Any other thrown value is wrapped
 * as ToolError code "tool_failed", with the original error's message folded
 * into the new message so nothing is lost.
 * @param {Array<object>} registry
 * @param {{name: string, args?: object, ctx?: object}} call
 * @returns {Promise<{data: unknown, observations: unknown[]}>}
 */
export async function runTool(registry, { name, args, ctx } = {}) {
  if (typeof name !== "string" || name.length === 0) {
    throw new TypeError("runTool requires a string tool name");
  }
  const tool = getTool(registry, name);
  validateArgs(tool, args);
  try {
    return await tool.handler(ctx, args ?? {});
  } catch (err) {
    if (err instanceof ToolError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new ToolError(`Tool "${name}" failed: ${message}`, "tool_failed");
  }
}
