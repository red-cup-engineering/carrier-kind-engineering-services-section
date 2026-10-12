import { test } from "node:test";
import assert from "node:assert/strict";

import { conservedExchange } from "../src/running/exchange.mjs";

const input = {
  item: "brass-clasp-knife",
  owner: "chandlery-room",
  from: "chandlery-room",
  to: "player:ada",
  payer: "player:ada",
  payee: "yorrick-vane",
  price: 60,
  payerBalance: 250,
  payeeBalance: 1200,
};

test("exchange transfers the same owned item and conserves pennies", () => {
  const result = conservedExchange(input);
  assert.deepEqual(result, {
    item: { item: "brass-clasp-knife", owner: "player:ada" },
    balances: [
      { actor: "player:ada", balance: 190 },
      { actor: "yorrick-vane", balance: 1260 },
    ],
    amount: 60,
  });
  assert.equal(result.balances[0].balance + result.balances[1].balance,
    input.payerBalance + input.payeeBalance);
});

test("exchange rejects absent or mismatched ownership, invalid money, and insufficient funds", () => {
  assert.throws(() => conservedExchange({ ...input, owner: undefined }), /owner is required/);
  assert.throws(() => conservedExchange({ ...input, owner: "harbor-quay" }), /not owned/);
  assert.throws(() => conservedExchange({ ...input, price: -1 }), /price must be/);
  assert.throws(() => conservedExchange({ ...input, price: 1.5 }), /price must be/);
  assert.throws(() => conservedExchange({ ...input, payerBalance: -1 }), /payer balance must be/);
  assert.throws(() => conservedExchange({ ...input, payerBalance: 59 }), /insufficient funds/);
});

test("exchange accepts a keeper's room inventory and purse as distinct anchors", () => {
  const result = conservedExchange({
    ...input,
    from: "shop-room",
    owner: "shop-room",
    payer: "keeper",
    payee: "player:ada",
    payerBalance: 90,
    payeeBalance: 0,
  });
  assert.deepEqual(result.item, { item: "brass-clasp-knife", owner: "player:ada" });
  assert.deepEqual(result.balances, [
    { actor: "keeper", balance: 30 },
    { actor: "player:ada", balance: 60 },
  ]);
});
