#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

const SECTION_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * One-off: record the honest multi-tenancy provisioning gap found in
 * FeltOS's MudServer (apps/feltos/src/mud-server.mjs) as a dated finding in
 * this section's own data/records/, through the house semantic record journal.
 * @returns {ReturnType<ReturnType<typeof createSemanticRecordJournal>["record"]>}
 */
export function recordMultiTenancyGapFinding() {
  const journal = createSemanticRecordJournal({
    root: resolve(SECTION_ROOT, "data", "records", "service-records", "world-hosting-gap-finding-journal"),
    objectKind: "world-hosting.multi-tenancy-gap-finding.record",
  });
  return journal.record({
    category: "multi-tenancy-provisioning-gap",
    recordedAt: new Date().toISOString(),
    charge: { support: true, refutation: false },
    record: {
      gap: "FeltOS's MudServer class (apps/feltos/src/mud-server.mjs lines 19-99) holds exactly one #engine private field, constructed once at line 31 (`this.#engine = engine ?? createEngine(game);`). There is no tenant-id/world-id namespacing anywhere in the file, no per-tenant port/route allocation, and no admin provisioning/deprovisioning API -- one MudServer instance serves exactly one world/game for its whole process lifetime.",
      roadmapItems: [
        "tenant registry + routing so many worlds share one listening process/port",
        "per-tenant resource quotas (CPU/memory/assertion-count ceilings per MudServer instance)",
        "billing/metering hook -- x402-services-section (1.4.0, Workers-native fetch payment boundary) is the natural primitive to wire later, not built in this pass",
        "backup/restore automation beyond the single snapshotWorld/checkpointWorld call this section already exercises",
        "admin dashboard for tenant lifecycle (create/suspend/delete)",
      ],
      deployTarget: "none of this runs on the laptop (checkout-is-not-a-runtime law). Target is cold-red-gate (already-paid VPS) or Cloudflare Durable Objects (free lane) as a future deploy, not built in this pass.",
    },
  });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "record-multi-tenancy-gap-finding", description: "One-off: record the honest multi-tenancy provisioning gap found in FeltOS's MudServer (apps/feltos/src/mud-server.mjs) as a dated finding in this section's own data/records/, through the house semantic record journal.", operation: recordMultiTenancyGapFinding }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
