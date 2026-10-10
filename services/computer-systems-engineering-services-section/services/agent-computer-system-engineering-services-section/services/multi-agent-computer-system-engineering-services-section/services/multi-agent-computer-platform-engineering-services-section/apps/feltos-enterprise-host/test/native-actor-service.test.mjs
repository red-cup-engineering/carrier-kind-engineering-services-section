import assert from "node:assert/strict";
import test from "node:test";
import { startNativeActorService, nativeActorReadiness, superviseRequiredNativeActor } from "../src/native-actor-service.mjs";

function owner(events = []) {
  let resolve, reject;
  const queue = new Promise((yes, no) => { resolve = yes; reject = no; });
  const resource = {
    inbox: { retained: true },
    provider: { federation: { startQueue: (_unused, { signal }) => {
      events.push("queue-start");
      signal.addEventListener("abort", () => { events.push("queue-stop"); resolve(); }, { once: true });
      return queue;
    } } },
    close: async () => { events.push("actor-close"); },
  };
  return { resource, resolve, reject };
}

test("required actor is not ready merely because the host can answer", () => {
  assert.deepEqual(nativeActorReadiness(undefined, true), { required: true, ok: false, state: "failed" });
  assert.equal(nativeActorReadiness({ state: () => "running" }, true).ok, false);
});

test("non-federating instances and isolated probes do not invent an actor", () => {
  assert.deepEqual(nativeActorReadiness(undefined, false), { required: false, ok: true, state: "not-required" });
});

test("owner resource and inbox are retained, then released once in dependency order", async () => {
  const events = [], { resource } = owner(events);
  const actor = await startNativeActorService({
    open: async () => resource,
    project: async provider => {
      assert.equal(provider, resource.provider);
      events.push("projection-start");
      return { close: async () => events.push("projection-stop") };
    },
  });
  assert.equal(actor.activityPub, resource);
  assert.equal(nativeActorReadiness(actor, true).ok, true);
  await Promise.all([actor.close(), actor.close()]);
  assert.deepEqual(events, ["projection-start", "queue-start", "projection-stop", "queue-stop", "actor-close"]);
  assert.equal(nativeActorReadiness(actor, true).ok, false);
});

test("owner startup failure propagates instead of becoming optional degradation", async () => {
  const failure = new Error("owner unavailable");
  await assert.rejects(startNativeActorService({ open: async () => { throw failure; } }), error => error === failure);
});

test("an absent provider fails startup", async () => {
  await assert.rejects(startNativeActorService({ open: async () => undefined }), /did not supply a provider/);
});

test("projection bind failure releases the owner and starts no queue", async () => {
  const events = [], { resource } = owner(events);
  await assert.rejects(startNativeActorService({
    open: async () => resource, project: async () => { throw new Error("bind failed"); },
  }), /bind failed/);
  assert.deepEqual(events, ["actor-close"]);
});

test("synchronous queue failure releases projection and owner", async () => {
  const events = [], { resource } = owner(events);
  resource.provider.federation.startQueue = () => { throw new Error("queue failed"); };
  await assert.rejects(startNativeActorService({
    open: async () => resource, project: async () => ({ close: async () => events.push("projection-stop") }),
  }), /queue failed/);
  assert.deepEqual(events, ["projection-stop", "actor-close"]);
});

test("already-rejected queue is a startup failure", async () => {
  const events = [], { resource } = owner(events);
  resource.provider.federation.startQueue = () => Promise.reject(new Error("queue rejected"));
  await assert.rejects(startNativeActorService({ open: async () => resource }), /queue rejected/);
  assert.deepEqual(events, ["actor-close"]);
});

test("later queue rejection makes readiness failed rather than merely logging", async () => {
  const { resource, reject } = owner();
  const actor = await startNativeActorService({ open: async () => resource });
  reject(new Error("delivery worker stopped"));
  await Promise.resolve();
  assert.deepEqual(nativeActorReadiness(actor, true), { required: true, ok: false, state: "failed" });
  await actor.close();
});

test("unexpected queue fulfillment is also a failed lifetime", async () => {
  const { resource, resolve } = owner();
  const actor = await startNativeActorService({ open: async () => resource });
  resolve();
  await Promise.resolve();
  assert.equal(actor.state(), "failed");
  await actor.close();
});

test("one cleanup failure cannot skip remaining cleanup", async () => {
  const events = [], { resource } = owner(events);
  const actor = await startNativeActorService({
    open: async () => resource,
    project: async () => ({ close: async () => { events.push("projection-stop"); throw new Error("close failed"); } }),
  });
  await assert.rejects(actor.close(), AggregateError);
  assert.deepEqual(events, ["queue-start", "projection-stop", "queue-stop", "actor-close"]);
});

test("startup and cleanup errors are both retained", async () => {
  const { resource } = owner();
  resource.close = async () => { throw new Error("close failed"); };
  await assert.rejects(startNativeActorService({
    open: async () => resource, project: async () => { throw new Error("bind failed"); },
  }), error => error instanceof AggregateError && error.errors[0].message === "bind failed"
    && error.errors[1] instanceof AggregateError && error.errors[1].errors[0].message === "close failed");
});

test("invalid private service contracts are rejected", async () => {
  await assert.rejects(startNativeActorService(), /owner factory/);
  await assert.rejects(startNativeActorService({ open() {}, project: true }), /must be a function/);
  const { resource } = owner();
  resource.provider.federation.startQueue = () => undefined;
  await assert.rejects(startNativeActorService({ open: async () => resource }), /expose its lifetime/);
});

test("an unexpected post-start queue loss requests one actual supervisor restart", async () => {
  const { resource, reject } = owner();
  const actor = await startNativeActorService({ open: async () => resource });
  let restarts = 0;
  const monitored = superviseRequiredNativeActor(actor, { draining: false }, () => { restarts += 1; });
  reject(new Error("native queue lost"));
  await monitored;
  assert.equal(restarts, 1);
  assert.equal((await actor.failed).message, "native queue lost");
  assert.deepEqual(nativeActorReadiness(actor, true), { required: true, ok: false, state: "failed" });
  await actor.close();
  assert.equal(restarts, 1);
});

test("graceful actor release causes no restart and an existing drain suppresses a late fatal signal", async () => {
  const first = owner(), normal = await startNativeActorService({ open: async () => first.resource });
  let restarts = 0;
  superviseRequiredNativeActor(normal, { draining: false }, () => { restarts += 1; });
  await normal.close();
  await Promise.resolve();
  assert.equal(restarts, 0);
  const second = owner(), draining = await startNativeActorService({ open: async () => second.resource });
  const result = superviseRequiredNativeActor(draining, { draining: true }, () => { restarts += 1; });
  second.reject(new Error("queue lost after draining began"));
  await result;
  assert.equal(restarts, 0);
  await draining.close();
});

test("required actor supervision refuses a service without a real failure signal", () => {
  assert.throws(() => superviseRequiredNativeActor({ state: () => "running" }, { draining: false }, () => {}), /failure signal/);
  assert.equal(superviseRequiredNativeActor(undefined, { draining: false }, () => {}), undefined);
});
