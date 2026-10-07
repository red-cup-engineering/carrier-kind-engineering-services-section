import assert from "node:assert/strict";
import test from "node:test";
import {
  marshHiveEngineResourceId,
  buildMarshHiveEngineAdmitCall,
  buildMarshHiveEngineTransitionCall,
} from "../src/resource-intents.hive-engine.mjs";

test("marshHiveEngineResourceId is deterministic and domain-separated by network, controller, kind, subject", () => {
  const id = marshHiveEngineResourceId({ network: "mainnet", controller: "alice", kind: "sensor", subject: "room-1" });
  assert.equal(id, "marsh:mainnet:alice:sensor:room-1");
  assert.notEqual(
    id,
    marshHiveEngineResourceId({ network: "testnet", controller: "alice", kind: "sensor", subject: "room-1" }),
  );
});

test("marshHiveEngineResourceId refuses a missing field", () => {
  assert.throws(() => marshHiveEngineResourceId({ controller: "alice", kind: "sensor", subject: "room-1" }), TypeError);
});

test("buildMarshHiveEngineAdmitCall builds the exact contractName/contractAction/contractPayload shape hive-broadcast expects", () => {
  const { resource, call } = buildMarshHiveEngineAdmitCall({
    network: "mainnet",
    controller: "alice",
    kind: "sensor",
    subject: "room-1",
    content: "c1",
    evidence: "e1",
  });
  assert.equal(resource, "marsh:mainnet:alice:sensor:room-1");
  assert.deepEqual(call, {
    contractName: "marsh",
    contractAction: "admitResource",
    contractPayload: { resource: "marsh:mainnet:alice:sensor:room-1", kind: "sensor", content: "c1", evidence: "e1" },
  });
});

test("buildMarshHiveEngineTransitionCall builds the compare-and-swap payload", () => {
  const { resource, call } = buildMarshHiveEngineTransitionCall({
    network: "mainnet",
    controller: "alice",
    kind: "sensor",
    subject: "room-1",
    priorContent: "c1",
    content: "c2",
    evidence: "e2",
  });
  assert.equal(resource, "marsh:mainnet:alice:sensor:room-1");
  assert.deepEqual(call, {
    contractName: "marsh",
    contractAction: "transitionResource",
    contractPayload: { resource: "marsh:mainnet:alice:sensor:room-1", priorContent: "c1", content: "c2", evidence: "e2" },
  });
});
