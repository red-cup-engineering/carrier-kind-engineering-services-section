#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { put } from "@red-cup-engineering/semiotic-eavt-services-section/store";

/** This section's own root, the default store custody root (writes land at data/logs/, per house data-custody law). */
export const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The `561-group/services` directory both this section and gemini-services-section's ancestry sit under -- science-services-section and engineering-services-section are siblings there, so the finding's root is built from this shared ancestor, never a relative walk up through NODE_ROOT's own (unrelated) branch. Walked programmatically (never hand-counted "../.." segments) by climbing until the directory named "561-group" is the current basename, then descending one more level into its "services" child. */
function findFiveSixOneGroupServicesRoot(from) {
  let dir = from;
  while (dirname(dir) !== dir) {
    if (dir.split("/").pop() === "561-group") return resolve(dir, "services");
    dir = dirname(dir);
  }
  throw new Error(`no "561-group" ancestor directory found above ${from}`);
}
const FIVE_SIX_ONE_GROUP_SERVICES_ROOT = findFiveSixOneGroupServicesRoot(NODE_ROOT);

/** The nearest ancestor services-section carrying data/ above gemini-services-section, for the cross-section finding (org-layering.md: a section holds data/ only as a FAE root; gemini-services-section itself carries none). */
export const COMPUTER_INFERENCE_SYSTEM_ROOT = resolve(FIVE_SIX_ONE_GROUP_SERVICES_ROOT, "engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-inference-system-services-section");

/** The store type of the record. */
export const CAMPAIGN_TYPE = "verifier-honesty-campaign";

/** The journal category the verifier-honesty wedge campaign record is written and queried under. */
export const CAMPAIGN_CATEGORY = "linguistics.verifier-honesty-wedge-campaign";

/** The store type of the record. */
export const FINDING_TYPE = "custody-finding";

/** The journal category cross-section custody findings are written and queried under. */
export const FINDING_CATEGORY = "red-cup-engineering.custody-finding";

/**
 * Records the verifier-honesty wedge campaign (engine copula+verb-tagging fix,
 * postcondition backports across the five language fibers, Mandarin verb
 * allowlist, and the independent assay pass) into this section's own
 * store.
 * @param {object} record
 * @param {{dataRoot?: string, recordedAt?: string}} [options]
 * @returns {{id: string}} the address of the recorded record.
 */
export function recordCampaign(record, options = {}) {
  const dataRoot = resolve(options.dataRoot ?? NODE_ROOT);
  return { id: put(dataRoot, CAMPAIGN_TYPE, { category: CAMPAIGN_CATEGORY, ...record, at: options.recordedAt ?? new Date().toISOString() }) };
}

/**
 * Records a cross-section custody finding for another section's owner. Never
 * fixes the finding itself — this is observation only.
 * @param {object} record
 * @param {{dataRoot?: string, recordedAt?: string}} [options]
 * @returns {{id: string}} the address of the recorded record.
 */
export function recordCrossSectionFinding(record, options = {}) {
  const dataRoot = resolve(options.dataRoot ?? COMPUTER_INFERENCE_SYSTEM_ROOT);
  return { id: put(dataRoot, FINDING_TYPE, { category: FINDING_CATEGORY, ...record, at: options.recordedAt ?? new Date().toISOString() }) };
}

