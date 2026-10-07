#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EAS_ROOT = resolve(ROOT, "node_modules/@ethereum-attestation-service/eas-contracts");
const ARTIFACTS = {
  registry: resolve(EAS_ROOT, "artifacts/contracts/SchemaRegistry.sol/SchemaRegistry.json"),
  eas: resolve(EAS_ROOT, "artifacts/contracts/EAS.sol/EAS.json"),
};

function cast(args) {
  const result = spawnSync("cast", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`cast-refused:${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}

function artifact(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (!/^0x[0-9a-f]+$/iu.test(parsed.bytecode ?? "")) throw new Error(`official-EAS-artifact-has-no-bytecode:${path}`);
  return parsed;
}

function deploy(bytecode, constructorTypes, constructorValues, rpcUrl, auth) {
  const encoded = constructorTypes.length
    ? cast(["abi-encode", `constructor(${constructorTypes.join(",")})`, ...constructorValues]).slice(2)
    : "";
  const receipt = JSON.parse(cast(["send", "--rpc-url", rpcUrl, ...auth, "--json", "--create", `${bytecode}${encoded}`]));
  if (!receipt.contractAddress || !receipt.transactionHash || ![1, "0x1", "0x01"].includes(receipt.status)) throw new Error("EAS-deployment-transaction-failed");
  return { address: receipt.contractAddress.toLowerCase(), transactionHash: receipt.transactionHash.toLowerCase(), blockNumber: Number(BigInt(receipt.blockNumber)) };
}

export function deployEasProtocol({ rpcUrl, auth }) {
  const registryArtifact = artifact(ARTIFACTS.registry);
  const easArtifact = artifact(ARTIFACTS.eas);
  const registry = deploy(registryArtifact.bytecode, [], [], rpcUrl, auth);
  const eas = deploy(easArtifact.bytecode, ["address"], [registry.address], rpcUrl, auth);
  const reportedRegistry = cast(["call", eas.address, "getSchemaRegistry()(address)", "--rpc-url", rpcUrl]).toLowerCase();
  if (reportedRegistry !== registry.address) throw new Error("EAS-registry-constructor-binding-mismatch");
  return Object.freeze({
    type: "EthereumAttestationServiceDeployment",
    protocol: "Ethereum Attestation Service",
    upstreamPackage: "@ethereum-attestation-service/eas-contracts",
    upstreamVersion: JSON.parse(readFileSync(resolve(EAS_ROOT, "package.json"), "utf8")).version,
    schemaRegistry: { ...registry, version: cast(["call", registry.address, "version()(string)", "--rpc-url", rpcUrl]) },
    eas: { ...eas, version: cast(["call", eas.address, "version()(string)", "--rpc-url", rpcUrl]), schemaRegistry: registry.address },
  });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "deploy-eas-protocol", description: "deployEasProtocol — the deploy-eas-protocol operation.", operation: deployEasProtocol }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
