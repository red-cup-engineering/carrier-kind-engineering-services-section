import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { COLD_RED_GATE_NODE } from "../src/service.mjs";

const unit = readFileSync(new URL("../content/deployments/cold-red-gate/scheduled-activity-delivery-run-due.service", import.meta.url), "utf8");

test("Cold Red Gate retains its explicit provider identity while keeping target configuration narrowly scoped", () => {
  assert.match(unit, /^Environment=SCHEDULED_ACTIVITY_DELIVERY_ACTOR=https:\/\/bare-cedar-fog\.561\.group\/actors\/cold-red-gate-scheduled-activity-delivery$/mu);
  assert.match(unit, /^EnvironmentFile=%h\/\.config\/emsenn\/scheduled-activity-delivery\.env$/mu);
  assert.doesNotMatch(unit, /^Environment=ACTIVITYPUB_/mu);
  assert.match(unit, /^Environment=SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST=KOIOS_NEWS_ROUTINE_PUBLICATION_JOB,KOIOS_NEWS_ROUTINE_PUBLICATION_QUEUE,KOIOS_NEWS_ROUTINE_PUBLICATION_AUTHORITY_KEYS,KOIOS_NEWS_ROUTINE_PUBLICATION_ASSESSMENT_KEYS,KOIOS_NEWS_ROUTINE_PUBLICATION_BASELINE_ROOT,KOIOS_NEWS_ROUTINE_PUBLICATION_OUTPUT_ROOT,KOIOS_NEWS_ROUTINE_PUBLICATION_REPLAY_ROOT$/mu);
});

test("Cold Red Gate admits only the fixed Koios routine configuration", () => {
  assert.match(unit, /^Environment=SCHEDULED_ACTIVITY_DELIVERY_TARGET_ENV_ALLOWLIST=KOIOS_NEWS_ROUTINE_PUBLICATION_JOB,KOIOS_NEWS_ROUTINE_PUBLICATION_QUEUE,KOIOS_NEWS_ROUTINE_PUBLICATION_AUTHORITY_KEYS,KOIOS_NEWS_ROUTINE_PUBLICATION_ASSESSMENT_KEYS,KOIOS_NEWS_ROUTINE_PUBLICATION_BASELINE_ROOT,KOIOS_NEWS_ROUTINE_PUBLICATION_OUTPUT_ROOT,KOIOS_NEWS_ROUTINE_PUBLICATION_REPLAY_ROOT$/mu);
});

test("Cold Red Gate binds the scheduler to its retained Guix Node closure", () => {
  assert.ok(unit.includes(`ExecStart=${COLD_RED_GATE_NODE} src/service.mjs --operation run-due\n`));
  assert.doesNotMatch(unit, /\.nvm\/versions\/node/u);
});
