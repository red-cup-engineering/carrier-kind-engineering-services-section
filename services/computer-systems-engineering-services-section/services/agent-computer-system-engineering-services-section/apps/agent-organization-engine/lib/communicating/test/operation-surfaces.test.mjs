import { test } from "node:test";
import assert from "node:assert/strict";

import {
  actions,
  codecActions,
  manifestActions,
  memeActions,
  morphismActions,
} from "../src/index.mjs";

const verbs = (surface) => surface.map((member) => member.verb);

test("the core, codec, and manifest operation classes remain separate and exact", () => {
  assert.deepEqual(verbs(memeActions), [
    "communicate",
    "semiose",
    "speak",
    "listen",
    "illocute",
    "ground",
    "translate",
    "negate",
    "conflate",
    "refer",
    "modalize",
    "presuppose",
    "quote",
    "compose",
  ]);
  assert.equal(morphismActions.length, 12);

  const languageReadings = actions({});
  assert.deepEqual(verbs(languageReadings), [
    ...verbs(memeActions),
    "cohere",
    "spacetime",
    "channel",
  ]);

  assert.deepEqual(verbs(codecActions({})), [
    "decode-communication",
    "articulate-communication",
    "settle-communication",
  ]);
  assert.deepEqual(verbs(manifestActions({})), [
    "read-language-manifest",
    "read-language-witness-journal",
    "read-language-manifest-receipts",
    "read-language-lambek-receipt",
    "read-language-sofic-receipt",
    "read-language-chu-receipt",
    "read-language-discourse-cover-receipt",
  ]);
});
