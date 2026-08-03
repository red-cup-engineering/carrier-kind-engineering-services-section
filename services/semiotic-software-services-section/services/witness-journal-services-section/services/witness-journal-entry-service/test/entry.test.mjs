import { test } from "node:test";
import assert from "node:assert/strict";
import { isClosed } from "@red-cup-engineering/relation-model-notation-typing";
import { verifyNormalizedSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { verifySemioticResourceNameAddress } from "@red-cup-engineering/semiotic-resource-name-addressing-service";

import * as journalEntry from "../src/index.mjs";

import {
  entry, sameEntry, isEntry, asEntry, assertValidEntry,
  seavt, isSeavt, asSeavt, assertValidSeavt, readSeavt, readAddressedSeavt,
  identifySeavtSemanticContent,
} from "../src/index.mjs";

test("entry builds a plain e/a/v/t record with no charge and no trace", () => {
  const row = entry("urn:subject:1", "urn:rmn:predicate:observed", 42, "2026-07-31T00:00:00.000Z");
  assert.deepEqual(row, {
    e: "urn:subject:1",
    a: "urn:rmn:predicate:observed",
    v: 42,
    t: "2026-07-31T00:00:00.000Z",
  });
  assert.equal("charge" in row, false);
  assert.equal("trace" in row, false);
});

test("entry rejects a missing predicate", () => {
  assert.throws(() => entry("s", undefined, "v", "t"), /field "a" is required/);
});

test("entry rejects a non-JSON value", () => {
  assert.throws(() => entry("s", "p", () => {}, "t"), TypeError);
});

test("entry honors a supplied predicate validator", () => {
  const predicateIsValid = (p) => p === "urn:rmn:known-term";
  assert.throws(
    () => entry("s", "urn:rmn:unknown-term", "v", "t", { predicateIsValid }),
    /RMN-term check/,
  );
  const row = entry("s", "urn:rmn:known-term", "v", "t", { predicateIsValid });
  assert.equal(row.a, "urn:rmn:known-term");
});

test("generic JSON EAVT exposes comparison but no semantic identity mint", () => {
  assert.equal(Object.hasOwn(journalEntry, "entryId"), false);
  assert.equal(sameEntry(entry("s", "p", "v", "t"), ["s", "p", "v", "t"]), true);
});

test("sameEntry compares by canonical content, not field order", () => {
  const a = { e: "s", a: "p", v: "v", t: "t" };
  const b = { t: "t", v: "v", a: "p", e: "s" };
  assert.equal(sameEntry(a, b), true);
});

test("isEntry / asEntry accept object and tuple spelling, reject malformed rows", () => {
  assert.equal(isEntry({ e: "s", a: "p", v: "v", t: "t" }), true);
  assert.equal(isEntry(["s", "p", "v", "t"]), true);
  assert.equal(isEntry({ e: "s", a: "p" }), false);
  assert.equal(isEntry(null), false);
  assert.deepEqual(asEntry(["s", "p", "v", "t"]), { e: "s", a: "p", v: "v", t: "t" });
  assert.throws(() => assertValidEntry(["s", "p", "v"]), /four/);
});

test("SEAVT stores all three punctuation relations as source surfaces and reads their RMN claims", () => {
  const row = seavt("order.payment", "payment:receipt", "receipt-delay", "2026-08-02T00:00:00.000Z");
  assert.deepEqual(row, {
    e: "order.payment",
    a: "payment:receipt",
    v: "receipt-delay",
    t: "2026-08-02T00:00:00.000Z",
  });
  const readout = readSeavt(row);
  assert.deepEqual(readout, {
    e: ["pair", ["mark", "order"], ["pair", ["mark", "generation"], ["mark", "payment"]]],
    a: ["pair", ["mark", "payment"], ["pair", ["mark", "witness"], ["mark", "receipt"]]],
    v: ["pair", ["mark", "receipt"], ["pair", ["mark", "obstruction"], ["mark", "delay"]]],
    t: "2026-08-02T00:00:00.000Z",
  });
  assert.equal(isClosed(readout.e), true);
  assert.equal(isClosed(readout.a), true);
  assert.equal(isClosed(readout.v), true);
});

test("SEAVT refuses escapes, parser refusals, and non-string source coordinates", () => {
  for (const row of [
    { e: "order_payment", a: "observed", v: "receipt", t: "t" },
    { e: "order.", a: "observed", v: "receipt", t: "t" },
    { e: "order", a: "observed", v: 7, t: "t" },
  ]) {
    assert.equal(isSeavt(row), false);
    assert.throws(() => assertValidSeavt(row), /SEAVT row/);
  }
});

test("SEAVT source has no stored identity, charge, or trace", () => {
  const source = seavt("order.payment", "payment:receipt", "receipt-delay", { at: "now" });
  const sameSource = { t: { at: "now" }, v: "receipt-delay", a: "payment:receipt", e: "order.payment" };
  assert.equal(sameEntry(source, sameSource), true);
  assert.deepEqual(asSeavt(["order.payment", "payment:receipt", "receipt-delay", { at: "now" }]), source);
  assert.equal("charge" in source, false);
  assert.equal("trace" in source, false);
  assert.equal("token" in source, false);
});

test("addressed SEAVT readout exposes verifiable token/claim coordinates without changing source", () => {
  const source = seavt("order.payment", "payment:receipt", "receipt-delay", "t");
  const addressed = readAddressedSeavt(source);

  assert.equal(addressed.e.surface, source.e);
  assert.equal(addressed.a.surface, source.a);
  assert.equal(addressed.v.surface, source.v);
  assert.equal(verifySemioticResourceNameAddress(addressed.e), true);
  assert.equal(verifySemioticResourceNameAddress(addressed.a), true);
  assert.equal(verifySemioticResourceNameAddress(addressed.v), true);
  assert.deepEqual(source, { e: "order.payment", a: "payment:receipt", v: "receipt-delay", t: "t" });
  assert.equal("token" in source, false);
  assert.equal("claim" in source, false);
});

test("strict SEAVT v2 identity commits addressed coordinates, time, and explicit custody", () => {
  const source = seavt("order.payment", "payment:receipt", "receipt-delay", "2026-08-02T00:00:00.000Z");
  const custody = { kind: "witness-journal.log.custody", feed: "semiotic", partition: "2026-08-02" };
  const identified = identifySeavtSemanticContent(source, custody);

  assert.equal(identified.material.kind, "witness-journal.seavt.semantic-content");
  assert.equal(identified.material.version, 2);
  assert.deepEqual(identified.source, source);
  assert.deepEqual(identified.material.witness, {
    kind: "witness-journal.seavt.time-custody-witness",
    version: 1,
    time: source.t,
    custody,
  });
  for (const coordinate of Object.values(identified.material.coordinates)) {
    assert.equal(verifySemioticResourceNameAddress(coordinate), true);
  }
  assert.equal(verifyNormalizedSemanticContent(identified.token, identified.envelope), true);
  assert.equal(
    verifyNormalizedSemanticContent(identified.witnessIdentity.token, identified.witnessIdentity.envelope),
    true,
  );
  assert.equal("charge" in identified.material, false);
  assert.notEqual(
    identifySeavtSemanticContent(source, { ...custody, feed: "other" }).token,
    identified.token,
  );
  assert.notEqual(
    identifySeavtSemanticContent({ ...source, t: "2026-08-03T00:00:00.000Z" }, custody).token,
    identified.token,
  );
});

test("strict semantic identity refuses generic JSON EAVT and non-JSON custody", () => {
  assert.throws(
    () => identifySeavtSemanticContent(entry("subject", { predicate: true }, 4, "t"), { feed: "generic" }),
    /SEAVT row/u,
  );
  assert.throws(
    () => identifySeavtSemanticContent(seavt("order", "payment", "receipt", "t"), () => {}),
    /custody witness/u,
  );
});
