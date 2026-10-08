import assert from "node:assert/strict";
import test from "node:test";
import { COMPUTER_ENGINEERING_SPECIFICATION_ID } from "@red-cup-engineering/computer-system-engine/specification";
import { createTypeSystem, defineType } from "@red-cup-engineering/computer-data-services-section/type-system";
import { declareCapabilityOperation } from "@red-cup-engineering/computer-code-engineering-services-section/typed-operation";
import { encodeOperationRequest, decodeOperationOutcome, jsonWireCodec, wireCodecCatalog } from "../src/wire.mjs";
import { bindingsProviders, createComputerPlatform, hostResolverOf, isComputerPlatform } from "../src/index.mjs";

test("providers start once in order, are visible as capabilities, and release in reverse", async () => {
  const events = [];
  const platform = createComputerPlatform({ providers: [
    { name: "storage", start: () => { events.push("storage+"); return new Map([["value", 7]]); }, close: () => { events.push("storage-"); } },
    { name: "clock", start: () => { events.push("clock+"); return () => 123; }, close: () => { events.push("clock-"); } },
  ] });
  assert.equal(isComputerPlatform(platform), true);
  assert.deepEqual(platform.capabilities(), {});
  const [first, second] = await Promise.all([platform.start(), platform.start()]);
  assert.equal(first.storage.get("value"), 7);
  assert.equal(second.clock(), 123);
  assert.deepEqual(events, ["storage+", "clock+"]);
  await platform.close(); await platform.close();
  assert.deepEqual(events, ["storage+", "clock+", "clock-", "storage-"]);
  assert.equal(platform.closed(), true);
  await assert.rejects(platform.start(), /closed/);
});

test("a startup failure releases what started and rejects without a partial platform", async () => {
  let released = 0;
  const platform = createComputerPlatform({ providers: [
    { name: "storage", start: () => new Map(), close: () => { released++; } },
    { name: "unavailable", start: () => { throw new Error("provider failed"); } },
  ] });
  await assert.rejects(platform.start(), /provider failed/);
  assert.equal(released, 1);
  assert.deepEqual(platform.capabilities(), {});
});

test("close waits for acquired work to drain before releasing", async () => {
  let closes = 0;
  const platform = createComputerPlatform({ providers: [{ name: "resource", start: () => ({}), close: () => { closes++; } }] });
  await platform.start();
  const release = platform.acquire();
  const closing = platform.close();
  await Promise.resolve();
  assert.equal(closes, 0);
  release(); release();
  await closing;
  assert.equal(closes, 1);
});

test("duplicate provider names are refused at composition", () => {
  assert.throws(() => createComputerPlatform({ providers: [{ name: "a", start: () => 1 }, { name: "a", start: () => 2 }] }), /unique/);
});

test("bindings become lifecycle-free providers and host resolution binds capability-effect operations by name", async () => {
  const text = defineType({ id: "test:text", name: "text", description: "test text", schema: { type: "string" }, parents: [] }).value;
  const typeSystem = createTypeSystem([text]).value;
  const operation = declareCapabilityOperation({ id: "test.shout", domain: text, codomain: text, capability: "test.shout" }).value;
  const platform = createComputerPlatform({
    id: "test.platform",
    typeSystem, operations: [operation],
    providers: bindingsProviders({ "test.shout": (input) => String(input).toUpperCase(), DB: { prepare() {} } }),
  });
  await platform.start();
  assert.equal(typeof platform.capabilities().DB.prepare, "function");
  assert.equal(hostResolverOf(platform.capabilities)("test.shout")("x"), "X");
  const result = await platform.execute("test.shout", "quiet");
  assert.equal(result.ok, true);
  assert.equal(result.value, "QUIET");
  await platform.close();
});

test("an unknown operation is refused as a value", async () => {
  const platform = createComputerPlatform({ id: "empty" });
  const result = await platform.execute("anything", {});
  assert.equal(result.ok, false);
  assert.equal(result.refusal.code, "OperationUnavailable");
  assert.equal(COMPUTER_ENGINEERING_SPECIFICATION_ID.length > 0, true);
});

function operationPlatform(host, close = () => {}) {
  const text = defineType({ id: "test:lifetime-text", name: "text", description: "text", schema: { type: "string" }, parents: [] }).value;
  const operation = declareCapabilityOperation({ id: "test.invoke", domain: text, codomain: text, effects: ["test:invoke"] }).value;
  return createComputerPlatform({
    id: "test.lifetime", typeSystem: createTypeSystem([text]).value, operations: [operation],
    providers: [{ name: "test.invoke", start: () => host, close }],
  });
}

for (const entry of ["execute", "dispatch"]) {
  test(`${entry} starts providers and retains them through concurrent work and shutdown`, async () => {
    const pending = [];
    let released = false;
    const platform = operationPlatform((input) => new Promise((resolve) => pending.push(() => resolve(input.toUpperCase()))), () => { released = true; });
    const codecs = wireCodecCatalog([jsonWireCodec]);
    const invoke = entry === "execute"
      ? (input) => platform.execute("test.invoke", input, { allowedEffects: ["test:invoke"] })
      : async (input) => decodeOperationOutcome(await platform.dispatch(encodeOperationRequest({ actorResourceCatalog: {},
          requestId: input, operationId: "test.invoke", inputCodec: "json", input: jsonWireCodec.encode(input), outputCodec: "json",
        }), { codecs, allowedEffects: ["test:invoke"] }), codecs).result;
    const first = invoke("first");
    const second = invoke("second");
    await platform.start();
    const closing = platform.close();
    await Promise.resolve();
    assert.equal(pending.length, 2);
    assert.equal(released, false);
    assert.throws(() => platform.acquire(), /closed/);
    if (entry === "execute") assert.equal((await invoke("late")).refusal.code, "platform-closed");
    else await assert.rejects(invoke("late"), /closed/);
    pending[0]();
    assert.deepEqual(await first, { ok: true, value: "FIRST" });
    assert.equal(released, false);
    pending[1]();
    assert.deepEqual(await second, { ok: true, value: "SECOND" });
    await closing;
    assert.equal(released, true);
  });
}

test("platform execution keeps typed admission and provider binding authoritative", async () => {
  let invoked = 0;
  const platform = operationPlatform((input) => { invoked++; return input; });
  assert.equal((await platform.execute("test.invoke", "x")).refusal.code, "EffectRefused");
  assert.equal((await platform.execute("test.invoke", 123, { allowedEffects: ["test:invoke"] })).refusal.code, "InvalidInput");
  assert.equal(invoked, 0);
  // A JavaScript caller cannot replace the platform's provider through options.
  assert.deepEqual(platform.execute("test.invoke", "owned", {
    allowedEffects: ["test:invoke"], resolveHost: () => () => "foreign",
  }), { ok: true, value: "owned" });
  await platform.close();
});

test("a failed provider startup releases the operation's acquisition", async () => {
  const platform = createComputerPlatform({
    ...operationPlatform((input) => input).specification,
    providers: [{ name: "test.invoke", start: () => { throw new Error("startup unavailable"); } }],
  });
  await assert.rejects(platform.execute("test.invoke", "x"), /startup unavailable/);
  await platform.close();
});
