#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { createWorld, snapshotWorld } from "@red-cup-engineering/feltos";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { planTenantProvisioning } from "../src/world-hosting.mjs";

const OBJECT_KIND = "world-hosting.tenant-provisioning.record";

/**
 * Record a tenant-provisioning receipt through the house semantic record
 * journal, seated under the tenant's own dataRoot (never inside this checkout).
 * @param {string} dataRoot
 * @param {import("../src/world-hosting.mjs").TenantProvisioningPlan} plan
 * @param {object} snapshot - the FeltOS world snapshot written for this tenant
 * @returns {ReturnType<ReturnType<typeof createSemanticRecordJournal>["record"]>}
 */
function recordProvisioningReceipt(dataRoot, plan, snapshot) {
  const journal = createSemanticRecordJournal({
    root: join(dataRoot, "data", "records", "service-records", "world-hosting-provisioning-journal"),
    objectKind: OBJECT_KIND,
  });
  return journal.record({
    category: "tenant-workspace-provisioned",
    recordedAt: new Date().toISOString(),
    charge: { support: true, refutation: false },
    record: {
      tenantId: plan.tenantId,
      tier: plan.tier,
      workspaceDirectory: plan.workspaceDirectory,
      snapshotPath: plan.snapshotPath,
      worldKind: snapshot.kind,
      worldSequence: snapshot.sequence,
    },
  });
}

/**
 * Provision one tenant's hosted-world workspace: build the plan, create its
 * namespaced directory under dataRoot, initialize a fresh FeltOS world, write
 * its initial snapshot, and journal a provisioning receipt.
 * @param {Object} input
 * @param {string} input.tenantId
 * @param {string} input.tier
 * @param {string} input.dataRoot - absolute path the caller owns
 * @returns {Promise<{plan: import("../src/world-hosting.mjs").TenantProvisioningPlan, snapshot: object, receipt: object}>}
 */
export async function provisionTenantWorkspace({ tenantId, tier, dataRoot }) {
  const plan = planTenantProvisioning({ tenantId, tier, dataRoot });
  await mkdir(plan.workspaceDirectory, { recursive: true });
  const snapshot = snapshotWorld(createWorld());
  await writeFile(plan.snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  const receipt = recordProvisioningReceipt(dataRoot, plan, snapshot);
  return { plan, snapshot, receipt };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({
    options: {
      tenant: { type: "string" },
      tier: { type: "string" },
      "data-root": { type: "string" },
    },
  });
  if (!values.tenant || !values.tier || !values["data-root"]) {
    console.error("usage: provision-tenant-workspace.mjs --tenant <id> --tier <name> --data-root <absolute-path>");
    process.exitCode = 2;
  } else {
    try {
      const result = await provisionTenantWorkspace({ tenantId: values.tenant, tier: values.tier, dataRoot: values["data-root"] });
      process.stdout.write(`${JSON.stringify({ plan: result.plan, receiptId: result.receipt.id }, null, 2)}\n`);
    } catch (error) {
      console.error(`error: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
