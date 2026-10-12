/**
 * Cross-package coherence: shipped protocol functors as WitnessJournal readings.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { cohere, cohereLog } from "@red-cup-engineering/eavt/ledger/reading";
import { spanFromWitness, witnessFromSpan } from "@red-cup-engineering/computer-networking-engineering-services-section/otlp";
import { cloudEventFromUtterance, createUtterance, utteranceFromCloudEvent } from "@red-cup-engineering/communicating/communicate/morphisms/illocute";

import { activityCell, activityFromCell } from "../src/writing/activitypub/ledger.mjs";
import { credentialLogReading } from "../src/writing/did/index.mjs";

const witness = Object.freeze({
  e: "did:web:dev.bare-cedar-fog.emsenn.net:agents:codex",
  a: "coherence-kernel|green",
  v: "assert",
  t: "2026-06-26T03:00:00.000Z",
});

const activityPubReading = Object.freeze({
  id: "animating.activitypub.activity",
  toWire: activityFromCell,
  fromWire: activityCell,
});

const cloudEventsReading = Object.freeze({
  id: "communicating.cloudevents.structured-json",
  toWire: (row) => {
    const admitted = createUtterance({ token: String(row.e), claim: row.v === "deny" ? `not ${String(row.a)}` : String(row.a) });
    assert.equal(admitted.ok, true, "CloudEvents reading admits an utterance");
    if (!admitted.ok) throw new TypeError(admitted.error.message);
    const encoded = cloudEventFromUtterance(admitted.value, String(row.t), "urn:animating:coherence-kernel");
    assert.equal(encoded.ok, true, "CloudEvents reading encodes an admitted utterance");
    if (!encoded.ok) throw new TypeError(encoded.error.message);
    return encoded.value;
  },
  fromWire: (event) => {
    const opened = utteranceFromCloudEvent(event);
    assert.equal(opened.ok, true, "CloudEvents reading decodes a canonical utterance");
    if (!opened.ok) throw new TypeError(opened.error.message);
    return {
      e: opened.value.token,
      a: opened.value.claim.replace(/^not /, ""),
      v: opened.value.claim.startsWith("not ") ? "deny" : "assert",
      t: event.id,
    };
  },
});

const otlpSpanReading = Object.freeze({
  id: "relating.otlp.span",
  toWire: spanFromWitness,
  fromWire: witnessFromSpan,
});

const protocolReadings = Object.freeze([activityPubReading, cloudEventsReading, otlpSpanReading]);

test("ActivityPub, CloudEvents, and OTLP are coherent readings of one witness journal entry", () => {
  for (const left of protocolReadings) {
    for (const right of protocolReadings) {
      const report = cohere(left, right, witness);
      assert.equal(report.ok, true, `${left.id} <-> ${right.id}`);
    }
  }
});
