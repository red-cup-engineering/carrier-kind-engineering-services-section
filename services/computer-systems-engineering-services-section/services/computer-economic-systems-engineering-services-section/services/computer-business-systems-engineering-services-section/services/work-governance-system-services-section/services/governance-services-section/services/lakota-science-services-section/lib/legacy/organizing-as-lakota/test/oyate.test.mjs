import { test } from "node:test";
import assert from "node:assert/strict";
import { tiyospaye, oyate, ocetiSakowin } from "../dist/index.mjs";

const kinSeed = [
  "naca|senior-relative",
  "akicita|enforce-obligation",
  "thiyospaye|extended-family-band",
  "winyan|sister",
  "thakoja|grandchild",
].join("\n");

const secondBand = [
  "naca|other-senior-relative",
  "akicita|enforce-obligation",
  "thiyospaye|allied-band",
  "wicasa|brother",
].join("\n");

test("tiyospaye reads a kin seed as a community with kinship-is-politics", () => {
  const band = tiyospaye(kinSeed);
  assert.equal(band.kind, "organizing-as-lakota.tiyospaye");
  assert.equal(band.scale, "band");
  assert.equal(band.kinshipIsPolitics, true);
  assert.ok(band.community, "carries an organizing community carrier");
  assert.ok(Object.isFrozen(band), "the carrier is frozen");
});

test("oyate reads a seed as an institution with a glued boolean", () => {
  const people = oyate(kinSeed);
  assert.equal(people.kind, "organizing-as-lakota.oyate");
  assert.equal(people.scale, "people");
  assert.ok(people.institution, "carries an organizing institution carrier");
  assert.equal(typeof people.glued, "boolean");
  assert.equal(people.glued, people.institution.glued, "glued is the institution's verdict");
  assert.ok(Object.isFrozen(people));
});

test("ocetiSakowin federates two bands with consensus-by-withdrawal", () => {
  const fire = ocetiSakowin([kinSeed, secondBand]);
  assert.equal(fire.kind, "organizing-as-lakota.oceti-sakowin");
  assert.equal(fire.scale, "confederacy");
  assert.equal(fire.consensusByWithdrawal, true);
  assert.ok(fire.federation, "carries an organizing federation carrier");
  assert.equal(typeof fire.glued, "boolean");
  assert.equal(fire.glued, fire.federation.glued, "glued is the federation's verdict");
  assert.ok(Object.isFrozen(fire));
});

test("ocetiSakowin over an empty cover refuses to federate — there is no confederacy of nothing", () => {
  // The right to withdraw is genuine: a confederacy with no constituent bands is not a
  // federation, and organizing's federate correctly refuses it.
  assert.throws(() => ocetiSakowin([]), /federate/);
});
