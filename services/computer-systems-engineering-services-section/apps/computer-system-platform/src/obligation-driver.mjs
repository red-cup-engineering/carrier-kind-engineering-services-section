/**
 * The driver for obligation records of kind `compute-capacity` (the operations console's declared
 * obligations): a move only the account holder can make that gives the house more compute. Nothing
 * is pasted: the driver observes the capacity itself, so the obligation waits until the machine
 * shows it and waits again if it is lost.
 *
 * The record's `result` names what to observe:
 * - `{ "observe": "oracle-instance", "name": "<display name>" }`: a RUNNING Oracle Cloud instance of
 *   that name in the tenancy of the configured OCI profile (the launch jobs make it once capacity
 *   exists; what the person unlocks is the capacity).
 * - `{ "observe": "memory", "minimumGiB": <n> }`: this machine's memory, as /proc/meminfo reads it.
 * - `{ "observe": "file-contains", "path": "<absolute path>", "text": "<marker>" }`: a host file a root
 *   install put in place carries the marker of the version the house needs.
 * @param {{ oci?: string, profile?: string, configFile?: string, meminfo?: string }} [options]
 */
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** The tenancy a profile of an OCI config file names. */
export function tenancyOfProfile(configText, profile) {
  let inProfile = false;
  for (const line of configText.split("\n")) {
    const header = /^\[(.+)\]\s*$/u.exec(line.trim());
    if (header) { inProfile = header[1] === profile; continue; }
    const tenancy = /^tenancy\s*=\s*(\S+)/u.exec(line.trim());
    if (inProfile && tenancy) return tenancy[1];
  }
  return undefined;
}

/** GiB of memory a /proc/meminfo text reports. */
export const memoryGiBOf = (meminfo) => Number(/MemTotal:\s+(\d+)\s+kB/u.exec(meminfo)?.[1] ?? 0) / 1024 / 1024;

export function computeCapacityDriver({
  oci = process.env.OCI_CLI ?? join(homedir(), ".local/bin/oci"),
  profile = process.env.OCI_PROFILE ?? "BLUE_CORN_CREEK_API_KEY",
  configFile = process.env.OCI_CONFIG_FILE ?? join(homedir(), ".oci/config"),
  meminfo = "/proc/meminfo",
} = {}) {
  const observed = async (record) => {
    const result = record.result ?? {};
    if (result.observe === "memory") return memoryGiBOf(readFileSync(meminfo, "utf8")) >= Number(result.minimumGiB) * 0.97;
    if (result.observe === "file-contains") return readFileSync(result.path, "utf8").includes(result.text);
    if (result.observe === "oracle-instance") {
      const tenancy = tenancyOfProfile(readFileSync(configFile, "utf8"), profile);
      if (tenancy === undefined) return false;
      const { stdout } = await run(oci, ["compute", "instance", "list", "--compartment-id", tenancy, "--display-name", result.name, "--lifecycle-state", "RUNNING",
        "--profile", profile, "--config-file", configFile, "--output", "json"], { timeout: 60_000 });
      return (JSON.parse(stdout || "{}").data ?? []).length > 0;
    }
    throw new TypeError(`compute-capacity: ${record.id} names no observation (memory, file-contains or oracle-instance)`);
  };
  return {
    kind: "compute-capacity",
    async held(record) { try { return await observed(record); } catch { return false; } },
    prepare: () => ({}),
    async capture(record) {
      if (!(await observed(record))) throw new Error(`The node does not see it yet: ${record.done?.title ?? record.title}. It checks again by itself; this page clears once it does.`);
      return { custody: "observed on the machine by the node; nothing is held" };
    },
  };
}
