import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  normalizeInstant, computeAstronomyPositions, computeEquatorialPositions,
  computeAngularGeometry, admitAstronomyEventWindow, admitAstronomyPositionSeries,
} from "../src/index.mjs";
import { computePrecisionAstronomyPositions } from "../src/precision-provider.mjs";

test("admit supported calendar dates and explicit-offset instants without changing their meaning", () => {
  const cases = [
    ["2026-10-13", "2026-10-13T00:00:00.000Z"],
    [" 2026-10-13T12:34Z ", "2026-10-13T12:34:00.000Z"],
    ["2026-10-13T12:34:56.7Z", "2026-10-13T12:34:56.700Z"],
    ["2026-10-13T12:34:56.78Z", "2026-10-13T12:34:56.780Z"],
    ["2026-10-13T12:34:56.789Z", "2026-10-13T12:34:56.789Z"],
    ["2026-10-13T12:34:56.789123Z", "2026-10-13T12:34:56.789Z"],
    ["2026-10-13T12:34:56+0530", "2026-10-13T07:04:56.000Z"],
    ["2026-10-13T12:34:56z", "2026-10-13T12:34:56.000Z"],
    ["+002026-10-13T12:34:56Z", "2026-10-13T12:34:56.000Z"],
    ["+002026-10-13", "2026-10-13T00:00:00.000Z"],
    ["2026-10-13T00:15:00+05:30", "2026-10-12T18:45:00.000Z"],
    ["2026-10-13T23:45:00-03:30", "2026-10-14T03:15:00.000Z"],
    ["2000-02-29", "2000-02-29T00:00:00.000Z"],
    ["2024-02-29T12:00:00Z", "2024-02-29T12:00:00.000Z"],
  ];
  for (const [input, expected] of cases) assert.equal(normalizeInstant(input), expected, input);
  assert.deepEqual(computeAstronomyPositions("2026-10-13T06:30:00+05:30"),
    computeAstronomyPositions("2026-10-13T01:00:00Z"));
});

test("refuse rolled calendar dates, ambiguous wall times and unsupported leap seconds", () => {
  for (const input of [
    "2026-02-29", "2026-02-30", "1900-02-29", "1800-02-29",
    "2026-04-31T00:00:00+01:00", "2026-00-01", "2026-13-01", "2026-01-00", "2026-01-32",
    "2026-10-13T12:34:56", "2026-10-13T12:34", "2026-10-13T24:00:00Z",
    "2026-10-13T12:60:00Z", "2026-10-13T12:34:60Z", "2016-12-31T23:59:60Z",
    "2026-10-13T12:34:56+24:00", "2026-10-13T12:34:56+01:60", "2026-10-13T12:34:56+0160",
    "2026-10-13 12:34:56Z", "2026-10-13T12Z", "2026/10/13", "", " ",
    null, undefined, 2026, ["2026-10-13"], { toString: () => "2026-10-13" },
  ]) assert.throws(() => normalizeInstant(input), TypeError, String(input));
});

test("apply the scientific range to the UTC instant after a valid offset", () => {
  assert.equal(normalizeInstant("1799-12-31T23:00:00-01:00"), "1800-01-01T00:00:00.000Z");
  assert.equal(normalizeInstant("2051-01-01T00:30:00+01:00"), "2050-12-31T23:30:00.000Z");
  assert.throws(() => normalizeInstant("1800-01-01T00:30:00+01:00"), RangeError);
  assert.throws(() => normalizeInstant("2050-12-31T23:30:00-01:00"), RangeError);
});

test("normalization and refusal are identical across execution host timezones", () => {
  const moduleUrl = new URL("../src/astronomy-positions.mjs", import.meta.url).href;
  const script = `import { normalizeInstant } from ${JSON.stringify(moduleUrl)};
    console.log(JSON.stringify(["2026-10-13", "2026-10-13T12:00:00Z", "2026-10-13T08:00:00-04:00", "2026-10-13T12:00:00"].map(value => {
      try { return normalizeInstant(value); } catch (error) { return error.name; }
    })));`;
  const observations = ["UTC", "America/Chicago", "Pacific/Auckland"].map(TZ =>
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8", env: { ...process.env, TZ },
    }));
  assert.equal(new Set(observations).size, 1);
  assert.equal(JSON.parse(observations[0]).at(-1), "TypeError");
});

test("all existing astronomical products share refusal before numerical or supplier work", async () => {
  for (const input of ["2026-02-30", "2026-10-13T12:00:00"]) {
    assert.throws(() => computeAstronomyPositions(input), TypeError);
    assert.throws(() => computeEquatorialPositions(input), TypeError);
    assert.throws(() => computeAngularGeometry({ time: input }), TypeError);
    assert.throws(() => admitAstronomyEventWindow({ kind: "lunation-quarters", start: input, end: "2026-10-20" }), TypeError);
    assert.throws(() => admitAstronomyPositionSeries({ start: input, end: "2026-10-20", stepMinutes: 1440 }), TypeError);
    let supplierCalls = 0;
    await assert.rejects(() => computePrecisionAstronomyPositions(input, { latitude: 0, longitude: 0 }, {
      execute: async () => { supplierCalls += 1; throw new Error("must not reach supplier"); },
    }), TypeError);
    assert.equal(supplierCalls, 0);
  }
});
