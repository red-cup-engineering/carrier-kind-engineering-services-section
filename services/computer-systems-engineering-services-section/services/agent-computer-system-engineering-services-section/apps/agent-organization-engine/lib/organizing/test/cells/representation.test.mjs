import assert from "node:assert/strict";
import test from "node:test";

import {
  affirmsRepresentation,
  deniesRepresentation,
  representationStanding,
} from "../../src/cells/representation.mjs";

const ACTOR = "agent:chatgpt-web";
const AUTH = "principal:emsenn";
const REPRESENTED = "office:trusted-assistant";
const SCOPE = "work-item:alignment";

test("representation is unknown without matching assertions", () => {
  const reading = representationStanding([], ACTOR, AUTH, REPRESENTED, SCOPE);
  assert.equal(reading.value, "unknown");
});

test("representation occupies the FOUR evidence lattice", () => {
  const affirm = affirmsRepresentation(
    "issuer:leader",
    ACTOR,
    AUTH,
    REPRESENTED,
    SCOPE,
    "2026-10-05T20:00:00.000Z",
  );
  const deny = deniesRepresentation(
    "issuer:counter",
    ACTOR,
    AUTH,
    REPRESENTED,
    SCOPE,
    "2026-10-05T20:01:00.000Z",
  );

  assert.equal(representationStanding([affirm], ACTOR, AUTH, REPRESENTED, SCOPE).value, "held");
  assert.equal(representationStanding([deny], ACTOR, AUTH, REPRESENTED, SCOPE).value, "denied");
  assert.equal(representationStanding([affirm, deny], ACTOR, AUTH, REPRESENTED, SCOPE).value, "contested");
});

test("representation assertions cannot leak across identity coordinates", () => {
  const affirm = affirmsRepresentation(
    "issuer:leader",
    ACTOR,
    AUTH,
    REPRESENTED,
    SCOPE,
    "2026-10-05T20:00:00.000Z",
  );

  assert.equal(representationStanding([affirm], "agent:other", AUTH, REPRESENTED, SCOPE).value, "unknown");
  assert.equal(representationStanding([affirm], ACTOR, "principal:other", REPRESENTED, SCOPE).value, "unknown");
  assert.equal(representationStanding([affirm], ACTOR, AUTH, "office:other", SCOPE).value, "unknown");
  assert.equal(representationStanding([affirm], ACTOR, AUTH, REPRESENTED, "work-item:other").value, "unknown");
});

test("representation source facts are content-addressed", () => {
  const left = affirmsRepresentation(
    "issuer:leader",
    ACTOR,
    AUTH,
    REPRESENTED,
    SCOPE,
    "2026-10-05T20:00:00.000Z",
    ["receipt:1"],
  );
  const same = affirmsRepresentation(
    "issuer:leader",
    ACTOR,
    AUTH,
    REPRESENTED,
    SCOPE,
    "2026-10-05T20:00:00.000Z",
    ["receipt:1"],
  );
  const later = affirmsRepresentation(
    "issuer:leader",
    ACTOR,
    AUTH,
    REPRESENTED,
    SCOPE,
    "2026-10-05T20:02:00.000Z",
    ["receipt:1"],
  );

  assert.equal(left.id, same.id);
  assert.notEqual(left.id, later.id);
});
