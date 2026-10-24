import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderGitHubSourceReceivingSummary as render } from "../.github/scripts/github-source-receiving-summary.mjs";

const repository = "red-cup-engineering/computer-engineering-services-section";
const id = 1425262050;
const sha = suffix => suffix.repeat(40);
const revision = "2026-10-24T17:00:00Z";
function originalReport() {
  const refName = "refs/tags/archive/agent/unreceived";
  return {
    applied: false, repositoriesObserved: 1, repositoriesFailed: 0, errors: [],
    archiveRefCoverage: "complete-for-observed-repositories",
    branchesDeleted: 0, branchesDeletable: 0, issuesClosed: 0, pullRequestsMerged: 0,
    equivalentCandidates: 2, pullRequestsMergeable: 1, originalPullsObserved:1, debtRecords: 4,
    branchSourceCandidateCount:1,
    archiveTagSourcesObserved: 1, originalIssuesObserved: 1,
    branchSourceCandidates: [{
      recordKind: "github.branch-source-reconciliation-candidate/v1",
      repositoryId: id, repositoryFullName: repository, refName: "refs/heads/codex/unreceived",
      headCommitId: sha("a"), technicalClassification: "unique-commits",
      sourceLineageRelation: "diverged", aheadCommitCount: 3, behindCommitCount: 2,
      matchingArchiveRefNames: [refName],
      automaticRefRetirementAllowed: false,
      originalWorkReceiving: "not-observed", ordinaryConsumerReceiving: "not-observed",
    }],
    pullSourceCandidates: [{
      recordKind:"github.pull-source-observation/v1",
      repositoryId:id,repositoryFullName:repository,pullRequestId:140519,pullRequestNumber:519,
      sourceHeadCommitId:sha("c"),sourceBaseCommitId:sha("d"),
      sourceHeadRepositoryFullName:repository,sourceHeadRefName:"refs/heads/fix/receive",
      sourceBaseRefName:"refs/heads/main",pullRequestUpdatedAt:revision,
      pullRequestState:"open",technicalClassification:"green-and-mergeable",
      checkEvidenceState:"passing",baseDifferenceCoverage:"complete",
      changedFileCount:3,sourceCoverage:"paged-current-open-github-pulls",
      originalWorkReceiving:"not-observed",ordinaryConsumerReceiving:"not-observed",
      automaticPullMergeAllowed:false,
    }],
    archiveRefSources: [{
      recordKind: "github.archive-ref-source-observation/v1",
      repository, repositoryId: id, refName,
      gitObjectId: sha("b"), peeledCommitId: sha("a"),
      technicalRelation: "divergent-source-history",
      independentReceivingRequired: true, automaticRefRetirementAllowed: false,
      originalIssueReceiving: "not-observed", originalConsumerReceiving: "not-observed",
    }],
    originalIssueSources: [{
      recordKind: "github.issue-source-observation/v1",
      repositoryId: id, repositoryFullName: repository,
      issueId: 140277, issueNumber: 277, issueUpdatedAt: revision, issueState: "open",
      closingKeywordMergedPullRequestUrl: null, automaticIssueClosureAllowed: false,
      originalWorkReceiving: "not-observed", ordinaryConsumerReceiving: "not-observed",
    }],
  };
}
const project = record => render(record, { repository });

