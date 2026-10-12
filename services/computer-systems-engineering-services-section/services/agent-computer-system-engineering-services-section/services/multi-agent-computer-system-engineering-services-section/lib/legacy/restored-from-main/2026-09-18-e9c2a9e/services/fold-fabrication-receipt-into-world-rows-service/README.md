# @red-cup-engineering/fold-fabrication-receipt-into-world-rows-service

Folds one canonically admitted fabrication receipt into the EAVT rows that constitute a born package and record its successful assays.

## Operation

~~~js
export function foldFabricationReceiptIntoWorldRows(request)
~~~

### Parameters

- request (object): A record with a flat or nested fabrication receipt and integer trace ordinal t.

### Returns

object: A WorldRowsFold record with type, version, address, and rows.

### Refusals

- TypeError: When the request has no receipt object, t is not an integer, or canonical creation-receipt admission refuses the selected receipt.

## Command

fold-fabrication-receipt-into-world-rows reads one JSON value per input line and writes one JSON value per output line.

## Examples

### folds a canonically admitted flat creation receipt

Input:

~~~json
{
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
}
~~~

Output:

~~~json
{
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
~~~
