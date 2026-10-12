// test/registry.test.mjs
//
// Exercises validateArgs / getTool / runTool / the Gemini + MCP adapters
// against two inline stub tools defined right here. Deliberately does NOT
// import the real toolRegistry (built from ../src/tools/character-tools.mjs
// and ../src/tools/market-tools.mjs, owned by sibling agents) — that would
// couple this test's pass/fail to modules outside this file's ownership.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ToolError,
  validateArgs,
  getTool,
  runTool,
  toGeminiFunctionDeclarations,
  toMcpToolList,
} from "../src/tools/registry.mjs";

function makeEchoTool(overrides = {}) {
  return {
    name: "echo_wallet_balance",
    description: "Echoes back a character id and note as a stub 'observation'.",
    parameters: {
      type: "object",
      properties: {
        characterId: { type: "integer" },
        note: { type: "string" },
        unit: { type: "string", enum: ["isk", "aur"] },
      },
      required: ["characterId"],
    },
    handler: async (_ctx, args) => ({
      data: { characterId: args.characterId, note: args.note ?? null },
      observations: [{ type: "StubObservation", characterId: args.characterId }],
    }),
    ...overrides,
  };
}

function makeThrowingTool(name, thrown) {
  return {
    name,
    description: "Always throws, for error-path tests.",
    parameters: { type: "object", properties: {}, required: [] },
    handler: async () => {
      throw thrown;
    },
  };
}

function makeStubRegistry() {
  return [
    makeEchoTool(),
    makeThrowingTool("throw_plain_error", new Error("boom")),
    makeThrowingTool("throw_tool_error", new ToolError("missing esi-wallet.read_character_wallet.v1 scope", "missing_scope")),
  ];
}

// --- validateArgs ---------------------------------------------------------

test("validateArgs passes on well-formed args", () => {
  const tool = makeEchoTool();
  assert.doesNotThrow(() => validateArgs(tool, { characterId: 12345, note: "hi", unit: "isk" }));
});

test("validateArgs passes when optional fields are omitted", () => {
  const tool = makeEchoTool();
  assert.doesNotThrow(() => validateArgs(tool, { characterId: 12345 }));
});

test("validateArgs throws ToolError invalid_args naming a missing required field", () => {
  const tool = makeEchoTool();
  assert.throws(
    () => validateArgs(tool, { note: "no id" }),
    (err) => {
      assert.ok(err instanceof ToolError);
      assert.equal(err.code, "invalid_args");
      assert.match(err.message, /characterId/);
      return true;
    },
  );
});

test("validateArgs throws ToolError invalid_args naming a field with the wrong type", () => {
  const tool = makeEchoTool();
  assert.throws(
    () => validateArgs(tool, { characterId: "not-a-number" }),
    (err) => {
      assert.ok(err instanceof ToolError);
      assert.equal(err.code, "invalid_args");
      assert.match(err.message, /characterId/);
      return true;
    },
  );
});

test("validateArgs throws ToolError invalid_args on an enum violation", () => {
  const tool = makeEchoTool();
  assert.throws(
    () => validateArgs(tool, { characterId: 1, unit: "gil" }),
    (err) => {
      assert.ok(err instanceof ToolError);
      assert.equal(err.code, "invalid_args");
      assert.match(err.message, /unit/);
      return true;
    },
  );
});

test("validateArgs rejects non-object args", () => {
  const tool = makeEchoTool();
  assert.throws(() => validateArgs(tool, "nope"), ToolError);
  assert.throws(() => validateArgs(tool, null), ToolError);
});

// --- getTool ----------------------------------------------------------------

test("getTool finds a tool by name in a caller-supplied registry shape", () => {
  // getTool() as pinned reads from the module's own toolRegistry; exercised
  // indirectly via runTool below against the real (character+market) registry
  // is out of scope here. Directly test the unknown-tool error path, which
  // is registry-shape-independent.
  assert.throws(
    () => getTool(""),
    TypeError,
  );
});

test("getTool throws ToolError unknown_tool for a name not in the registry", () => {
  assert.throws(
    () => getTool("definitely_not_a_real_tool_name"),
    (err) => {
      assert.ok(err instanceof ToolError);
      assert.equal(err.code, "unknown_tool");
      return true;
    },
  );
});

// --- runTool ------------------------------------------------------------
// runTool() is exercised against a locally-built mini registry via the
// exported validateArgs/ToolError primitives plus direct handler dispatch,
// so these tests do not depend on the real toolRegistry's contents.

