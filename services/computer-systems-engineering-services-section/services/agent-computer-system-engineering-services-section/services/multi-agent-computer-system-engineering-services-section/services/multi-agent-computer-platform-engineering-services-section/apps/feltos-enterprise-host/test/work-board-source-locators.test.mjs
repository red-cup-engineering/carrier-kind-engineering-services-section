import assert from "node:assert/strict";
import test from "node:test";
import { workBoardSourceLocators } from "../src/work-board-source-locators.mjs";

test("work-board combines singular and plural source filters as an exact union", () => {
  assert.deepEqual(workBoardSourceLocators({ source: "urn:one", sources: ["urn:two", "urn:three"] }), [
    "urn:one", "urn:two", "urn:three",
  ]);
  assert.deepEqual(workBoardSourceLocators({ source: "urn:one", sources: ["urn:one", "urn:two"] }), [
    "urn:one", "urn:two",
  ]);
  assert.equal(workBoardSourceLocators({}), undefined);
});

test("work-board retains exact source selector validation", () => {
  assert.throws(() => workBoardSourceLocators({ source: "" }), /non-empty exact locator/);
  assert.throws(() => workBoardSourceLocators({ sources: ["urn:one", "urn:one"] }), /unique exact locators/);
  assert.throws(() => workBoardSourceLocators({ source: "urn:one", sources: [] }), /unique exact locators/);
});
