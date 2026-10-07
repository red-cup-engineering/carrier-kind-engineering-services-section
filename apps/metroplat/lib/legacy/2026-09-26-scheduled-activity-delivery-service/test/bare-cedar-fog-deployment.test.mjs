import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runDue } from "../src/service.mjs";

const unitPath = fileURLToPath(new URL("../content/deployments/bare-cedar-fog/scheduled-activity-delivery-run-due.service", import.meta.url));
const unit = readFileSync(unitPath, "utf8");
const serviceRoot = dirname(dirname(dirname(dirname(unitPath))));

function findRepoRoot(from) {
  let dir = from;
  while (!existsSync(join(dir, "lib", "emsenn"))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error("no repository root found above the service directory");
    dir = parent;
  }
  return dir;
}

test("the bare-cedar-fog tick's WorkingDirectory names this service's actual current directory", () => {
  const repoRoot = findRepoRoot(serviceRoot);
  const expected = `%h/info/${relative(repoRoot, serviceRoot).split(sep).join("/")}`;
  const match = unit.match(/^WorkingDirectory=(.+)$/mu);
  assert.ok(match, "unit must declare a WorkingDirectory");
  assert.equal(match[1], expected);
  assert.ok(existsSync(join(repoRoot, relative(repoRoot, serviceRoot), "package.json")), "the declared WorkingDirectory must contain this service's package.json");
});

test("the installed tick opens its default durable journal before reading it", async () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "scheduled-activity-delivery-default-journal-"));
  try {
    const result = await runDue("2098-07-17T12:00:00.000Z", { dataRoot });
    assert.equal(result.type, "ScheduledDeliveryTickResult");
    assert.equal(result.attempted, 0);
    assert.deepEqual(result.pendingSettlements, []);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
