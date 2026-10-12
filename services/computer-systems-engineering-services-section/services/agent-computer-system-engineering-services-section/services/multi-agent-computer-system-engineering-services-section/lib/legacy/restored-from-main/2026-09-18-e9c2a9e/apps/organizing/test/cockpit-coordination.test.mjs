import test from "node:test";
import assert from "node:assert/strict";

import { grant } from "@red-cup-engineering/animating";
import {
  accountableClaim,
  capabilityGrantsPath,
  claimWitness,
  cockpitFederationSources,
  coordinateCockpitClaims,
  heldCapabilityReading,
} from "../dist/index.mjs";
import { cohere } from "@red-cup-engineering/relating/ledger";

const activeClaim = (session, claimId, paths, reason = null) =>
  Object.freeze({
    kind: "organizing.theatre.active-work-locus-claim",
    claimId,
    capability: grant(
      `urn:agent:${session}`,
      `workspace:${paths.join("|")}`,
      `https://dev.bare-cedar-fog.emsenn.net/capabilities/work-locus/${encodeURIComponent(claimId)}`,
    ),
    session,
    harness: "claude-code",
    paths: Object.freeze([...paths]),
    reason,
    at: `2026-06-26T00:00:0${claimId.length % 10}Z`,
    expiresAt: "2026-06-27T00:00:00Z",
    event: `evt-${claimId}`,
  });

test("a sole held capability is an accountable claim: authorized and witnessed", () => {
  const claim = activeClaim("alpha", "c-alpha", ["lib/organizing/src/theatre.mts"]);
  const report = accountableClaim("lib/organizing/src/theatre.mts", [claim]);

  assert.equal(report.standing, "sole");
  assert.equal(report.authorized, true);
  assert.equal(report.witnessed, true);
  assert.equal(report.accountable, true);
  assert.deepEqual(report.legs, { authorized: "potential", witnessed: "potential" });
  assert.equal(report.holders.length, 1);
  assert.equal(report.coherence.every((entry) => entry.ok), true);
});

test("a capability that does not grant the path is unauthorized (active, not silently ok)", () => {
  const claim = activeClaim("alpha", "c-alpha", ["lib/animating/src/index.mts"]);
  // claim's capability grants animating, but we query an organizing path
  assert.equal(capabilityGrantsPath(claim.capability, "lib/organizing/src/index.mts"), false);
  const report = accountableClaim("lib/organizing/src/index.mts", [claim]);
  assert.equal(report.authorized, false);
  assert.equal(report.legs.authorized, "active");
  assert.equal(report.accountable, false);
});

test("competing positive claims retain every holder and require admission", () => {
  const path = "lib/organizing/src/theatre.mts";
  const report = accountableClaim(path, [activeClaim("alpha", "c-alpha", [path]), activeClaim("beta", "c-beta", [path])]);
  assert.equal(report.standing, "requires-admission");
  assert.deepEqual(report.holders.map((entry) => entry.witness), ["alpha:c-alpha", "beta:c-beta"]);
  assert.equal(report.authorized, true);
  assert.equal(report.witnessed, true);
  assert.equal(report.legs.witnessed, "potential");
  assert.equal(report.accountable, false);
  assert.equal("contestCharge" in report, false);
  assert.equal("falsityHolders" in report, false);
});

test("disjoint peer evidence remains shared", () => {
  // two sessions claim DIFFERENT single paths: disjoint, monotone, no overlap cell
  const sources = cockpitFederationSources([
    activeClaim("alpha", "c-alpha", ["lib/organizing/src/theatre.mts"]),
    activeClaim("beta", "c-beta", ["lib/animating/src/index.mts"]),
  ]);
  const coordination = coordinateCockpitClaims([
    activeClaim("alpha", "c-alpha", ["lib/organizing/src/theatre.mts"]),
    activeClaim("beta", "c-beta", ["lib/animating/src/index.mts"]),
  ]);

  assert.equal(sources.length, 2);
  const fed = coordination.federation;
  assert.notEqual(fed, null);
  assert.equal(fed.shared.length, 2);
  assert.equal(fed.contested.length, 0);
  assert.equal(fed.requiresAdmission.length, 0);
});

test("same-path distinct assertions require admission", () => {
  const path = "lib/organizing/src/theatre.mts";
  const coordination = coordinateCockpitClaims([
    activeClaim("alpha", "c-alpha", [path]),
    activeClaim("beta", "c-beta", [path]),
  ]);
  const fed = coordination.federation;
  assert.equal(fed.contested.length, 0);
  assert.equal(fed.requiresAdmission.length, 1);
  assert.equal(fed.requiresAdmission[0].cell, path);
  assert.equal(fed.requiresAdmission[0].reason, "multiple-asserted-values");

  // The per-path claim also requires admission.
  const claim = coordination.claims.find((entry) => entry.path === path);
  assert.equal(claim.standing, "requires-admission");
  assert.equal(claim.accountable, false);
});

test("multiple distinct assertions retain every witness for admission", () => {
  const path = "lib/organizing/src/theatre.mts";
  const coordination = coordinateCockpitClaims([
    activeClaim("alpha", "c-alpha-1", [path], "rewrite"),
    activeClaim("alpha", "c-alpha-2", [path], "review"),
    activeClaim("beta", "c-beta-1", [path], "rewrite"),
    activeClaim("beta", "c-beta-2", [path], "review"),
  ]);

  const fed = coordination.federation;
  assert.equal(fed.requiresAdmission.length, 1);
  assert.equal(fed.requiresAdmission[0].cell, path);
  assert.deepEqual(
    fed.requiresAdmission[0].statements.map((entry) => entry.witness).sort(),
    ["alpha:c-alpha-1:lib/organizing/src/theatre.mts", "alpha:c-alpha-2:lib/organizing/src/theatre.mts", "beta:c-beta-1:lib/organizing/src/theatre.mts", "beta:c-beta-2:lib/organizing/src/theatre.mts"],
  );
});

test("the cockpit's RWIL claim trace reads coherently through the kernel", () => {
  const path = "lib/organizing/src/theatre.mts";
  const claim = activeClaim("alpha", "c-alpha", [path]);
  const row = claimWitness(claim, path);

  // the held-capability reading is an iso on the RWIL row: round-trips losslessly
  const report = cohere(heldCapabilityReading, heldCapabilityReading, row);
  assert.equal(report.ok, true);
  assert.equal(report.leftIso, true);
  assert.equal(report.rightIso, true);

  // and the wire recovers the holder identity from the witness
  const wire = heldCapabilityReading.toWire(row);
  assert.equal(wire.session, "alpha");
  assert.equal(wire.path, path);
  assert.equal(wire.grants, `workspace:${path}`);
});

test("workspace authority covers exact paths and descendants, never parents or siblings", () => {
  const capability = activeClaim("alpha", "c-alpha", ["lib/organizing/src"]).capability;
  assert.equal(capabilityGrantsPath(capability, "lib/organizing/src"), true);
  assert.equal(capabilityGrantsPath(capability, "lib/organizing/src/index.mts"), true);
  for (const path of ["lib/organizing", "lib/organizing/test", "lib/organizing/src-other", "lib/organizing/src/../test"]) {
    assert.equal(capabilityGrantsPath(capability, path), false, path);
    const claim = activeClaim("alpha", "c-alpha", ["lib/organizing/src"]);
    assert.equal(accountableClaim(path, [claim]).authorized, false, path);
  }
});
