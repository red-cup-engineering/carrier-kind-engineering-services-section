import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
export const FORBIDDEN_GITHUB_REPOSITORIES = Object.freeze(new Set(["emsenn/561-group"]));

export function repositoryName(value) {
  if (typeof value !== "string" || !repositoryPattern.test(value)) throw new TypeError("repository must be owner/name");
  const normalized = value.toLowerCase();
  if (FORBIDDEN_GITHUB_REPOSITORIES.has(normalized)) {
    throw new TypeError(`GitHub intake: repository ${normalized} is forbidden noncanonical drift`);
  }
  return normalized;
}

/** An issue's stable locator, which every revision of its report cites as its source. */
export function githubIssueUrl(repository, number) {
  repository = repositoryName(repository);
  if (!Number.isSafeInteger(number) || number < 1) throw new TypeError("invalid GitHub issue number");
  return `https://github.com/${repository}/issues/${number}`;
}

/**
 * A GitHub issue as what it is on the work board: a report, an observation someone made, not a
 * request anyone has promised. The condition it reports is that the issue stands open, so its law is
 * `github-issue-open` and its subject the issue's locator: every revision is the same thread, and
 * reporting it again corroborates it (reopening it if it had been resolved). Its title is the
 * observation (one finding, bounded by the arena's statement law) and its body the context, cut
 * where the law bounds it, since the whole snapshot is committed in its source; its labels, as
 * slugs, are tags; its comments and the snapshot's commitment are evidence. Source content grants
 * neither office authority nor execution.
 */
export function reportOfGitHubIssue(repository, issue, comments) {
  repository = repositoryName(repository);
  const url = githubIssueUrl(repository, issue.number);
  const snapshot = {
    repository, number: issue.number, id: issue.node_id, url,
    title: issue.title, body: issue.body ?? "", author: issue.user?.login,
    state: issue.state, stateReason: issue.state_reason ?? null, updatedAt: issue.updated_at,
    labels: (issue.labels ?? []).map((label) => typeof label === "string" ? label : label.name).sort(),
    comments: comments.map((comment) => ({ id: comment.node_id, url: comment.html_url,
      author: comment.user?.login, body: comment.body ?? "", updatedAt: comment.updated_at })),
  };
  if (typeof snapshot.title !== "string" || !["open", "closed"].includes(snapshot.state)) throw new TypeError("invalid GitHub report");
  const commitment = hash(JSON.stringify(snapshot));
  return Object.freeze({
    snapshot,
    report: Object.freeze({
      move: "report",
      law: GITHUB_ISSUE_LAW,
      subject: url,
      observation: bounded(snapshot.title.trim() || url, FINDING_LIMIT),
      ...(snapshot.body.trim() ? { context: bounded(snapshot.body.trim(), CONTEXT_LIMIT) } : {}),
      evidence: [url, ...snapshot.comments.map((comment) => comment.url).filter(Boolean), commitment],
      tags: [...new Set(["github-issue", ...snapshot.labels.map(tagOf).filter(Boolean)])],
      sources: [{ kind: "github-issue", locator: url, commitment }],
    }),
  });
}

// The work arena's statement bounds (organizing STATEMENT_LIMITS: a finding, and context).
const FINDING_LIMIT = 800;
const CONTEXT_LIMIT = 4000;
const bounded = (text, limit) => (text.length <= limit ? text : `${text.slice(0, limit - 1)}…`);
const tagOf = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The law every GitHub issue report states: the issue stands open. */
export const GITHUB_ISSUE_LAW = "github-issue-open";

const CLOSED = new Set(["resolved", "withdrawn", "superseded"]);
const WORK_BOARD_PAGE_SIZE = 20;
const WORK_BOARD_SOURCE_LIMIT = 200;
const MAX_SELECTED_ISSUES = 50;

