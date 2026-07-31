/**
 * mcp — the JSNodeServer's Model Context Protocol surface.
 *
 * This module owns the MCP *contract*: the tool descriptors an agent sees on
 * `tools/list`, the orientation `instructions`, and the argument parsing that
 * turns a `tools/call` into a typed request. The *data* behind each tool is
 * supplied by the service (service.mts) through `JSNodeMcpDeps`, so the tools
 * read the same in-process indices the HTTP routes do — no HTTP round-trip, one
 * cache, invalidated by refresh() in lockstep.
 *
 * The tools mirror the agent (JSON) surface documented on the service: search,
 * a package record, the subject atlas, the dependency-graph analysis, the
 * type-flow category and one type's presentation, and the attributed type /
 * function indices.
 */
import type { McpDispatch, McpTool } from "@emsenn/web/mcp";

/** The in-process data accessors the tools delegate to. Each returns the same
 *  JSON value the corresponding HTTP route emits; `undefined` means not found. */
export interface JSNodeMcpDeps {
  search(query: string): unknown;
  package(name: string): unknown | undefined;
  atlas(): unknown;
  analysis(): unknown;
  typeFlow(): unknown;
  typeFlowType(type: string, to: string | undefined): unknown | undefined;
  types(match: string): unknown;
  functions(taking: string | undefined, producing: string | undefined): unknown;
  domains(): unknown;
}

const READ_ONLY = { readOnlyHint: true, openWorldHint: false, destructiveHint: false } as const;

export const JSNODE_TOOLS: readonly McpTool[] = [
  {
    name: "jsnode_search",
    description:
      "Search the workspace's packages, ranked (name > tag > description). Use this FIRST to find the package(s) that own a concept, then jsnode_package for detail.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Search term (matched against package name, tags, and description)" } },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: "jsnode_package",
    description:
      "The full record for one workspace package by exact name (e.g. @emsenn/jsnode-computer): its description, layer, tags, coordinate, and its dependencies and dependents within the workspace.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "Exact package name" } },
      required: ["name"],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: "jsnode_atlas",
    description:
      "The domain atlas: the workspace browsed by subject. Each domain with its representative description, role coverage, and import degree — the best whole-workspace overview.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
  },
  {
    name: "jsnode_domains",
    description:
      "The domain quotient: the dependency graph contracted to subjects (which subject areas depend on which). The bird's-eye dependency structure.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
  },
  {
    name: "jsnode_analysis",
    description:
      "The geometry of the dependency graph: connected components, acyclicity/cycles, distance (diameter/radius/centre), and per-package centrality and strata.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
  },
  {
    name: "jsnode_typeflow",
    description:
      "The type-flow category: types as objects and functions as morphisms, with composition (codomain meets domain) made explicit — the hub types, sources, and sinks across the built workspace. Building the index runs the TypeScript compiler over every package's declarations, so the first call may be slow; it is then cached.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
  },
  {
    name: "jsnode_typeflow_type",
    description:
      "One type's hom-functor presentation: the functions that produce and consume it, its one-step neighbours, and what it reaches by composition. Pass `to` to also get a shortest pipeline of functions from this type to that one.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "The type name (must be addressable — declared in exactly one package)" },
        to: { type: "string", description: "Optional target type; returns a shortest function pipeline from `type` to `to`" },
      },
      required: ["type"],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: "jsnode_types",
    description:
      "Attributed types across the built workspace, optionally filtered to those whose name contains a substring. Each type is attributed to the package that declares it.",
    inputSchema: {
      type: "object",
      properties: { match: { type: "string", description: "Optional case-insensitive substring of the type name" } },
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: "jsnode_functions",
    description:
      "Attributed functions across the built workspace, optionally filtered by a type in their domain (`taking`) and/or their codomain (`producing`). Find the functions that move you between two types.",
    inputSchema: {
      type: "object",
      properties: {
        taking: { type: "string", description: "Optional: substring of a parameter type" },
        producing: { type: "string", description: "Optional: substring of the return type" },
      },
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
];

/** Server-level orientation handed to the model on connect. */
export function jsnodeInstructions(name: string): string {
  return [
    `The ${name} workspace package graph, read off package.json manifests and built TypeScript declarations. Read-only.`,
    "",
    "Two complementary views:",
    "- The package graph — packages and their workspace dependencies. Tools: jsnode_search, jsnode_package, jsnode_atlas, jsnode_domains, jsnode_analysis.",
    "- The type-flow category — types as objects, functions as morphisms. Tools: jsnode_typeflow, jsnode_typeflow_type, jsnode_types, jsnode_functions.",
    "",
    "Typical workflow:",
    "1. jsnode_atlas for the whole-workspace overview by subject, or jsnode_search to find the package(s) that own a concept.",
    "2. jsnode_package for one package's dependencies and dependents.",
    "3. jsnode_typeflow_type to see what produces/consumes a type, and `to` for a pipeline between two types.",
    "",
    "The type-flow tools read built declarations; a package that has never been built contributes no types.",
  ].join("\n");
}

function requireString(args: Readonly<Record<string, unknown>>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`missing required string argument: ${key}`);
  }
  return value;
}

function optionalString(args: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Route a `tools/call` to the in-process data accessors. */
export function jsnodeDispatch(deps: JSNodeMcpDeps): McpDispatch {
  return async (name, args) => {
    switch (name) {
      case "jsnode_search":
        return deps.search(requireString(args, "query"));
      case "jsnode_package": {
        const pkgName = requireString(args, "name");
        const record = deps.package(pkgName);
        if (record === undefined) throw new Error(`package not found: ${pkgName}`);
        return record;
      }
      case "jsnode_atlas":
        return deps.atlas();
      case "jsnode_domains":
        return deps.domains();
      case "jsnode_analysis":
        return deps.analysis();
      case "jsnode_typeflow":
        return deps.typeFlow();
      case "jsnode_typeflow_type": {
        const type = requireString(args, "type");
        const record = deps.typeFlowType(type, optionalString(args, "to"));
        if (record === undefined) throw new Error(`type not addressable in the flow: ${type}`);
        return record;
      }
      case "jsnode_types":
        return deps.types(optionalString(args, "match") ?? "");
      case "jsnode_functions":
        return deps.functions(optionalString(args, "taking"), optionalString(args, "producing"));
      default:
        throw new Error(`unknown tool: ${name}`);
    }
  };
}
