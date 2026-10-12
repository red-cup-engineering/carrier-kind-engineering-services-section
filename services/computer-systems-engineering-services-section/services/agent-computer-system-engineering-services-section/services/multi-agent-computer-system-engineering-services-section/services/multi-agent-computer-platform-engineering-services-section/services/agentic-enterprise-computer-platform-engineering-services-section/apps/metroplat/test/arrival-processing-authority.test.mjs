import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { appendArrivalAtRoot, readArrivalProjection } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { processArrivals } from "@red-cup-engineering/metroplat/arrival-processing";
import { readFileUtf8 } from "@red-cup-engineering/computer-system-engine/filesystem";

const AT = "2026-09-09T12:00:00.000Z";
const DATE = AT.slice(0, 10);

function dispatchArrival(id, subject = "actor:claimed-by-peer") {
  return Object.freeze({
    specversion: "1.0",
    id,
    source: "https://untrusted-peer.example/metroplat",
    type: "org.emsenn.metroplat.dispatch",
    time: AT,
    datacontenttype: "application/json",
    data: Object.freeze({
      material: Object.freeze({
        kind: "metroplat.dispatch.arrival-material",
        subject,
        argv: Object.freeze(["remote-work"]),
        stdin: "null",
      }),
    }),
  });
}

function authorization(ok, subjects) {
  return (invocation, operation, decidedAt) => {
    subjects.push(invocation.subject);
    return Object.freeze({
      kind: ok ? "metroplat.rpc.authorization:witness" : "metroplat.rpc.authorization:obstruction",
      ok,
      invocation: invocation.id,
      operation: operation.ref,
      subject: invocation.subject,
      reading: ok ? "held" : "denied",
      evidence: Object.freeze(["local-capability:evidence"]),
      reasons: Object.freeze(ok ? [] : ["local capability is denied"]),
      decidedAt,
    });
  };
}

function operationThatCounts(calls) {
  return operation({
    verb: "remote-work",
    inputFormat: "json",
    outputFormat: "json",
    relation: "boundary",
    run: () => {
      calls.push("executed");
      return null;
    },
  });
}

test("arrival claims are retained but cannot become an authority subject without a receiver-local binding", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-arrival-authority-"));
  const calls = [];
  const authorizationSubjects = [];
  try {
    appendArrivalAtRoot(root, dispatchArrival("unbound-claim"), { at: AT });
    const result = await processArrivals([operationThatCounts(calls)], root, DATE, {
      at: AT,
      readFileUtf8,
      authorize: authorization(true, authorizationSubjects),
    });

    assert.equal(result.processed, 0);
    assert.equal(result.obstructed, 1);
    assert.deepEqual(calls, []);
    assert.deepEqual(authorizationSubjects, []);
    assert.match(result.entries[0].obstructions.join("; "), /no receiver-local principal binding/);

    const receipt = readArrivalProjection(root, DATE);
    assert.equal(receipt.entries.length, 1, "the original arrival receipt remains available after refusal");
    assert.equal(receipt.entries[0].packet.presentation.source, "https://untrusted-peer.example/metroplat");
    assert.equal(receipt.entries[0].dispatchEvent.claimedSubject, "actor:claimed-by-peer");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("only a locally bound subject reaches capability authorization; peer source and material subject do not", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-arrival-local-binding-"));
  const calls = [];
  const authorizationSubjects = [];
  try {
    appendArrivalAtRoot(root, dispatchArrival("locally-bound-claim", "actor:forged-local-admin"), { at: AT });
    const result = await processArrivals([operationThatCounts(calls)], root, DATE, {
      at: AT,
      readFileUtf8,
      authorize: authorization(false, authorizationSubjects),
      bindPrincipal: (request) => {
        assert.equal(request.source, "https://untrusted-peer.example/metroplat");
        assert.equal(request.claim.claimedSubject, "actor:forged-local-admin");
        return Object.freeze({
          kind: "metroplat.arrival.local-principal-binding",
          state: "bound",
          subject: "actor:receiver-local-worker",
          evidence: Object.freeze(["incumbency:receiver-local-worker", "capability:receiver-local-worker"]),
          reasons: Object.freeze([]),
        });
      },
    });

    assert.equal(result.processed, 0);
    assert.equal(result.obstructed, 1);
    assert.deepEqual(calls, []);
    assert.deepEqual(authorizationSubjects, ["actor:receiver-local-worker"]);
    assert.notEqual(authorizationSubjects[0], "actor:forged-local-admin");
    assert.equal(readArrivalProjection(root, DATE).entries.length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an arrival that smuggles authority material is retained as an obstructed receipt and never dispatches", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-arrival-smuggling-"));
  const calls = [];
  const authorizationSubjects = [];
  try {
    const event = dispatchArrival("smuggled-principal");
    const receipt = appendArrivalAtRoot(root, {
      ...event,
      data: {
        material: {
          ...event.data.material,
          caller: { principal: "actor:forged-local-admin" },
        },
      },
    }, { at: AT });
    assert.equal(receipt.ok, false);
    assert.match(receipt.obstructions.join("; "), /principal is not admissible/u);

    const result = await processArrivals([operationThatCounts(calls)], root, DATE, {
      at: AT,
      readFileUtf8,
      authorize: authorization(true, authorizationSubjects),
      bindPrincipal: () => { throw new Error("an obstructed claim must not request local principal binding"); },
    });
    assert.equal(result.processed, 0);
    assert.deepEqual(calls, []);
    assert.deepEqual(authorizationSubjects, []);
    const projection = readArrivalProjection(root, DATE);
    assert.equal(projection.entries.length, 1, "the rejected material remains an inspectable receipt");
    assert.match(projection.entries[0].obstructions.join("; "), /principal is not admissible/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
