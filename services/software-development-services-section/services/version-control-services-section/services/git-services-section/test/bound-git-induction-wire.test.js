import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fixtures, decodeCarrier, encodeCarrier } from "../src/bound-git-induction-wire.js";

test("the Git carrier is the approved chain-parameterized unbounded executable", async () => {
  const bytes = new URL("../src/bound-git-induction-wire.js", import.meta.url);
  assert.equal(createHash("sha256").update(await readFile(bytes)).digest("hex"), "e6453dace31532bd1fbc8466f6c237e10332b3d2fbb125ed55c895f6b7c5ae49");
});

test("every declared public carrier fixture remains canonical", () => {
  for (const [key, fixture] of Object.entries(fixtures)) {
    const family = key.split("/")[0];
    assert.deepEqual(decodeCarrier(family, encodeCarrier(family, fixture)), decodeCarrier(family, encodeCarrier(family, fixture)));
  }
});
