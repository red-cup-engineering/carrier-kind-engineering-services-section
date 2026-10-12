import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { authorizationOf, mandateRefusalsOf, settlementOf, sweepPlanOf, treasuryActOf } from "../src/accounting/treasury.mjs";

const YANAGI = { venue: "eip155:8453", address: "0x224C08A8526751887a83e2711B167f890c6D078d" };
const GROUP = "0x32886f6f361c1d570255c2762967a2e41d0e9b1a";
const power = {
  id: "yanagi-base-wallet-trading-by-emsenn-personal-chief-financial-officer", over: "emsenn-personal-chief-financial-officer",
  account: { ...YANAGI, signer: "key-management sign-with-wallet.mjs" }, valid_until: "2027-01-01",
  limits: { max_value_per_transaction: "25 USD at the pre-trade quote", standing_flows: "this grant authorizes no outbound transfer to an address outside the 561 Group's wallet registry" },
};
const act = (to, amount = "10") => treasuryActOf({ kind: "transfer", from: YANAGI, to: { venue: "eip155:8453", address: to }, asset: "USDC", amount, purpose: "consolidate operating USDC", route: [{ venue: "eip155:8453", action: "erc20-transfer" }], office: "emsenn-personal-chief-financial-officer", at: "2026-10-03T18:00:00.000Z" });
const reading = { at: "2026-10-03T18:00:00.000Z", quote: { amount: "10", currency: "USD" }, groupAccounts: new Set([GROUP]) };

test("an act within its mandate's account, limit, date and destination is authorized, naming the mandate and its signer", () => {
  const authorized = authorizationOf(act(GROUP), [power], reading);
  assert.equal(authorized.stage, "authorized");
  assert.equal(authorized.mandate, power.id);
  assert.match(authorized.signer, /sign-with-wallet/u);
});

test("an act no mandate covers stays on paper and says why", () => {
  const outside = authorizationOf(act("0x000000000000000000000000000000000000dEaD"), [power], reading);
  assert.equal(outside.stage, "paper");
  assert.ok(outside.refusals[0].refusals.includes("allows no transfer outside the Group's own accounts"));
  assert.ok(mandateRefusalsOf(power, act(GROUP, "40"), { ...reading, quote: { amount: "40", currency: "USD" } }).some((reason) => reason.includes("beyond its 25 USD limit")));
  assert.ok(mandateRefusalsOf(power, act(GROUP), { ...reading, at: "2027-02-01T00:00:00.000Z" }).some((reason) => reason.startsWith("lapsed")));
  assert.equal(authorizationOf(act(GROUP), [], reading).stage, "paper");
});

test("an act settles only when two providers agree on its receipt", () => {
  const moved = act(GROUP);
  const one = { provider: "a", transaction: "0x1", status: "success", amount: "10", to: GROUP };
  assert.equal(settlementOf(moved, { transaction: "0x1", readings: [one] }).stage, "executed");
  assert.equal(settlementOf(moved, { transaction: "0x1", readings: [one, { ...one, provider: "b" }] }).stage, "settled");
  assert.equal(settlementOf(moved, { transaction: "0x1", readings: [one, { ...one, provider: "b", amount: "9" }] }).stage, "executed");
});

test("a sweep plans one act for the excess over its keep, and nothing without a route", () => {
  const hive = { venue: "hive", address: "michael561" };
  const planned = sweepPlanOf({ from: hive, to: { venue: "eip155:8453", address: GROUP }, asset: "HBD", holding: "12.500", keep: "2.000", route: [{ venue: "hive", action: "transfer", via: "an exchange's deposit memo" }, { venue: "eip155:8453", action: "withdraw" }], office: "emsenn-personal-chief-financial-officer", at: "2026-10-03T18:00:00.000Z" });
  assert.equal(planned.acts[0].amount, "10.500");
  assert.match(sweepPlanOf({ from: hive, to: { venue: "eip155:8453", address: GROUP }, asset: "HBD", holding: "1", keep: "2", office: "x", at: "2026-10-03T18:00:00.000Z" }).why, /within its keep/u);
  assert.match(sweepPlanOf({ from: hive, to: { venue: "eip155:8453", address: GROUP }, asset: "HBD", holding: "12", keep: "2", office: "x", at: "2026-10-03T18:00:00.000Z" }).why, /no route/u);
});

test("the real YANAGI grant reads as a mandate", () => {
  const record = JSON.parse(readFileSync(new URL("../../../../../../../../../../../../561-group-services-section/lib/agency/deontic-powers/yanagi-base-wallet-trading-by-emsenn-personal-chief-financial-officer.json", import.meta.url), "utf8"));
  assert.equal(authorizationOf(act(GROUP), [record], reading).stage, "authorized");
});
