/**
 * Present the one selected GitHub reconciliation CLI JSON result in the original
 * Computer Engineering Actions job summary. This is a typed source *consumer*:
 * it neither writes a second debt register nor receives Work/retirement authority.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const BRANCH_CLASSES = new Set(["contained-in-default", "unique-commits", "protected", "has-open-pull-request", "comparison-unavailable"]);
const LINEAGE = new Set(["diverged", "branch-ahead", "branch-behind", "identical", "not-observed"]);
const TAG_RELATIONS = new Set(["noncommit-or-unpeeled-ref", "same-base-commit", "source-history-contained-in-base", "source-history-ahead-of-base", "divergent-source-history"]);
const PULL_CLASSES = new Set([
  "green-and-mergeable","not-against-default","draft","mergeability-unknown",
  "conflicting","checks-unavailable","checks-failing","checks-pending",
  "no-checks","checks-inconclusive","same-files-changed-on-default",
  "base-difference-incomplete"
]);
const CHECK_STATES = new Set(["passing","failing","pending","none","inconclusive","unavailable"]);
const gitBranchRef = value => typeof value === "string" &&
  /^refs\/heads\/[A-Za-z0-9_][-A-Za-z0-9_./]*$/u.test(value) &&
  !/\.\.|@\{|\/\/|\/$|\.$|(?:^|\/)\.|\.lock(?:\/|$)/u.test(value);
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
function rows(report, field, kind, predicate) {
  const value = report[field];
  if (!Array.isArray(value) || value.some(item =>
    item === null || typeof item !== "object" || item.recordKind !== kind || !predicate(item)))
    throw new TypeError("missing or incompatible typed GitHub source: " + field);
  return value;
}
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
export function renderGitHubSourceReceivingSummary(report, { repository, limit = 12 } = {}) {
  if (!REPO.test(repository ?? "") ||
      !report || report.applied !== false ||
      report.repositoriesObserved !== 1 || report.repositoriesFailed !== 0 ||
      report.archiveRefCoverage !== "complete-for-observed-repositories" ||
      !Array.isArray(report.errors) || report.errors.length ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 25)
    throw new TypeError("original GitHub source result is incomplete, effectful or out of scope");

  // A source observer must never be able to market a GitHub mutation as its
  // own completed receiving. Keep the native, separately authorized receiver.
  if (report.branchesDeleted !== 0 || report.pullRequestsMerged !== 0 ||
      report.issuesClosed !== 0 || report.branchesDeletable !== 0)
    throw new TypeError("source-only consumer received an effectful reconciliation result");

  const branchSources = rows(report, "branchSourceCandidates", "github.branch-source-reconciliation-candidate/v1",
    x => x.repositoryFullName === repository && Number.isSafeInteger(x.repositoryId) && x.repositoryId > 0 &&
      typeof x.refName === "string" && x.refName.startsWith("refs/heads/") &&
      OID.test(x.headCommitId ?? "") && BRANCH_CLASSES.has(x.technicalClassification) &&
      LINEAGE.has(x.sourceLineageRelation) &&
      x.automaticRefRetirementAllowed === false &&
      x.originalWorkReceiving === "not-observed" && x.ordinaryConsumerReceiving === "not-observed" &&
      Array.isArray(x.matchingArchiveRefNames));
  const pullSources = rows(report, "pullSourceCandidates", "github.pull-source-observation/v1",
    x => x.repositoryFullName === repository && Number.isSafeInteger(x.repositoryId) && x.repositoryId > 0 &&
      Number.isSafeInteger(x.pullRequestId) && x.pullRequestId > 0 &&
      Number.isSafeInteger(x.pullRequestNumber) && x.pullRequestNumber > 0 &&
      OID.test(x.sourceHeadCommitId ?? "") && OID.test(x.sourceBaseCommitId ?? "") &&
      gitBranchRef(x.sourceHeadRefName) && gitBranchRef(x.sourceBaseRefName) &&
      (x.sourceHeadRepositoryFullName === null || REPO.test(x.sourceHeadRepositoryFullName ?? "")) &&
      x.pullRequestState === "open" && typeof x.pullRequestUpdatedAt === "string" &&
      Number.isFinite(Date.parse(x.pullRequestUpdatedAt)) &&
      (PULL_CLASSES.has(x.technicalClassification) || /^not-clean-[a-z-]{1,32}$/u.test(x.technicalClassification ?? "")) &&
      CHECK_STATES.has(x.checkEvidenceState) &&
      ["complete","incomplete"].includes(x.baseDifferenceCoverage) &&
      Number.isSafeInteger(x.changedFileCount) && x.changedFileCount >= 0 &&
      x.sourceCoverage === "paged-current-open-github-pulls" &&
      x.automaticPullMergeAllowed === false &&
      x.originalWorkReceiving === "not-observed" && x.ordinaryConsumerReceiving === "not-observed");
  const archiveSources = rows(report, "archiveRefSources", "github.archive-ref-source-observation/v1",
    x => x.repository === repository && Number.isSafeInteger(x.repositoryId) && x.repositoryId > 0 &&
      typeof x.refName === "string" && x.refName.startsWith("refs/tags/archive/") &&
      OID.test(x.gitObjectId ?? "") && (x.peeledCommitId === null || OID.test(x.peeledCommitId ?? "")) &&
      TAG_RELATIONS.has(x.technicalRelation) && x.automaticRefRetirementAllowed === false &&
      x.independentReceivingRequired === true &&
      x.originalIssueReceiving === "not-observed" && x.originalConsumerReceiving === "not-observed");
  const issueSources = rows(report, "originalIssueSources", "github.issue-source-observation/v1",
    x => x.repositoryFullName === repository && Number.isSafeInteger(x.repositoryId) && x.repositoryId > 0 &&
      Number.isSafeInteger(x.issueId) && x.issueId > 0 &&
      Number.isSafeInteger(x.issueNumber) && x.issueNumber > 0 &&
      x.issueState === "open" && Number.isFinite(Date.parse(x.issueUpdatedAt)) &&
      x.automaticIssueClosureAllowed === false &&
      x.originalWorkReceiving === "not-observed" && x.ordinaryConsumerReceiving === "not-observed");
  const identifiers = new Set([...branchSources, ...pullSources, ...archiveSources, ...issueSources].map(x => x.repositoryId));
  if (identifiers.size > 1 ||
      new Set(branchSources.map(x => x.refName)).size !== branchSources.length ||
      new Set(archiveSources.map(x => x.refName)).size !== archiveSources.length ||
      new Set(pullSources.map(x => x.pullRequestId)).size !== pullSources.length ||
      new Set(pullSources.map(x => x.pullRequestNumber)).size !== pullSources.length ||
      pullSources.some(x => issueSources.some(i => i.issueNumber === x.pullRequestNumber)) ||
      report.originalPullsObserved !== pullSources.length ||
      report.pullRequestsMergeable !== pullSources.filter(x => x.technicalClassification === "green-and-mergeable").length ||
      report.branchSourceCandidates !== branchSources.length ||
      new Set(issueSources.map(x => x.issueId)).size !== issueSources.length ||
      new Set(issueSources.map(x => x.issueNumber)).size !== issueSources.length ||
      branchSources.some(x => x.matchingArchiveRefNames.some(ref =>
        !archiveSources.some(t => t.refName === ref))) ||
      report.archiveTagSourcesObserved !== archiveSources.length ||
      report.originalIssuesObserved !== issueSources.length)
    throw new TypeError("contradictory original GitHub source identity, relationship or census counts");

  const lines = [
    "# Original GitHub source-receiving frontier (read-only)",
    "Repository: " + code(repository),
    "Observed branch source candidates: " + branchSources.length,
    "Open pull request sources awaiting receiving: " + pullSources.length,
    "Archive-tagged code sources still awaiting receiving: " + archiveSources.length,
    "Original open issue sources awaiting receiving: " + issueSources.length,
    "Source-equivalent history assessments: " + sourceCount(report, "equivalentCandidates"),
    "Qualified PR source-review candidates: " + sourceCount(report, "pullRequestsMergeable"),
    "Other original source/debt observations: " + sourceCount(report, "debtRecords"),
    "Coverage is one repository, not the Group estate or the host runtime.",
    "## Branch source candidates (first " + limit + ")",
    ...preview(branchSources, limit, x => "- " + code(x.refName) +
      " — " + code(x.technicalClassification) + "; lineage " + code(x.sourceLineageRelation) +
      "; ahead " + clean(x.aheadCommitCount) + ", behind " + clean(x.behindCommitCount) +
      "; commit " + commitLink(repository, x.headCommitId) +
      (x.matchingArchiveRefNames.length ? "; matching archive refs: " + x.matchingArchiveRefNames.map(code).join(", ") : "")),
    "## Open PR proposals, including drafts and failed checks (first " + limit + ")",
    ...preview(pullSources, limit, x => "- [PR #" + x.pullRequestNumber +
      "](https://github.com/" + repository + "/pull/" + x.pullRequestNumber + ")" +
      " — " + code(x.technicalClassification) + "; checks " + code(x.checkEvidenceState) +
      "; base diff " + code(x.baseDifferenceCoverage) +
      "; head " + commitLink(x.sourceHeadRepositoryFullName ?? repository, x.sourceHeadCommitId) +
      "; base " + commitLink(repository, x.sourceBaseCommitId) +
      (x.sourceHeadRepositoryFullName === null ? "; fork repository not independently observed" : "")),
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
