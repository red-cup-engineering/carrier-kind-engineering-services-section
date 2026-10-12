---
title: Bounded source derivation and independent assessment for muse-assist
date-created: 2026-09-27
type: specification
status: derived LLD; operator-mediated realization using existing tools
derived-from: 2026-09-27-muse-assist-hld.md
derived-from-sha256: 5f824fb118e4cdfec8e23cc2f74e8aff667eff420d5e461ffb4c60b8ad57c6e9
---

## What this is

This LLD closes H-F2/H-F3's first source-derivation realization using existing inference and isolation tools, without adding a scheduler, gateway, generator framework, or application-specific fabricator. It governs an operator-mediated transformation from a closed fabrication order into a staged candidate and separately held acceptance evidence. It is a bounded first realization, not automation of the whole Customer Demand-to-code chain.

## Work-order and candidate carriers

**L-F01.** The admitted generation input MUST bind the predecessor chain, fabrication order, current transformation-input bytes/digests, public examples, output contract, model/configuration and invocation bounds. The input MUST exclude private assay source, fixtures, expected results and assessor conversation. A separate assessor MUST derive and commit the private assay inventory before source derivation starts. Commitment is a byte digest, not proof that the assay is sufficient.

**L-F02.** The first output contract is a closed JSON object with `disposition` (`candidate` or `refused`), `reason`, and `edits`. A refused result MUST have no edits and a specific reason. Each candidate edit MUST contain exactly `path`, `inputSha256`, `before`, `after`, and `clauses`. `path` identifies an admitted relative source file, `inputSha256` binds its original bytes, `before` is a nonempty exact substring occurring once at the point of application, `after` is replacement text, and `clauses` is a nonempty array of governing clause IDs. Multiple edits to a file apply in output order against one original input digest. Missing files, ambiguous text matches, path escape, mismatched input digest, unrecognized clause IDs, or extra object fields MUST refuse materialization. Candidate outputs are untrusted source until independently assessed.

The deterministic materializer applies only admitted textual replacements to a staged copy and computes full resulting file digests. This is a bounded codemod application, not behavioral source derivation. It MUST NOT execute generator-provided shell commands. New files require a separately specified creation contract; this first work order uses existing files. Actual transformed bytes, input/output digests and clause correspondence become the source-result evidence required by H-F2/F-H07.

## Generator access boundary

**L-F03.** The source provider MUST run in a fresh inference context with no inherited conversation, no assessor material, and no shared-checkout write access. For the first local realization, the existing Codex executable MAY be invoked noninteractively with the requested GPT-6 Luna model inside a Bubblewrap mount/PID namespace. The only task content is the public input packet delivered on standard input. The host checkout, assay directory, host process namespace, session history, user/project configuration, skills and connectors MUST NOT be mounted or otherwise supplied. The public output schema MAY be mounted read-only. Runtime libraries, TLS/DNS files and the existing authentication file may be made available solely to run the authenticated provider; authentication material MUST NOT be printed or placed in prompts.

The invocation MUST use a fresh ephemeral session, ignore user configuration and rules, disable shell, web search, apps and further agent delegation where the installed CLI supports those controls, and use a read-only model-command sandbox. External process isolation supplies the filesystem boundary; prompts and the CLI's read-only setting alone do not. Native tools which remain advertised cannot see the omitted mounts. The invocation MUST NOT resume this conversation or any previous source/assessor session. The actual argument vector, executable digest/version, public input digest, observed model and event record MUST be retained without credentials. Undeclared tool use, unexpected mounts, source input change, unavailable authentication/model, or source-provider access to assessor material MUST reject that invocation. No alternate model is silently substituted.

**L-F04.** Before live source generation, a deterministic process under the same mount profile MUST establish that the host checkout and an external sentinel cannot be read, that the process view is namespaced, and that only the intended task inputs are available. This demonstrates the local process boundary, not provider-server confidentiality or model correctness. The provider's own server retention/isolation remains a trust assumption and MUST be stated. The operator MUST NOT send private assay content through feedback, diagnostics or a resumed source session.

## Independent assessment and promotion

**L-F05.** The assessor MUST run the committed assays against the content-bound candidate, separately from the source provider. Executing candidate code MUST not give it a communication channel back to that provider or access to operational credentials/private user data. A network-denied execution namespace with only required runtime, dependency, candidate and assay inputs is the selected local assessment boundary. The assessor may inspect private results; the source generator receives only a separately admitted public reproduction or changed specification, never private fixtures or raw assay logs.

**L-F06.** The evidence bundle MUST contain specification/chain/input/candidate/assay digests, provider/model/configuration, invocation boundaries, method, environment, assessor, result, limits, and measured token/time/cost information where available. Missing cash-cost data MUST be marked unavailable rather than zero. Generic artifact receipts may reference this bundle by locator/digest; receipts do not prove acceptance. Failed candidates remain rejected. New evidence or revised specifications can justify a new candidate; an invisible edit after a failed assay cannot.

**L-F07.** Promotion MUST compare each original input digest with current shared-checkout bytes immediately before applying the accepted replacements. Any mismatch refuses the entire promotion batch and preserves both candidate and concurrent edits. All affected files must pass this check before any is replaced. Promotion MUST retain the accepted output digest and actual receiving-workflow evidence; staging checks do not establish public deployment or assistant operation.

## Implementations

The installed host currently has Bubblewrap and Codex CLI 0.154.0. A preliminary empty namespace probe could not see `/home/emsenn/info`; the complete invocation profile still requires L-F04's recorded check. The CLI's local help exposes ephemeral, ignored-user-config, output-schema and noninteractive execution. [Official configuration documentation](https://learn.chatgpt.com/docs/config-file/config-reference) defines the shell-tool switch; [noninteractive documentation](https://learn.chatgpt.com/docs/non-interactive-mode) describes the ephemeral invocation. These are invocation capabilities, not proof of assay independence or generated-code correctness.

The separately inspected ops inference route reported one configured `llama3.2:3b` provider with no admitted resource-availability observation. It was not invoked or substituted for the requested Luna source role. Its existence is not evidence of available capacity. The local invocation above uses existing tooling; no inference service is being repaired or reimplemented here.

## Open questions

- **L-FO1:** The first source invocation must establish actual model/authentication availability and record L-F04's complete boundary check. Failure preserves the closed order and assays; it does not authorize direct hand coding.
- **L-FO2:** Broader unattended generation, scheduler integration and automatic demand-to-design derivation are not supplied by this operator-mediated protocol. Any subsequent automation must preserve these contracts and receive its own specification before implementation.
