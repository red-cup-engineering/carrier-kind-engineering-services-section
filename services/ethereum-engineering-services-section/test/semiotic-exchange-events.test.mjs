import assert from "node:assert/strict";
import test from "node:test";
import { Interface, sha256 } from "ethers";
import {
  SEMIOTIC_EXCHANGE_EVENTS_ABI,
  createSemioticExchangeA2aSources,
  invokeFinalizedDemandInterval,
  projectSemioticExchangeActivities,
  projectDemandRaised,
  readDemandRaised,
  readSemioticExchangeEvents,
  semioticExchangeEventReceipt,
} from "../src/semiotic-exchange-events.mjs";

const iface = new Interface(SEMIOTIC_EXCHANGE_EVENTS_ABI);
const exchange = "0x98bBC65824962b61dF876A47B5779C4EcBBD4939";
const carrier = new TextEncoder().encode("sen:org.emsenn.a2a-sen-hire-request.v1:test");
const event = iface.encodeEventLog(iface.getEvent("DemandRaised"), [
  `0x${"11".repeat(32)}`,
  "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B",
  `0x${"22".repeat(32)}`,
  `0x${"33".repeat(32)}`,
  carrier,
]);

function rpcWith(logs, calls = []) {
  return async (url, method, params) => {
    calls.push({ url, method, params });
    return logs;
  };
}

function logFor({ demandByte, carrier: demandCarrier, blockNumber, logIndex }) {
  const encoded = iface.encodeEventLog(iface.getEvent("DemandRaised"), [
    `0x${demandByte.repeat(32)}`,
    "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B",
    `0x${"22".repeat(32)}`,
    `0x${"33".repeat(32)}`,
    demandCarrier,
  ]);
  return {
    ...encoded,
    blockNumber: `0x${blockNumber.toString(16)}`,
    blockHash: `0x${"44".repeat(32)}`,
    transactionHash: `0x${"55".repeat(32)}`,
    logIndex: `0x${logIndex.toString(16)}`,
  };
}

test("reads complete SEN demand carriers from a bounded chain interval", async () => {
  const calls = [];
  const demands = await readDemandRaised({
    rpcUrl: "http://chain.invalid",
    exchange,
    fromBlock: 12n,
    toBlock: 14n,
    rpc: rpcWith([{
      ...event,
      blockNumber: "0xd",
      blockHash: `0x${"44".repeat(32)}`,
      transactionHash: `0x${"55".repeat(32)}`,
      logIndex: "0x2",
    }], calls),
  });

  assert.equal(demands.length, 1);
  assert.deepEqual(demands[0].carrier, carrier);
  assert.equal(demands[0].chainPosition.blockNumber, 13n);
  assert.equal(calls[0].method, "eth_getLogs");
  assert.deepEqual(calls[0].params[0].fromBlock, "0x0c");
  assert.deepEqual(calls[0].params[0].toBlock, "0x0e");
});

test("projects witnessed demands sequentially and advances the cursor", async () => {
  const submitted = [];
  const projection = await projectDemandRaised({
    rpcUrl: "http://chain.invalid",
    exchange,
    fromBlock: 20n,
    toBlock: 20n,
    rpc: rpcWith([{
      ...event,
      blockNumber: "0x14",
      blockHash: `0x${"66".repeat(32)}`,
      transactionHash: `0x${"77".repeat(32)}`,
      logIndex: "0x0",
    }]),
    submitDemand: async (demand) => {
      submitted.push(demand.demand);
      return { accepted: true };
    },
  });

  assert.equal(projection.witnessed, 1);
  assert.equal(projection.nextBlock, 21n);
  assert.deepEqual(projection.projections, [{ accepted: true }]);
  assert.equal(submitted.length, 1);
});

test("refuses unbounded or reversed reads", async () => {
  await assert.rejects(
    readDemandRaised({ rpcUrl: "x", exchange, fromBlock: 2n }),
    /toBlock/,
  );
  await assert.rejects(
    readDemandRaised({ rpcUrl: "x", exchange, fromBlock: 2n, toBlock: 1n }),
    /precedes/,
  );
});

