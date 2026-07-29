import assert from "node:assert/strict";
import test from "node:test";
import { classify, define, entails, restrict } from "../src/index.mts";

test("restriction recognition entails every ancestor proof", () => {
  const file = define({ type: "file", recognize: ({ path }) => path.length > 0 });
  const json = restrict(file, { type: "json", recognize: ({ path }) => path.endsWith(".json") });
  assert.deepEqual(entails(json).map(({ type }) => type), ["json", "file"]);
  assert.equal(classify({ path: "claim.json", content: "{}" }, [file, json]), json);
});
