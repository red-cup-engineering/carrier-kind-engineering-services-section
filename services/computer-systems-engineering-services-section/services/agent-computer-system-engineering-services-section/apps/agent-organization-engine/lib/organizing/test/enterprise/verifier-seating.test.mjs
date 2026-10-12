import assert from "node:assert/strict";
import test from "node:test";
import { verifierSeatingOf } from "../../src/enterprise/governance.mjs";

// A registry of the shape verifierOfficesOf reads: two offices of one enterprise, one of which verifies as black.
const SECTION = "services/eng";
const office = (id, extra = {}) => ({ key: `${SECTION}#${id}`, id, sectionPath: SECTION, authored: extra });
const build = (holders = {}) => {
  const offices = [office("junior"), office("assurance", { verifies: "black" }), office("red-team", { verifies: "red" })];
  const enterprise = { id: "engineering", sectionPath: SECTION, authored: { offices: offices.map((entry) => entry.id) } };
  const incumbencies = Object.entries(holders).map(([id, holder]) => ({ holder, office: id, sectionPath: SECTION, recognition: "t", induction: "t" }));
  return {
    offices: new Map(offices.map((entry) => [entry.key, entry])),
    enterprises: new Map([[enterprise.id, enterprise]]),
    incumbencies: new Map(incumbencies.map((entry, index) => [index, entry])),
    byId: { offices: new Map(offices.map((entry) => [entry.id, [entry]])) },
    sections: new Set([SECTION]),
  };
};

test("a delivery is staffed to the distinct verifier office its enterprise lists, one per colour housed", () => {
  const seating = verifierSeatingOf(build(), { enterprise: "engineering", producer: `${SECTION}#junior` });
  assert.deepEqual(seating.staffed, [{ role: "black", office: `${SECTION}#assurance` }, { role: "red", office: `${SECTION}#red-team` }]);
  assert.deepEqual(seating.refused, []);
});

test("a delivery whose producer is in the only verifier office is refused with the seating reason, not an error", () => {
  const seating = verifierSeatingOf(build(), { enterprise: "engineering", producer: `${SECTION}#assurance`, require: ["black"] });
  assert.deepEqual(seating.staffed, []);
  assert.equal(seating.refused.length, 1);
  assert.equal(seating.refused[0].role, "black");
  assert.match(seating.refused[0].reason, /own or shares its bearer: seat a distinct one/u);
});

test("a verifier office whose bearer also bears the producer's office is passed over", () => {
  const seating = verifierSeatingOf(build({ junior: "ada", assurance: "ada" }), { enterprise: "engineering", producer: `${SECTION}#junior`, require: ["black"] });
  assert.deepEqual(seating.staffed, []);
  assert.equal(seating.refused[0].role, "black");
});

test("the terms may require colours: an unhoused colour is refused, a housed one is staffed", () => {
  const seating = verifierSeatingOf(build(), { enterprise: "engineering", producer: `${SECTION}#junior`, require: ["black", "white"] });
  assert.deepEqual(seating.staffed, [{ role: "black", office: `${SECTION}#assurance` }]);
  assert.deepEqual(seating.refused.map((entry) => entry.role), ["white"]);
  assert.match(seating.refused[0].reason, /lists no office that verifies as white/u);
});

test("an enterprise that lists no verifier office owes a seating signal", () => {
  const seating = verifierSeatingOf(build(), { enterprise: "elsewhere", producer: `${SECTION}#junior` });
  assert.equal(seating.staffed.length, 0);
  assert.match(seating.refused[0].reason, /lists no office that verifies/u);
});
