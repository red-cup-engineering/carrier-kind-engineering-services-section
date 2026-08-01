import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { runGitStatus as runContractedGitStatus } from "./git-ingress.mjs";

export const ACTOR = "urn:ame:repository-state-observation-service";
export const FIXED_GIT_OPERATION = Object.freeze(["status", "--porcelain=v1", "--ignore-submodules=all"]);
const ROOT = new URL("..", import.meta.url).pathname;
export const ACCOUNT = JSON.parse(readFileSync(new URL("../content/evm/accounts/eip155-31337.json", import.meta.url), "utf8")).account.caip10;
const rawNi = (await import(new URL("../../../../../../lenticule-science/services/obsmetrological-services-section/services/rmn-semantic-conformance-die/src/canonical-cbor.mjs", import.meta.url).href)).rawNiUri;
const id = (value) => semanticId(relationalWitnessJournalDocument(value));
export const record = (body) => Object.freeze({ id: id(body), ...body });

export function validateRequest(request) {
  if (request?.type !== "RepositoryStateObservationRequest") throw new Error("request type must be RepositoryStateObservationRequest");
  if (request.purpose !== undefined && request.purpose !== "observe repository state") throw new Error("unsupported purpose");
  if (typeof request.repositoryRoot !== "string" || !request.repositoryRoot.startsWith("/")) throw new Error("repositoryRoot must be absolute");
  if (Object.hasOwn(request, "waitMilliseconds")) throw new Error("waitMilliseconds is retired; repository observation is one immediate fact and future changes arrive as events");
  if (!["dry-run", "live"].includes(request.executionMode)) throw new Error("executionMode must be dry-run or live");
  for (const forbidden of ["argv", "executable", "environment", "command", "effects", "mutation"]) {
    if (Object.hasOwn(request, forbidden)) throw new Error(`caller-selected ${forbidden} is forbidden`);
  }
  return request;
}

function runGitStatus(request) {
  return runContractedGitStatus(request, { actor: ACTOR, account: ACCOUNT, operation: FIXED_GIT_OPERATION });
}

export async function observeRepositoryState(request, options = {}) {
  validateRequest(request);
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (request.executionMode === "dry-run") return record({
    type: "RepositoryStateObservationResult",
    provider: ACTOR,
    executionMode: "dry-run",
    repositoryRoot: request.repositoryRoot,
    fixedGitOperation: [...FIXED_GIT_OPERATION],
    observed: false,
    outcome: { positiveEvidence: false, negativeEvidence: false },
    customerMutation: false,
    recordedAt,
  });
  const run = await (options.runGitStatus ?? runGitStatus)(request);
  if (!Number.isInteger(run?.exitCode) || typeof run.stdout !== "string" || typeof run.stderr !== "string") throw new Error("Git ingress returned a malformed observation");
  const statusLines = run.stdout.split(/\r?\n/u).filter(Boolean);
  return record({
    type: "RepositoryStateObservationResult",
    provider: ACTOR,
    executionMode: "live",
    repositoryRoot: request.repositoryRoot,
    fixedGitOperation: [...FIXED_GIT_OPERATION],
    observed: true,
    dirty: statusLines.length > 0,
    statusLines,
    rawStatus: rawNi(Buffer.from(run.stdout, "utf8")),
    stderr: rawNi(Buffer.from(run.stderr, "utf8")),
    supplierExitCode: run.exitCode,
    outcome: { positiveEvidence: run.exitCode === 0, negativeEvidence: run.exitCode !== 0 },
    customerMutation: false,
    recordedAt,
  });
}

export const SETTLEMENT_ROOT = ROOT;