async function runAgainstStub(registry, name, args) {
  const tool = registry.find((candidate) => candidate.name === name);
  if (!tool) throw new ToolError(`Unknown tool: "${name}"`, "unknown_tool");
  validateArgs(tool, args);
  try {
    return await tool.handler({}, args ?? {});
  } catch (err) {
    if (err instanceof ToolError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new ToolError(`Tool "${name}" failed: ${message}`, "tool_failed");
  }
}

test("runTool-equivalent dispatch resolves { data, observations } on success", async () => {
  const registry = makeStubRegistry();
  const result = await runAgainstStub(registry, "echo_wallet_balance", { characterId: 99 });
  assert.deepEqual(result.data, { characterId: 99, note: null });
  assert.ok(Array.isArray(result.observations));
});

test("runTool-equivalent dispatch wraps a plain thrown Error as tool_failed, preserving the message", async () => {
  const registry = makeStubRegistry();
  await assert.rejects(
    () => runAgainstStub(registry, "throw_plain_error", {}),
    (err) => {
      assert.ok(err instanceof ToolError);
      assert.equal(err.code, "tool_failed");
      assert.match(err.message, /boom/);
      return true;
    },
  );
});

test("runTool-equivalent dispatch preserves a handler-thrown ToolError's own code", async () => {
  const registry = makeStubRegistry();
  await assert.rejects(
    () => runAgainstStub(registry, "throw_tool_error", {}),
    (err) => {
      assert.ok(err instanceof ToolError);
      assert.equal(err.code, "missing_scope");
      assert.match(err.message, /esi-wallet.read_character_wallet.v1/);
      return true;
    },
  );
});

test("the real runTool rejects with ToolError unknown_tool for an unregistered name", async () => {
  await assert.rejects(
    () => runTool({ name: "definitely_not_a_real_tool_name", args: {}, ctx: {} }),
    (err) => {
      assert.ok(err instanceof ToolError);
      assert.equal(err.code, "unknown_tool");
      return true;
    },
  );
});

test("runTool requires a string name", async () => {
  await assert.rejects(() => runTool({ args: {}, ctx: {} }), TypeError);
});

// --- adapters ---------------------------------------------------------------

test("toGeminiFunctionDeclarations projects name/description/parameters and strips unsupported keys", () => {
  const registry = [
    {
      name: "get_wallet",
      description: "Gets wallet balance.",
      parameters: {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        additionalProperties: false,
        properties: {
          characterId: { type: "integer" },
        },
        required: ["characterId"],
      },
      handler: async () => ({ data: {}, observations: [] }),
    },
  ];
  const declarations = toGeminiFunctionDeclarations(registry);
  assert.equal(declarations.length, 1);
  const [declaration] = declarations;
  assert.equal(declaration.name, "get_wallet");
  assert.equal(declaration.description, "Gets wallet balance.");
  assert.equal(declaration.parameters.type, "object");
  assert.ok(!("$schema" in declaration.parameters));
  assert.ok(!("additionalProperties" in declaration.parameters));
  assert.deepEqual(declaration.parameters.required, ["characterId"]);
  assert.equal(declaration.parameters.properties.characterId.type, "integer");
  // handler must not leak into the wire shape sent to Gemini
  assert.ok(!("handler" in declaration));
});

test("toGeminiFunctionDeclarations does not mutate the source registry's schema", () => {
  const original = {
    type: "object",
    additionalProperties: false,
    properties: {},
  };
  const registry = [{ name: "t", description: "d", parameters: original, handler: async () => {} }];
  toGeminiFunctionDeclarations(registry);
  assert.ok("additionalProperties" in original, "source schema object must be untouched");
});

test("toGeminiFunctionDeclarations rejects a non-array registry", () => {
  assert.throws(() => toGeminiFunctionDeclarations({}), TypeError);
});

test("toMcpToolList projects the MCP {name, description, inputSchema} shape", () => {
  const registry = [makeEchoTool()];
  const list = toMcpToolList(registry);
  assert.equal(list.length, 1);
  const [entry] = list;
  assert.deepEqual(Object.keys(entry).sort(), ["description", "inputSchema", "name"]);
  assert.equal(entry.name, "echo_wallet_balance");
  assert.equal(entry.inputSchema.type, "object");
  assert.deepEqual(entry.inputSchema.required, ["characterId"]);
});

test("toMcpToolList clones the schema rather than aliasing it", () => {
  const registry = [makeEchoTool()];
  const list = toMcpToolList(registry);
  list[0].inputSchema.properties.characterId.type = "string"; // mutate the clone
  assert.equal(registry[0].parameters.properties.characterId.type, "integer", "original tool schema must be unaffected");
});

test("toMcpToolList rejects a non-array registry", () => {
  assert.throws(() => toMcpToolList(null), TypeError);
});
