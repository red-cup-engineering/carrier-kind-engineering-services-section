import assert from "node:assert/strict";
import test from "node:test";
import { createCapabilityPlatform } from "../src/capability-lifecycle.mjs";

test("disabled providers are absent, do not run or close, and do not degrade readiness", async () => {
  let checked = 0, started = 0, closed = 0;
  const platform = createCapabilityPlatform({ providers: [
    { name: "runtime", start: () => ({ clock: false }) },
    { name: "clock", optional: true, enabled: caps => { checked++; assert.ok(Object.isFrozen(caps)); return caps.runtime.clock; }, start: () => { started++; }, close: () => { closed++; } },
    { name: "dependent", enabled: caps => Object.hasOwn(caps, "clock"), start: () => { started++; }, close: () => { closed++; } },
  ] });
  const caps = await platform.start();
  assert.deepEqual(Object.keys(caps), ["runtime"]); assert.equal(platform.state(), "ready");
  for (const name of ["clock", "dependent"]) { assert.equal(platform.providerStates()[name].state, "disabled"); assert.equal(platform.providerStates()[name].attempts, 0); }
  await platform.start(); await platform.close(); await platform.close();
  assert.equal(checked, 1); assert.equal(started, 0); assert.equal(closed, 0);
});

test("enabled providers retain established dependency ordering and reverse cleanup", async () => {
  const events = [];
  const platform = createCapabilityPlatform({ providers: [
    { name: "runtime", start: () => { events.push("runtime:start"); return { clock: true }; }, close: () => events.push("runtime:close") },
    { name: "clock", enabled: caps => { events.push("clock:enabled"); return caps.runtime.clock; }, start: () => { events.push("clock:start"); return { tick: true }; }, close: () => events.push("clock:close") },
  ] });
  assert.equal((await platform.start()).clock.tick, true); await platform.close();
  assert.deepEqual(events, ["runtime:start", "clock:enabled", "clock:start", "clock:close", "runtime:close"]);
});

test("invalid or throwing predicates fail startup and roll back existing capabilities", async () => {
  for (const enabled of [false, () => undefined, () => 1, () => Promise.resolve(false),
    async () => { throw new Error("rejected async predicate"); },
    () => new Promise((resolve, reject) => setTimeout(() => reject(new Error("delayed rejection")), 5)),
    () => { throw new Error("predicate refused"); }]) {
    let closed = 0, started = 0;
    const platform = createCapabilityPlatform({ providers: [
      { name: "existing", start: () => ({}), close: async () => { await new Promise(resolve => setTimeout(resolve, 10)); closed++; } },
      { name: "conditional", optional: true, enabled, start: () => { started++; } },
    ] });
    await assert.rejects(platform.start(), /enabled must|predicate refused/);
    assert.equal(platform.state(), "failed"); assert.deepEqual(platform.capabilities(), {}); assert.equal(closed, 1); assert.equal(started, 0);
    await platform.close(); assert.equal(closed, 1);
  }
});

test("a required dependent may refuse an absent disabled capability and roll back", async () => {
  let closed = 0, disabledClosed = 0;
  const platform = createCapabilityPlatform({ providers: [
    { name: "existing", start: () => ({}), close: () => { closed++; } },
    { name: "disabled", enabled: () => false, start: () => assert.fail("disabled start"), close: () => { disabledClosed++; } },
    { name: "dependent", start: caps => { assert.equal(Object.hasOwn(caps, "disabled"), false); throw new Error("dependency absent"); } },
  ] });
  await assert.rejects(platform.start(), /dependency absent/); assert.equal(closed, 1); assert.equal(disabledClosed, 0);
  await platform.close(); assert.equal(closed, 1);
});

test("an enabled optional retry does not reevaluate its predicate", async () => {
  let checks = 0, attempts = 0, closed = 0;
  const platform = createCapabilityPlatform({ providers: [{ name: "retry", optional: true, retryMs: 1,
    enabled: () => { checks++; return true; }, start: () => { if (++attempts === 1) throw new Error("retry once"); return {}; }, close: () => { closed++; },
  }] });
  await platform.start(); await until(() => platform.state() === "ready");
  assert.equal(checks, 1); assert.equal(attempts, 2); await platform.close(); assert.equal(closed, 1);
});

