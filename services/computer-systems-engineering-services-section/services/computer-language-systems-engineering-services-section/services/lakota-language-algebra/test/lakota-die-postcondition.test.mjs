// Backport check: lakota-die.mjs's invoke-service now checks the same
// postcondition english-die.mjs's invoke() checks (settled/totalObstructionBits
// surfaced from tagText()'s discarded-by-default cohomology reading), via the
// same CLI transport the other siblings use — this die is CLI-only (no
// exported solicit/invoke), so the check drives the real subprocess.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { ACTIVITYSTREAMS_CONTEXT } from "@red-cup-engineering/activitypub-services-section/activitystreams";

const DIE = fileURLToPath(new URL("../src/lakota-die.mjs", import.meta.url));
const ACTOR = "urn:ame:lakota-language-algebra";

function run(operation, activity) {
  const result = spawnSync(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), DIE, "--operation", operation, "--now", "2026-09-01T00:00:00.000Z"], {
    input: JSON.stringify(activity),
    encoding: "utf8",
  });
  return JSON.parse(result.stdout);
}

function solicitation(text) {
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT, type: "Offer", target: ACTOR,
    object: { type: "ServiceSolicitation", sourceActivity: { id: "urn:activity:test", object: { content: text } } },
  };
}

test("invoke-service checks the real postcondition instead of trusting tagText blindly", () => {
  const offer = run("solicit-service", solicitation("Sunka kiŋ yawá."));
  assert.equal(offer.type, "Offer");
  const acceptance = {
    "@context": ACTIVITYSTREAMS_CONTEXT, type: "Accept", target: ACTOR,
    object: {
      type: "ServiceContract",
      offer,
      capability: {
        type: "Capability", holder: ACTOR, invocationTarget: ACTOR,
        parentOffer: offer.id,
        attenuation: { requestDigest: offer.object.requestDigest },
        allowedActions: ["invoke-service"],
      },
    },
  };
  const result = run("invoke-service", acceptance);
  assert.equal(result.type, "Accept");
  assert.equal(typeof result.object.settled, "boolean");
  assert.equal(typeof result.object.totalObstructionBits, "number");
  assert.ok(result.object.sentences[0].cohomology, "cohomology reading must survive to the response, not be discarded");
});
