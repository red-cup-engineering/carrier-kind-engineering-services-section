import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { provisionTenantWorkspace } from "../scripts/provision-tenant-workspace.mjs";

test("provisionTenantWorkspace: creates the tenant directory and an initial FeltOS world snapshot", async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), "world-hosting-test-"));
  try {
    const { plan, snapshot, receipt } = await provisionTenantWorkspace({
      tenantId: "test-tenant",
      tier: "Starter",
      dataRoot,
    });

    assert.ok(existsSync(plan.workspaceDirectory), "tenant workspace directory must exist");
    assert.ok(existsSync(plan.snapshotPath), "initial world snapshot file must exist");

    const written = JSON.parse(await readFile(plan.snapshotPath, "utf8"));
    assert.equal(written.kind, "feltos.world-snapshot.v1");
    assert.equal(written.sequence, 0);
    assert.equal(snapshot.kind, "feltos.world-snapshot.v1");

    assert.equal(typeof receipt.id, "string");
    assert.equal(receipt.objectKind, "world-hosting.tenant-provisioning.record");
  } finally {
    await rm(dataRoot, { recursive: true, force: true });
  }
});

test("provisionTenantWorkspace: rejects an unknown tier before touching disk", async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), "world-hosting-test-"));
  try {
    await assert.rejects(
      provisionTenantWorkspace({ tenantId: "test-tenant", tier: "Nope", dataRoot }),
      TypeError,
    );
    assert.ok(!existsSync(join(dataRoot, "tenants")), "no tenants directory should be created on a rejected plan");
  } finally {
    await rm(dataRoot, { recursive: true, force: true });
  }
});
