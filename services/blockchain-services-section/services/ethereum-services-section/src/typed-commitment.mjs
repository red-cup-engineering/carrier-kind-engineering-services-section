import { readFileSync } from "node:fs";
import { AbiCoder, Interface, sha256 } from "ethers";
import { executeEnterpriseUserOperation } from "./enterprise-user-operation.mjs";

const PROJECTION_ABI = new Interface([
  "function commit(bytes32 rmnAct, bytes32 predicate, bytes32 subject, bytes32 object, bytes32 evidenceRoot) returns (bytes32)",
  "event TypedCommitment(bytes32 indexed rmnAct,address indexed accountableSettlement,bytes32 indexed predicate,bytes32 subject,bytes32 object,bytes32 evidenceRoot,bytes32 commitmentId)"
]);
const NI = /^ni:\/\/\/sha-256;([A-Za-z0-9_-]{43})$/u;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;

function niBytes32(value, label) {
  const match = NI.exec(value ?? "");
  if (!match) throw new Error(`${label} must be an RFC 6920 SHA-256 ni URI`);
  const bytes = Buffer.from(match[1], "base64url");
  if (bytes.length !== 32) throw new Error(`${label} does not contain 32 SHA-256 bytes`);
  return `0x${bytes.toString("hex")}`;
}
async function rpc(url, method, params = []) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`${method} refused: ${body.error?.message ?? response.status}`);
  return body.result;
}

/** Project one typed relation through the accountable settlement's ERC-4337 account. */
export async function projectTypedCommitment({
  bindingPath,
  keystorePath,
  passwordFile,
  deploymentPath,
  rpcUrl,
  bundlerUrl,
  rmnAct,
  predicate,
  subject,
  object,
  evidenceRoot,
  receiptWaitMs,
  execute = executeEnterpriseUserOperation
}) {
  const binding = JSON.parse(readFileSync(bindingPath, "utf8"));
  const accountable = binding.account?.address;
  if (!ADDRESS.test(accountable ?? "")) throw new Error("account binding has no EVM smart-account address");
  const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
  const target = deployment.deployments?.find(({ standard }) => standard === "org.emsenn.evm.typed-commitment-projection.v1")?.address;
  if (!ADDRESS.test(target ?? "")) throw new Error("typed commitment projection is absent from the declared chain deployment");
  const values = {
    rmnAct: niBytes32(rmnAct, "rmnAct"),
    predicate: niBytes32(predicate, "predicate"),
    subject: niBytes32(subject, "subject"),
    object: niBytes32(object, "object"),
    evidenceRoot: niBytes32(evidenceRoot, "evidenceRoot")
  };
  const calldata = PROJECTION_ABI.encodeFunctionData("commit", [values.rmnAct, values.predicate, values.subject, values.object, values.evidenceRoot]);
  const operation = await execute({ bindingPath, keystorePath, passwordFile, rpcUrl, bundlerUrl, target, calldata, rmnSemanticDigest: values.rmnAct, ...(receiptWaitMs === undefined ? {} : { receiptWaitMs }) });
  const transaction = await rpc(rpcUrl, "eth_getTransactionReceipt", [operation.transactionHash]);
  if (!transaction?.blockHash) throw new Error("typed commitment transaction has no block-inclusion receipt");
  const event = transaction.logs?.flatMap((log) => {
    if (log.address?.toLowerCase() !== target.toLowerCase()) return [];
    try { const parsed = PROJECTION_ABI.parseLog(log); return parsed?.name === "TypedCommitment" ? [{ log, parsed }] : []; } catch { return []; }
  })?.[0];
  if (!event) throw new Error("typed commitment event is absent from the UserOperation transaction");
  const expectedId = sha256(AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "address", "bytes32", "bytes32", "bytes32", "bytes32"],
    [values.rmnAct, accountable, values.predicate, values.subject, values.object, values.evidenceRoot]
  ));
  if (event.parsed.args.accountableSettlement.toLowerCase() !== accountable.toLowerCase() || event.parsed.args.commitmentId.toLowerCase() !== expectedId.toLowerCase()) throw new Error("typed commitment event does not bind the accountable settlement and exact relation");
  return Object.freeze({
    ...operation,
    projection: target.toLowerCase(),
    predicate,
    subject,
    object,
    evidenceRoot,
    commitmentId: expectedId.toLowerCase(),
    includedReceipt: Object.freeze({ chainId: operation.chainId, blockHash: transaction.blockHash.toLowerCase(), transactionHash: operation.transactionHash, logIndex: Number(BigInt(event.log.logIndex)) }),
    finality: Object.freeze({
      status: "assay-required",
      demandType: "ReceiptFinalityPolicyAssayDemand",
      providerKind: "independently-hireable-multi-chain-finality-service",
    }),
  });
}