test("readDemandRaised bisects a range the chain reader refuses and merges the leaves in order", async () => {
  const wide = logFor({ demandByte: "aa", carrier: new Uint8Array([0x81]), blockNumber: 12, logIndex: 0 });
  const narrow = logFor({ demandByte: "bb", carrier: new Uint8Array([0x82]), blockNumber: 14, logIndex: 0 });
  const calls = [];
  const rpc = async (_url, _method, params) => {
    const { fromBlock, toBlock } = params[0];
    calls.push({ fromBlock, toBlock });
    if (fromBlock !== toBlock) throw new Error("Requested range exceeds maximum RPC range limit");
    const block = BigInt(fromBlock);
    return [wide, narrow].filter((log) => BigInt(log.blockNumber) === block);
  };

  const demands = await readDemandRaised({ rpcUrl: "http://chain.invalid", exchange, fromBlock: 12n, toBlock: 14n, rpc });

  assert.deepEqual(demands.map(({ chainPosition }) => chainPosition.blockNumber), [12n, 14n]);
  assert.equal(calls[0].fromBlock, "0x0c");
  assert.equal(calls[0].toBlock, "0x0e");
  assert.equal(calls.length > 1, true, "a refused wide range must retry as narrower calls");
});

test("readDemandRaised still throws once bisection reaches a single block that keeps failing", async () => {
  await assert.rejects(
    readDemandRaised({
      rpcUrl: "http://chain.invalid", exchange, fromBlock: 12n, toBlock: 14n,
      rpc: async () => { throw new Error("cloud chain unavailable"); },
    }),
    /cloud chain unavailable/,
  );
});

test("cold-spore adapter admits canonical hires before ordered provider submission", async () => {
  const firstCarrier = new Uint8Array([0x82, 0x01, 0x02]);
  const secondCarrier = new Uint8Array([0x82, 0x03, 0x04]);
  const seen = [];
  const receipt = await invokeFinalizedDemandInterval({
    finalized: true,
    rpcUrl: "http://chain.invalid",
    exchange,
    fromBlock: 31n,
    toBlock: 32n,
    rpc: rpcWith([
      logFor({ demandByte: "aa", carrier: firstCarrier, blockNumber: 31, logIndex: 0 }),
      logFor({ demandByte: "bb", carrier: secondCarrier, blockNumber: 32, logIndex: 0 }),
    ]),
    conformHireInput: ({ carrier }) => ({ hire: { kind: "hire", byte: carrier[1] }, canonicalCarrier: carrier }),
    selectProvider: ({ demand, hire }) => ({ id: `provider-${hire.byte}`, demand: demand.demand }),
    submitHire: async ({ demand, provider }) => {
      seen.push(demand.demand);
      return { accepted: true, provider: provider.id };
    },
  });

  assert.equal(receipt.finality.status, "finalized");
  assert.equal(receipt.witnessed, 2);
  assert.equal(receipt.nextBlock, 33n);
  assert.deepEqual(seen, [`0x${"aa".repeat(32)}`, `0x${"bb".repeat(32)}`]);
  assert.deepEqual(receipt.invocations.map(({ submission }) => submission.provider), ["provider-1", "provider-3"]);
  assert.throws(() => { receipt.invocations.push({}); }, TypeError);
  assert.throws(() => { receipt.invocations[0].submission.accepted = false; }, TypeError);
});

test("cold-spore adapter refuses malformed or noncanonical carriers before selecting a provider", async () => {
  let selected = 0;
  const base = {
    finalized: true,
    rpcUrl: "http://chain.invalid",
    exchange,
    fromBlock: 40n,
    toBlock: 40n,
    rpc: rpcWith([logFor({ demandByte: "cc", carrier: new Uint8Array([0x81, 0x01]), blockNumber: 40, logIndex: 0 })]),
    selectProvider: () => { selected += 1; return { id: "never" }; },
    submitHire: () => { throw new Error("must not submit"); },
  };

  await assert.rejects(
    invokeFinalizedDemandInterval({ ...base, conformHireInput: () => { throw new Error("malformed SEN/A2A hire input"); } }),
    /malformed SEN\/A2A hire input/,
  );
  await assert.rejects(
    invokeFinalizedDemandInterval({
      ...base,
      conformHireInput: ({ carrier }) => ({ hire: { kind: "hire" }, canonicalCarrier: new Uint8Array([...carrier, 0]) }),
    }),
    /not canonical/,
  );
  assert.equal(selected, 0);
});

