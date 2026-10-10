import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { enterpriseWebConfig } from "../src/instance-config.mjs";

// The released tree is found by its workspace file above the instance declaration.
const release = mkdtempSync(join(tmpdir(), "google-sign-in-"));
writeFileSync(join(release, "pnpm-workspace.yaml"), "packages: []\n");

const installed = {
  identity: { id: "soft-grass-pebble.561.group", title: "Fixture colony" },
  applications: [], schedules: [], capabilities: [],
  web: { companions: [], networkSources: [] },
};
const settings = {
  METROPLAT_REPOSITORY_ROOT: "/not-a-live-repository",
  METROPLAT_WEB_STATE_DIR: "/not-a-live-state",
  METROPLAT_DATA_ROOT: "/not-a-live-data-root",
  PUBLIC_BASE_URL: "https://soft-grass-pebble.invalid",
  SESSION_SECRET: "fixture-only-not-a-secret",
};
const configure = (changes = {}) => enterpriseWebConfig(installed, join(release, "instance.json"), { ...settings, ...changes });

test("a node with no Google client starts with no Google provider", () => {
  assert.equal(configure().google, undefined);
  assert.equal(configure({ GOOGLE_CLIENT_ID: " ", GOOGLE_CLIENT_SECRET: "" }).google, undefined);
});

test("a node with a Google client carries both halves of it", () => {
  assert.deepEqual(configure({ GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: "secret" }).google,
    { clientId: "client", clientSecret: "secret" });
});

test("half a Google client is refused before any effect", () => {
  assert.throws(() => configure({ GOOGLE_CLIENT_ID: "client" }), /all-or-none; missing GOOGLE_CLIENT_SECRET/);
  assert.throws(() => configure({ GOOGLE_CLIENT_SECRET: "secret" }), /all-or-none; missing GOOGLE_CLIENT_ID/);
});
