import { spawnSync } from "node:child_process";

export const GIT_EXECUTABLE = "/usr/bin/git";

export function runGit(request, { operation, spawn = spawnSync }) {
  const result = spawn(GIT_EXECUTABLE, operation, {
    cwd: request.repositoryRoot,
    encoding: "utf8",
    maxBuffer: Number.POSITIVE_INFINITY,
  });
  if (result.error) throw result.error;
  if (!Number.isInteger(result.status)) throw new Error("Git returned no exit status");
  return { exitCode: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}