test("cold-spore adapter requires an explicitly finalized interval", async () => {
  await assert.rejects(
    invokeFinalizedDemandInterval({ fromBlock: 1n, toBlock: 1n }),
    /finalized closed interval/,
  );
});

test("replays the complete exchange history in chain order", async () => {
  const cellCarrier = new Uint8Array([1]), demandCarrier = new Uint8Array([2]), offerCarrier = new Uint8Array([3]), resultCarrier = new Uint8Array([4]);
  const cellId = sha256(cellCarrier), demandId = sha256(demandCarrier), offerId = sha256(offerCarrier), resultId = sha256(resultCarrier);
  const definitions = [
    ["CellSeated", [cellId, "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", `0x${"02".repeat(32)}`, cellCarrier]],
    ["CellRetired", [cellId, "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B"]],
    ["DemandRaised", [demandId, "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", `0x${"02".repeat(32)}`, `0x${"04".repeat(32)}`, demandCarrier]],
    ["DemandOffered", [demandId, offerId, cellId, "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", offerCarrier]],
    ["PurchaseMoved", [demandId, offerId, cellId, "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B"]],
    ["DemandSettled", [demandId, cellId, "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", resultId, resultCarrier]],
  ];
  const logs = definitions.map(([name, args], index) => ({
    ...iface.encodeEventLog(iface.getEvent(name), args),
    blockNumber: index < 2 ? "0xb" : "0xc",
    blockHash: `0x${"44".repeat(32)}`,
    transactionHash: `0x${String(index + 1).padStart(2, "0").repeat(32)}`,
    logIndex: `0x${(index < 2 ? 1 - index : index).toString(16)}`,
  })).reverse();
  const calls = [];
  const history = await readSemioticExchangeEvents({ rpcUrl: "http://chain.invalid", exchange, fromBlock: 11n, toBlock: 12n, rpc: rpcWith(logs, calls) });
  assert.deepEqual(history.map(({ kind }) => kind), ["CellRetired", "CellSeated", "DemandRaised", "DemandOffered", "PurchaseMoved", "DemandSettled"]);
  assert.deepEqual(calls[0].params[0].topics[0], definitions.map(([name]) => iface.getEvent(name).topicHash));
  assert.equal(history[2].carrierHex, "0x02");
  assert.equal(history[5].result, resultId);
  assert.match(history[5].carrierNi, /^ni:\/\/\/sha-256;/u);
});

test("readSemioticExchangeEvents bisects a range the chain reader refuses and merges the leaves in chain order", async () => {
  const earlyCarrier = new Uint8Array([0x81]), lateCarrier = new Uint8Array([0x82]);
  const early = {
    ...iface.encodeEventLog(iface.getEvent("DemandRaised"), [sha256(earlyCarrier), "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", `0x${"22".repeat(32)}`, `0x${"33".repeat(32)}`, earlyCarrier]),
    blockNumber: "0xc", blockHash: `0x${"44".repeat(32)}`, transactionHash: `0x${"55".repeat(32)}`, logIndex: "0x0",
  };
  const late = {
    ...iface.encodeEventLog(iface.getEvent("DemandRaised"), [sha256(lateCarrier), "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", `0x${"22".repeat(32)}`, `0x${"33".repeat(32)}`, lateCarrier]),
    blockNumber: "0xe", blockHash: `0x${"44".repeat(32)}`, transactionHash: `0x${"66".repeat(32)}`, logIndex: "0x0",
  };
  const calls = [];
  const rpc = async (_url, _method, params) => {
    const { fromBlock, toBlock } = params[0];
    calls.push({ fromBlock, toBlock });
    if (fromBlock !== toBlock) throw new Error("Requested range exceeds maximum RPC range limit");
    const block = BigInt(fromBlock);
    return [early, late].filter((log) => BigInt(log.blockNumber) === block);
  };

  const history = await readSemioticExchangeEvents({ rpcUrl: "http://chain.invalid", exchange, fromBlock: 12n, toBlock: 14n, rpc });

  assert.deepEqual(history.map(({ chainPosition }) => chainPosition.blockNumber), [12n, 14n]);
  assert.equal(calls.length > 1, true, "a refused wide range must retry as narrower calls");
});

