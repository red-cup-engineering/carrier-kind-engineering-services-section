#!/usr/bin/env node
// Verification-pass correction append to the semiotic-language-model
// salvage record: real file counts (miscopied from the pre-strip brief)
// and two in-flight held-out-eval results the salvage record marked
// "neverRan" that actually completed with real numbers.
import { recordCampaign } from "./record-semiotic-language-model-salvage-campaign.mjs";

const recordedAt = new Date().toISOString();

const correctionRecord = {
  event: "session-salvage-verification-correction",
  date: "2026-09-02",
  sourceSession: "e159df5e-4a3f-4009-b332-cb976bbd70be (semiotic-language-model)",
  correctsRecord: "content.40b9d0852604edd82606448fa9f4e43a0f04ea89c64de1b9887c3bca178de792 (semiotic-computer-system.semiotic-language-model-salvage, recorded 2026-09-02T17:58:01.872Z, landed in commit b1a68b4d351)",
  fileCountsCorrection: {
    method: "git show --name-only --format='' <sha> | grep -c '<dir>/' against the actual commit content, run fresh this pass",
    note: "The salvage record's uncommittedNightFilesDisposition file counts were copied forward from the pre-.git-strip brief, not counted against what was actually committed. The commit's own diff totals (729 files in 7879cf39399, 713 in 3c09187d4b9, 31 in f65572d1aee, 31 in b1a68b4d351 minus 2 record files = 29) were not cross-checked at landing time.",
    corrected: [
      { path: "linguistics-services-section/lib/legacy/2026-09-01-panini-lineage/", recordClaimed: 87, actualCommitted: 31 },
      { path: "semiotic-computer-system-services-section/lib/legacy/2025-12-15-semiotic-cell-machine/", recordClaimed: 58, actualCommitted: 29 },
      { path: "relationality-services-section/lib/legacy/2025-12-15-on-relationality/", recordClaimed: 629, actualCommitted: 600 },
      { path: "relationality-services-section/lib/legacy/2025-12-15-quasicrystalline-hypertensor-topos/", recordClaimed: 31, actualCommitted: 2 },
      { path: "relationality-services-section/lib/legacy/2025-12-18-deprecated-relational-research/", recordClaimed: 96, actualCommitted: 63 },
      { path: "relationality-services-section/lib/legacy/2026-09-01-cold-red-gate-lean-archive/", recordClaimed: 64, actualCommitted: 64 },
      { path: "semiotics-science-services-section/lib/legacy/2026-09-01-agential-relationality/", recordClaimed: 728, actualCommitted: 698 },
      { path: "obsmetrological-services-section/lib/legacy/", recordClaimed: 44, actualCommitted: 15 },
    ],
  },
  inFlightWorkflowResultsCorrection: {
    workflow: "wf_f0ed808a-b1a",
    note: "The salvage record's three_corpus_scale_and_refutation.neverRan list named 'package-graph learning-curve run' and 'RelConLang learning-curve run' as never having run. True only of the 5-round adaptive learning-curve step (step 5); the held-out-eval step (step 4) completed for both corpora with real measured numbers, verbatim from the workflow transcripts, never landed anywhere until this correction.",
    packageGraphHeldOutEval: {
      corpus: "package-graph.json, 2907 known pairs, 726 test pairs per seed",
      method: "kernel (induced DG basis) vs frequency baseline, 20% held-out mask",
      seed1: { kernelHits: 396, kernelAccuracy: 0.5454545454545454, baselineHits: 364, baselineAccuracy: 0.5013774104683195 },
      seed2: { kernelHits: 392, kernelAccuracy: 0.5399449035812672, baselineHits: 346, baselineAccuracy: 0.4765840220385675 },
      seed3: "never ran -- the eval process hit its 580s timeout (EXIT:124) after seed 2",
      step5LearningCurve: "started in background (step5-curve.mjs) but the agent's transcript ends before any result; unrecoverable (source scratchpad no longer exists on disk)",
    },
    relconlangHeldOutEval: {
      corpus: "relconlang.json, 64 objects (50 utterances + 14 lexicon root-nouns), 119 attributes, 722 pairs",
      method: "kernel (induced DG basis, 482-implication basis) vs frequency baseline, 20% held-out mask, 3 seeds",
      seed1: { kernelHits: 32, testPairs: 144, kernelAccuracyPct: 22.2, baselineAccuracyPct: 18.8 },
      seed2: { kernelHits: 35, testPairs: 144, kernelAccuracyPct: 24.3, baselineAccuracyPct: 18.1 },
      seed3: { kernelHits: 34, testPairs: 144, kernelAccuracyPct: 23.6, baselineAccuracyPct: 19.4 },
      meanAcrossSeeds: { kernelAccuracyPct: 23.4, baselineAccuracyPct: 18.8 },
      step5LearningCurve: "started (5 rounds of induceBasis) but the background process was killed (exit code 137) before finishing; unrecoverable",
    },
    caveat: "Neither eval was regenerated from a checked-in fixture (commit b277bec67d3's own finding, already flagged in the salvage record) -- both corpora were scratchpad-only and no longer exist on disk. These numbers are reported as historical evidence of what the source session measured, not as a claim the kernel currently beats baseline on a reproducible checked-in corpus.",
  },
  verifiedBy: "independent verification pass over raw transcripts and workflow journals, not the persist agent's own brief",
};

const receipt = recordCampaign(correctionRecord, { recordedAt });
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
