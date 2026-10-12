#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { digest, induceVerifiedSoftwareMissionProposal, proposeFabricatedSoftwareChange } from "../src/becoming/doing/working/software-change/mission/agent-tools.mjs";
import { concludeSoftwareWork, proposeSoftwareWork } from "../src/becoming/doing/working/software-change/work-journal.mjs";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";

/**
 * Induces one verified mission proposal supplied on standard input.
 * @returns {void}
 * @throws {Error} When the receiver input is malformed or induction refuses.
 */
async function main() {
  const input = JSON.parse(readFileSync(0, "utf8"));
  if (input.action === "fabricate-modules") {
    const { fabricationOperations } = await import("@red-cup-engineering/computer-code-development-engine/fabrication/operations");
    const operations = fabricationOperations({ repositoryRoot: input.root }, { dependencyProjectRoot: input.root });
    const plan = await operations.find(operation => operation.verb === "fabrication-plan-jsnode-modules")
      .execute({workOrder: input.workOrder});
    const proposal = plan.type !== "JsnodeModuleFabricationPlan" ? plan
      : await proposeFabricatedSoftwareChange({ root: input.root, writablePaths: input.writablePaths, plan,
        fabricate: () => operations.find(operation => operation.verb === "fabrication-derive-jsnode-modules")
          .execute({workOrder: input.workOrder}) });
    process.stdout.write(`${JSON.stringify(proposal)}\n`);
    if (proposal.type !== "SoftwareMissionChangeProposal") process.exitCode = 1;
    return;
  }
  if (input.action !== undefined && input.action !== "receive") throw new TypeError("unknown source receiving action");
  let work;
  if (input.proposal?.sourceSnapshot !== undefined) {
    if (typeof input.journalPath !== "string" || !input.journalPath) throw new TypeError("source-bound receiving requires a journalPath");
    work = identifyJsonSemanticContent({ objectKind: "software-change.fabrication-receiving", value: {
      source: input.proposal.sourceSnapshot.id, proposal: input.proposal,
      root: input.root, writablePaths: input.writablePaths,
      verifyCommand: input.verifyCommand, acceptanceCommand: input.acceptanceCommand ?? input.verifyCommand,
    }, witnessRoot: EMPTY_WITNESS_ROOT }).id;
    await proposeSoftwareWork(input.journalPath, work, input.proposal);
  }
  const result = induceVerifiedSoftwareMissionProposal(input);
  if (work) {
    const outputs = input.proposal.changes.map(change => {
      const path=resolve(input.root,change.path),afterExisted=existsSync(path);
      if(afterExisted !== (change.afterExisted !== false))throw new Error(`receiver output existence changed during checks: ${change.path}`);
      const afterDigest = `sha256:${digest(afterExisted?readFileSync(path):Buffer.alloc(0))}`;
      if (afterDigest !== change.afterDigest) throw new Error(`receiver output changed during checks: ${change.path}`);
      return { path: change.path, afterExisted, afterDigest };
    });
    await concludeSoftwareWork(input.journalPath, work, "applied", { outputs, verification: result.verification, acceptance: result.acceptance });
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
