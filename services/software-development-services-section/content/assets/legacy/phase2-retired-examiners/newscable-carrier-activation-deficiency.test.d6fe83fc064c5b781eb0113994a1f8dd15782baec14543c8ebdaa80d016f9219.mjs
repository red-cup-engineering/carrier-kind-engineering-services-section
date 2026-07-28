import assert from "node:assert/strict";
import test from "node:test";

import { examineNewscableCarrierActivationDeficiency } from "../src/independent-newscable-carrier-activation-deficiency-examiner.mjs";

test("recognizes live Newscable import resolution while retaining the historical failure denominator", () => {
  const examination = examineNewscableCarrierActivationDeficiency("2026-07-19T04:25:00.000Z");
  assert.equal(examination.disposition, "close-newscable-live-carrier-activation-deficiency-after-live-import-resolution");
  assert.deepEqual(examination.checks.filter((item) => !item.passed).map((item) => item.id), [
    "declared-producing-content-source-exists-but-live-resolution-is-absent",
    "live-broker-import-fails-at-the-declared-dependency-boundary",
  ]);
  assert.equal(examination.liveImportWitness.passed, true);
  assert.equal(examination.currentResolution.liveDependencyPresent, true);
  assert.equal(examination.stagedCarrier.importWitness.passed, true);
  assert.equal(examination.liveSolicitationFailures.length >= 2, true);
  assert.equal(examination.currentResolution.historicalFailureCount >= 2, true);
  assert.equal(examination.nonclaims.includes("authority to deploy or activate the accepted carrier"), true);
  assert.equal(examination.foreignMutation, false);
});
