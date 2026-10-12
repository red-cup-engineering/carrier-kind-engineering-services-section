import assert from "node:assert/strict";
import test from "node:test";
import { bestStaffing, staffingFor, thompsonDraw } from "../src/work/staffing.mjs";

test("a draw is the same for the same decision and differs across decisions", () => {
  const draw = thompsonDraw("office|character|model|0|2026-10-12T12:00");
  assert.equal(draw(3, 5), thompsonDraw("office|character|model|0|2026-10-12T12:00")(3, 5));
  assert.notEqual(draw(3, 5), thompsonDraw("office|character|model|0|2026-10-12T12:01")(3, 5));
  for (const [accepted, attempts] of [[0, 0], [0, 4], [4, 4], [30, 40]]) {
    const acceptance = draw(accepted, attempts);
    assert.ok(acceptance > 0 && acceptance < 1, `${accepted}/${attempts} drew ${acceptance}`);
  }
});

test("draws centre on the posterior mean the staffing otherwise reads", () => {
  let total = 0;
  const trials = 400;
  for (let n = 0; n < trials; n += 1) total += thompsonDraw(`seed-${n}`)(8, 10);
  assert.ok(Math.abs(total / trials - 9 / 12) < 0.04, `mean ${total / trials}`);
});

test("staffing drawn from a posterior uses the draw as its acceptance, and none draws the mean", () => {
  const standing = new Map([["model-a", { accepted: 8, attempts: 10 }]]);
  const mean = staffingFor({ carrier: "model-a", standing });
  assert.equal(mean.acceptance, 9 / 12);
  const draw = thompsonDraw("decision");
  const drawn = staffingFor({ carrier: "model-a", standing, draw });
  assert.equal(drawn.acceptance, draw(8, 10));
  assert.equal(bestStaffing({ carriers: ["model-a"], standing, draw }).acceptance, drawn.acceptance);
});
