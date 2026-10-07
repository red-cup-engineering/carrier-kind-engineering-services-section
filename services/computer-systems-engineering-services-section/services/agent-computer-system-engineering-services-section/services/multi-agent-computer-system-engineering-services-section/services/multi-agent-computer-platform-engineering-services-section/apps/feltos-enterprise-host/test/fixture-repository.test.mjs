import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fixtureRepository } from "./fixture-repository.mjs";

// These empty, uniquely named markers test path discovery only. They are not
// Group schemas and do not stand in for the character test's real fixtures.
function workspace(t) {
  const root = mkdtempSync(path.join(tmpdir(), "host-fixture-search-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const start = path.join(root, "nested", "test");
  mkdirSync(start, { recursive: true });
  return { root, start, marker: `.fixture-marker-${path.basename(root)}` };
}

test("fixture discovery keeps the nearest existing marker", (t) => {
  const { root, start, marker } = workspace(t);
  mkdirSync(path.join(root, marker));
  assert.equal(fixtureRepository(start, marker), root);
  const nearest = path.dirname(start);
  mkdirSync(path.join(nearest, marker));
  assert.equal(fixtureRepository(start, marker), nearest);
  mkdirSync(path.join(start, marker));
  assert.equal(fixtureRepository(start, marker), start);
});

test("missing fixtures fail explicitly after finite ancestor search", (t) => {
  const { start, marker } = workspace(t);
  assert.throws(() => fixtureRepository(start, marker), (error) => {
    assert.equal(error.code, "ERR_REQUIRED_FIXTURE_MISSING");
    assert.ok(error.message.includes(marker));
    assert.ok(error.message.includes(start));
    assert.ok(error.message.includes(`filesystem root ${path.parse(start).root}`));
    return true;
  });
});

test("an absent marker at the filesystem root fails without repeating it", (t) => {
  const { start, marker } = workspace(t);
  assert.throws(() => fixtureRepository(path.parse(start).root, marker), {
    code: "ERR_REQUIRED_FIXTURE_MISSING",
  });
});
