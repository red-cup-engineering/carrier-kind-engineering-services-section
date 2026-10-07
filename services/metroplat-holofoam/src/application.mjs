import { operations } from "@red-cup-engineering/holofoam/operations";

/** Project Holofoam's existing pure operations through an installed platform surface. */
export function holofoamTools() {
  return {
    applications: [],
    tools: Object.values(operations).map((operation) => Object.freeze({
      name: `holofoam_${operation.id}`.replace(/[^A-Za-z0-9_-]/gu, "_").slice(0, 64),
      description: `[holofoam] ${operation.description}`,
      inputSchema: operation.inputSchema ?? { type: "object" },
      admitArguments: false,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      handler: (input) => operation.execute(input),
    })),
  };
}
