import {
  BASE_PUBLIC_EVM_CHAIN,
  BASE_PUBLIC_EVM_PROVIDERS,
  createPublicEvmReadPool,
} from "@red-cup-engineering/ethereum-engineering-services-section/public-evm-read";

const MARSH_RESOURCES_ABI = [{
  type: "function",
  name: "resources",
  stateMutability: "view",
  inputs: [{ name: "resource", type: "bytes32" }],
  outputs: [
    { name: "controller", type: "address" },
    { name: "kind", type: "bytes32" },
    { name: "content", type: "bytes32" },
    { name: "evidence", type: "bytes32" },
    { name: "sequence", type: "uint64" },
    { name: "exists", type: "bool" },
  ],
}];

function requiredHex(name, value, bytes) {
  if (typeof value !== "string" || !new RegExp(`^0x[0-9a-fA-F]{${bytes * 2}}$`, "u").test(value)) {
    throw new TypeError(`${name} must be a ${bytes}-byte hexadecimal value`);
  }
  return value.toLowerCase();
}

function requiredSequence(value) {
  if (typeof value === "bigint" && value >= 0n) return value.toString();
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  throw new TypeError("MARSH resource sequence must be a non-negative integer");
}

function resourceFromGetter(value) {
  if (!Array.isArray(value) || value.length !== 6) throw new TypeError("MARSH resources getter returned an invalid value");
  const [controller, kind, content, evidence, sequence, exists] = value;
  if (exists !== true && exists !== false) throw new TypeError("MARSH resource existence must be boolean");
  if (!exists) return null;
  return Object.freeze({
    controller: requiredHex("MARSH resource controller", controller, 20),
    kind: requiredHex("MARSH resource kind", kind, 32),
    content: requiredHex("MARSH resource content", content, 32),
    evidence: requiredHex("MARSH resource evidence", evidence, 32),
    sequence: requiredSequence(sequence),
  });
}

/** Read one MARSH resource at a provider-verified Base block boundary. */
export async function readMarshResource({ marshAddress, resourceId, boundary }) {
  const address = requiredHex("MARSH contract address", marshAddress, 20);
  const resource = requiredHex("MARSH resource id", resourceId, 32);
  const readPool = createPublicEvmReadPool({
    chain: BASE_PUBLIC_EVM_CHAIN,
    providers: BASE_PUBLIC_EVM_PROVIDERS,
  });
  const result = await readPool.readContractsAtBoundary({
    ...(boundary === undefined ? {} : { boundary }),
    contracts: [{ address, abi: MARSH_RESOURCES_ABI, functionName: "resources", args: [resource] }],
  });
  if (!Array.isArray(result.value) || result.value.length !== 1) {
    throw new TypeError("public EVM reader returned an invalid MARSH contract result");
  }
  return Object.freeze({
    marshAddress: address,
    resourceId: resource,
    resource: resourceFromGetter(result.value[0]),
    provenance: Object.freeze({
      chainId: result.boundary.chainId,
      boundary: result.boundary,
      providerId: result.provider.id,
      endpoint: result.provider.url,
      attempts: result.attempts,
      failures: result.failures,
      callCount: result.callCount,
    }),
  });
}
