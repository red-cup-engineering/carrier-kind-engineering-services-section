import { test } from "node:test";
import assert from "node:assert/strict";

import { canonical } from "@red-cup-engineering/json-services-section";
import { mark, utterance } from "@red-cup-engineering/signcell/utterance";
import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import {
  CLOUDEVENTS_DATA_CONTENT_TYPE,
  CLOUDEVENTS_JSON_CONTENT_TYPE,
  CLOUDEVENTS_SPECVERSION,
  cloudEventFromUtterance,
  cloudEventIllocutionaryForce,
  utteranceFromCloudEvent,
} from "../src/index.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

test("CloudEvents structured JSON round-trips one membrane utterance losslessly", () => {
  const source = "did:web:dev.bare-cedar-fog.emsenn.net:agents:codex";
  const force = "directive";
  const time = "2026-06-26T02:45:00Z";
  const claim = Object.freeze({
    relation: "opens",
    object: "across-envelope",
    evidence: ["CloudEvents structured JSON"],
  });
  const carrier = utterance(mark(source), mark(claim));

  const event = cloudEventFromUtterance(carrier, force, time, {
    id: "urn:uuid:cloudevents-law",
  });

  assert.equal(CLOUDEVENTS_JSON_CONTENT_TYPE, "application/cloudevents+json");
  assert.equal(event.specversion, CLOUDEVENTS_SPECVERSION);
  assert.equal(event.specversion, "1.0");
  assert.equal(event.id, "urn:uuid:cloudevents-law");
  assert.equal(event.source, source, "source is the utterance token");
  assert.equal(event.type, force, "type is the illocutionary force");
  assert.equal(event.time, time, "time is T");
  assert.equal(event.datacontenttype, CLOUDEVENTS_DATA_CONTENT_TYPE);
  assert.equal(canonical(event.data), canonical(claim), "data is the utterance claim");

  const opened = utteranceFromCloudEvent(event);
  assert.equal(canonical(jsonResource(opened)), canonical(jsonResource(carrier)));

  const closedAgain = cloudEventFromUtterance(opened, cloudEventIllocutionaryForce(event), event.time, {
    id: event.id,
  });
  assert.equal(canonical(closedAgain), canonical(event));
});

test("CloudEvents type carries the admitted Searle force explicitly", () => {
  const carrier = utterance(mark("did:web:dev.bare-cedar-fog.emsenn.net:agents:codex"), mark("state the shared force law"));
  const cases = [
    "assertive",
    "directive",
    "commissive",
    "expressive",
    "declaration",
  ];

  for (const force of cases) {
    const event = cloudEventFromUtterance(carrier, force, "2026-06-26T02:50:00Z", {
      id: `urn:uuid:cloudevents-${force}`,
    });
    assert.equal(cloudEventIllocutionaryForce(event), force);
  }
});

test("CloudEvents preserve the established SCIS v2 semantic identity law", () => {
  const source = "did:web:example.test:agents:listener";
  const type = "assertive";
  const time = "2026-08-14T20:00:00Z";
  const data = Object.freeze({ relation: "states", object: "continuity" });
  const carrier = utterance(mark(source), mark(data));
  const expected = identifyJsonSemanticContent({
    objectKind: "lenticule.communicating.cloudevent",
    value: { source, type, time, data },
    witnessRoot: EMPTY_WITNESS_ROOT,
  });

  const plain = cloudEventFromUtterance(carrier, type, time);
  const valued = cloudEventFromUtterance(carrier, type, time, { truthReading: "stable" });

  assert.equal(plain.id, expected.token);
  assert.equal(valued.id, expected.token, "an envelope extension does not rewrite semantic identity");
});