function selectedIssueNumbers(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SELECTED_ISSUES
    || value.some((number) => !Number.isSafeInteger(number) || number < 1)
    || new Set(value).size !== value.length) {
    throw new TypeError(`GitHub intake: issueNumbers must contain 1-${MAX_SELECTED_ISSUES} unique positive issue numbers`);
  }
  return [...value].sort((a, b) => a - b);
}

/**
 * The snapshot of an issue the board last saw, across every thread citing it (its report, and any
 * request a micro-enterprise rewrote it into): the latest commitment among their sources and the
 * evidence their corroborations carry.
 */
function lastCommitment(threads, url) {
  const seen = threads.flatMap((thread) => [
    ...(thread.opening.sources ?? []).filter((source) => source.locator === url && source.commitment !== undefined)
      .map((source) => ({ at: thread.opening.at, commitment: source.commitment })),
    ...(thread.corroborations ?? []).flatMap((entry) => entry.evidence.filter((item) => item.startsWith("sha256:"))
      .map((commitment) => ({ at: entry.at, commitment }))),
  ]).sort((a, b) => a.at.localeCompare(b.at));
  return seen.at(-1)?.commitment;
}

async function githubJson(url, path, { fetchImpl, token }) {
  const response = await fetchImpl(url, { headers: {
    accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28",
    "user-agent": "metroplat-github-work-intake",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`GitHub intake returned HTTP ${response.status} for ${path.split("?")[0]}`);
  return response.json();
}

async function githubPages(path, { fetchImpl, token }) {
  const entries = [];
  for (let page = 1; page <= 100; page++) {
    const url = new URL(`https://api.github.com${path}`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const batch = await githubJson(url, path, { fetchImpl, token });
    if (!Array.isArray(batch)) throw new TypeError("GitHub intake expected an array");
    entries.push(...batch);
    if (batch.length < 100) return entries;
  }
  throw new Error("GitHub intake exceeded 100 pages; no truncated intake was accepted");
}

async function githubIssue(repository, number, { fetchImpl, token }) {
  const path = `/repos/${repository}/issues/${number}`;
  const issue = await githubJson(new URL(`https://api.github.com${path}`), path, { fetchImpl, token });
  if (issue === null || typeof issue !== "object" || Array.isArray(issue) || issue.number !== number) {
    throw new TypeError(`GitHub intake: selected issue ${number} returned an invalid issue record`);
  }
  return issue;
}

/** Read exact source witnesses from the canonical board, never from a private projection. */
async function threadsBySource(urls, as) {
  const bySource = new Map(urls.map((url) => [url, []]));
  const byId = new Map();
  for (let offset = 0; offset < urls.length; offset += WORK_BOARD_SOURCE_LIMIT) {
    const sources = urls.slice(offset, offset + WORK_BOARD_SOURCE_LIMIT);
    let after;
    let expected;
    let position;
    let received = 0;
    const pageIds = new Set();
    do {
      const page = await as("work-board", { sources, full: true, limit: WORK_BOARD_PAGE_SIZE,
        ...(after === undefined ? {} : { after }) });
      if (page?.kind !== "feltos.work.work-board" || !Number.isSafeInteger(page.matched) || page.matched < 0
        || !Array.isArray(page.threads) || page.threads.length > WORK_BOARD_PAGE_SIZE || page.position === undefined) {
        throw new TypeError("GitHub intake: work-board returned an invalid full source page");
      }
      if (expected === undefined) {
        expected = page.matched;
        position = JSON.stringify(page.position);
      } else if (page.matched !== expected || JSON.stringify(page.position) !== position) {
        throw new TypeError("GitHub intake: canonical work board changed during source pagination");
      }
      if (page.threads.length === 0 && page.next !== undefined) throw new TypeError("GitHub intake: empty work-board page has a continuation");
      for (const thread of page.threads) {
        if (typeof thread?.id !== "string" || thread.id.length === 0 || thread.opening === undefined
          || !Array.isArray(thread.opening.sources)) {
          throw new TypeError("GitHub intake: full work-board page omitted canonical thread evidence");
        }
        if (pageIds.has(thread.id)) throw new TypeError(`GitHub intake: work-board repeated thread ${thread.id} during pagination`);
        pageIds.add(thread.id);
        received++;
        const existing = byId.get(thread.id);
        if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(thread)) {
          throw new TypeError(`GitHub intake: canonical thread ${thread.id} changed across source pages`);
        }
        byId.set(thread.id, thread);
        const matchedSources = new Set(thread.opening.sources.map((source) => source.locator).filter((locator) => sources.includes(locator)));
        if (matchedSources.size === 0) throw new TypeError(`GitHub intake: thread ${thread.id} does not cite the selected source`);
        for (const source of matchedSources) {
          if (!bySource.get(source).some((entry) => entry.id === thread.id)) bySource.get(source).push(thread);
        }
      }
      if (page.next === undefined) {
        if (received !== expected) throw new TypeError("GitHub intake: work-board source pagination ended before all matches");
        break;
      }
      if (typeof page.next !== "string" || page.next !== page.threads.at(-1)?.id || page.next === after || received >= expected) {
        throw new TypeError("GitHub intake: work-board source pagination did not advance consistently");
      }
      after = page.next;
    } while (true);
  }
  return bySource;
}

/**
 * Discover from GitHub and play what changed on the work board as the syncing person: a new or
 * edited issue reports its condition (the board corroborates a condition it already holds), a closed
 * one resolves the report standing for it. Prior threads are found by the issue they cite, whoever
 * answers for them now. The board is the only registry; there is no cursor to lose. Closure resolves
 * the report only: work anyone adopted from it stands on its own request.
 */
export async function syncGitHubIssues({ repository, producer, office, issueNumbers: requestedIssueNumbers, runAs, fetchImpl = fetch, token, tokenCommand, receivingBinding, resolveReceivingBinding }) {
  repository = repositoryName(repository);
  const issueNumbers = selectedIssueNumbers(requestedIssueNumbers);
  if (resolveReceivingBinding !== undefined && typeof resolveReceivingBinding !== "function") throw new TypeError("GitHub receiving resolver must be a host capability");
  if (resolveReceivingBinding !== undefined && receivingBinding !== undefined) throw new TypeError("GitHub intake must select one receiving binding source");
  const as = (verb, input) => runAs(producer, verb,
    office !== undefined && ["work-open", "work-move"].includes(verb) ? { ...input, as: office } : input);
  if (!token && tokenCommand !== undefined) {
    const [command, ...args] = tokenCommand;
    try {
      token = (await promisify(execFile)(command, args, { timeout: 10_000, maxBuffer: 16_384 })).stdout.trim();
    } catch {
      throw new Error("the configured GitHub credential source is unavailable");
    }
    if (!token) throw new Error("the configured GitHub credential source returned no credential");
  }
  let repositoryRecord;
  if (receivingBinding !== undefined || resolveReceivingBinding !== undefined) {
    repositoryRecord = await githubJson(new URL(`https://api.github.com/repos/${repository}`), `/repos/${repository}`, {fetchImpl,token});
    if (!Number.isSafeInteger(repositoryRecord.id) || repositoryRecord.id <= 0 || repositoryRecord.full_name?.toLowerCase() !== repository || repositoryRecord.private !== false)
      throw new TypeError("GitHub intake has no verified matching public repository audience");
    if (resolveReceivingBinding !== undefined) {
      receivingBinding = await resolveReceivingBinding({ repository,
        repositoryRecord: Object.freeze({ id: repositoryRecord.id, full_name: repositoryRecord.full_name, private: repositoryRecord.private }),
        producer, office });
      if (receivingBinding === undefined || receivingBinding === null
          || !Array.isArray(receivingBinding.scope) || receivingBinding.scope.length === 0
          || receivingBinding.scope.some(value => typeof value !== "string" || value.trim() === "")
          || typeof receivingBinding.receiver !== "string" || receivingBinding.receiver.trim() === "")
        throw new TypeError("GitHub receiving resolver did not bind an institutional receiver");
    }
    if (repositoryRecord.id !== receivingBinding.repositoryId || repositoryRecord.full_name?.toLowerCase() !== repository || repositoryRecord.private !== false || receivingBinding.visibility !== "public")
      throw new TypeError("GitHub intake has no verified matching public repository audience");
  }
  let discoveredIssues;
  if (issueNumbers === undefined) {
    discoveredIssues = await githubPages(`/repos/${repository}/issues?state=all&sort=created&direction=asc`, { fetchImpl, token });
  } else {
    discoveredIssues = [];
    for (const number of issueNumbers) discoveredIssues.push(await githubIssue(repository, number, { fetchImpl, token }));
  }
  if (receivingBinding !== undefined) {
    const items = [];
    for (const issue of discoveredIssues) {
      const pull = issue.pull_request === undefined ? undefined : await githubJson(new URL(`https://api.github.com/repos/${repository}/pulls/${issue.number}`), `/repos/${repository}/pulls/${issue.number}`, {fetchImpl,token});
      const comments = issue.comments > 0 ? await githubPages(`/repos/${repository}/issues/${issue.number}/comments`, {fetchImpl,token}) : [];
      const reviews = pull === undefined ? [] : await githubPages(`/repos/${repository}/pulls/${issue.number}/reviews`, {fetchImpl,token});
      const reviewComments = pull === undefined ? [] : await githubPages(`/repos/${repository}/pulls/${issue.number}/comments`, {fetchImpl,token});
      items.push({issue,pull,comments,reviewComments,reviews});
    }
    const {receivePublicGitHubItems}=await import("./github-native-intake.mjs");
    return receivePublicGitHubItems({repository,repositoryRecord,binding:receivingBinding,items,producer,office,runAs});
  }
  const issues = discoveredIssues.filter((issue) => issue.pull_request === undefined);
  const urls = issues.map((issue) => githubIssueUrl(repository, issue.number));
  if (new Set(urls).size !== urls.length) throw new TypeError("GitHub intake: issue pagination repeated an issue locator");
  const threads = await threadsBySource(urls, as);
  const planned = [];
  for (const [index, issue] of issues.entries()) {
    const url = urls[index];
    const citing = threads.get(url);
    if (citing === undefined) throw new TypeError(`GitHub intake: no source selection for ${url}`);
    const report = citing.find((thread) => thread.opening.move === "report" && !CLOSED.has(thread.standing));
    if (issue.state === "closed") {
      // Old closed issues open nothing; a closed issue resolves the report standing for it.
      if (report !== undefined) planned.push({ issue, url, report });
      continue;
    }
    const seen = lastCommitment(citing, url);
    const comments = issue.comments > 0
      ? await githubPages(`/repos/${repository}/issues/${issue.number}/comments`, { fetchImpl, token }) : [];
    const { report: opening } = reportOfGitHubIssue(repository, issue, comments);
    if (seen !== opening.sources[0].commitment) planned.push({ issue, url, opening, seen });
  }
  const played = [];
  for (const item of planned) {
    const { issue, url, report, opening, seen } = item;
    if (issue.state === "closed") {
      // Old closed issues open nothing; a closed issue resolves the report standing for it.
      const move = await as("work-move", { thread: report.id, move: "resolve", evidence: [url] });
      played.push({ issue: url, thread: report.id, move: move.move, title: issue.title });
      continue;
    }
    const move = await as("work-open", opening);
    played.push({ issue: url, thread: move.thread ?? move.id, move: seen === undefined ? "report" : "revise", title: issue.title,
      ...(move.peerHandoff === undefined ? {} : { peerHandoff: move.peerHandoff }) });
  }
  return Object.freeze({ kind: "metroplat.github-issue-intake", repository, observed: issues.length, played: played.length, issues: played });
}
