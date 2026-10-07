import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { acceptedWorkReceipts } from "@red-cup-engineering/feltos/work/work-acceptance-readout";
import {
  publicationPlanResourceKind,
  readOnlyPublicationPlanForItem,
} from "@red-cup-engineering/npm-workspace-publication-service/read-only-publication-plan";

const execFile = promisify(execFileCallback);
const PLAN_REQUEST_KIND = "npm-workspace-publication-plan-request@1";
const COMMIT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/iu;
const MAX_GIT_OUTPUT = 32 * 1024 * 1024;

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function packagePath(value) {
  if (typeof value !== "string" || value === "" || value.startsWith("/") || value.includes("\\")
    || value.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new TypeError("publication plan package path must be canonical and repository-relative");
  }
  return value;
}

async function git(root, args) {
  const { stdout } = await execFile("git", ["-C", root, ...args], {
    encoding: "utf8",
    maxBuffer: MAX_GIT_OUTPUT,
    windowsHide: true,
  });
  return stdout;
}

function requestOf(outcome) {
  if (!object(outcome) || !object(outcome.result) || outcome.result.kind !== "skill-result"
    || !object(outcome.result.value)) return undefined;
  return outcome.result.value.kind === PLAN_REQUEST_KIND ? outcome.result.value : undefined;
}

function resourceEntries(item) {
  return Array.isArray(item?.signedAction?.resources)
    ? item.signedAction.resources.filter((entry) => entry?.resource?.kind === publicationPlanResourceKind)
    : [];
}

async function resolveAcceptedIntegratedSource({ item, resource, sourceRoot, binding, date }) {
  const source = resource.source;
  if (!object(source) || !COMMIT_ID.test(source.commit ?? "")) throw new TypeError("plan Resource must identify a full accepted Git commit");
  const packageName = resource.package?.name;
  const packageDirectory = packagePath(resource.package?.path);
  if (resource.locator !== packageDirectory || typeof packageName !== "string" || packageName === "") {
    throw new TypeError("plan Resource package identity is incomplete or inconsistent");
  }

  const repositoryRoot = await realpath(sourceRoot);
  const [repository, head, tree] = await Promise.all([
    git(repositoryRoot, ["remote", "get-url", "origin"]),
    git(repositoryRoot, ["rev-parse", "--verify", "HEAD^{commit}"]),
    git(repositoryRoot, ["rev-parse", "--verify", `${source.commit}^{tree}`]),
  ]);
  if (repository.trim() !== source.repository || tree.trim() !== source.tree) {
    throw new TypeError("plan Resource repository or accepted source tree does not match the configured source custody");
  }
  try {
    await git(repositoryRoot, ["merge-base", "--is-ancestor", source.commit, head.trim()]);
  } catch (error) {
    if (error?.code === 1) throw new TypeError("accepted source commit is not integrated into the configured source branch");
    throw error;
  }

  const receipts = acceptedWorkReceipts(binding, date, new Set([source.duty]), source.subject);
  const matching = receipts.filter((receipt) => receipt.scope === source.duty
    && receipt.subject === source.subject
    && receipt.proposalReceipt === source.receiving
    && Array.isArray(receipt.providerEvidence)
    && receipt.providerEvidence.includes(`commit:${source.commit}`));
  if (matching.length !== 1) throw new TypeError("plan Resource does not resolve to one independently accepted source proposal");

  const manifestPath = `${packageDirectory}/package.json`;
  const lockPath = `${packageDirectory}/package-lock.json`;
  const [manifestText, lockText] = await Promise.all([
    git(repositoryRoot, ["cat-file", "blob", `${source.commit}:${manifestPath}`]),
    git(repositoryRoot, ["cat-file", "blob", `${source.commit}:${lockPath}`]),
  ]);
  return Object.freeze({
    repository: source.repository,
    duty: source.duty,
    subject: source.subject,
    commit: source.commit,
    tree: source.tree,
    receiving: source.receiving,
    manifestText,
    lockText,
  });
}

/**
 * Run only at the end of a real hosted turn. The model can request this one
 * fixed read-only effect, but cannot choose a command, repository, path, or
 * registry. No plan Resource means the caller must continue its ordinary
 * outcome path unchanged.
 */
export async function publicationPlanForHostedOutcome({ item, outcome, sourceRoot, binding, date, observedSession, verifyHostedSession }) {
  const request = requestOf(outcome);
  const resources = resourceEntries(item);
  if (request === undefined && resources.length === 0) return undefined;
  if (request === undefined) return undefined;
  if (item.signedAction?.operation !== "agency-work-execute") {
    throw new TypeError("publication plan request requires the current signed agency-work-execute Action");
  }
  if (resources.length !== 1) throw new TypeError("publication plan request requires exactly one Resource on the current signed Action");

  const [entry] = resources;
  if (request.scope !== item.scope || request.resource !== entry.id || request.witness !== entry.witness) {
    throw new TypeError("publication plan request does not match the current allocated scope and witnessed Resource");
  }
  if (!observedSession || typeof item.allocation !== "string" || item.allocation.trim() === ""
    || typeof item.execution?.receipt !== "string" || item.execution.receipt.trim() === ""
    || item.execution.session !== observedSession.id || item.execution.model !== observedSession.model
    || (item.execution.reasoningEffort !== undefined && item.execution.reasoningEffort !== observedSession.reasoningEffort)) {
    throw new TypeError("publication plan request is not bound to this hosted SessionStart");
  }
  if (item.requiredCarrier !== undefined && (observedSession.model !== item.requiredCarrier.model
    || observedSession.reasoningEffort !== item.requiredCarrier.reasoningEffort)) {
    throw new TypeError("publication plan request's observed carrier does not meet the allocated requirement");
  }
  if (typeof verifyHostedSession !== "function") throw new TypeError("publication plan requires the host's current admitted-session reader");
  verifyHostedSession(item, observedSession);

  const acceptedSource = await resolveAcceptedIntegratedSource({
    item,
    resource: entry.resource,
    sourceRoot,
    binding,
    date,
  });
  const result = readOnlyPublicationPlanForItem({
    item,
    acceptedSource,
    manifestText: acceptedSource.manifestText,
    lockText: acceptedSource.lockText,
  });
  return Object.freeze({ kind: "skill-result", value: result });
}
