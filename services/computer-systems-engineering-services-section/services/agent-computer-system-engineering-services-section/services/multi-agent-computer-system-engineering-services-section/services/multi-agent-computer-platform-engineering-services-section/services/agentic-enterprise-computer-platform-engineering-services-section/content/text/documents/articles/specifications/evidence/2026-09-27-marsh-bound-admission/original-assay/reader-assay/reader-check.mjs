import { pathToFileURL } from "node:url";
const root = process.env.MARSH_ASSAY_PACKAGE_DIR;
if (!root) throw new Error("MARSH_ASSAY_PACKAGE_DIR is required");
const { readMarshResource } = await import(pathToFileURL(`${root}/src/resource-read.mjs`));
const contract = process.env.MARSH_ASSAY_CANDIDATE_ADDRESS;
const legacy = process.env.MARSH_ASSAY_LEGACY_ADDRESS;
const candidateResource = process.env.MARSH_ASSAY_CANDIDATE_RESOURCE;
const legacyResource = process.env.MARSH_ASSAY_LEGACY_RESOURCE;
const absentResource = process.env.MARSH_ASSAY_ABSENT_RESOURCE;
const boundary = { chainId: 8453, blockNumber: process.env.MARSH_ASSAY_BOUNDARY_BLOCK_NUMBER, blockHash: process.env.MARSH_ASSAY_BOUNDARY_BLOCK_HASH };
const checks = [
  ["candidate-current-head", contract, candidateResource, true],
  ["legacy-raw-key-head", legacy, legacyResource, true],
  ["absent-resource", contract, absentResource, false],
];
for (const [label, address, resourceId, exists] of checks) {
  const result = await readMarshResource({ marshAddress: address, resourceId, boundary });
  if ((result.resource !== null) !== exists) throw new Error(`${label}: unexpected resource presence`);
  if (result.provenance.chainId !== 8453 || result.provenance.providerId !== "private-anvil"
      || result.provenance.boundary.blockNumber !== boundary.blockNumber
      || result.provenance.boundary.blockHash !== boundary.blockHash.toLowerCase()) {
    throw new Error(`${label}: local fixture provenance missing`);
  }
  if (exists && (result.resource.sequence !== "1" || result.resource.controller === "0x0000000000000000000000000000000000000000")) {
    throw new Error(`${label}: invalid decoded head`);
  }
  process.stdout.write(`${label}: ${exists ? "decoded" : "null"}; chain=${result.provenance.chainId}; block=${result.provenance.boundary.blockNumber}; provider=${result.provenance.providerId}\n`);
}
