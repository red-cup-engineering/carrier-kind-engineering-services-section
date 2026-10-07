# Standalone MetroPlat office-work plan

Date: 2026-09-30

Scope: `work-item:bare-cedar-fog-standalone-office-work-plan`

Planning evidence revision: `957612320a5f8b3cc7af0c8a05bfeb1a1f73e43f`

Source issue: [#26](https://github.com/emsenn/bare-cedar-fog/issues/26), including the corrected bootstrap permission in [comment 5902823042](https://github.com/emsenn/bare-cedar-fog/issues/26#issuecomment-5902823042). The source admission is `ni:///sha-256;-Bgy7t5_zu5NgrZEQ5oE1fd8tK_yt4MrGA-xkVy1YFI`; the canonical planning demand is `ni:///sha-256;ArWP007SaqGFKRqF85ojNqw9Bwv7zGruuO3qjZ99vnE`.

## Decision

Qualify one named installation, `hai-xudi-office-work`, for the effect this work needs: an authorized worker can discover its office duty, read the applicable knowledge and authority, perform bounded work, submit a result proposal, and have a distinct receiver review and discharge it. Preserve the signed roadmap and work-item evidence, office/account authority, session and harness identity, the proposal/receipt distinction, and the host's authored records.

Use MetroPlat's named-instance selection for the four operation-family surfaces `@red-cup-engineering/metroplat/lsp`, `/offices`, `/metroplex`, and `/capability-assertions`. Use only the existing FeltOS work exports required by the selected work lifecycle, initially allocation/readout, proposal, acceptance, and discharge operations. Resolve each actual export and import at the frozen revision; this list describes the capability boundary, not an authorization to copy every file in either application. Do not route the installation through MetroPlat's legacy all-family catalog or load unrelated domain families.

The carrier boundary is shared reusable source packages plus separate host-held content, agency/identity records, journals and authority state, and explicit host configuration. A full repository checkout is currently permitted as a local bootstrap. It is not evidence that a full checkout is the long-term source/data boundary, nor approval to migrate production, create identities, copy credentials, or federate authority. Keep secrets and machine-specific resources in host secret storage. Do not commit Hai Xudi's operational data or configuration to the shared source workspace.

## Evidence and limits

The allocation names `957612320a5f8b3cc7af0c8a05bfeb1a1f73e43f` as its required revision. Package counts and manifests below were read from that Git tree with `git show`, not inferred from the dirty working copy. The checkout has since advanced to `f0b9b149b77072dbd6085cc99d5a53a5525dadc1` and has unrelated concurrent modifications. Before extraction, freeze an explicit candidate revision and repeat the bounded audit against that exact tree; do not silently substitute current checkout state for the allocation revision.

At the planning revision, MetroPlat 0.9.0 declares 57 runtime and 2 development dependencies, exports source directly, and has no build script. FeltOS 0.18.3 declares 68 runtime dependencies. MetroPlat's instance loader selects operation sources from package exports, while its legacy loader can dynamically import many domain families. The named catalog provides the four surfaces above; trace the selected loader branches and exports instead of treating the whole legacy loader as required. The existing source audit tools can identify imports and package edges, but they do not establish all environment-dependent file reads or prove a runnable isolated installation.

An earlier broad manifest scan reported a partial closure of 166 package names and 29 unresolved names; it is not a certified closure for this installation or this revision. The issue also records cycles between MetroPlat and development-engine-related packages, 11 dynamic-only owners not proven removable, differing Node engine requirements (MetroPlat declares `>=22.18`, while nested packages require up to `>=24.2.0`), and source paths that assume repository layout. Treat these as open constraints. Do not remove an owner based on a package-name count or a static manifest edge alone.

## Work sequence

1. **Freeze and inventory the selected effect.** Record the candidate commit, lockfile, Node and package-manager versions. Trace the named instance's `operationSources` and each invoked export through the office, work, sign-roadmap, result-proposal, acceptance, and discharge paths. Include LSP, offices, metroplex and capability-assertion entrypoints only where the named installation uses them. Preserve current public package names and exports during qualification.
2. **Compute the bounded source and development closure.** Run the repository's existing workspace graph, module-topology, and source import-audit tools against that frozen tree and selected entrypoints. Reconcile each selected source import—including conditional and dynamic imports—with the declaring package and export target. Separately inspect only the selected code's filesystem, `process.env`, `cwd`, `.git` ancestry and subprocess reads; record every configured root/file it needs and replace ambient checkout assumptions with explicit instance/host roots as part of the later implementation. Include tests, fixtures, scripts and development-only imports that establish the same effect. Do not create a permanent analyzer for this work.
3. **Bound unresolved packages and cycles.** Emit the actual-path package list, missing import/export targets, and strongly connected components for the selected closure as audit evidence. Resolve missing targets at source, or retain them as explicit unresolved blockers; keep cyclic packages together as opaque closure groups unless path- and export-level evidence proves a safe cut. Retain dynamic-only owners until the selected loader path and fixture run prove they are not required. Do not claim standalone qualification while a selected import, file read, or fixture dependency is missing.
4. **Form the smallest source workspace.** In a later implementation change, assemble a source-only workspace containing exactly the qualified runtime packages and the development/test/fixture support needed to demonstrate this effect. Retain package boundaries and public exports initially, with its own workspace manifest and frozen lockfile. Keep source code and portable fixtures/contracts here; keep Hai Xudi authored content, authority, journals, runtime configuration and secrets on the host. Remove excluded machinery only after all consumers of the selected effect have been migrated and the same fixture path works without the old checkout.
5. **Qualify with fixtures before any host action.** Use temporary fixture agency roots, repository roots, instance records, journals and secret-free client configuration. Reject any test or smoke run that reads `/home/emsenn/info`, a developer home directory, a real Hai Xudi authority record, or a live credential. Run the candidate workspace's declared tests and then invoke the named installation's selected operations against the fixtures. Preserve exact admitted action and proposal evidence; verify that proposal creation does not itself constitute receiver acceptance or discharge. Do not use a live service, migrate production data, change identities, or interrupt active agents as part of this plan.
6. **Review the host boundary separately.** Only after fixture qualification, have the authorized host/CTO review explicit content, configuration, authority and secret locations and decide whether a separate host deployment is authorized. Bootstrap checkout permission does not satisfy this review or establish restart, installation, or federation acceptance.

## Hai Xudi provider contract to preserve

The first provider slice is one locally executed, already declared AOE Action from one admitted allocation. Its exact Action definition supplies the effect and acceptance condition. It receives no implied permission to perform adjacent work. The following is a proposed interface and state contract, not a set of live MetroPlat verbs:

| Proposed operation | Contract |
| --- | --- |
| Dispatch one Action | Accept the exact allocation commitment, Action identifier and admitted producer session. Before starting, resolve the Action's authorized operation/effect, declared working directory, readable and writable paths, resource limits, and dependency set. Refuse undeclared paths, capabilities, dependencies or host effects. Permit at most one active execution for that allocation/Action/session tuple. |
| Read execution status | Return the execution identifier, state, and any bounded progress/artifact references for that same tuple. Status reads perform no Action effects. |
| Cancel execution | Be idempotent. Linearize cancellation so no new Action effect starts after cancellation is recorded; signal the running local process to stop. Preserve partial artifacts in the host's designated custody area and mark the execution `interrupted`, never successful or accepted. A duplicate cancel returns the same state. |
| Return result | Return the execution record and artifacts for the same tuple. On retry, return the original execution/result rather than rerunning the Action. A completed result may be proposed for receipt; an interrupted result remains unaccepted and cannot satisfy the receiver condition. |

Use the explicit idempotency key `(allocation commitment, AOE Action identifier, exact admitted session identifier)`. A repeated dispatch with this key returns the original execution and result/artifact references; it does not repeat effects. Do not allow overlapping executions with the same key. Any resource/dependency change requires a newly authorized Action/allocation, not a changed retry.

The harness evidence must bind the producer to the exact session and record the session's reported model; the model label is evidence, not authority to expand the Action. Bind the exact Action, allocation, execution identifier/receipt, typed result proposal, and resulting `resultReceipt` through the same tuple. The producer's proposal never accepts or discharges itself. A separately authorized Sol CTO receiver evaluates the declared receiver condition against the exact Action, scope, execution and result evidence, then records acceptance/discharge. Process exit, artifact existence, successful transport, and producer attestation alone do not meet that condition.

This first slice excludes host administration, account or identity creation, credential management, authority changes outside the Action, federation, and production migration. Those operations are not part of the proposed provider interface. The plan task itself authorizes only this reviewable note and its proposal for independent receipt; it does not authorize implementing or running the provider.

## Fixture-only acceptance commands

Run these from the candidate source workspace after its package names and workspace manifest have been assembled. These commands are acceptance gates for the later implementation; they are not claims that the current checkout already passes them. Use only temporary fixture directories and secret-free fixture values:

```sh
pnpm install --frozen-lockfile
pnpm --filter @red-cup-engineering/metroplat test
pnpm --filter @red-cup-engineering/feltos test
env METROPLAT_AGENCY_ROOT="$FIXTURE_AGENCY_ROOT" \
    METROPLAT_REPOSITORY_ROOT="$FIXTURE_REPOSITORY_ROOT" \
    METROPLAT_NODE_CLIENT_ENV="$FIXTURE_CLIENT_ENV" \
    pnpm --filter @red-cup-engineering/metroplat exec node --test \
      test/agency-work-allocation.test.mjs \
      test/agency-work-delegated-standing.test.mjs \
      test/agency-work-provider.test.mjs \
      test/structured-work-intent.test.mjs
```

The fixture run must additionally exercise the named instance's actual selected exports (not just these package tests) through: read office and applicable authority; read the fixture roadmap/work item; submit one session-qualified proposal; inspect the proposal receipt; and demonstrate that only a separately authorized fixture receiver action accepts/discharges it. Record the exact command, selected exports, fixture paths, and outcome in the implementation's acceptance evidence. If current tests hard-code the original checkout or rely on omitted agency records, first migrate the necessary fixture and consumer behavior into the candidate workspace; do not point tests at the live repository to make them green.

## Completion boundary

This planning allocation is complete when this bounded note is published at its authorized path and its result is submitted with the exact admitted worker session for independent CTO receipt. That accepts the plan deliverable only. No standalone workspace, runtime, provider, host installation, deployment, or production migration has been implemented or qualified here. The later implementation remains unaccepted until the fixture behavior, dependency/file-read boundary, provider contract, and retirement conditions above are demonstrated and reviewed under a separately authorized work item.
