import test from "node:test";
import assert from "node:assert/strict";
import {
  WORK_ORDER_TASK_CLASS, dischargeOfFabrication, duplicateCapabilityRefusal, formDutyWorkOrderDemand,
  isDuplicateRefusal, nameTakenRefusal, resolveSectionDirectory, sectionDirectoryNameOfDutyText, workOrderOfInferenceResult,
} from "../src/duty-work-order-demand.mjs";

const DUTY = { scope: "task:friction-missing-capability-x-1234", text: "x/scripts/a.mjs needed \"a thing\"", intent: "friction-report-1" };

test("formDutyWorkOrderDemand binds the duty, the dialect, and the output schema into one bounded demand", () => {
  const demand = formDutyWorkOrderDemand({ duty: DUTY, dialectExample: "# example\n## Requirements\n" });
  assert.match(demand.objective, /task:friction-missing-capability-x-1234/u);
  assert.match(demand.context, /## Duty\nx\/scripts\/a\.mjs needed/u);
  assert.match(demand.context, /## Admitted example/u);
  assert.equal(demand.taskClass, WORK_ORDER_TASK_CLASS);
  assert.equal(demand.outputSchema, undefined);
  assert.match(demand.objective, /Markdown document only/u);
  assert.equal(demand.workType, "inquiry");
  assert.ok(!demand.context.includes("Previous attempt"));
});

test("a refusal from the previous attempt is fed back verbatim as data", () => {
  const demand = formDutyWorkOrderDemand({ duty: DUTY, dialectExample: "# e", refusal: { code: "UNKNOWN_STRUCTURE", message: "m" } });
  assert.match(demand.context, /Previous attempt was refused.*\n\{"code":"UNKNOWN_STRUCTURE","message":"m"\}/u);
});

test("formDutyWorkOrderDemand refuses a duty without a scope and an empty dialect", () => {
  assert.throws(() => formDutyWorkOrderDemand({ duty: {}, dialectExample: "# e" }), /duty\.scope is required/u);
  assert.throws(() => formDutyWorkOrderDemand({ duty: DUTY, dialectExample: " " }), /dialectExample is required/u);
});

test("workOrderOfInferenceResult reads the work order from an object candidate, a JSON string, or bare Markdown", () => {
  assert.equal(workOrderOfInferenceResult({ candidate: { workOrder: "# a\nb" } }), "# a\nb");
  assert.equal(workOrderOfInferenceResult({ value: JSON.stringify({ workOrder: "# c" }) }), "# c");
  assert.equal(workOrderOfInferenceResult({ output: "# d\n## Requirements" }), "# d\n## Requirements");
  assert.equal(workOrderOfInferenceResult({ candidate: "```markdown\n# e\n## Requirements\n```" }), "# e\n## Requirements");
  assert.equal(workOrderOfInferenceResult({ outcome: "provider-refusal" }), null);
  assert.equal(workOrderOfInferenceResult(null), null);
});

test("dischargeOfFabrication names the package, the work order, and the registry as evidence", () => {
  const discharge = dischargeOfFabrication({
    duty: DUTY,
    receipt: { packageName: "@red-cup-engineering/a-service", packageVersion: "0.1.0", destination: "/d/services/a-service", registryPublication: { registry: "https://registry.561.group" } },
    producer: { id: "@red-cup-engineering/agent-work-computer-system-engineering-services-section", revision: "0.2.0" },
    workOrderPath: "/d/content/text/documents/specifications/a.md",
  });
  assert.equal(discharge.kind, "metroplat.work.discharge");
  assert.equal(discharge.id, `discharge-${DUTY.scope}`);
  assert.equal(discharge.intent, "friction-report-1");
  assert.deepEqual(discharge.evidence, [
    "work-order:/d/content/text/documents/specifications/a.md",
    "package:@red-cup-engineering/a-service@0.1.0",
    "destination:/d/services/a-service",
    "registry:https://registry.561.group",
  ]);
});

test("sectionDirectoryNameOfDutyText reads the leading directory name off a missing-capability duty's text", () => {
  assert.equal(sectionDirectoryNameOfDutyText("key-management-services-section/scripts/check-set-of-hardcoded-payment-receivers.mjs needed \"a check\""), "key-management-services-section");
  assert.equal(sectionDirectoryNameOfDutyText("x/scripts/a.mjs needed \"a thing\""), "x");
  assert.equal(sectionDirectoryNameOfDutyText("no shape here"), null);
  assert.equal(sectionDirectoryNameOfDutyText(undefined), null);
});

test("resolveSectionDirectory matches exactly one candidate by basename, and refuses on none or an ambiguous match", () => {
  const candidates = ["/lib/a/key-management-services-section", "/lib/b/roadmap-engineering-services-section"];
  assert.equal(resolveSectionDirectory("key-management-services-section", candidates), "/lib/a/key-management-services-section");
  assert.equal(resolveSectionDirectory("no-such-section", candidates), null);
  assert.equal(resolveSectionDirectory("key-management-services-section", [...candidates, "/lib/c/key-management-services-section"]), null);
  assert.equal(resolveSectionDirectory("", candidates), null);
  assert.equal(resolveSectionDirectory("key-management-services-section", null), null);
});

test("nameTakenRefusal and duplicateCapabilityRefusal carry the matching package names isDuplicateRefusal recognizes", () => {
  const taken = nameTakenRefusal({ packageName: "@red-cup-engineering/a-service", version: "0.4.0" });
  assert.equal(taken.code, "PACKAGE_NAME_TAKEN");
  assert.deepEqual(taken.matches, ["@red-cup-engineering/a-service"]);
  assert.ok(isDuplicateRefusal(taken));

  const duplicate = duplicateCapabilityRefusal(["@red-cup-engineering/existing-service"]);
  assert.equal(duplicate.code, "DUPLICATE_CAPABILITY");
  assert.deepEqual(duplicate.matches, ["@red-cup-engineering/existing-service"]);
  assert.ok(isDuplicateRefusal(duplicate));

  assert.equal(isDuplicateRefusal({ code: "UNKNOWN_STRUCTURE" }), false);
  assert.equal(isDuplicateRefusal(null), false);
});