const until = async (predicate, milliseconds = 1_000) => {
  const expires = Date.now() + milliseconds;
  while (!predicate()) {
    if (Date.now() >= expires) throw new Error("condition was not reached before its deadline");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

test("an optional provider degrades start, retries, and restores readiness", async () => {
  let attempts = 0;
  const platform = createCapabilityPlatform({
    providers: [{ name: "required", start: async () => "required" }, {
      name: "optional",
      optional: true,
      retryMs: 5,
      start: async () => {
        attempts += 1;
        if (attempts < 3) throw new Error(`attempt ${attempts}`);
        return "optional";
      },
    }],
  });

  await platform.start();
  assert.equal(platform.state(), "degraded");
  assert.ok(["pending", "retrying"].includes(platform.providerStates().optional.state));
  await until(() => platform.state() === "ready");
  assert.equal(platform.providerStates().optional.attempts, 3);
  assert.deepEqual(platform.capabilities(), { required: "required", optional: "optional" });
  await platform.close();
});

test("a required provider failure rejects start and releases providers already started", async () => {
  const stopped = [];
  const platform = createCapabilityPlatform({ providers: [{
    name: "first",
    start: async () => "first",
    close: async () => stopped.push("first"),
  }, {
    name: "required-failure",
    start: async () => { throw new Error("required unavailable"); },
  }] });

  await assert.rejects(platform.start(), /required unavailable/);
  assert.equal(platform.state(), "failed");
  assert.deepEqual(stopped, ["first"]);
  assert.equal(platform.providerStates().first.state, "stopped");
});

test("providers stop in reverse start order", async () => {
  const stopped = [];
  const platform = createCapabilityPlatform({ providers: ["one", "two", "three"].map((name) => ({
    name,
    start: async () => name,
    close: async () => stopped.push(name),
  })) });

  await platform.start();
  await platform.close();
  assert.deepEqual(stopped, ["three", "two", "one"]);
});

test("a stop deadline abandons a hung provider and continues stopping", async () => {
  const stopped = [];
  const platform = createCapabilityPlatform({ providers: [{
    name: "earlier",
    start: async () => "earlier",
    close: async () => stopped.push("earlier"),
  }, {
    name: "hung",
    stopMs: 20,
    start: async () => "hung",
    close: () => new Promise(() => undefined),
  }] });

  await platform.start();
  const began = Date.now();
  await platform.close();
  assert.ok(Date.now() - began < 500);
  assert.deepEqual(stopped, ["earlier"]);
  assert.equal(platform.providerStates().hung.state, "abandoned");
  assert.equal(platform.providerStates().earlier.state, "stopped");
});

test("startup, retry, readiness, stop, and abandon phases emit lifecycle events", async () => {
  const events = [];
  let attempts = 0;
  const platform = createCapabilityPlatform({
    id: "witnessed-platform",
    onEvent: (event) => events.push(event),
    providers: [{
      name: "required",
      start: async () => "required",
      close: async () => undefined,
    }, {
      name: "optional",
      optional: true,
      retryMs: 5,
      stopMs: 20,
      start: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("not yet");
        return "optional";
      },
      close: () => new Promise(() => undefined),
    }],
  });

  await platform.start();
  await until(() => platform.state() === "ready");
  await platform.close();

  assert.ok(events.every((event) => event.kind === "node-process.services.lifecycle-event"));
  assert.ok(events.some((event) => event.service === "required" && event.detail.phase === "start" && event.ok));
  assert.ok(events.some((event) => event.service === "optional" && event.detail.phase === "retry" && !event.ok));
  assert.ok(events.some((event) => event.service === "witnessed-platform" && event.detail.state === "degraded"));
  assert.ok(events.some((event) => event.service === "witnessed-platform" && event.detail.state === "ready"));
  assert.ok(events.some((event) => event.service === "required" && event.detail.phase === "stop"));
  assert.ok(events.some((event) => event.service === "optional" && event.detail.phase === "abandon"));
});

test("a slow optional provider is not retried and becomes ready when it finishes", async () => {
  let attempts = 0;
  let finish;
  const platform = createCapabilityPlatform({
    providers: [{ name: "required", start: async () => "required" }, {
      name: "slow",
      optional: true,
      retryMs: 5,
      start: () => { attempts += 1; return new Promise((resolve) => { finish = resolve; }); },
    }],
  });

  await platform.start();
  assert.equal(platform.state(), "degraded");
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(attempts, 1);
  finish("slow");
  await until(() => platform.state() === "ready");
  assert.equal(attempts, 1);
  await platform.close();
});

test("a required provider that misses its start deadline has its late result closed", async () => {
  let finish;
  const closed = [];
  const platform = createCapabilityPlatform({
    providers: [{
      name: "late",
      startMs: 20,
      start: () => new Promise((resolve) => { finish = resolve; }),
      close: async (value) => { closed.push(value); },
    }],
  });

  await assert.rejects(platform.start(), /did not start within 20 ms/u);
  finish("late-capability");
  await until(() => closed.length === 1);
  assert.deepEqual(closed, ["late-capability"]);
});
