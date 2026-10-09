import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { enterpriseWebConfig } from "../src/instance-config.mjs";

// The released tree is found by its workspace file above the instance declaration.
const release = mkdtempSync(join(tmpdir(), "work-peer-presence-"));
writeFileSync(join(release, "pnpm-workspace.yaml"), "packages: []\n");

const installedWith = (web = {}) => ({
  identity: { id: "cold-red-gate.561.group", title: "Fixture node" },
  applications: [], schedules: [], capabilities: [],
  web: { companions: [], networkSources: [], ...web },
});
const settings = {
  METROPLAT_REPOSITORY_ROOT: "/not-a-live-repository",
  METROPLAT_WEB_STATE_DIR: "/not-a-live-state",
  METROPLAT_DATA_ROOT: "/not-a-live-data-root",
  PUBLIC_BASE_URL: "https://cold-red-gate.invalid",
  SESSION_SECRET: "fixture-only-not-a-secret",
  GOOGLE_CLIENT_ID: "fixture-client",
  GOOGLE_CLIENT_SECRET: "fixture-only-not-a-secret",
  ACTIVITYPUB_ORIGIN: "https://cold-red-gate.invalid",
  ACTIVITYPUB_NODE_HOST: "cold-red-gate",
  ACTIVITYPUB_INSTANCE_ACTOR_IDENTIFIER: "metroplat",
};
const PEER = "https://soft-grass-pebble.invalid/actors/metroplat";
const configure = (changes = {}, web = {}) => enterpriseWebConfig(installedWith(web), join(release, "instance.json"), { ...settings, ...changes });

test("a work peer is continuous unless it is declared known-intermittent", () => {
  assert.equal(configure({ METROPLAT_WORK_PEER_ACTOR: PEER }).workPeerPresence, "continuous");
  assert.equal(configure({}, { workPeerActor: PEER, workPeerPresence: "known-intermittent" }).workPeerPresence, "known-intermittent");
  assert.equal(configure({ METROPLAT_WORK_PEER_ACTOR: PEER, METROPLAT_WORK_PEER_PRESENCE: "known-intermittent" }).workPeerPresence, "known-intermittent");
  assert.equal(configure({ METROPLAT_WORK_PEER_PRESENCE: "continuous" }, { workPeerActor: PEER, workPeerPresence: "known-intermittent" }).workPeerPresence,
    "continuous", "the private environment wins over the host declaration, as it does for the peer itself");
});

test("a node with no work peer has no presence to read", () => {
  assert.equal(configure().workPeerPresence, undefined);
});

test("an unknown presence is refused before any effect", () => {
  assert.throws(() => configure({ METROPLAT_WORK_PEER_ACTOR: PEER, METROPLAT_WORK_PEER_PRESENCE: "sometimes" }), /must be one of continuous, known-intermittent/);
});
