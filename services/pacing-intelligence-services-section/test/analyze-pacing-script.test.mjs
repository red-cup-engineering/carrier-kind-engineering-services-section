import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyzePacingFile } from "../scripts/analyze-pacing.mjs";
import { observation } from "./fixtures/biometric-observations.mjs";

test("reads a JSON file of observations and returns analyzePacing's result", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pacing-intelligence-"));
  const file = join(dir, "observations.json");
  try {
    const observations = [observation({ metric: "resting-heart-rate", day: "2026-08-20", value: 58, unit: "{beats}/min" })];
    await writeFile(file, JSON.stringify({ observations, windowDays: 7 }));
    const result = await analyzePacingFile(file);
    assert.equal(result.restingHeartRate.latestValue, 58);
    assert.equal(result.windowDays, 7);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejects when the file does not exist", async () => {
  await assert.rejects(() => analyzePacingFile("/nonexistent/pacing-observations.json"));
});
