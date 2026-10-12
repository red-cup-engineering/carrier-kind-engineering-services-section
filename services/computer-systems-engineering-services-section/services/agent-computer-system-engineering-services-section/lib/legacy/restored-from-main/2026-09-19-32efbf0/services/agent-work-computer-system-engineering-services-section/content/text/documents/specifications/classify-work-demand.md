# classify-work-demand
## Requirements
- `demand-record`: The operation returns a WorkDemand record naming the work item's skillful-work type and its attention lane, with the two nuclei and the evidence that closed or left open each nucleus.
- `parameterized-grammar`: The repair-script scope kinds, checker-recognized scope kinds, and gated friction kinds are parameters of the request with declared defaults, never constants hidden in the operation.
## Prohibitions
- `missing-scope-refusal`: The operation must refuse a request whose scope is not a non-empty string.
- `no-inference-from-prose`: The operation must not close a nucleus from prose alone; only a named scope kind, a script path, or a command gate in the text closes one.
## Laws
- `admitted-example-face-equivalence` | JSNode operation face-equivalence law | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-code-fabrication-services-section/services/javascript-node-code-fabrication-services-section/services/jsnode-package-services-section/README.md | Applies to the shared examples projected to the JSNode import and command faces. | Every admitted example has equivalent import and command outputs under the downstream JSNode face assay.
- `nuclear-quartet-work-types` | Skillful-work quartet (Nuclear Quartet Theorem) | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/agent-work-computer-system-engineering-services-section/content/text/documents/articles/specifications/skillful-work.md | Applies to the mapping from the two nuclei to the four work types. | Inquiry is the raw algebra, Procedure is Fix(sigma) meaning-closed, Derivation is Fix(delta) execution-closed, Process is both closed.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/classify-work-demand-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/classify-work-demand.mjs
#!/usr/bin/env node
/**
 * Reads one work item's skillful-work type and attention lane off the item itself.
 * @param {object} request A record with scope, optional text, and optional grammar parameters.
 * @returns {object} A WorkDemand record.
 * @throws {TypeError} When the scope is not a non-empty string.
 */
