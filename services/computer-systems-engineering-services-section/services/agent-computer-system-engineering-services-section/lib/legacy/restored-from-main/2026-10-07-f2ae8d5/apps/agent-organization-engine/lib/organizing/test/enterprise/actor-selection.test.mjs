import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { enterpriseOperations } from "../../src/enterprise/operations.mjs";
import { enterpriseStore } from "../../src/enterprise/store.mjs";

test("shared Hive account selects its Actor before enterprise judgment and preserves it in the journal", async () => {
  const root = mkdtempSync(join(tmpdir(), "enterprise-actor-"));
  try {
    let agency = {
      enterprises: new Map([["core", { id: "core", kind: "node", offices: [], settings: [{ axis: "capacity", poles: [0, 10] }] }]]),
      contracts: new Map(), offices: new Map(),
      organs: new Map([["shared", { account: "hive:shared", of: ["alice", "bob"], sectionPath: "s" }]]),
      characters: new Map(),
      byId: { characters: new Map(["alice", "bob"].map(id => [id, [{ id, sectionPath: "s" }]])) },
    };
    const store = enterpriseStore({ dataRoot: root });
    const op = enterpriseOperations({ dataRoot: root }, { agency: () => agency, store,
      deedsOf: () => [{ bearer: "bob" }] }).find(op => op.verb === "enterprise-setting-record");
    const input = { enterprise: "core", axis: "capacity", value: 4, because: "An observed service need", revisitBy: "2099-01-01T00:00:00Z" };
    const context = { invocation: { subject: "hive:shared", caller: { hand: "authenticated-session" } } };
    await assert.rejects(async () => op.execute(input, {}, context), /select the bearer/);
    await assert.rejects(async () => op.execute({ ...input, bearer: "alice" }, {}, context), /has done none/);
    await assert.rejects(async () => op.execute({ ...input, bearer: "unrelated" }, {}, context), /not a current hand/);
    assert.equal(store.read("setting").length, 0);
    await op.execute({ ...input, bearer: "bob" }, {}, context);
    const [stored] = enterpriseStore({ dataRoot: root }).read("setting", { enterprise: "core" });
    assert.deepEqual(stored.player, { by: "core", bearer: "bob", hand: "authenticated-session" });
    assert.equal(stored.value, 4);
    agency = { ...agency, organs: new Map([["shared", { account: "hive:shared", of: ["alice"], sectionPath: "s" }]]) };
    await assert.rejects(async () => op.execute({ ...input, bearer: "bob" }, {}, context), /not a current hand/);
    assert.equal(store.read("setting").length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