if (import.meta.main) {
  const recordedAt = new Date().toISOString();

  const campaignRecord = {
    event: "verifier-honesty-wedge-campaign",
    date: "2026-09-02",
    summary:
      "The engine's closedClassTags() floored any fiber-only copula to 'noun' instead of surfacing 'cop', and morphologyTags()/verbForm() never tagged an irregular or regular-3sg verb as 'verb' from bundle-declared morphology data. Both defects repaired in the engine, backported as a postcondition check (settled/totalObstructionBits, previously silently discarded) across all five language fibers, and closed for Mandarin specifically with a source-cited HSK 1-3 verb-stem allowlist. An independent assay pass then re-drove the published packages against the campaign's own named test sentences.",
    engineFix: {
      package: "@red-cup-engineering/communicating",
      fromVersion: "0.0.4",
      toVersion: "0.0.5",
      defect1: "closedClassTags() now checks the bundle's copula set after aux (aux keeps precedence); a word listed only as a fiber's copula now surfaces ['cop'] instead of flooring to ['noun'].",
      defect2: "morphologyTags()/verbForm() now tag 'verb' from morphology.irregularVerbs (bases + paradigm-form surface strings) and morphology.verbFormRules entries tagged '3sg'/'base', consulted before the regular verbFormRules fallback. No RawBundle contract change; purely additive.",
      testCounts: {
        baseline: "tests 70, pass 70, fail 0",
        postChange: "tests 78, pass 78, fail 0",
        freshInstall: "tests 78, pass 78, fail 0",
      },
    },
    postconditionBackports: [
      { package: "@lenticule-science/english-language-algebra", fromVersion: "0.1.5", toVersion: "0.1.6", note: "regular-3sg verbFormRules added (excludes -ous/-less/-ness), 'be'-forms split out of auxiliaries into copula-only.", testCounts: { baseline: "tests 24, pass 24, fail 0", postChange: "tests 28, pass 28, fail 0" } },
      { package: "@lenticule-science/lakota-language-algebra", fromVersion: "0.1.3 (published) / 0.1.4 (source, unpublished)", toVersion: "0.1.4", note: "checkedPostcondition() backported into lakota-die.mjs's invoke(), single-file CLI die shape preserved.", testCounts: { baseline: "tests 20, pass 20, fail 0", postChange: "tests 21, pass 21, fail 0", freshInstall: "tests 21, pass 21, fail 0" } },
      { package: "@lenticule-science/latin-language-algebra", fromVersion: "0.1.3 (published) / 0.1.4 (source, unpublished)", toVersion: "0.1.4", note: "checkedPostcondition() backported into latin-die.mjs's invoke(); solicit()/invoke() not exported, so verified via the real CLI subprocess.", testCounts: { baseline: "tests 20, pass 20, fail 0", postChange: "tests 21, pass 21, fail 0" } },
      { package: "@lenticule-science/tokipona-language-algebra", fromVersion: "0.1.3", toVersion: "0.1.4", note: "checkedPostcondition() backported into tokipona-die.mjs's invoke(), CLI/emit() transport shape unchanged.", testCounts: { baseline: "tests 18, pass 18, fail 0", postChange: "tests 19, pass 19, fail 0" } },
      { package: "@lenticule-science/mandarin-language-algebra", fromVersion: "0.1.0", toVersion: "0.1.1", note: "checkedPostcondition() backported into mandarin-die.mjs's invoke(); package's own pre-existing 'honest gap: 是 is a recognized copula but closedClassTags() never surfaces cop' test rewritten to assert the now-true fixed state.", testCounts: { baseline: "tests 27, pass 26, fail 1 (the stale copula honest-gap test)", postChange: "tests 28, pass 28, fail 0" } },
    ],
    mandarinVerbAllowlist: {
      package: "@lenticule-science/mandarin-language-algebra",
      fromVersion: "0.1.1",
      toVersion: "0.1.2",
      note: "172-entry source-cited HSK 1-3 verb-stem allowlist (content/wordlists/mandarin-verb-stems.json, drawn from drkameleon/complete-hsk-vocabulary, MIT) wired into morphology.rootPatternRules in both bundle.mjs and bundle.mts; one citation correction made before shipping (the 'v' POS tag traces to SUBTLEX-CH/HanLP per the dataset's own README, not CC-CEDICT as first written).",
      testCounts: { baseline: "tests 28, pass 27, fail 1 (stale honest-gap assertion contradicted by the already-wired allowlist)", postChange: "tests 30, pass 30, fail 0", freshInstall: "tests 30, pass 30, fail 0" },
    },
    redCupEngineeringTwin: {
      package: "@red-cup-engineering/communicating",
      fromVersion: "0.1.2",
      toVersion: "0.1.3",
      note: "Re-pinned its own dependency on the engine twin @red-cup-engineering/communicating 0.0.4 -> 0.0.5. The five downstream consumers (animating, computing, feltos, gaming, socializing) were left unrepinned per that lot's explicit instruction.",
      testCounts: { baseline: "tests 60, pass 60, fail 0", postChange: "tests 60, pass 60, fail 0" },
    },
    publishedVersions: [
      "@lenticule-science/communicating@0.0.5",
      "@lenticule-science/english-language-algebra@0.1.6",
      "@lenticule-science/lakota-language-algebra@0.1.4",
      "@lenticule-science/latin-language-algebra@0.1.4",
      "@lenticule-science/tokipona-language-algebra@0.1.4",
      "@lenticule-science/mandarin-language-algebra@0.1.1",
      "@lenticule-science/mandarin-language-algebra@0.1.2",
      "@red-cup-engineering/communicating@0.1.3",
    ],
    unrepinnedConsumers: [
      "gaming/computing/animating/feltos/socializing under @red-cup-engineering/communicating still pin its 0.1.2 (pre-repin), per that lot's own scope instruction",
      "emsenn-language-learning-services-section/lib/frontier pins @lenticule-science/mandarin-language-algebra@0.1.0, now two patches behind",
    ],
    independentAssay: {
      method: "A second pass re-drove each just-published package fresh-installed from the canonical registry against the campaign's own named test sentences, independent of the implementing lots' own test suites.",
      testCounts: {
        english: "tests 28, pass 28, fail 0, cancelled 0, skipped 0, todo 0 (@lenticule-science/english-language-algebra@0.1.6, fresh install from https://registry.561.group)",
        mandarin: "tests 30, pass 30, fail 0, cancelled 0, skipped 0, todo 0 (@lenticule-science/mandarin-language-algebra@0.1.2, fresh install from https://registry.561.group)",
      },
      gates: [
        { gate: "ENGLISH control -- 'The dog barked loudly.' stays clean", result: "PASS" },
        { gate: "ENGLISH 'The cat sat on the mat.' -- sat tags verb, nsubj arc, no spurious pp-attachment conflict", result: "PASS" },
        { gate: "ENGLISH 'She walks to the store.' -- walks tags verb, nsubj arc", result: "PASS" },
        { gate: "ENGLISH 'The cats chase the mouse.' -- the verb (chase) tags verb, nsubj arc forms", result: "FAIL", evidence: "'cats' (the subject) is tagged verb by the regular-3sg regex (plural -s collision); 'chase' (the true verb) floors to noun; no nsubj arc forms anywhere in the sentence." },
        { gate: "ENGLISH copula sentence -- 'is' surfaces 'cop'", result: "PASS", caveat: "Tag is correct but the sentence's own cohomology is not cleanly glued: h1:2, two unresolved obstructions, no arc ever connects is/loud into the parse." },
        { gate: "MANDARIN 喜欢 tags verb with a verb-anchored arc", result: "PASS" },
        { gate: "MANDARIN 你好吗 and 喜欢你我 no longer read identically in cohomology", result: "PASS" },
        { gate: "MANDARIN 是 surfaces cop", result: "PASS" },
        { gate: "MANDARIN 把-sentence: did the verb tag on 放 change/break the spurious backward pp-attachment walk?", result: "PASS", caveat: "The named backward-walk misattachment does appear resolved, but the same sentence still surfaces real, untested breakage: the subject 我 is fully disconnected from the parse; 书 gets contradictory nsubj+obl arcs to the same verb; 桌子 is wrongly split into 桌+子 because 上 is independently in the verb-stem allowlist and fires as a second predicate." },
        { gate: "ENGLISH fresh-install full test suite", result: "PASS", evidence: "17/17 lockfile URLs canonical; tests 28, pass 28, fail 0" },
        { gate: "MANDARIN fresh-install full test suite", result: "PASS", evidence: "17/17 lockfile URLs canonical; tests 30, pass 30, fail 0" },
      ],
      verdict:
        "Campaign claims mostly hold but do not fully clear the stated gates. Both packages install cleanly at the claimed versions, both correctly re-pin communicating@0.0.5, and both fresh-install test suites are genuinely green. Most named probes pass exactly as claimed. But 'The cats chase the mouse.' -- one of the four sentences the campaign named as required to now tag its verb and form an nsubj arc -- fails cleanly: the regular-3sg regex added to fix 'walks' also matches plural nouns ending in -s, so the subject is misclassified as the verb and the true verb floors to noun. This is not a corner case (plural subject + regular verb is the single most common English sentence shape) and it is invisible to the published test suite because no test covers that shape. The Mandarin 把-sentence gate passes on its literal wording but the same probe surfaces new, untested breakage (disconnected subject, contradictory arcs, a spurious noun split) caused by the same verb-stem allowlist that fixed it. Net: the engine-level defects named as this campaign's scope are genuinely fixed and test-verified; the downstream regular-verb-recognition fix introduces a real, unaddressed regression on plural subjects, and both fibers have real, untested breakage adjacent to the sentences the campaign chose to test.",
    },
    publishGate: "Every publish in this campaign followed the publish-package skill gate (registry liveness, fresh install with 0 non-canonical resolved URLs, version-availability check, tarball diff classified additive, npm pack --dry-run / prepack green, scratch-directory fresh-install verify against the canonical registry exercising the real fix). Verbatim per-publish receipts already landed in this section's data/logs/ under objectKind red-cup-engineering.package-publish-service-record during the implementing lots; this record is the campaign-level rollup, not a duplicate of those.",
  };

  const findingRecord = {
    event: "custody-finding",
    date: "2026-09-02",
    finding: "gemini-services-section/src/execute-sen-inference.mjs:15 still carries the banned urn:ame:* actor coinage in live shipped code.",
    evidence: "export const ACTOR = \"urn:ame:gemini-inference-team\";",
    file: "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-inference-system-services-section/services/gemini-services-section/src/execute-sen-inference.mjs",
    line: 15,
    context: "The urn:ame:* actor-ID coinage is the named-rejected pattern per working-discipline.md's ground-premise ruling (2026-08-31): 'the rushed urn:ame:* actor-ID coinage, rejected the day this premise was ruled.' A second live occurrence of the same pattern was independently noted 2026-09-01 in lakota-language-algebra's own src/lakota-die.mjs lines 14-15 (recorded in this section's scripts/record-nlnet-language-fiber-ratification.mjs preconditions) -- suggesting the coinage is not yet fully purged from shipped code across sections.",
    recordedBy: "linguistics-services-section, discovered while writing the verifier-honesty-wedge campaign receipt",
    disposition: "Finding only, per import-stratification.md / working-discipline.md custody law: 'a finding about another section's material is recorded as a finding, never fixed en passant.' Not fixed. computer-inference-system-services-section (nearest ancestor data/-carrying section above gemini-services-section) is this record's custody root so gemini-services-section's owner can find it.",
  };

  const skipCampaign = process.argv.includes("--finding-only");
  const campaignReceipt = skipCampaign ? undefined : recordCampaign(campaignRecord, { recordedAt });
  const findingReceipt = recordCrossSectionFinding(findingRecord, { recordedAt });

  process.stdout.write(`${JSON.stringify({ campaignReceipt, findingReceipt }, null, 2)}\n`);
}
