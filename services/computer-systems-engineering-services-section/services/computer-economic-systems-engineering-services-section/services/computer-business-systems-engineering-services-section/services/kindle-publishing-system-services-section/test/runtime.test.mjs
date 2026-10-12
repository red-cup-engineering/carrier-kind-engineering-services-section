import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readKindlePipelineConfig } from "../src/runtime.mjs";

test("pipeline configuration defaults byline adoption false and admits the versioned KDP capacity", async () => {
  const root = await mkdtemp(join(tmpdir(), "kindle-runtime-")), path = join(root, "pipeline.json");
  await writeFile(path, `${JSON.stringify({ dataRoot: "./data", contentRoot: "./books", customerActor: "fixture", categories: [], marketPolicy: {}, validationPrivateKey: "./private.pem", validationKeyId: "fixture", channelCapacity: { type: "ChannelCapacity", version: 1, channel: "kdp", newTitlesPerFormatPerWeek: 2, observedAt: "2026-09-21", source: "https://kdp.amazon.com/en_US/help/topic/G201857950" } })}\n`);
  const config = await readKindlePipelineConfig(path);
  assert.equal(config.bylineAdopted, false);
  assert.equal(config.channelCapacity.newTitlesPerFormatPerWeek, 2);
});
