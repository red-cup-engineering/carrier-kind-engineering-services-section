import assert from "node:assert/strict";
import test from "node:test";
import { projectArguments, resolveBinding } from "../src/compute-binding.mjs";

const declaration = { method: "POST", route: "/v1/compute", operation: "first" };
const binding = { package: "@a/b", export: "compute", args: ["body"] };

test("concurrent requests share a failed import and the next request recovers", async () => {
  let loads = 0;
  const failure = new Error("loader temporarily unavailable");
  const invoke = resolveBinding(binding, declaration, { load: async () => {
    loads += 1;
    if (loads === 1) throw failure;
    return { compute: (value) => value };
  } });
  const failed = await Promise.allSettled([invoke({ body: "a" }), invoke({ body: "b" })]);
  assert.equal(loads, 1);
  assert.ok(failed.every((result) => result.status === "rejected" && result.reason === failure));
  assert.deepEqual(await Promise.all([invoke({ body: "c" }), invoke({ body: "d" })]), ["c", "d"]);
  assert.equal(loads, 2);
});

test("execution failure does not evict a successfully loaded operation", async () => {
  let loads = 0;
  const invoke = resolveBinding(binding, declaration, { load: async () => {
    loads += 1;
    return { compute: (value) => { if (value === "bad") throw new Error("bad input"); return value; } };
  } });
  await assert.rejects(invoke({ body: "bad" }), /bad input/u);
  assert.equal(await invoke({ body: "good" }), "good");
  assert.equal(loads, 1);
});

test("caller mutation cannot change the admitted operation or argument projection", async () => {
  const selected = { ...binding, args: ["body", "offer.operation"] };
  const offer = { ...declaration };
  const invoke = resolveBinding(selected, offer, { load: async () => ({ compute: (...args) => args, other: () => "wrong" }) });
  selected.export = "other";
  selected.args[0] = "env";
  offer.operation = "changed";
  assert.deepEqual(await invoke({ body: false, env: { secret: "private" } }), [false, "first"]);
});

test("argument projection preserves own null values and refuses inherited fields", () => {
  const body = Object.assign(Object.create({ inherited: "outside" }), { own: null });
  assert.deepEqual(projectArguments({ ...binding, args: ["body.own", "body.inherited", "body.__proto__"] }, declaration, { body }), [null, undefined, undefined]);
});

test("only an explicitly exported operation can be invoked", async () => {
  const invoke = resolveBinding(binding, declaration, { load: async () => Object.create({ compute: () => "inherited" }) });
  await assert.rejects(invoke({ body: {} }), /exports no function/u);
});

test("typed operation records retain their executor context", async () => {
  const invoke = resolveBinding(binding, declaration, { load: async () => ({ compute: { value: "received", execute() { return this.value; } } }) });
  assert.equal(await invoke({ body: {} }), "received");
});
