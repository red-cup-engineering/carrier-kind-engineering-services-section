// latin-die-postcondition.test.mjs — exercises latin-die.mjs through its
// actual CLI transport (subprocess, stdin/stdout JSON), the only face this
// single-file die exposes; solicit()/invoke() are not exported.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { ACTIVITYSTREAMS_CONTEXT } from "@red-cup-engineering/activitypub-services-section/activitystreams";

const DIE = fileURLToPath(new URL("../src/latin-die.mjs", import.meta.url));
const ACTOR = "urn:ame:latin-language-algebra";

function run(operation, activity, extraArgs = []) {
  const result = spawnSync(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), DIE, "--operation", operation, ...extraArgs], {
    input: JSON.stringify(activity),
    encoding: "utf8",
  });
  return { code: result.status, value: JSON.parse(result.stdout) };
}

function solicitation(text) {
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT, type: "Offer", target: ACTOR,
    object: { type: "ServiceSolicitation", sourceActivity: { id: "urn:activity:test", object: { content: text } } },
  };
}

test("invoke() checks the real postcondition instead of trusting tagText blindly", () => {
  const offer = run("solicit-service", solicitation("Puella rosam amat.")).value;
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
  const { value, code } = run("invoke-service", acceptance, ["--now", "2026-09-01T00:00:00.000Z"]);
  assert.equal(code, 0);
  assert.equal(value.type, "Accept");
  assert.equal(typeof value.object.settled, "boolean");
  assert.equal(typeof value.object.totalObstructionBits, "number");
  assert.ok(value.object.sentences[0].cohomology, "cohomology reading must survive to the response, not be discarded");
  assert.equal(value.object.settled, true);
  assert.equal(value.object.totalObstructionBits, 0);
});