test("projects one chain move through receiptSen into the existing ActivityPub projector", async () => {
  const witnessed = [{
    kind: "DemandSettled",
    chainPosition: { blockNumber: 99n, blockHash: `0x${"11".repeat(32)}`, transactionHash: `0x${"12".repeat(32)}`, logIndex: 7 },
    demand: `0x${"21".repeat(32)}`, cell: `0x${"22".repeat(32)}`, controller: "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B",
    result: `0x${"23".repeat(32)}`, carrierHex: "0x8101",
  }];
  const projected = await projectSemioticExchangeActivities({
    witnessed, chainId: "eip155:5615610", exchange,
    receiptSen: (receipt) => ({ bytes: new TextEncoder().encode(JSON.stringify(receipt)) }),
    projectSenActivity: (input) => input,
    origin: "https://actions.561.group", identifier: "semiotic-exchange", recipient: "https://www.w3.org/ns/activitystreams#Public", agentCard: "https://actions.561.group/.well-known/agent-card.json",
  });
  assert.equal(projected[0].type, "Announce");
  const receipt = JSON.parse(new TextDecoder().decode(projected[0].objectBytes));
  assert.deepEqual(receipt, semioticExchangeEventReceipt(witnessed[0], { chainId: "eip155:5615610", exchange }));
  assert.equal(receipt.position.blockNumber, "99");
});

test("A2A sources replay task, coordination, and all six public exchange moves without resident state", async () => {
  const encode = (value) => new TextEncoder().encode(JSON.stringify(value));
  const task = (state, sha) => ({ taskId: "task-1", tenant: "", sha256: sha, envelope: { protocol: "A2A", protocolVersion: "1.0", tenant: "", task: { id: "task-1", status: { state } } } });
  const records = [task("TASK_STATE_SUBMITTED", "one"), { namespace: "push-outbox", tenant: "", key: "delivery-1", value: { disposition: "pending" } }, task("TASK_STATE_WORKING", "two")];
  const kinds = ["CellSeated", "CellRetired", "DemandRaised", "DemandOffered", "PurchaseMoved", "DemandSettled"];
  const history = kinds.map((kind, index) => ({
    kind,
    chainPosition: { blockNumber: BigInt(index + 1), blockHash: `0x${"11".repeat(32)}`, transactionHash: `0x${String(index + 1).padStart(2, "0").repeat(32)}`, logIndex: 0 },
    ...(index < records.length ? { carrier: encode(records[index]), carrierHex: "0x01", carrierNi: `ni:///sha-256;${"a".repeat(42)}A` } : {}),
    ...(kind === "CellSeated" ? { cell: `0x${"01".repeat(32)}`, controller: "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", law: `0x${"02".repeat(32)}` } : {}),
    ...(kind === "CellRetired" ? { cell: `0x${"01".repeat(32)}`, controller: "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B" } : {}),
    ...(kind === "DemandRaised" ? { demand: `0x${"03".repeat(32)}`, raiser: "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", wantedLaw: `0x${"02".repeat(32)}`, grounding: `0x${"04".repeat(32)}` } : {}),
    ...(kind === "DemandOffered" ? { demand: `0x${"03".repeat(32)}`, offer: `0x${"05".repeat(32)}`, cell: `0x${"01".repeat(32)}`, controller: "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B" } : {}),
    ...(kind === "PurchaseMoved" ? { demand: `0x${"03".repeat(32)}`, offer: `0x${"05".repeat(32)}`, cell: `0x${"01".repeat(32)}`, raiser: "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", controller: "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B" } : {}),
    ...(kind === "DemandSettled" ? { demand: `0x${"03".repeat(32)}`, cell: `0x${"01".repeat(32)}`, controller: "0x08E4B3bc9ef76b403879C0eC372d1Fd146E3a07B", result: `0x${"06".repeat(32)}` } : {}),
  }));
  const appended = [];
  const sources = createSemioticExchangeA2aSources({
    chainId: "eip155:5615610", exchange,
    history: async () => history,
    decodeCarrier: async (bytes) => JSON.parse(new TextDecoder().decode(bytes)),
    append: async (transition) => { appended.push(transition); return { admitted: true }; },
  });
  assert.equal((await sources.taskSource.get({ taskId: "task-1", tenant: "" })).sha256, "two");
  assert.equal((await sources.taskSource.list({ tenant: "" })).length, 1);
  assert.equal((await sources.coordinationSource.list({ namespace: "semiotic-exchange-events", tenant: "" })).length, 6);
  assert.equal((await sources.coordinationSource.get({ namespace: "push-outbox", tenant: "", key: "delivery-1" })).value.disposition, "pending");
  await sources.taskSource.put(task("TASK_STATE_COMPLETED", "three"));
  await sources.coordinationSource.remove({ namespace: "push-outbox", tenant: "", key: "delivery-1" });
  assert.deepEqual(appended.map(({ type }) => type), ["A2aTaskStateTransition", "A2aCoordinationRetraction"]);
  assert.equal(appended[0].causalPredecessor, "two");
});

