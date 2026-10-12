import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lakotaGovernanceSignature,
  distinguishesFrom,
} from "../dist/index.mjs";

test("default signature: peacetime H1 0, accumulation 0, lax-idempotence trivial, overlay absent", () => {
  const sig = lakotaGovernanceSignature();
  assert.equal(sig.kind, "organizing-as-lakota.governance-signature");
  assert.equal(sig.peacetimeH1, 0);
  assert.equal(sig.accumulationClass, 0);
  assert.equal(sig.laxIdempotenceTwoCell, "trivial");
  assert.equal(sig.settlerOverlayH1, "absent");
  assert.equal(sig.distinguishing, false);
  assert.ok(Object.isFrozen(sig));
});

test("Heyókȟa-bearing makes the lax-idempotence 2-cell non-trivial and the pattern distinguishing", () => {
  const sig = lakotaGovernanceSignature({ heyokhaVocations: 2 });
  assert.equal(sig.laxIdempotenceTwoCell, "non-trivial");
  // accumulation still structurally zero -> only-row case holds
  assert.equal(sig.accumulationClass, 0);
  assert.equal(sig.distinguishing, true);
});

test("reservation conditions raise the persistent settler-overlay H1 class", () => {
  const sig = lakotaGovernanceSignature({ settlerOverlay: true });
  assert.equal(sig.settlerOverlayH1, "non-trivial");
  // overlay is independent of the peacetime / accumulation invariants
  assert.equal(sig.peacetimeH1, 0);
  assert.equal(sig.accumulationClass, 0);
});

test("a polity firing S_wolak alone has no settler-overlay class", () => {
  const sig = lakotaGovernanceSignature({ heyokhaVocations: 3, settlerOverlay: false });
  assert.equal(sig.settlerOverlayH1, "absent");
  assert.equal(sig.distinguishing, true);
});

test("distinguishesFrom: a strict-idempotent pattern differs in feature (b)", () => {
  // most other patterns collapse the 2-cell to strict-idempotence (trivial)
  assert.equal(
    distinguishesFrom({ laxIdempotenceTwoCell: "trivial", accumulationClass: 0 }),
    true,
  );
});

test("distinguishesFrom: a wealth-stratified pattern differs in feature (c)", () => {
  // a wealth-stratified pattern has a non-zero accumulation H0-class
  assert.equal(
    distinguishesFrom({ laxIdempotenceTwoCell: "non-trivial", accumulationClass: 5 }),
    true,
  );
});

test("distinguishesFrom: a pattern matching both features is NOT distinguished", () => {
  // same (b) and (c) as the distinguishing Lakota signature -> cohomologically alike here
  assert.equal(
    distinguishesFrom({ laxIdempotenceTwoCell: "non-trivial", accumulationClass: 0 }),
    false,
  );
});
