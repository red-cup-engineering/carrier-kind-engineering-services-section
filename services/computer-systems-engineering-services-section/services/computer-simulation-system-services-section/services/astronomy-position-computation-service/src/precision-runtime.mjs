import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, open, realpath, stat } from "node:fs/promises";
import { delimiter, resolve, sep } from "node:path";
import { promisify } from "node:util";

const executeFile = promisify(execFile);
const identityFields = ["dev", "ino", "size", "mtimeNs", "ctimeNs"];

function sameFile(left, right) {
  return identityFields.every((field) => left[field] === right[field]);
}

async function measureFile(path) {
  // O_NONBLOCK prevents a misconfigured FIFO from hanging before isFile().
  const handle = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) throw new Error("precision runtime input must be a regular file");
    const hash = createHash("sha256");
    for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk);
    if (!sameFile(before, await handle.stat({ bigint: true }))) throw new Error("precision runtime input changed while hashing");
    return { path, stat: before, sha256: hash.digest("hex") };
  } finally {
    await handle.close();
  }
}

async function assertUnchanged(file) {
  if (!sameFile(file.stat, await stat(file.path, { bigint: true }))) {
    throw new Error("precision runtime input changed during execution");
  }
}

async function resolveExecutable(binary) {
  const candidates = binary.includes(sep) ? [resolve(binary)]
    : (process.env.PATH ?? "/usr/bin:/bin").split(delimiter).map((directory) => resolve(directory, binary));
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return await realpath(candidate);
    } catch (error) {
      if (!["ENOENT", "ENOTDIR", "EACCES"].includes(error.code)) throw error;
    }
  }
  throw new Error("precision supplier executable is unavailable");
}

// Internal process/file seam, not a public provider or an environment pin
// override. The existing provider supplies its source-owned hash and version.
export async function executePinnedOxiEphemeris({ binary, ephemerisFile, ephemerisSha256, supplierVersion, argumentsForEphemeris }) {
  const ephemeris = await measureFile(await realpath(ephemerisFile));
  if (ephemeris.sha256 !== ephemerisSha256) throw new Error("precision ephemeris SHA-256 does not match the pinned DE440 file");
  const executable = await measureFile(await resolveExecutable(binary));
  const { stdout: versionOutput } = await executeFile(executable.path, ["--version"], { encoding: "utf8", maxBuffer: 4096, timeout: 5000 });
  if (versionOutput.trim() !== `oxieph ${supplierVersion}`) throw new Error("precision supplier version does not match the pinned OxiEphemeris version");
  await Promise.all([assertUnchanged(ephemeris), assertUnchanged(executable)]);
  const { stdout } = await executeFile(executable.path, argumentsForEphemeris(ephemeris.path), { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: 15_000 });
  await Promise.all([assertUnchanged(ephemeris), assertUnchanged(executable)]);
  return {
    chart: JSON.parse(stdout),
    identity: Object.freeze({ ephemerisSha256: ephemeris.sha256, supplierVersion, supplierSha256: executable.sha256 }),
  };
}