export function classifyWorkDemand(request) {
  if (typeof request?.scope !== "string" || request.scope.length === 0) throw new TypeError("scope is required");
  const repairScriptKinds = Array.isArray(request.repairScriptKinds) ? request.repairScriptKinds : ["exact-deps", "data-custody"];
  const recognizedKinds = Array.isArray(request.recognizedKinds) ? request.recognizedKinds : ["import-stratification", "checkout-bound-unit"];
  const gatedFrictionKinds = Array.isArray(request.gatedFrictionKinds) ? request.gatedFrictionKinds : ["command", "tool", "carrier-falsehood"];
  const text = typeof request.text === "string" ? request.text : "";
  const scope = request.scope;
  const kindOf = (kinds) => kinds.find((kind) => scope.startsWith(`task:${kind}-`)) ?? null;
  const repairScript = kindOf(repairScriptKinds);
  const recognized = kindOf(recognizedKinds);
  const gatedFriction = gatedFrictionKinds.find((kind) => scope.startsWith(`task:friction-${kind}-`)) ?? null;
  const scriptPath = /\bscripts\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\.(?:mjs|mts|sh)\b/u.exec(text);
  const commandGate = /\b(?:npm (?:test|run [a-z:-]+)|node --test|exit(?:s)? (?:0|1|2)|exit status)\b/u.exec(text);
  const evidence = [];
  let meaningClosed = false;
  let executionClosed = false;
  if (repairScript !== null) {
    meaningClosed = true;
    executionClosed = true;
    evidence.push(`scope owned by repair script ${repairScript}: sigma and delta closed`);
  } else if (recognized !== null) {
    meaningClosed = true;
    evidence.push(`checker-recognized scope ${recognized}: sigma closed by its finding schema`);
  } else if (gatedFriction !== null) {
    meaningClosed = true;
    evidence.push(`friction scope carries its own gate (${gatedFriction}): sigma closed`);
  }
  if (!executionClosed && scriptPath !== null) {
    executionClosed = true;
    evidence.push(`text names a script path: delta closed (${scriptPath[0]})`);
  }
  if (!meaningClosed && commandGate !== null) {
    meaningClosed = true;
    evidence.push(`text names a command gate: sigma closed (${commandGate[0]})`);
  }
  if (!meaningClosed) evidence.push("sigma open: no scope kind or command gate names the output");
  if (!executionClosed) evidence.push("delta open: no repair script or script path names the execution");
  const workType = meaningClosed ? (executionClosed ? "Process" : "Procedure") : (executionClosed ? "Derivation" : "Inquiry");
  const lane = { Process: "script", Derivation: "run-and-read", Procedure: "bounded-inference", Inquiry: "frontier" }[workType];
  return { type: "WorkDemand", scope, workType, lane, nuclei: { meaningClosed, executionClosed }, repairScript, evidence };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("classifyWorkDemand — Reads one work item's skillful-work type and attention lane off the item itself.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(classifyWorkDemand(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/classify-work-demand.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { classifyWorkDemand } from "../scripts/classify-work-demand.mjs";
test("a repair-script scope is a Process on the script lane", () => {
  const demand = classifyWorkDemand({ scope: "task:exact-deps-lib-x", text: "pin exact" });
  assert.equal(demand.workType, "Process");
  assert.equal(demand.lane, "script");
  assert.equal(demand.repairScript, "exact-deps");
});
test("a checker-recognized scope without a repair script is a Procedure under its gate", () => {
  assert.equal(classifyWorkDemand({ scope: "task:import-stratification-lib-z" }).lane, "bounded-inference");
});
test("a gated friction scope is a Procedure; a missing-capability friction with bare prose is an Inquiry", () => {
  assert.equal(classifyWorkDemand({ scope: "task:friction-command-abc", text: "it failed" }).workType, "Procedure");
  assert.equal(classifyWorkDemand({ scope: "task:friction-missing-capability-x", text: "decide" }).lane, "frontier");
});
test("a script path in the text closes delta only: Derivation, run-and-read", () => {
  const demand = classifyWorkDemand({ scope: "task:friction-missing-capability-x", text: "run scripts/publish-package.mjs and read the refusal" });
  assert.deepEqual(demand.nuclei, { meaningClosed: false, executionClosed: true });
  assert.equal(demand.lane, "run-and-read");
});
test("grammar parameters override the defaults", () => {
  assert.equal(classifyWorkDemand({ scope: "task:lint-fix-a", repairScriptKinds: ["lint-fix"] }).workType, "Process");
});
test("refuses a missing scope", () => assert.throws(() => classifyWorkDemand({ text: "x" }), /scope is required/u));
```
## Examples
```json name="repair-script scope is a Process"
{"input":{"scope":"task:data-custody-lib-y","text":"move data"},"output":{"type":"WorkDemand","scope":"task:data-custody-lib-y","workType":"Process","lane":"script","nuclei":{"meaningClosed":true,"executionClosed":true},"repairScript":"data-custody","evidence":["scope owned by repair script data-custody: sigma and delta closed"]}}
```
```json name="gated friction is a Procedure"
{"input":{"scope":"task:friction-tool-def","text":"it failed"},"output":{"type":"WorkDemand","scope":"task:friction-tool-def","workType":"Procedure","lane":"bounded-inference","nuclei":{"meaningClosed":true,"executionClosed":false},"repairScript":null,"evidence":["friction scope carries its own gate (tool): sigma closed","delta open: no repair script or script path names the execution"]}}
```
```json name="bare prose is an Inquiry"
{"input":{"scope":"task:friction-missing-capability-z","text":"decide whether the claim is true"},"output":{"type":"WorkDemand","scope":"task:friction-missing-capability-z","workType":"Inquiry","lane":"frontier","nuclei":{"meaningClosed":false,"executionClosed":false},"repairScript":null,"evidence":["sigma open: no scope kind or command gate names the output","delta open: no repair script or script path names the execution"]}}
```
## Traceability
- `demand-record` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `nuclear-quartet-work-types`, `node-esm-operation`
- `parameterized-grammar` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `missing-scope-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-inference-from-prose` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `nuclear-quartet-work-types`, `node-esm-operation`
