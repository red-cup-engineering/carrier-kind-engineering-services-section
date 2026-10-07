import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { chargeValue, chargeValueName, joinKnowledgeValue } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";

const namesByCoordinates = Object.freeze({
  "absent,absent": "absurd",
  "present,absent": "potential",
  "absent,present": "active",
  "present,present": "stable",
});

const coordinateKey = (name) => chargeValue(name).coordinates.map((side) => side.name).join(",");

test("Node, Lean, and Solidity share one named FOUR carrier", async () => {
  for (const [coordinates, name] of Object.entries(namesByCoordinates)) {
    assert.equal(coordinateKey(name), coordinates);
  }
  assert.equal(chargeValueName(joinKnowledgeValue(chargeValue("potential"), chargeValue("active"))), "stable");

  const [lean, solidity] = await Promise.all([
    readFile(new URL("../../../lib/obsmetrologia/Obsmetrologia/Language/Positing/Charge.lean", import.meta.url), "utf8"),
    readFile(new URL("../services/predicate/services/posit/src/Charge.sol", import.meta.url), "utf8"),
  ]);

  assert.match(lean, /def kBot : Charge := Articulating\.Corner\.absurd/u);
  assert.match(lean, /def tTop : Charge := Articulating\.Corner\.potential/u);
  assert.match(lean, /def tBot : Charge := Articulating\.Corner\.active/u);
  assert.match(lean, /def kTop : Charge := Articulating\.Corner\.stable/u);

  assert.match(solidity, /function kBot\(\)[\s\S]*?return ofSlots\(false, false\);/u);
  assert.match(solidity, /function tTop\(\)[\s\S]*?return ofSlots\(true, false\);/u);
  assert.match(solidity, /function tBot\(\)[\s\S]*?return ofSlots\(false, true\);/u);
  assert.match(solidity, /function kTop\(\)[\s\S]*?return ofSlots\(true, true\);/u);
});
