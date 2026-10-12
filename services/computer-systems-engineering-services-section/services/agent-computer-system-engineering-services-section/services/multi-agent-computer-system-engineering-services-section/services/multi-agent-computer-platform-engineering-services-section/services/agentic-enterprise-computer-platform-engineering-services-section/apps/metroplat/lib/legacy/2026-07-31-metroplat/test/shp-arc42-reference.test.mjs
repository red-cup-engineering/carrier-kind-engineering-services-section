import assert from "node:assert/strict";
import test from "node:test";

import { fromSection, project, markup, ref, isRef, unmark, REF_PREFIX } from "@red-cup-engineering/html-structural-projection-service";
import { buildingBlock } from "../src/lib/codecs/arc42/index.mts";

test("ref() marks an entity reference distinguishable from a literal string", () => {
  const r = ref("arc42:5.9");
  assert.equal(isRef(r), true);
  assert.equal(isRef("arc42:5.9"), false);
  assert.deepEqual(unmark(r), r);
});

test("project/markup round-trips a reference-valued claim through data-v", () => {
  const dataform = fromSection({ affirmed: [
    { predicate: "depends-on", object: ref("arc42:5.9") },
  ] }, { subject: "arc42:5.13a" });
  const html = project(dataform);
  assert.match(html, new RegExp(`data-v="${REF_PREFIX}arc42:5\\.9"`));

  const cells = markup(html);
  assert.equal(cells.length, 1);
  assert.equal(isRef(cells[0].cell.object), true);
  assert.equal(cells[0].cell.object.ref, "arc42:5.9");
});

// The three building blocks below are transcribed from §5.13a/b/c of the
// arc42 SAD, filled in through the buildingBlock() authoring form rather
// than parsed from the prose — proving the form can carry a real,
// multi-hop dependency chain (5.13c depends on both 5.13a and 5.13b).

const block513a = buildingBlock({
  id: "arc42:5.13a",
  name: "Conflict",
  dependsOn: ["arc42:5.8"],
  interface: "contributionCount : Point x EvidencePresheaf -> NonNegativeInteger; inConflict : Point x EvidencePresheaf -> Boolean",
  obstructionVariants: "none - both operations are total reads of an already-built presheaf",
  preconditions: "any Point of the presheaf's site and any EvidencePresheaf already built over it",
  postconditions: "inConflict(point, presheaf) = true iff readingAt(presheaf, point) = contested",
});

const block513b = buildingBlock({
  id: "arc42:5.13b",
  name: "Coordination",
  dependsOn: ["arc42:5.13a", "arc42:5.10"],
  interface: "coordinationCost : Cover -> NonNegativeInteger",
  obstructionVariants: "none - coordinationCost is a total arithmetic function of a well-formed Cover",
  preconditions: "any Cover satisfying components <= entities and entities <= cells + components",
  postconditions: "coordinationCost(cover) = 0 iff the cover's overlaps form a spanning forest",
});

const block513c = buildingBlock({
  id: "arc42:5.13c",
  name: "Reconciliation",
  dependsOn: ["arc42:5.13a", "arc42:5.13b", "arc42:5.9"],
  interface: "merge : EvidencePresheaf x EvidencePresheaf -> EvidencePresheaf; requestConsensus : List<ConflictingReading> -> Judgment<ResolvedReading, ConsensusObstruction>",
  obstructionVariants: "ConsensusObstruction is one of: NoQuorum, StaleProposal. merge has none - it is total.",
  preconditions: "merge accepts any two EvidencePresheaf values over the same site",
  postconditions: "merge is a bounded join-semilattice operation: commutative, idempotent, associative, least upper bound",
});

test("hand-encode arc42 building block 5.13a (Conflict) via the authoring form", () => {
  const cells = markup(project(block513a));
  assert.equal(cells.length, 6); // name + depends-on + interface + obstruction-variants + preconditions + postconditions
  const byPredicate = Object.fromEntries(cells.map((c) => [c.cell.predicate, c.cell.object]));
  assert.equal(byPredicate.name, "Conflict");
  assert.equal(isRef(byPredicate["depends-on"]), true);
  assert.equal(byPredicate["depends-on"].ref, "arc42:5.8");
});

test("5.13b and 5.13c prove multi-hop dependsOn refs through the authoring form", () => {
  const cellsB = markup(project(block513b));
  const dependsOnB = cellsB.filter((c) => c.cell.predicate === "depends-on").map((c) => c.cell.object.ref);
  assert.deepEqual(dependsOnB.sort(), ["arc42:5.10", "arc42:5.13a"]);

  const cellsC = markup(project(block513c));
  const dependsOnC = cellsC.filter((c) => c.cell.predicate === "depends-on").map((c) => c.cell.object.ref);
  assert.deepEqual(dependsOnC.sort(), ["arc42:5.13a", "arc42:5.13b", "arc42:5.9"]);

  // 5.13c's dependency chain resolves transitively back to 5.13a's own
  // dependency (5.8), proving refs compose across independently built
  // dataforms, not just within one.
  const chain = new Map([
    ["arc42:5.13c", markup(project(block513c)).filter((c) => c.cell.predicate === "depends-on").map((c) => c.cell.object.ref)],
    ["arc42:5.13b", dependsOnB],
    ["arc42:5.13a", markup(project(block513a)).filter((c) => c.cell.predicate === "depends-on").map((c) => c.cell.object.ref)],
  ]);
  assert.ok(chain.get("arc42:5.13c").includes("arc42:5.13a"));
  assert.ok(chain.get("arc42:5.13b").includes("arc42:5.13a"));
  assert.ok(chain.get("arc42:5.13a").includes("arc42:5.8"));
});

test("buildingBlock() rejects a spec missing id or name", () => {
  assert.throws(() => buildingBlock({ id: "", name: "x" }), TypeError);
  assert.throws(() => buildingBlock({ id: "arc42:5.99", name: "" }), TypeError);
});
