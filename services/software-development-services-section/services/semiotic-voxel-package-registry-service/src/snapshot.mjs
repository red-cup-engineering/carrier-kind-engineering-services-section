import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const SNAPSHOT_DEMAND = "UnionPackageRegistrySnapshotDemand";

function registryOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("registry URL must be HTTP(S)");
  return url.href;
}

function scopedConfig(scopes, registry) {
  return ["registry=https://registry.npmjs.org/", ...scopes.map((scope) => `@${scope}:registry=${registry}`), ""].join("\n");
}

export async function obtainRegistrySnapshot(demand, { registryRoot, registryUrl }) {
  if (demand?.type !== SNAPSHOT_DEMAND) throw new TypeError("one UnionPackageRegistrySnapshotDemand is required");
  if (typeof demand.requestId !== "string" || demand.requestId.trim() === "") throw new TypeError("snapshot demand requires requestId");
  const registry = registryOrigin(registryUrl);
  if (demand.registry !== registry) throw new Error("snapshot demand must name this exact private registry face");
  const receiptBytes = await readFile(join(resolve(registryRoot), "registry-receipt.json"));
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  if (receipt?.type !== "SemioticVoxelPackageRegistryReceipt" || !Array.isArray(receipt.packages) || !Array.isArray(receipt.scopes)) {
    throw new Error("registry has no recognized immutable snapshot receipt");
  }
  const packages = receipt.packages.map(({ name, version, artifact, bytes, shasum, integrity }) => Object.freeze({
    name, version, artifact, bytes, shasum, integrity, tarball: new URL(artifact, registry).href,
  }));
  return Object.freeze({
    type: "UnionPackageRegistrySnapshot",
    requestId: demand.requestId,
    registry,
    receiptSha256: `sha256:${createHash("sha256").update(receiptBytes).digest("hex")}`,
    packages,
    scopes: Object.freeze([...receipt.scopes]),
    npmrc: scopedConfig(receipt.scopes, registry),
  });
}
