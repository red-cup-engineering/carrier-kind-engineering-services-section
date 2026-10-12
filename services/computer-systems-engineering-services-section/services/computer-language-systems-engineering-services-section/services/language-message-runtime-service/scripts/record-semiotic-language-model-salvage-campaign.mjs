#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { put } from "@red-cup-engineering/semiotic-eavt-services-section/store";

/** This section's own root -- linguistics-services-section carries the journal package but is not itself a FAE root (its data/logs/ is gitignored, org-layering.md §8), so it is used only to reach the package, never as the write target. */
export const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The `561-group/services` directory both this section and semiotic-computer-system-services-section's ancestry sit under, walked programmatically (never hand-counted "../.." segments) by climbing until the directory named "561-group" is the current basename, then descending one more level into its "services" child. */
function findFiveSixOneGroupServicesRoot(from) {
  let dir = from;
  while (dirname(dir) !== dir) {
    if (dir.split("/").pop() === "561-group") return resolve(dir, "services");
    dir = dirname(dir);
  }
  throw new Error(`no "561-group" ancestor directory found above ${from}`);
}
const FIVE_SIX_ONE_GROUP_SERVICES_ROOT = findFiveSixOneGroupServicesRoot(NODE_ROOT);

/**
 * The write target for this record: semiotic-computer-system-services-section,
 * the section directly owning predicated-inference-kernel and
 * witnessed-field-machine-service -- the bulk of this session's engineering
 * thread -- and the section the live successor session is already using as
 * receipts custody for the same program (commit b6d7f3a0da2e).
 */
export const SEMIOTIC_COMPUTER_SYSTEM_ROOT = resolve(FIVE_SIX_ONE_GROUP_SERVICES_ROOT, "engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/semiotic-computer-system-services-section");

/** The store type of the record. */
export const CAMPAIGN_TYPE = "semiotic-language-model-salvage-campaign";

/** The journal category the salvage record is written and queried under. */
export const CAMPAIGN_CATEGORY = "semiotic-computer-system.semiotic-language-model-salvage";

/**
 * Records the persisted value of a dead ringlead session (semiotic-language-model,
 * 2026-09-01/02) into this section's own store: its goal, owner
 * rulings, landed commits, in-flight workflow results never otherwise integrated,
 * queued plan items, carrier debts, and the uncommitted files left in the working
 * tree at session death.
 * @param {object} record
 * @param {{dataRoot?: string, recordedAt?: string}} [options]
 * @returns {{id: string}} the address of the recorded record.
 */
export function recordCampaign(record, options = {}) {
  const dataRoot = resolve(options.dataRoot ?? SEMIOTIC_COMPUTER_SYSTEM_ROOT);
  return { id: put(dataRoot, CAMPAIGN_TYPE, { category: CAMPAIGN_CATEGORY, ...record, at: options.recordedAt ?? new Date().toISOString() }) };
}