test("one snapshot preserves last updates, first order, tombstones, and collision-free tenant coordinates", async () => {
  const task = (taskId, tenant, sha256) => ({ taskId, tenant, sha256, envelope: { protocol: "A2A", protocolVersion: "1.0" } });
  const coord = (namespace, tenant, key, value) => ({ namespace, tenant, key, value });
  const records = [
    task("a\u0000b", "c", "one"), task("a", "b\u0000c", "two"), task("second", "c", "three"), task("a\u0000b", "c", "latest"),
    coord("a\u0000b", "c", "d", 1), coord("a", "b\u0000c", "d", 2), coord("a", "c", "b\u0000d", 3),
    coord("last", "c", "key", 4), { namespace: "a\u0000b", tenant: "c", key: "d", removed: true },
    coord("a\u0000b", "c", "d", 5), { namespace: "last", tenant: "c", key: "key", removed: true },
    null, { taskId: "invalid", tenant: "c" }, { namespace: "invalid", tenant: "c", key: "x" },
  ];
  let reads = 0;
  const sources = createSemioticExchangeA2aSources({
    chainId: "eip155:5615610", exchange, append: () => { throw new Error("read only test"); },
    history: async () => { reads++; return records.map((record, logIndex) => ({
      kind: "CellRetired", cell: `0x${"01".repeat(32)}`, controller: exchange, carrier: record,
      chainPosition: { blockNumber: 1n, logIndex },
    })); },
    decodeCarrier: async (record) => record,
  });
  const snapshot = await sources.snapshot({ tenant: "c" });
  assert.equal(reads, 1);
  assert.deepEqual(snapshot.tasks.map(({ sha256 }) => sha256), ["latest", "three"]);
  assert.deepEqual(snapshot.coordination.map(({ value }) => value), [5, 3]);
  assert.ok(Object.isFrozen(snapshot.tasks));
  assert.deepEqual((await sources.snapshot({ tenant: "b\u0000c" })).tasks.map(({ sha256 }) => sha256), ["two"]);
  assert.deepEqual((await sources.snapshot({ tenant: "b\u0000c" })).coordination.map(({ value }) => value), [2]);
  assert.equal((await sources.snapshot()).coordination.length, records.length);
  await assert.rejects(sources.snapshot({ tenant: null }), /tenant must be a string/);
});
