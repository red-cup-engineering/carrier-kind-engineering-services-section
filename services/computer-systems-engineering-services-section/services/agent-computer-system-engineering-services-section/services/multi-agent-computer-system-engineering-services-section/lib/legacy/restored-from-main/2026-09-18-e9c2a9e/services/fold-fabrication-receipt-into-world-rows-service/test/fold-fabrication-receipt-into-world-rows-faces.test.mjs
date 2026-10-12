import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { foldFabricationReceiptIntoWorldRows } from "../scripts/fold-fabrication-receipt-into-world-rows.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "folds a canonically admitted flat creation receipt",
    "input": {
      "receipt": {
        "type": "JsnodeOperationPackageCreationReceipt",
        "version": 1,
        "packageName": "@a/b",
        "packageVersion": "0.1.0",
        "destination": "/x",
        "filesDigest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "files": [
          {
            "type": "TextFileMaterialization",
            "version": 1,
            "path": "scripts/a.mjs",
            "mode": 493,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
          }
        ],
        "assays": [
          {
            "type": "JsnodeOperationPackageAssay",
            "version": 1,
            "name": "syntax",
            "status": "passed"
          },
          {
            "type": "JsnodeOperationPackageAssay",
            "version": 1,
            "name": "the-rule",
            "status": "passed",
            "scripts": 1,
            "lines": 1
          },
          {
            "type": "JsnodeOperationPackageAssay",
            "version": 1,
            "name": "tests",
            "status": "passed",
            "paths": [
              "test/a.test.mjs"
            ]
          },
          {
            "type": "JsnodeOperationPackageAssay",
            "version": 1,
            "name": "pack",
            "status": "passed",
            "filename": "a.tgz",
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
          },
          {
            "type": "JsnodeOperationPackageAssay",
            "version": 1,
            "name": "clean-installation",
            "status": "passed",
            "javascriptFiles": 1,
            "reachableJavascriptFiles": 1
          },
          {
            "type": "JsnodeOperationPackageAssay",
            "version": 1,
            "name": "import-face",
            "status": "passed",
            "examples": 1
          },
          {
            "type": "JsnodeOperationPackageAssay",
            "version": 1,
            "name": "command-face",
            "status": "passed",
            "examples": 1
          },
          {
            "type": "JsnodeOperationPackageAssay",
            "version": 1,
            "name": "help",
            "status": "passed"
          }
        ]
      },
      "t": 0
    },
    "output": {
      "type": "WorldRowsFold",
      "version": 1,
      "address": "jsnode-operation-package:-giAi1xiLEdc7OtZFc2KGlwYeEvpd0blwMDauHH5zIc",
      "rows": [
        {
          "e": "jsnode-operation-package:-giAi1xiLEdc7OtZFc2KGlwYeEvpd0blwMDauHH5zIc",
          "a": "constituted",
          "v": {
            "name": "@a/b",
            "version": "0.1.0",
            "workOrder": null
          },
          "t": 0
        },
        {
          "e": "jsnode-operation-package:-giAi1xiLEdc7OtZFc2KGlwYeEvpd0blwMDauHH5zIc",
          "a": "files-digest",
          "v": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "t": 1
        },
        {
          "e": "jsnode-operation-package:-giAi1xiLEdc7OtZFc2KGlwYeEvpd0blwMDauHH5zIc",
          "a": "has-quality",
          "v": "fabricated-through-the-jsnode-line",
          "t": 2
        },
        {
          "e": "jsnode-operation-package:-giAi1xiLEdc7OtZFc2KGlwYeEvpd0blwMDauHH5zIc",
          "a": "assay-passed",
          "v": "syntax",
          "t": 3
        },
        {
          "e": "jsnode-operation-package:-giAi1xiLEdc7OtZFc2KGlwYeEvpd0blwMDauHH5zIc",
          "a": "assay-passed",
          "v": "the-rule",
          "t": 4
        },
        {
          "e": "jsnode-operation-package:-giAi1xiLEdc7OtZFc2KGlwYeEvpd0blwMDauHH5zIc",
          "a": "assay-passed",
          "v": "tests",
          "t": 5
        },
        {
          "e": "jsnode-operation-package:-giAi1xiLEdc7OtZFc2KGlwYeEvpd0blwMDauHH5zIc",
          "a": "assay-passed",
          "v": "pack",
          "t": 6
        },
        {
          "e": "jsnode-operation-package:-giAi1xiLEdc7OtZFc2KGlwYeEvpd0blwMDauHH5zIc",
          "a": "assay-passed",
          "v": "clean-installation",
          "t": 7
        },
        {
          "e": "jsnode-operation-package:-giAi1xiLEdc7OtZFc2KGlwYeEvpd0blwMDauHH5zIc",
          "a": "assay-passed",
          "v": "import-face",
          "t": 8
        },
        {
          "e": "jsnode-operation-package:-giAi1xiLEdc7OtZFc2KGlwYeEvpd0blwMDauHH5zIc",
          "a": "assay-passed",
          "v": "command-face",
          "t": 9
        },
        {
          "e": "jsnode-operation-package:-giAi1xiLEdc7OtZFc2KGlwYeEvpd0blwMDauHH5zIc",
          "a": "assay-passed",
          "v": "help",
          "t": 10
        }
      ]
    }
  }
];

test("refuses the historical creation-only face before it can produce rows", () => {
  assert.throws(() => foldFabricationReceiptIntoWorldRows(examples[0].input), (error) => error.code === "MISSING_REALIZATION_RECEIPT");
});
