# A2A compatibility package

This restores the plain-Node `@red-cup-engineering/a2a-services-section` package consumed by FeltOS, preserving its eight public subpaths and existing protocol behavior. It includes the JSON-RPC client/server, signed Agent Card helpers, durable state stores and SEN/circuit parts. It does not use `@a2a-js/sdk`.

The original snapshot combined this executable package with a README describing a different, package-free SDK-based section. The original README is preserved under `provenance/original-README.md`; its statements are historical, not this package's installation contract. Source restoration does not activate a provider or grant an identity, credential, publication or deployment permission.

## Verification

Run `npm run check` and `npm test` from this directory after installing the exact compatible dependencies. The check visits every script and test file instead of passing several filenames to one `node --check` invocation.

## Publication prerequisites

The original workspace dependency contracts are preserved, except for the verified unused networking edge. Several required source versions are unpublished, while some same-name published versions expose different APIs. Explicit pins await compatible upstream release receipts. No lockfile or passing installation is claimed. Do not publish this package until its exact dependency closure and lockfile are received and the shared publication assay emits a valid artifact plan.
