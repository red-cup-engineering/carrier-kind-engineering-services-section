import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const GIT_INGRESS = fileURLToPath(new URL("../../version-control-services-section/services/git-services-section/bin/git", import.meta.url));

export function gitObservationEnvironment({ actor, account }) {
  return Object.freeze({
    PATH: "/usr/bin:/bin",
    GIT_ANT_CUSTOMER: actor,
    GIT_ANT_CUSTOMER_CAIP10: account,
  });
}

export function runGitStatus(request, { actor, account, operation, spawn = spawnSync }) {
  const result = spawn(GIT_INGRESS, operation, {
    cwd: request.repositoryRoot,
    encoding: "utf8",
    maxBuffer: Number.POSITIVE_INFINITY,
    env: gitObservationEnvironment({ actor, account }),
  });
  if (result.error) throw result.error;
  if (!Number.isInteger(result.status)) throw new Error("Git ingress returned no exit status");
  return { exitCode: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}
