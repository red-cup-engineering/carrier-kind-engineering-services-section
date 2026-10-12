import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const { processLeaseCoordinator } = await import(pathToFileURL(process.argv[2]));
const root = mkdtempSync(join(tmpdir(), "muse-coordination-observation-"));
try {
  const coordinate = processLeaseCoordinator(root);
  const operation = { ref: "fixture:effect" };
  const invocations = ["attempt-a", "attempt-b"].map(id => ({ id, arguments: { effectId: "same-effect" } }));
  const results = invocations.map(invocation => coordinate(invocation, operation, "2026-09-27T12:00:00.000Z"));
  console.log(JSON.stringify({ observation: "Two different invocations naming the same logical effect both obtain this process lease", accepted: results.map(r => r.ok), sameHolder: results[0].holder === results[1].holder, limitation: "Direct coordinator observation only; no provider, whole RPC workflow, crash, or disk durability was exercised" }, null, 2));
  if (!results.every(r => r.ok)) process.exitCode = 1;
} finally { rmSync(root, { recursive: true, force: true }); }