test("the original branch, archive-tag and issue sources actually reach the job summary", () => {
  const markdown = project(originalReport());
  assert.match(markdown, /Observed branch source candidates: 1/u);
  assert.match(markdown, /Open pull request sources awaiting receiving: 1/u);
  assert.match(markdown, /PR #519/u);
  assert.match(markdown, /Archive-tagged code sources still awaiting receiving: 1/u);
  assert.match(markdown, /Original open issue sources awaiting receiving: 1/u);
  assert.match(markdown, /refs\/heads\/codex\/unreceived/u);
  assert.match(markdown, /refs\/tags\/archive\/agent\/unreceived/u);
  assert.match(markdown, /\[Issue #277\]\(https:\/\/github.com\/red-cup-engineering\/computer-engineering-services-section\/issues\/277\)/u);
  assert.match(markdown, /diverged/u);
  assert.match(markdown, /Source-equivalent history assessments: 2/u);
  assert.match(markdown, /Original Work and ordinary consumer receiving: NOT OBSERVED/u);
  assert.match(markdown, /Automatic PR merge, issue closure, branch\/tag retirement authority: NONE/u);
  assert.doesNotMatch(markdown, /branchesDeletable/u);
});

test("a second valid observed profile with no candidates does not claim the Work is complete", () => {
  const report = originalReport();
  report.branchSourceCandidates = [];
  report.branchSourceCandidateCount = 0;
  report.pullSourceCandidates = [];
  report.originalPullsObserved = 0;
  report.pullRequestsMergeable = 0;
  report.archiveRefSources = [];
  report.originalIssueSources = [];
  report.archiveTagSourcesObserved = 0;
  report.originalIssuesObserved = 0;
  const markdown = project(report);
  assert.match(markdown, /Observed branch source candidates: 0/u);
  assert.match(markdown, /None observed in this source category; this does not discharge Work/u);
});

test("unread GitHub comparison is a retained Work source, not unique-commits", () => {
  const report = originalReport();
  report.branchSourceCandidates[0].technicalClassification = "comparison-unavailable";
  report.branchSourceCandidates[0].sourceLineageRelation = "not-observed";
  report.branchSourceCandidates[0].aheadCommitCount = null;
  report.branchSourceCandidates[0].behindCommitCount = null;
  const result = project(report);
  assert.match(result, /comparison-unavailable/u);
  assert.match(result, /Original Work and ordinary consumer receiving: NOT OBSERVED/u);
});

test("tag-only noncommit original objects stay unresolved, never converted into accepted code", () => {
  const report = originalReport();
  report.branchSourceCandidates = [];
  report.branchSourceCandidateCount = 0;
  report.pullSourceCandidates = [];
  report.originalPullsObserved = 0;
  report.pullRequestsMergeable = 0;
  report.originalIssueSources = [];
  report.originalIssuesObserved = 0;
  report.archiveRefSources[0].gitObjectId = sha("b");
  report.archiveRefSources[0].peeledCommitId = null;
  report.archiveRefSources[0].technicalRelation = "noncommit-or-unpeeled-ref";
  const markdown = project(report);
  assert.match(markdown, /noncommit-or-unpeeled-ref/u);
  assert.match(markdown, /peeled commit unobserved source commit/u);
  assert.match(markdown, /retirement authority: NONE/u);
});

test("source absence, unknown record shape, changed authority, and foreign repo refuse", () => {
  for (const change of [
    r => { delete r.branchSourceCandidates; },
    r => { delete r.pullSourceCandidates; },
    r => { r.pullSourceCandidates[0].automaticPullMergeAllowed = true; },
    r => { r.pullSourceCandidates[0].recordKind = "generic-debt"; },
    r => { r.pullSourceCandidates[0].sourceHeadCommitId = "not-git-oid"; },
    r => { r.pullSourceCandidates[0].sourceHeadRepositoryFullName = "../outside"; },
    r => { r.pullSourceCandidates[0].pullRequestUpdatedAt = "not-a-revision"; },
    r => { r.originalPullsObserved = 0; },
    r => { r.pullRequestsMergeable = 0; },
    r => { r.branchSourceCandidateCount = 0; },
    r => { r.archiveRefSources = null; },
    r => { r.originalIssueSources[0].recordKind = "untyped"; },
    r => { r.branchSourceCandidates[0].originalWorkReceiving = "accepted"; },
    r => { r.branchSourceCandidates[0].automaticRefRetirementAllowed = true; },
    r => { r.archiveRefSources[0].independentReceivingRequired = false; },
    r => { r.originalIssueSources[0].automaticIssueClosureAllowed = true; },
    r => { r.originalIssueSources[0].repositoryFullName = "unrelated/project"; },
    r => { r.archiveRefSources[0].repositoryId = 999; },
    r => { r.branchSourceCandidates[0].sourceLineageRelation = "safe-to-delete"; },
    r => { r.applied = true; },
    r => { r.issuesClosed = 1; },
    r => { r.repositoriesFailed = 1; },
    r => { r.archiveRefCoverage = "incomplete"; },
    r => { r.errors = [{error:"unavailable"}]; },
    r => { r.originalIssuesObserved = 0; },
    r => { r.archiveTagSourcesObserved = 0; },
    r => { r.archiveRefSources[0].refName = "refs/tags/not-an-archive"; },
  ]) {
    const changed = originalReport();
    change(changed);
    assert.throws(() => project(changed));
  }
});

test("contradictory branch-tag receiving, duplicate issue identities and revision loss refuse", () => {
  for (const change of [
    r => { r.archiveRefSources = []; r.archiveTagSourcesObserved = 0; },
    r => { r.pullSourceCandidates.push({...r.pullSourceCandidates[0]}); r.originalPullsObserved=2; },
    r => { r.pullSourceCandidates[0].pullRequestNumber = r.originalIssueSources[0].issueNumber; },
    r => { r.pullSourceCandidates[0].technicalClassification = "safe-to-delete"; },
    r => { r.pullSourceCandidates[0].sourceHeadRefName = "refs/heads/../danger"; },
    r => { r.originalIssueSources.push({...r.originalIssueSources[0]}); r.originalIssuesObserved = 2; },
    r => { r.originalIssueSources[0].issueUpdatedAt = "not-a-revision"; },
    r => { r.branchSourceCandidates[0].headCommitId = "unknown"; },
  ]) {
    const changed = originalReport();
    change(changed);
    assert.throws(() => project(changed));
  }
});

test("bounded job summary retains the true issue denominator instead of silently truncating", () => {
  const report = originalReport();
  report.originalIssueSources = Array.from({length: 14}, (_, n) => ({
    ...report.originalIssueSources[0], issueId: 140277+n, issueNumber: 277+n,
  }));
  report.originalIssuesObserved = 14;
  const markdown = render(report, { repository, limit: 12 });
  assert.match(markdown, /Original open issue sources awaiting receiving: 14/u);
  assert.match(markdown, /2 more records in the original CLI JSON output/u);
  assert.doesNotMatch(markdown, /Issue #290/u);
  assert.throws(() => render(report,{repository,limit:1000}),/incomplete/u);
});

test("the original workflow selects the real consumer and its native tests, not a shadow JSON writer", () => {
  const workflow = readFileSync(new URL("../.github/workflows/github-reconcile-contained-branches.yml", import.meta.url), "utf8");
  assert.match(workflow, /node --test test\/github-source-receiving-summary\.test\.mjs/u);
  assert.match(workflow, /node \.github\/scripts\/github-source-receiving-summary\.mjs/u);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/u);
  // GitHub issues and combined commit statuses require their own read grants:
  // Pulls/checks/contents alone cannot qualify a private repository census.
  assert.match(workflow, /^      issues: read$/mu);
  assert.match(workflow, /^      statuses: read$/mu);
  assert.match(workflow, /^      checks: read$/mu);
  assert.match(workflow, /^      pull-requests: read$/mu);
  assert.doesNotMatch(workflow, /^\s+(?:contents|issues|statuses|pull-requests|checks): write$/mu);
  assert.doesNotMatch(workflow, /--register|--apply|branchesDeletable/u);
});

test("draft and unobserved-check PR source remains visible, never silently counted as zero",()=>{
  const record=originalReport();
  record.pullSourceCandidates[0].technicalClassification="draft";
  record.pullSourceCandidates[0].checkEvidenceState="unavailable";
  record.pullRequestsMergeable=0;
  const markdown=project(record);
  assert.match(markdown,/Open pull request sources awaiting receiving: 1/u);
  assert.match(markdown,/draft/u);
  assert.match(markdown,/checks.*unavailable/u);
  assert.match(markdown,/Automatic PR merge, issue closure, branch\/tag retirement authority: NONE/u);
});

test("typed PR count and presentation are bounded without claiming merge or source receiving",()=>{
  const record=originalReport();
  const example=record.pullSourceCandidates[0];
  record.pullSourceCandidates=Array.from({length:15},(_,i)=>({
    ...example,pullRequestId:140519+i,pullRequestNumber:519+i,
    technicalClassification:i%2?"checks-failing":"green-and-mergeable",
    checkEvidenceState:i%2?"failing":"passing"
  }));
  record.originalPullsObserved=15;
  record.pullRequestsMergeable=8;
  const out=project(record);
  assert.match(out,/Open pull request sources awaiting receiving: 15/u);
  assert.match(out,/3 more records in the original CLI JSON output/u);
  assert.doesNotMatch(out,/PR #533/u);
});
