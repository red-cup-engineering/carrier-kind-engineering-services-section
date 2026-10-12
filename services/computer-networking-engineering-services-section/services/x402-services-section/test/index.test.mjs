import { test } from "node:test";
import assert from "node:assert/strict";
import { settlementWitnessGraphId } from "../scripts/x402-settlement-witness-identity.mjs";

test("returns a well-formed ni:///sha-256 URI", () => {
  const graph = settlementWitnessGraphId({ network: "eip155:8453", transaction: "0xabc" });
  assert.match(graph, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});

test("is deterministic for the same inputs", () => {
  const a = settlementWitnessGraphId({ network: "eip155:8453", transaction: "0xabc" });
  const b = settlementWitnessGraphId({ network: "eip155:8453", transaction: "0xabc" });
  assert.equal(a, b);
});

test("distinguishes network from transaction (no delimiter collision)", () => {
  // Under a `${network}\0${transaction}` scheme this pair would have been
  // ambiguous with network="a\0b", transaction="c". The canonical CBOR carrier
  // keeps the fields separate regardless of their content.
  const a = settlementWitnessGraphId({ network: "a", transaction: "b c" });
  const b = settlementWitnessGraphId({ network: "a b", transaction: "c" });
  assert.notEqual(a, b);
});

test("rejects a missing network or transaction", () => {
  assert.throws(() => settlementWitnessGraphId({ transaction: "0xabc" }), /network/u);
  assert.throws(() => settlementWitnessGraphId({ network: "eip155:8453" }), /transaction/u);
  assert.throws(() => settlementWitnessGraphId(), /network/u);
});

test("rejects non-string or empty fields", () => {
  assert.throws(() => settlementWitnessGraphId({ network: "", transaction: "0xabc" }), /network/u);
  assert.throws(() => settlementWitnessGraphId({ network: "eip155:8453", transaction: "" }), /transaction/u);
  assert.throws(() => settlementWitnessGraphId({ network: 8453, transaction: "0xabc" }), /network/u);
});

test("matches the exact receiver contract already pinned by x402 sellers", () => {
  // paid-ephemeris-gateway and public-blockchain-services-section
  // each assert this literal shape on the settled
  // context they pass through: { network, transaction } in, ni:// URI out.
  const graph = settlementWitnessGraphId({
    network: "eip155:8453",
    transaction: "0xabc",
  });
  assert.equal(typeof graph, "string");
  assert.equal(graph.startsWith("ni:///sha-256;"), true);
});
