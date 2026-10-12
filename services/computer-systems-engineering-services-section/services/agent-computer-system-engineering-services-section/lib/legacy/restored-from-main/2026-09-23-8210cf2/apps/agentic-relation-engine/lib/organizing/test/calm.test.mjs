/**
 * writing/calm - CALM reads federation coordination through monotonicity.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTIVITYSTREAMS_CONTEXT,
  federateActivities,
  readCalmCovers,
  readCalmFederation,
} from "../src/index.mjs";

const create = (actor, content) => ({
  "@context": ACTIVITYSTREAMS_CONTEXT,
  type: "Create",
  actor,
  object: { content },
});

test("a top-introducing federation witness reads consensus-required by CALM", () => {
  const agreementOnly = federateActivities([
    [create("mara", "treaty|signed")],
    [create("mara", "treaty|signed")],
  ]);
  const federation = {
    ...agreementOnly,
    shared: 0,
    contested: 1,
    federationOnly: 1,
    glued: false,
    coordination: "consensus-required",
  };
  const reading = readCalmFederation(federation);

  assert.equal(reading.monotone, false);
  assert.equal(reading.coordination, "consensus-required");
  assert.deepEqual(reading.witness, {
    shared: 0,
    contested: 1,
    federationOnly: 1,
  });
});
