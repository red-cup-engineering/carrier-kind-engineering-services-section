#!/usr/bin/env node
// launch-oracle-instance — launches one of the 561 Group's Oracle Cloud Always Free machines, named
// and shaped by its arguments, into an existing VCN and subnet (--network, named <network>-vcn and
// <network>-subnet), from the newest Ubuntu 24.04 image for that shape:
//
//   launch-oracle-instance --name blue-corn-creek --shape VM.Standard.A1.Flex --ocpus 2 --memory-gb 12 --boot-gb 100
//   launch-oracle-instance --name shiny-grass-bow --shape VM.Standard.E2.1.Micro --boot-gb 50 --network blue-corn-creek
//
// Free capacity is often exhausted (A1 above all), so it can run on a timer: it tries every
// availability domain once and exits 75 (EX_TEMPFAIL) when all refuse for capacity, 0 when the
// instance exists or was launched, 1 on any other error. A LimitExceeded refusal counts as capacity
// when the tenancy's limits still have room for the request in that domain: Oracle rations free A1
// that way, and only a limit actually spent is a standing obstruction. It reads the tenancy from the
// OCI config profile and signs with that profile's API key, so it needs no browser session.

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { requireAlwaysFreeRequest, requireAlwaysFreeHeadroom, providerAvailabilityAllows, selectOciProfile, receiveOciContainerCollection, classifyOciLaunchRefusal, projectOciAlwaysFreeCapacity } from "./oci-always-free-admission.mjs";

const run = promisify(execFile);

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) { if (fallback === undefined) throw new TypeError(`--${name} is required`); return fallback; }
  return process.argv[index + 1];
}
const OBSERVE_ONLY = process.argv.includes("--observe-only");
const NAME = option("name", OBSERVE_ONLY ? "" : undefined);
const SHAPE = option("shape");
const NETWORK = option("network", NAME);
if (!OBSERVE_ONLY && (!/^[a-z][a-z0-9-]{0,61}[a-z0-9]$/u.test(NAME) ||
    !/^[a-z][a-z0-9-]{0,61}[a-z0-9]$/u.test(NETWORK))) {
  throw new TypeError("OCI launch requires valid named machine and network");
}
const REQUEST = requireAlwaysFreeRequest({
  shape: SHAPE,
  ocpus: SHAPE.endsWith(".Flex") ? Number(option("ocpus")) : undefined,
  memoryGBs: SHAPE.endsWith(".Flex") ? Number(option("memory-gb")) : undefined,
  bootGB: Number(option("boot-gb", "50")),
});
const SHAPE_CONFIG = REQUEST.shape.endsWith(".Flex")
  ? JSON.stringify({ ocpus: REQUEST.ocpus, memoryInGBs: REQUEST.memoryGBs }) : undefined;
const BOOT_VOLUME_GB = String(REQUEST.bootGB);

const oci = process.env.OCI_CLI ?? join(homedir(), ".local/bin/oci");
const configFile = process.env.OCI_CONFIG_FILE ?? join(homedir(), ".oci/config");
const profile = selectOciProfile(await readFile(configFile, "utf8"), process.env);
const sshPublicKeyFile = process.env.SSH_PUBLIC_KEY_FILE ?? join(homedir(), ".ssh/id_ed25519.pub");

