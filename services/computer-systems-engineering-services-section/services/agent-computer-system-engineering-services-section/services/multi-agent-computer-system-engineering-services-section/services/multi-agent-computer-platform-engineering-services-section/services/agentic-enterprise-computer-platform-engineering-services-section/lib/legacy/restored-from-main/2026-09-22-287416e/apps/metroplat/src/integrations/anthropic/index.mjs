/**
 * integrations/anthropic — every piece of this package's
 * Anthropic/Claude Code integration, in one directory: `src/` (JSON
 * schemas, codec/chronicle logic — no host I/O), `services/` (confined
 * filesystem reads over real transcript files), and `fleet/` (reading many
 * sessions under one root as one cross-session judgement). Every consumer
 * reaches all of it from this one path regardless.
 *
 * @packageDocumentation
 */
export * from "./service.mjs";
export * from "./inference-client.mjs";
export * from "./fleet/service.mjs";
export * as schema from "./claude-session/schema.mjs";
export * as codec from "./codec.mjs";
export * as fleetSchema from "./fleet/schema.mjs";
