/**
 * Present the one selected GitHub reconciliation CLI JSON result in the original
 * Computer Engineering Actions job summary. This is a typed source *consumer*:
 * it neither writes a second debt register nor receives Work/retirement authority.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { admitGitHubReconciliationSource } from "../../services/computer-systems-engineering-services-section/services/computer-code-development-system-services-section/services/github-reconciliation-service/src/source-report.mjs";

// Only link-display fallback remains here; Git identities and authority are admitted upstream.
const OID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const code = value => String.fromCharCode(96) + clean(value) + String.fromCharCode(96);
const clean = value => String(value ?? "unobserved")
  .replace(/[\x00-\x1f\x7f]/gu, "_")
  .replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;")
  .replace(/\x60/gu, "&#96;");
const commitLink = (repository, sha) => OID.test(sha ?? "")
  ? "[" + sha.slice(0, 12) + "](https://github.com/" + repository + "/commit/" + sha + ")"
  : "unobserved source commit";
const sourceCount = (report, field) => {
  const value = report[field];
  return Number.isSafeInteger(value) && value >= 0 ? value : "unobserved";
};
function preview(items, limit, format) {
  if (!items.length) return ["- None observed in this source category; this does not discharge Work"];
  return [
    ...items.slice(0, limit).map(format),
    ...(items.length > limit ? ["- " + (items.length - limit) + " more records in the original CLI JSON output"] : []),
  ];
}

/**
 * @param {object} report Original github-reconcile JSON stdout (not another store).
 * @param {{repository: string, limit?: number}} options The exact Actions repository scope.
 * @returns {string} GitHub Actions job-summary Markdown; no state change.
 */
export function renderGitHubSourceReceivingSummary(report,{repository,limit=12}={}) {
  if (!Number.isSafeInteger(limit) || limit<1 || limit>25)
    throw new TypeError("bounded source presentation limit must be 1..25");
  // The original provider owns type, ref, source-relationship and effect law.
  const {branchSources,pullSources,archiveSources,issueSources} =
    admitGitHubReconciliationSource(report,{repository});

  const lines = [
    "# Original GitHub source-receiving frontier (read-only)",
    "Repository: " + code(repository),
    "Observed branch source candidates: " + branchSources.length,
    "Open pull request sources awaiting receiving: " + pullSources.length,
    "Archive-tagged code sources still awaiting receiving: " + archiveSources.length,
    "Original open issue sources awaiting receiving: " + issueSources.length,
    "Source-equivalent history assessments: " + sourceCount(report, "equivalentCandidates"),
    "Qualified PR source-review candidates: " + sourceCount(report, "pullRequestsMergeable"),
    "Coverage is one repository, not the Group estate or the host runtime.",
    "## Branch source candidates (first " + limit + ")",
    ...preview(branchSources, limit, x => "- " + code(x.refName) +
      " — " + code(x.technicalClassification) + "; lineage " + code(x.sourceLineageRelation) +
      "; ahead " + clean(x.aheadCommitCount) + ", behind " + clean(x.behindCommitCount) +
      "; commit " + commitLink(repository, x.headCommitId) +
      (x.matchingArchiveRefNames.length ? "; matching archive refs: " + x.matchingArchiveRefNames.map(code).join(", ") : "") +
      (x.matchingOpenPullRequestNumbers.length
        ? "; exact PR source #" + x.matchingOpenPullRequestNumbers.join(", #") : "") +
      (x.unresolvedOpenPullRequestNumbers.length
        ? "; unresolved PR source #" + x.unresolvedOpenPullRequestNumbers.join(", #") : "")),
    "## Open PR proposals, including drafts and failed checks (first " + limit + ")",
    ...preview(pullSources, limit, x => "- [PR #" + x.pullRequestNumber +
      "](https://github.com/" + repository + "/pull/" + x.pullRequestNumber + ")" +
      " — " + code(x.technicalClassification) + "; checks " + code(x.checkEvidenceState) +
      "; base diff " + code(x.baseDifferenceCoverage) +
      "; head " + (x.sourceHeadRepositoryFullName === null
        ? code(x.sourceHeadCommitId) + " (head repository unobserved)"
        : commitLink(x.sourceHeadRepositoryFullName, x.sourceHeadCommitId)) +
      "; originating repository ID " + code(x.sourceHeadRepositoryId) +
      "; base " + commitLink(repository, x.sourceBaseCommitId)),
    "## Archive refs holding possibly unprocessed code (first " + limit + ")",
    ...preview(archiveSources, limit, x => "- " + code(x.refName) +
      " — " + code(x.technicalRelation) + "; Git object " + code(x.gitObjectId) +
      "; peeled commit " + commitLink(repository, x.peeledCommitId)),
    "## Open original issue sources (first " + limit + ")",
    ...preview(issueSources, limit, x => "- [Issue #" + x.issueNumber +
      "](https://github.com/" + repository + "/issues/" + x.issueNumber + ")" +
      " — provider revision " + code(x.issueUpdatedAt) +
      (x.closingKeywordMergedPullRequestUrl ? "; a PR keyword is not receiving" : "")),
    "Source equality, ancestry, green checks or tag names do not prove Work acceptance.",
    "Original Work and ordinary consumer receiving: NOT OBSERVED",
    "Automatic PR merge, issue closure, branch/tag retirement authority: NONE",
  ];
  return lines.join("\n") + "\n";
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new TypeError("exactly one original CLI JSON path required");
  const report = JSON.parse(readFileSync(process.argv[2], "utf8"));
  process.stdout.write(renderGitHubSourceReceivingSummary(report, {
    repository: process.env.GITHUB_REPOSITORY,
  }));
}
