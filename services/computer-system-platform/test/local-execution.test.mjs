import assert from "node:assert/strict";
import test from "node:test";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { defineType } from "@red-cup-engineering/computer-data-services-section/type-system";
import { tm } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation";
import { createOperationExecutor, declareCapabilityOperation, executeOperation } from "@red-cup-engineering/computer-code-engineering-services-section/typed-operation";

const text = schemaFrom({ $id: "test/local/text", type: "string" });
const type = defineType({ id: "test/local/text", name: "Text", description: "Text input", schema: { type: "string" }, parents: [] }).value;

test("local contract execution keeps sync results, arguments, context, and original failures", () => {
  let calls = 0;
  const context = { witness: "local" };
  const run = createOperationExecutor({ id: "greet", domain: text, codomain: text, run: (input, args, ctx) => {
    calls += 1; assert.equal(ctx, context); return args.prefix + input;
  } });
  assert.equal(run("Ada", { prefix: "Hello " }, context), "Hello Ada");
  assert.throws(() => run(3, {}, context), /operation greet input/);
  assert.equal(calls, 1);
  const failure = new Error("original host failure");
  assert.throws(() => createOperationExecutor({ id: "fail", run: () => { throw failure; } })(null, {}), error => error === failure);
});

test("local async execution validates carried output without dropping evidence or artifacts", async () => {
  const evidence = [{ kind: "witness" }], artifacts = [{ source: "local" }];
  const bind = (value) => createOperationExecutor({ id: "envelope", domain: text, codomain: text,
    run: async () => ({ value, evidence, artifacts }),
    projectOutput: (output, admit) => ({ ...output, value: admit(output.value) }),
  });
  const result = await bind("ok")("input", {});
  assert.equal(result.value, "ok"); assert.equal(result.evidence, evidence); assert.equal(result.artifacts, artifacts);
  await assert.rejects(bind(4)("input", {}), /operation envelope output/);
  const failure = new Error("async host failure");
  await assert.rejects(createOperationExecutor({ id: "fail", run: async () => { throw failure; } })(null, {}), error => error === failure);
});

test("portable local terms execute through the same pre/post boundary", () => {
  const term = structuredClone(tm.lam(tm.var(0)));
  const run = createOperationExecutor({ id: "identity", domain: text, codomain: text, runTerm: term });
  assert.equal(run("retained", {}), "retained");
  assert.throws(() => run(1, {}), /operation identity input/);
  assert.equal(Object.isFrozen(term), false);
});

test("typed execution refuses effects and invalid inputs before resolving a host, then checks sync and async outputs", async () => {
  const operation = declareCapabilityOperation({ id: "host", domain: type, codomain: type, effects: ["write"] }).value;
  let resolutions = 0;
  const options = { allowedEffects: ["write"], resolveHost: () => { resolutions += 1; return () => 3; } };
  assert.equal(executeOperation(operation, "input", { ...options, allowedEffects: [] }).refusal.code, "EffectRefused");
  assert.equal(executeOperation(operation, 2, options).refusal.code, "InvalidInput");
  assert.equal(resolutions, 0);
  assert.equal(executeOperation(operation, "input", options).refusal.code, "InvalidOutput");
  const asyncOptions = { allowedEffects: ["write"], resolveHost: async () => async () => "ok" };
  assert.deepEqual(await executeOperation(operation, "input", asyncOptions), { ok: true, value: "ok" });
  assert.equal((await executeOperation(operation, "input", { ...asyncOptions, resolveHost: async () => async () => 3 })).refusal.code, "InvalidOutput");
});