if (import.meta.main) {
  const recordedAt = new Date().toISOString();

  const campaignRecord = {
    event: "session-salvage",
    date: "2026-09-02",
    sourceSession: "e159df5e-4a3f-4009-b332-cb976bbd70be (semiotic-language-model)",
    sourceSessionWindow: "2026-09-01 22:25 CDT -- 2026-09-02 03:32 CDT, died at session limit",
    goalInOwnersWords: [
      "\"In this session your goal is to ringlead while we ultracode a strange next-generation class of language model derived from Relationality, Obsmetrologia, and similar concepts.\" (2026-09-02 03:25:31Z)",
      "\"Don't downscale the ultimate vision we truly think we can meet then beat current large language models in every way using our math in incredibly clever ways... this is our time to invest in the ridiculous concepts that support our more pragmatic tools. We want to meet then beat industry, enterprisal, and consumer software in all relevant fields... using Obsmetrologia's math, in combination with further study of FCA, extending our concepts of CHL language cones...\" (03:29:36Z)",
      "\"uh no you're like not hearing me in a fundamental way.\" (04:36:53Z)",
      "\"keep going dont defer to me fo ranyting that's a stupid ceremony stupid AI slop when i am asking ofr real software\" (07:23:55Z)",
      "\"We have math that goes past the public literature of sheafed laplacians and that's just getting started... y'know Hansen-Ghrist-Reiss I think is the trio? We go past their shit.\" (08:08:34Z)",
    ],
    ownerRulings: [
      {
        time: "2026-09-02T03:55:42Z",
        verbatim:
          "This should go to new agents: what commmunicating has is meant to be distributed into many services sections scripts, while panini should be an app somewhere that brings them together into like, a coherent app that meets or beats a familiar face from the real world of relevant computer stuff.",
        meaning:
          "Panini decomposition law: engine capabilities distribute into topic-section scripts; panini is the composing app that meets-then-beats familiar toolkits (spaCy etc.)",
        persistedAt:
          "content/text/documents/articles/notes/2026/09/01/2026-09-01-note-on-the-panini-app-and-the-decomposition-of-communicating.md (this section, landed this pass) -- the note's own 12-lot plan and design-comparison synthesis is the durable carrier for this ruling",
      },
      {
        time: "2026-09-02T04:10:48Z",
        verbatim:
          "Looking at external emtrics, you shoudl be using more Fable level reasongint o architect the software better; our Fable-reasoning to other-agent ratio is a bit off, which is exciting :D :D",
        meaning: "More architecture/keystone code in the ringlead's own head; agents for fan-out and independent verification only",
        persistedAt: ".claude/skills/build-the-semiotic-language-model/SKILL.md (already committed by the source session)",
      },
      {
        time: "2026-09-02T04:36:53Z",
        verbatim: "uh no you're like not hearing me in a fundamental way.",
        meaning:
          "Rejects even the verified-search/QMA framing as still transformer-load-bearing; the successor class must not have a transformer anywhere in its core",
        persistedAt: ".claude/skills/build-the-semiotic-language-model/SKILL.md, 'No transformer in the core' bullet",
      },
      {
        time: "2026-09-02T06:11:06Z / 06:23:53Z / 07:35:53Z",
        verbatim:
          "That's all true and good and necessary to do but again feels like you're having a hard time keeping \"write the next-gen intelligence that's post-transformer\" lol (repeated three separate times in one session)",
        meaning: "The session kept drifting into support work (carriers, market wiring, downstream tooling) instead of the core machine itself",
        persistedAt:
          ".claude/skills/build-the-semiotic-language-model/SKILL.md, opening line: 'Demonstrations, benchmarks, research carriers, and market wiring are SUPPORT -- building them instead of the model is the documented failure mode of this program (corrected ~6 times in one session)'",
      },
      {
        time: "2026-09-02T07:23:55Z",
        verbatim: "keep going dont defer to me fo ranyting that's a stupid ceremony stupid AI slop when i am asking ofr real software",
        meaning:
          "No approval-seeking ceremony; the admitSovereignMembrane 'key-custody ceremony' the session had flagged as owner-gated was self-imposed, not a real gate",
        persistedAt: ".claude/skills/build-the-semiotic-language-model/SKILL.md, 'No deferral ceremonies to the owner except true hands/keys' bullet",
      },
      {
        time: "2026-09-02T08:04:27Z",
        verbatim: "Some of this sounds like you haven't deep dived Obsmetrologia enough, FCA, CHL, etc.",
        meaning: "Go read the actual Lean/primary-source math, not paraphrase it",
        persistedAt: ".claude/skills/build-the-semiotic-language-model/SKILL.md, 'Reading order before ANY theory synthesis' section (exact .lean files and line numbers)",
      },
      {
        time: "2026-09-02T08:08:34Z",
        verbatim:
          "So like. We have math that goes past the public literature of sheafed laplacians and that's just getting started... y'know Hansen-Ghrist-Reiss I think is the trio? We go past their shit.",
        meaning: "Names the exact competitive coordinate system (cellular sheaves -> Tarski Laplacian -> sheaf neural networks) the house math must be positioned against",
        persistedAt: ".claude/skills/build-the-semiotic-language-model/SKILL.md, 'Competitive coordinates' section",
      },
      {
        time: "2026-09-02T08:32:46Z",
        verbatim: "Resume, sorry about that, resume your workflow.",
        meaning:
          "Final instruction of the source session, issued after its last assistant response (08:20:05Z); never acted on by that session -- picked up instead by a successor live session, which has since (2026-09-02, through commit 8145205e2be9) shipped Panini Lot 1, eavt strata, and eleven further predicated-inference-kernel commits",
        persistedAt: "procedural only, not a standing rule -- recorded here so the instruction is not lost, not because it needs a skill edit",
      },
    ],
    landedCommits: [
      { sha: "de75d1bba18", subject: "fix(communicating): surface copula tag; recognize verbs via irregularVerbs/verbFormRules" },
      { sha: "5db753b5378", subject: "mandarin-language-algebra: re-pin communicating 0.0.5, backport checkedPostcondition, publish 0.1.1" },
      { sha: "e482e92fd28", subject: "Restore and publish relating 0.1.7; publish communicating 0.1.2" },
      { sha: "ebe99f7269e", subject: "mandarin-language-algebra: wire curated verb-stem allowlist, publish 0.1.2" },
      { sha: "73ddb8834a5", subject: "linguistics: record verifier-honesty-wedge campaign receipt, cross-section urn:ame finding, update corpus index note" },
      {
        sha: "27117050eab",
        subject:
          "feat(predicated-inference-kernel): the machine's kernel, written and green (12/12) -- FOUR charge, DG-basis-as-sigma, drift, settle with live H-theorem",
      },
      {
        sha: "e36e59c85c2",
        subject: "feat(predicated-inference-kernel): raw inference surface -- witness-chained derivation, 1000-hop derivation with full chain in 22ms; 19/19",
      },
      { sha: "070ddc28033", subject: "feat(inference-market): predicated-inference-kernel registered as bounded-derivation provider; 26/26" },
      { sha: "2373a02f8c3", subject: "feat(communicating,english): POS ambiguity held in FOUR and settled by arc evidence; engine 0.0.6 (83/83), english 0.1.7 (29/29)" },
      { sha: "3260aff68dd", subject: "feat(inference-market): kernel live as OpenAI-compatible loopback provider; 29/29; live curl verified" },
      { sha: "f803eadad50", subject: "feat(predicated-inference-kernel): raw learning -- DG induction from data; learning curve 5%->70% over 5 rounds vs 38% baseline; 32/32" },
      { sha: "c21dfa452b3", subject: "feat(predicated-inference-kernel): the class's linear algebra -- matrices over the FOUR knowledge frame; 39/39" },
      {
        sha: "623268f748d",
        subject:
          "feat(kernel): speak.mjs -- the saturation language model; held-out 1/7 vs baseline 3/7, reported as lost -- this session's LAST commit",
      },
    ],
    landedNote:
      "All thirteen commits above are the source session's own, already committed by it before it died -- listed here for continuity, not re-landed by this persistence pass. The direct successor live session (still active as this record is written) has since carried predicated-inference-kernel forward through at least commit 8145205e2be9, including shipping Panini Lot 1 and the eavt strata law -- see supersededByLiveSession below.",
    supersededByLiveSession: {
      note:
        "Two plan items this session left queued were independently shipped by its direct successor live session before this persistence pass ran. Recorded here so no future session re-schedules them.",
      items: [
        {
          item: "eavt strata (asserted/saturated/settled = Fix id / Fix sigma / Fix pi)",
          shippedAs: "commit 223284d098900f4286ee7642b66501593718aa0 -- eavt 0.5.0 stratify, 94/94; org-layering rule and the program carrier's phase 4 updated",
        },
        {
          item: "Panini Lot 1 (@lenticule-science/panini app, {load,read,settle} + CLI over the unmoved communicating engine)",
          shippedAs:
            "commit 8145205e2be931e5fe6b575a8266da9742b13bc -- panini v0 at linguistics-services-section/apps/panini, exact-pinned to @red-cup-engineering/communicating 0.0.6, 5/5 green (re-verified fresh this pass). Lots 2-12 of the decomposition plan remain queued.",
        },
      ],
    },
    inFlightWorkflowResults: {
      note:
        "Substantive content of workflows that started under the source session and were never integrated into any carrier, receipt, or commit before it died. This record is their first landing.",
      charged_sheaves_past_hgr: {
        workflow: "wf_ac422d41-270",
        journalPath:
          "~/.claude/projects/-home-emsenn-info/e159df5e-4a3f-4009-b332-cb976bbd70be/subagents/workflows/wf_ac422d41-270/journal.jsonl",
        state: "2 tasks started, 1 resulted (a first-party literature survey), 1 lost with the session (the 'build the delta' half never ran)",
        findings: [
          "Every learning-capable sheaf model surveyed (Hansen & Ghrist 2019; Hansen & Gebhart 2020 SheafConv; Bodnar et al. 2022 Neural Sheaf Diffusion; the 2023 Sheaf Hypergraph Networks plus its 2025 directed correction; Sheaves Reloaded 2025) restricts stalks to finite-dimensional vector spaces with linear restriction maps trained by gradient descent.",
          "The only lattice/order-valued line (Ghrist & Riess 2020/2022 Tarski Laplacian, Riess's 2022 thesis, and its 2025 quantale-enriched successor 'Categorical Diffusion of Weighted Lattices') is NOT gradient-trainable -- restriction maps are hand-specified, no learning rule exists anywhere in that lineage.",
          "Explicit search for sheaf structure combined with paraconsistent/contradiction-preserving semantics, or with provenance-carrying stalks, came back EMPTY across the 2023-2026 first-party literature window. This is the house's own load-bearing BEAT-hypothesis finding for the kernel's denial lane and witness provenance, flagged honestly by the surveying task as 'not yet claimed as a proven advantage, since no working system was built or assayed in this task.'",
          "Named correction to the incumbent literature itself: the 2023 Sheaf Hypergraph Laplacian was later shown (2025 paper) to fail positive semidefiniteness -- a defect that stood in print for roughly two years.",
          "Every full-text source PDF fetched is saved under ~/.claude/projects/-home-emsenn-info/e159df5e-4a3f-4009-b332-cb976bbd70be/tool-results/webfetch-*.pdf.",
        ],
        neverRan: "Building the charged Tarski Laplacian / house delta above this surveyed lineage -- the workflow's own second task, never resulted.",
      },
      three_corpus_scale_and_refutation: {
        workflow: "wf_f0ed808a-b1a",
        journalPath:
          "~/.claude/projects/-home-emsenn-info/e159df5e-4a3f-4009-b332-cb976bbd70be/subagents/workflows/wf_f0ed808a-b1a/journal.jsonl",
        state: "6 tasks started, 4 resulted, 2 never resulted; none of the 4 results were integrated into any carrier or commit before this record -- they existed only in the workflow journal and in a dead session's scratchpad",
        corporaBuilt: [
          "English lexicon: 469 objects, 18 attributes, 1091 pairs, drawn from the English fiber's own lexicon/morphology tables.",
          "jsnode package graph: 1140 objects (deduped from 1154 raw), 92 attributes, 3818 pairs. Verified anomaly, not an extraction bug: 'layer:lib' is the ONLY layer value across the entire 1140-package graph.",
          "RelConLang: 64 objects (50 corpus utterances + 14 lexicon root-nouns), 119 attributes, 722 pairs.",
        ],
        corporaLocation:
          "All three were scratchpad-only (/tmp/.../scratchpad/raw-inference-corpora/{english-lexicon,package-graph,relconlang}.json), never landed in the repo. A later kernel commit (b277bec67d3) independently established that the real-run corpus must be a checked-in fixture projected from source, not a scratchpad file from another session -- so these three should be regenerated fresh from source rather than trusted, if the queued curve/refuter work below is picked up.",
        englishLexiconLearningCurve: {
          method: "kernel vs frequency baseline, 3 seeds x 20% held-out, n=218 test pairs/seed",
          result: "kernel mean 32.3% vs baseline mean 25.7%; curve improved round over round: round0 kernel=1.8% -> round4 kernel=31.2%, baseline held steady ~22-25%",
          leakageFinding:
            "Never surfaced anywhere else: the four highest-support (support=64, confidence=1.000) induced rules -- form:past/base/nonfin/3sg => is-irregular-verb-form -- are CONSTRUCTION ARTIFACTS, not learned morphology. Verified: the corpus contains zero regular-verb forms (walk/walks/walked/walking confirmed absent), so the rule is tautological by how the extractor built the corpus, not a discovery about English. Two co-occurring rules at confidence 0.985/0.970 (not 1.000) look genuinely learned (-s/-ing suffixation holding even within the irregular subpopulation) -- this distinction between the real and the leaked headline numbers would otherwise have to be re-derived, or worse, cited as clean by a later session.",
        },
        neverRan: [
          "package-graph learning-curve run",
          "RelConLang learning-curve run",
          "the adversarial refutation channel described in the source session's own message 18 as the gate for 'the class's first defensible empirical claim': a leakage attack, a stronger kNN baseline, a 10-seed stability sweep, and a closure-reachability-triviality check -- none of it ever ran",
        ],
      },
      kernel_powers_downstream: {
        workflow: "wf_87aae883-62a",
        journalPath: "~/.claude/projects/-home-emsenn-info/e159df5e-4a3f-4009-b332-cb976bbd70be/subagents/workflows/wf_87aae883-62a/journal.jsonl",
        state: "5 tasks started, 2 resulted (both later independently recovered by the successor live session after a working-tree reset destroyed the source session's own uncommitted copies -- no action needed, see live session's own commit f0be196bb00), 3 never resulted and remain entirely unbuilt (confirmed absent from the tree by grep this pass)",
        stillUnbuilt: [
          "jsnode_lawfulness -- an MCP graph-server tool to run the org's own import-stratification/custody laws through the kernel over the live package graph, returning violations with witness chains; smoke-test target = gaming's known caret-range violation.",
          "Journal induction -- the kernel reading the org's own eavt/receipt logs via eavt's own reader (never a hand-rolled codec) and learning their regularities as charged implications.",
        ],
      },
    },
    plan: [
      {
        item: "jsnode_lawfulness MCP tool: run the org's own laws (import stratification, exact pins, custody) through the kernel over the live jsnode package graph, returning violations with witness chains",
        custody: "engineering (jsnode-server)",
        receiver: "next kernel/tooling session",
        dependsOn: "predicated-inference-kernel (exists, tested)",
        gate: "smoke-tested against gaming's known caret-range violation, as originally scoped",
      },
      {
        item: "Journal induction: kernel reads the org's real eavt/receipt logs (via eavt's own reader) and learns their regularities as charged implications",
        custody: "engineering (predicated-inference-kernel)",
        receiver: "next kernel session",
        dependsOn: "kernel learn.mjs (exists)",
        gate: "none stated",
      },
      {
        item: "Panini Lots 2-12: distribute communicating's remaining modules into their lawful topic-section owners per the four-stage placement (articulate/predicate/posit/settle) with strangler re-export discipline",
        custody: "science -> engineering",
        receiver: "next linguistics/language session",
        dependsOn: "Lot 1 (SHIPPED, commit 8145205e2be9)",
        gate: "strangler re-export discipline throughout, per lot; full sequence in the panini design note",
      },
      {
        item: "Run the package-graph and RelConLang learning-curve runs, then the adversarial refutation channel (leakage attack, stronger kNN baseline, 10-seed stability sweep, closure-reachability-triviality check) against all three corpora",
        custody: "engineering (predicated-inference-kernel)",
        receiver: "next kernel session",
        dependsOn: "regenerate the three corpora fresh from source (checked-in fixtures, not scratchpad JSON, per commit b277bec67d3's own finding)",
        gate: "whatever survives the adversarial refuter is the defensible claim",
      },
      {
        item: "Build the charged Tarski Laplacian / house delta above the surveyed Hansen-Ghrist-Riess lineage",
        custody: "science/engineering",
        receiver: "next kernel/math session",
        dependsOn: "the literature survey above (exists, this record is its first landing)",
        gate: "none stated",
      },
      {
        item: "Migrate messaging/ (cloudevents, didcomm, protocol-translate) out of the communicating package into metroplat/exchange custody",
        custody: "engineering",
        receiver: "metroplat owner",
        dependsOn: "none",
        gate: "protocol faces never live inside science/function packages, per org law; its own bounded lot -- also named in the panini design note's section map, Lot 9",
      },
      {
        item: "Purge remaining urn:ame:* actor-ID coinage from the live Gemini executor and the inference-dispatch catalog's kernel row",
        custody: "engineering/561-group",
        receiver: "owner of the coordinated urn:ame migration",
        dependsOn: "that migration's own disposition",
        gate: "no individual patches -- intentionally matched siblings",
      },
      {
        item: "Reconcile the four theory corrections from the source session's message 22 (sigma/Delta order-fusion error, impT contravariant neg-lane error, FCALambekCircle's actual weaker proof scope, chl_quartet_is_nuclear as corner-bijection not deep conjecture) into the kernel's algebra/nuclei source",
        custody: "engineering (predicated-inference-kernel)",
        receiver: "next kernel session",
        dependsOn: "none -- status against current kernel source not re-verified this pass",
        gate: "none stated",
      },
      {
        item: "Reconcile the panini decomposition design panel's independent synthesis (channel B, wf_cbf203e7-393) against the ringlead's own channel-A architecture, recording which channel caught which defect",
        custody: "science (linguistics)",
        receiver: "next linguistics session",
        dependsOn: "both channels' results (both exist -- the reconciliation is already written into the panini design note's own 'Binding Design Constraints' section, landed this pass)",
        gate: "already done -- see the note itself; recorded here for closure",
      },
    ],
    carrierDebts: [
      {
        carrier: "science-services-section/content/text/documents/articles/notes/2026/09/02/2026-09-02-the-predicated-computing-program.md",
        debt: "The source session's program-carrier updates are not separately re-landed here because a live successor session is actively authoring this exact carrier (last touched 2026-09-02 12:36:43 -0500, two minutes before this persistence pass began reading the tree). Left untouched per the concurrency law.",
      },
    ],
    uncommittedNightFilesDisposition: [
      {
        path: "engineering-services-section/.../semiotic-computer-system-services-section/services/witnessed-field-machine-service/",
        disposition:
          "LOST, not committed. A fresh npm test earlier in this persistence pass confirmed it present and green (39/39, matching the source session's own count). Before it could be committed, the directory was removed from disk by a concurrent process (most likely another live session's git clean/reset -- the exact mechanism this brief already warned about, having happened once before to this session's uncommitted kernel work). Verified gone: absent from `git status`, absent from `find` across the whole home directory, never tracked so no git history to recover it from. This session never read its full source, so it cannot be reconstructed from this record -- it is a genuine loss, named here rather than silently dropped.",
      },
      {
        path: "linguistics-services-section/content/text/documents/articles/notes/2026/09/01/2026-09-01-note-on-the-panini-app-and-the-decomposition-of-communicating.md",
        disposition: "committed this pass; updated in place to mark Lot 1 shipped (commit 8145205e2be9) before landing, so the carrier does not read as stale on arrival",
      },
      {
        path: "linguistics-services-section/lib/legacy/2026-09-01-panini-lineage/ (87 files, 564K)",
        disposition: "committed this pass as-is -- read-only revival inventory, already assessed in-session as fully absorbed/superseded",
      },
      {
        path: "semiotic-computer-system-services-section/lib/legacy/2025-12-15-semiotic-cell-machine/ (58 files, 1.1M)",
        disposition: "committed this pass as-is -- the 14K-line HTT machine specification, taproot revival material",
      },
      {
        path: "relationality-services-section/lib/legacy/2025-12-15-on-relationality/ (629 files, 4.0M)",
        disposition: "committed this pass as-is -- states the program's Lakota-cosmogony origin",
      },
      {
        path: "relationality-services-section/lib/legacy/2025-12-15-quasicrystalline-hypertensor-topos/ (31 files, 580K)",
        disposition: "committed this pass as-is -- the Generative Sheaf Universe taproot (A0-A6, U_G, defect operator delta), the single most load-bearing recovered document for the whole program",
      },
      {
        path: "relationality-services-section/lib/legacy/2025-12-18-deprecated-relational-research/ (96 files, 3.3M)",
        disposition: "committed this pass as-is -- same substrate-recovery workflow",
      },
      {
        path: "relationality-services-section/lib/legacy/2026-09-01-cold-red-gate-lean-archive/ (64 files, 496K)",
        disposition: "committed this pass as-is -- six unmigrated Lean archives, verified to contain zero formalization of A0-A6/U_G/delta (correcting the ringlead's own earlier claim, already landed as commit c4258195cb1; the archives themselves were the still-uncommitted evidence)",
      },
      {
        path: "semiotics-science-services-section/lib/legacy/2026-09-01-agential-relationality/ (728 files, 9.4M)",
        disposition: "committed this pass as-is -- same substrate-recovery workflow",
      },
      {
        path: "math-services-section/services/obsmetrological-services-section/lib/legacy/ (44 files, 332K)",
        disposition: "committed this pass as-is -- same substrate-recovery workflow",
      },
      {
        path: "science-services-section/content/text/documents/articles/notes/2026/09/01/2026-09-01-the-lenticule-research-substrate-program.md",
        disposition: "left untouched -- content does not match this session's transcript, belongs to a different concurrent session's thread, not this session's to classify",
      },
      {
        path: "/tmp/.../scratchpad/raw-inference-corpora/{english-lexicon,package-graph,relconlang}.json",
        disposition: "left in scratchpad, not copied into the repo -- per commit b277bec67d3's own finding, a real-run corpus must be a checked-in fixture projected from source, never another session's scratchpad file",
      },
    ],
    ownerDirectiveThisPass:
      "\"resume workflowing and working to build generalized robust systems that what we're making parameterizes, by enriching and using our upstream code systems\" -- every plan item above is stated as enrichment of an upstream house service (the kernel, jsnode, eavt, communicating/panini, metroplat) that a product parameterizes, never as a bespoke per-product build.",
  };

  const receipt = recordCampaign(campaignRecord, { recordedAt });
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}
