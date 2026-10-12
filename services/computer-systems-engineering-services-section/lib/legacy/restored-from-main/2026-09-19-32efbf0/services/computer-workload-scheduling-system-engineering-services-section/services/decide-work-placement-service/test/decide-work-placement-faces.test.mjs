import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { decideWorkPlacement } from "../scripts/decide-work-placement.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "no feasible work offer produces the typed refusal",
    "input": {
      "demand": {
        "type": "TypedWorkDemand",
        "id": "urn:demand:example",
        "taskClass": "bounded-work",
        "principal": "urn:actor:customer",
        "requiredCapabilities": [],
        "requiredQualityTiers": [],
        "requiredEffects": [],
        "requiredExecutionClasses": [
          "bounded-compute"
        ],
        "idempotence": "idempotent",
        "context": {
          "identity": "urn:context:one",
          "authorityScope": "urn:scope:one",
          "freshnessIdentity": "urn:freshness:one",
          "dataConstraints": [],
          "custodyConstraints": []
        },
        "outputContract": {
          "identity": "urn:output:one"
        },
        "measures": {},
        "routePolicy": {
          "preferenceOrder": [
            [
              "consideration"
            ],
            [
              "resources"
            ],
            [
              "latency"
            ],
            [
              "acceptance-probability"
            ]
          ],
          "considerationPreference": [],
          "considerationCeilings": [],
          "resourceCeilings": [],
          "reuse": "forbid",
          "unknownObservations": "choice-required"
        }
      },
      "offers": [],
      "observations": []
    },
    "output": {
      "type": "WorkPlacementRefusal",
      "version": 1,
      "disposition": "refused",
      "selected": null,
      "attemptPlan": [],
      "refusals": [],
      "rationale": [
        "exact-feasibility-produced-no-placement"
      ]
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await decideWorkPlacement(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/decide-work-placement.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