async function ociJson(...args) {
  const { stdout } = await run(oci, [...args, "--profile", profile, "--config-file", configFile, "--output", "json"], {
    env: { ...process.env, OCI_CLI_AUTH: "api_key", SUPPRESS_LABEL_WARNING: "True" },
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout.trim() === "" ? { data: [] } : JSON.parse(stdout);
}

async function tenancyOf(profileName) {
  const text = await readFile(configFile, "utf8");
  let inProfile = false;
  for (const line of text.split(/\r?\n/u)) {
    const header = /^\[(.+)\]$/u.exec(line.trim());
    if (header) inProfile = header[1] === profileName;
    const tenancy = /^\s*tenancy\s*=\s*(\S+)/u.exec(line);
    if (inProfile && tenancy) return tenancy[1];
  }
  throw new Error(`no tenancy in ${configFile} profile ${profileName}`);
}

const tenancy = await tenancyOf(profile);
const profileContents = await readFile(configFile, "utf8");
const section = profileContents.split(/^\[([^\]]+)\]\s*$/gmu);
const profileIndex = section.indexOf(profile);
const configuredRegion = profileIndex >= 0
  ? section[profileIndex + 1].match(/^region\s*=\s*(\S+)/mu)?.[1] : null;
const subscriptions = (await ociJson("iam", "region-subscription", "list", "--tenancy-id", tenancy)).data;
const homeRegions = Array.isArray(subscriptions)
  ? subscriptions.filter((region) => region["is-home-region"] === true).map((region) => region["region-name"]) : [];
if (homeRegions.length !== 1 || !configuredRegion || configuredRegion !== homeRegions[0]) {
  throw new Error("Always Free OCI work requires proven tenancy home-region configuration");
}
const compartments = (await ociJson("iam", "compartment", "list",
  "--compartment-id", tenancy, "--compartment-id-in-subtree", "true", "--all")).data;
if (!Array.isArray(compartments)) throw new Error("OCI compartment inventory is incomplete");
const ids = [tenancy, ...compartments.filter((row) => row["lifecycle-state"] === "ACTIVE").map((row) => row.id)];
if (ids.some((id) => typeof id !== "string" || !id) || new Set(ids).size !== ids.length)
  throw new Error("OCI compartment scope cannot be qualified");
const instances = [], containerInstances = [];
for (const id of ids) {
  const containers = receiveOciContainerCollection(await ociJson("container-instances", "container-instance", "list", "--compartment-id", id, "--all"));
  for (const container of containers) {
    if (container.shape === "CI.Standard.A1.Flex" &&
        !["TERMINATED", "DELETED"].includes(container["lifecycle-state"])) {
      // ListContainerInstances omits resource details in some API revisions.
      // Confirm every active shared-quota user's *actual* shape allocation
      // from GetContainerInstance; a missing or conflicting receipt refuses.
      const observed = (await ociJson("container-instances", "container-instance", "get",
        "--container-instance-id", container.id)).data;
      if (observed?.id !== container.id || observed.shape !== container.shape ||
          !observed["shape-config"]) {
        throw new TypeError("OCI A1 container detail does not match the inventory");
      }
      containerInstances.push({ ...container, "shape-config": observed["shape-config"] });
    } else containerInstances.push(container);
  }
  const rows = (await ociJson("compute", "instance", "list", "--compartment-id", id, "--all")).data;
  if (!Array.isArray(rows)) throw new Error("OCI instances inventory is incomplete");
  for (const instance of rows) {
    if (instance.shape === "VM.Standard.A1.Flex" && instance["lifecycle-state"] !== "TERMINATED") {
      // The list endpoint is not guaranteed to include the full shape config.
      const observed = (await ociJson("compute", "instance", "get", "--instance-id", instance.id)).data;
      instances.push({ ...instance, "shape-config": observed?.["shape-config"] });
    } else instances.push(instance);
  }
}
// A tenancy capacity probe must not disappear when any similarly named VM
// exists; observing a candidate and receiving a running machine are different
// operations with distinct effects.
const existing = OBSERVE_ONLY ? null : instances.find((instance) => instance["display-name"] === NAME
  && instance["lifecycle-state"] !== "TERMINATED");
if (existing) {
  const state = existing["lifecycle-state"];
  if (state === "RUNNING") {
    process.stdout.write(`${NAME} already running; LAGOON/Guix receiving still required\n`);
    process.exit(0);
  }
  process.stderr.write(`${NAME} exists in state ${state}; start/recover through owning operator, do not duplicate\n`);
  process.exit(75);
}

// Observation must not depend on an already provisioned VCN, subnet, image,
// or local SSH key. These are execution resources, not quota telemetry.
// Admit them only after the complete inventory and limit check, and only for
// an explicit launch rather than a read-only preflight.
const domainRows = (await ociJson("iam", "availability-domain", "list", "--compartment-id", tenancy)).data;
if (!Array.isArray(domainRows) || domainRows.length === 0) throw new Error("OCI availability domain inventory is incomplete");
const domains = domainRows.map((domain) => domain.name);
if (domains.some((name) => typeof name !== "string" || !name)) throw new Error("invalid OCI availability domain");
const bootVolumes = [], blockVolumes = [];
for (const id of ids) {
  const blocks = (await ociJson("bv", "volume", "list", "--compartment-id", id, "--all")).data;
  if (!Array.isArray(blocks)) throw new Error("OCI block volume inventory is incomplete");
  blockVolumes.push(...blocks);
  for (const domain of domains) {
    const boots = (await ociJson("bv", "boot-volume", "list", "--compartment-id", id,
      "--availability-domain", domain, "--all")).data;
    if (!Array.isArray(boots)) throw new Error("OCI boot volume inventory is incomplete");
    bootVolumes.push(...boots);
  }
}
// Do not count capacity from a partial CLI enumeration or an unknown billing
// plan. This envelope is conservative, not an invoice or permission to spend.
const headroom = requireAlwaysFreeHeadroom(REQUEST, { instances, bootVolumes, blockVolumes, containerInstances });

// The limits a LimitExceeded refusal names, each with the request's share of it; a refusal is
// rationing, not a spent limit, when every named limit still has that much available.
const requested = SHAPE_CONFIG === undefined ? undefined : JSON.parse(SHAPE_CONFIG);
async function limitsHaveRoom(detail, domain) {
  if (requested === undefined) return false;
  const named = /service limits were exceeded: ([^"\n]+)/u.exec(detail)?.[1].split(/,\s*/u) ?? [];
  if (named.length === 0) return false;
  for (const limit of named) {
    const need = limit.includes("memory") ? requested.memoryInGBs : requested.ocpus;
    const scope = limit.includes("regional") ? [] : ["--availability-domain", domain];
    const { data } = await ociJson("limits", "resource-availability", "get", "--service-name", "compute",
      "--limit-name", limit.trim(), "--compartment-id", tenancy, ...scope);
    if (!(data.available >= need)) return false;
  }
  return true;
}

async function requireLaunchResources() {
  const networks = (await ociJson("network", "vcn", "list", "--compartment-id", tenancy,
    "--display-name", `${NETWORK}-vcn`, "--all")).data;
  if (!Array.isArray(networks) || networks.length !== 1 || !networks[0]?.id)
    throw new TypeError("OCI launch VCN is absent or ambiguous");
  const subnets = (await ociJson("network", "subnet", "list", "--compartment-id", tenancy,
    "--vcn-id", networks[0].id, "--display-name", `${NETWORK}-subnet`, "--all")).data;
  if (!Array.isArray(subnets) || subnets.length !== 1 || !subnets[0]?.id)
    throw new TypeError("OCI launch subnet is absent or ambiguous");
  const images = (await ociJson("compute", "image", "list", "--compartment-id", tenancy,
    "--shape", SHAPE, "--operating-system", "Canonical Ubuntu",
    "--operating-system-version", "24.04", "--sort-by", "TIMECREATED", "--all")).data;
  if (!Array.isArray(images) || !images[0]?.id)
    throw new TypeError("OCI launch image is absent");
  const sshKey = (await readFile(sshPublicKeyFile, "utf8")).trim();
  if (!/^ssh-(?:ed25519|rsa) [A-Za-z0-9+/]+=*(?:\s[^\r\n]*)?$/u.test(sshKey))
    throw new TypeError("OCI launch requires one valid SSH public key");
  return { subnet: subnets[0], image: images[0], sshKey };
}
let launchResources = null;
let quotaQualifiedDomains = 0;
const launchRefusals = [];
for (const domain of domains) {
  // Every attempted AD must attest the resource-specific provider limit.
  // Oracle can refuse a VM despite positive entitlement (host stock).
  const names = REQUEST.shape === "VM.Standard.A1.Flex"
    ? ["standard-a1-core-count", "standard-a1-memory-count"]
    : ["standard-e2-micro-core-count"];
  const availability = {};
  try {
    for (const limitName of names) {
      const response = await ociJson("limits", "resource-availability", "get",
        "--service-name", "compute", "--limit-name", limitName,
        "--compartment-id", tenancy, "--availability-domain", domain);
      availability[limitName] = response.data?.available;
    }
  } catch {
    // A denied or unsupported native limit is not zero-cost admission.
    continue;
  }
  if (!providerAvailabilityAllows(REQUEST, availability)) continue;
  quotaQualifiedDomains += 1;
  // A current quota reading does not establish actual free physical host stock.
  // Qualify all domains without creating any resource in observe-only mode.
  if (OBSERVE_ONLY) continue;
  try {
    // Resolve launch-only resources lazily. A quota probe neither demands nor
    // creates networking, machine images or any SSH identity carrier.
    if (launchResources === null) launchResources = await requireLaunchResources();
    const { subnet, image, sshKey } = launchResources;
    const launched = await ociJson(
      "compute", "instance", "launch", "--no-retry",
      "--compartment-id", tenancy, "--availability-domain", domain, "--subnet-id", subnet.id,
      "--display-name", NAME, "--hostname-label", NAME,
      "--shape", SHAPE, ...(SHAPE_CONFIG === undefined ? [] : ["--shape-config", SHAPE_CONFIG]), "--image-id", image.id,
      "--boot-volume-size-in-gbs", BOOT_VOLUME_GB, "--assign-public-ip", "true",
      "--is-pv-encryption-in-transit-enabled", "true",
      "--metadata", JSON.stringify({ ssh_authorized_keys: sshKey }),
    );
    process.stdout.write(`${NAME} provider launch accepted in ${domain}; LAGOON/Guix receiving and billing readback remain required\n`);
    process.exit(0);
  } catch (error) {
    // No raw provider stderr is admitted to CI logs or public receipts.
    const detail = `${error.stderr ?? ""}\n${error.message ?? ""}`;
    const kind = classifyOciLaunchRefusal(detail);
    launchRefusals.push(kind);
    if (kind === "host-capacity-unavailable" || kind === "provider-rate-limited") continue;
    if (kind === "provider-limit-exceeded") {
      let rationed = false;
      try { rationed = await limitsHaveRoom(detail, domain); } catch { rationed = false; }
      if (rationed) continue;
    }
    process.stderr.write(JSON.stringify({
      kind: "oci.native-launch-refusal",
      reason: kind,
      quotaQualifiedDomains, attemptedDomains: launchRefusals.length,
      launched: false, providerStatus: "refused",
    }) + "\n");
    process.exit(1);
  }
}

if (OBSERVE_ONLY) {
  const capacity = projectOciAlwaysFreeCapacity(REQUEST, headroom, {
    homeRegion: configuredRegion,
    observedAt: new Date().toISOString(),
    qualifiedDomains: quotaQualifiedDomains,
    domainsObserved: domains.length,
  });
  process.stdout.write(JSON.stringify({
    kind: "oci.always-free-native-preflight",
    capacity,
    mode: "read-only",
    region: configuredRegion,
    shape: REQUEST.shape,
    requestedOcpus: REQUEST.ocpus ?? null,
    requestedMemoryGBs: REQUEST.memoryGBs ?? null,
    requestedBootGB: REQUEST.bootGB,
    quotaQualifiedDomains,
    availabilityDomainsObserved: domains.length,
    freeEnvelope: headroom.qualified,
    remainingAfterRequest: {
      ocpus: headroom.remainingOcpus,
      memoryGBs: headroom.remainingMemoryGBs,
      microInstances: headroom.remainingMicroInstances,
      bootAndBlockGB: headroom.remainingBootAndBlockGB,
    },
    billingVerified: false,
    physicalHostCapacityVerified: false,
    launched: false,
  }) + "\n");
  process.exit(quotaQualifiedDomains > 0 ? 0 : 75);
}
process.stderr.write(JSON.stringify({
  kind: "oci.native-launch-refusal",
  reason: launchRefusals.length ? (launchRefusals.every(x => x === "host-capacity-unavailable")
    ? "host-capacity-unavailable" : "temporarily-unavailable") : "no-quota-qualified-domain",
  quotaQualifiedDomains, attemptedDomains: launchRefusals.length,
  refusalKinds: [...new Set(launchRefusals)].sort(),
  launched: false, providerStatus: "unavailable",
}) + "\n");
process.exit(75);
