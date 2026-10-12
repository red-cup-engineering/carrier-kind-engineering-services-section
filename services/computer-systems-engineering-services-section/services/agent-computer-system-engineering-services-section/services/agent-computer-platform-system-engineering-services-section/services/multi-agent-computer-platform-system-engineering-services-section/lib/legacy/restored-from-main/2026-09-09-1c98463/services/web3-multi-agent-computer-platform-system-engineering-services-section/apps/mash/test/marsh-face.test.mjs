import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import test from "node:test";

import { composeMarshFace, createMarshAppFace, MARSH_NAME } from "../src/faces/marsh.mjs";
import { seedWitness } from "./support/seed-member.mjs";
import { makeTempRoot } from "./support/temp-root.mjs";

const chainId = "eip155:5615611";
const exchange = "0xc4234dc42c9d93bc7d61b0354aba2729ae52e322";
const encode = (value) => new TextEncoder().encode(JSON.stringify(value));
const task = {
  taskId: "task-1",
  tenant: "",
  sha256: "task-state-one",
  envelope: { protocol: "A2A", protocolVersion: "1.0", tenant: "", task: { id: "task-1", status: { state: "TASK_STATE_SUBMITTED" } } },
};
const coordination = { namespace: "resource-share", tenant: "", key: "resource-1", value: { availability: "offered" } };

function event(record, index) {
  const carrier = encode(record);
  return {
    kind: "DemandRaised",
    chainPosition: {
      blockNumber: BigInt(100 + index),
      blockHash: `0x${"11".repeat(32)}`,
      transactionHash: `0x${String(index + 1).padStart(2, "0").repeat(32)}`,
      logIndex: index,
    },
    demand: `0x${String(index + 1).padStart(2, "0").repeat(32)}`,
    raiser: "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B",
    wantedLaw: `0x${"22".repeat(32)}`,
    grounding: `0x${"33".repeat(32)}`,
    carrier,
    carrierHex: `0x${Buffer.from(carrier).toString("hex")}`,
    carrierNi: `ni:///sha-256;${"a".repeat(42)}A`,
  };
}

function face() {
  return createMarshAppFace({
    chainId,
    exchange,
    history: async () => [event(coordination, 0), event(task, 1)],
    decodeCarrier: async (bytes) => JSON.parse(new TextDecoder().decode(bytes)),
  });
}

test("MARSH exposes the deployed SemioticExchange as attenuated A2A resource sources", async () => {
  const appFace = face();
  assert.equal(appFace.name, MARSH_NAME);
  assert.deepEqual(appFace.chain, { chainId, exchange });
  assert.deepEqual(appFace.authority, {
    mode: "read-only-observation",
    chainMutation: false,
    signing: false,
    spending: false,
    deployment: false,
    legalCommitment: false,
  });
  assert.equal(typeof appFace.taskSource.put, "undefined");
  assert.equal(typeof appFace.coordinationSource.remove, "undefined");
  assert.equal((await appFace.taskSource.list({ tenant: "" }))[0].taskId, "task-1");
  assert.equal((await appFace.coordinationSource.get(coordination)).value.availability, "offered");
});

test("MARSH composes one canonical FAE face with EVM-carried shared resources", async () => {
  const root = makeTempRoot("marsh-face-");
  try {
    seedWitness(root, { target: "concepts/alpha.md", timestamp: "2026-08-30T00:00:00Z" });
    const readout = await composeMarshFace([{ id: "alpha", root }], { exchangeFace: face() });
    assert.equal(readout.type, "MarshAppFaceReadout");
    assert.equal(readout.fae.members[0].member, "alpha");
    assert.equal(readout.resources.tasks[0].taskId, "task-1");
    assert.equal(readout.resources.coordination.some(({ namespace }) => namespace === "resource-share"), true);
    assert.equal(readout.resources.coordination.some(({ namespace }) => namespace === "semiotic-exchange-events"), true);
    assert.equal(readout.authority.signing, false);
    assert.throws(() => { readout.resources.tasks.push(task); }, TypeError);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("MARSH refuses an app face that could carry ambient mutation authority", async () => {
  await assert.rejects(
    composeMarshFace([], { exchangeFace: { ...face(), authority: { mode: "read-write" } } }),
    /read-only MARSH app face/u,
  );
});

test("one MARSH readout observes tasks and coordination from the same history read", async () => {
  let reads = 0;
  const exchangeFace = createMarshAppFace({
    chainId, exchange,
    history: async () => {
      const revision = ++reads;
      return [event({ ...task, sha256: String(revision) }, 0), event({ ...coordination, value: { revision } }, 1)];
    },
    decodeCarrier: async (bytes) => JSON.parse(new TextDecoder().decode(bytes)),
  });
  for (const revision of [1, 2]) {
    const readout = await composeMarshFace([], { exchangeFace });
    assert.equal(reads, revision);
    assert.equal(readout.resources.tasks[0].sha256, String(revision));
    assert.equal(readout.resources.coordination.find(({ namespace }) => namespace === coordination.namespace).value.revision, revision);
  }
  assert.equal(typeof exchangeFace.append, "undefined");
  assert.equal(typeof exchangeFace.taskSource.put, "undefined");
});
