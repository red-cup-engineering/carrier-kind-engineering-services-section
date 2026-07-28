import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import test from "node:test";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { customerGrantMessage, verifyCustomerGrant } from "../src/bound-git-induction-auth.js";
import { fixtures } from "../src/bound-git-induction-wire.js";

const ANVIL = "/home/emsenn/.config/.foundry/bin/anvil";
const CHAIN_ID = 31337;
const DEFAULT_ANVIL_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ERC1271_MAGIC = "0x1626ba7e";
/* Creation code for a contract which returns ERC-1271's magic value for isValidSignature. */
const ERC1271_ALWAYS_VALID_CREATION = "0x6010600c60003960106000f3631626ba7e60e01b60005260206000f3";
const GRANT_TYPES = {
  GitCustomerGrant: [
    { name: "actorId", type: "bytes32" }, { name: "actorCardId", type: "bytes32" },
    { name: "actorCardSignatureId", type: "bytes32" }, { name: "customer", type: "address" },
    { name: "provider", type: "address" }, { name: "requestId", type: "bytes32" },
    { name: "offerId", type: "bytes32" }, { name: "contractId", type: "bytes32" },
    { name: "parentEffectId", type: "bytes32" }, { name: "nonce", type: "bytes32" },
    { name: "expiry", type: "uint64" },
  ],
};

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), new Promise(resolve => setTimeout(resolve, 2_000))]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await once(child, "exit");
  }
}

function grantOperation(customer, provider) {
  const operation = structuredClone(fixtures["PublicOperation/inspect-binding"]);
  operation.customerAccount = `eip155:${CHAIN_ID}:${customer}`;
  operation.gitAccount = `eip155:${CHAIN_ID}:${provider}`;
  return operation;
}

function grantTypedData(operation, provider, expiry) {
  const requestId = operation.customerGrantId;
  return {
    requestId,
    domain: { name: "emsenn Git Services Customer Grant", version: "1", chainId: CHAIN_ID, verifyingContract: provider },
    types: GRANT_TYPES,
    primaryType: "GitCustomerGrant",
    message: customerGrantMessage({ ...operation, requestId }, `eip155:${CHAIN_ID}:${provider}`, expiry),
  };
}

test("live Anvil proves fixed EIP-712 EOA recovery and ERC-1271 code route", { timeout: 30_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "bound-git-live-eip1271-"));
  let child;
  try {
    const port = await freePort();
    const rpcUrl = `http://127.0.0.1:${port}`;
    child = spawn(ANVIL, ["--host", "127.0.0.1", "--port", String(port), "--chain-id", String(CHAIN_ID), "--state", join(root, "anvil-state.json")], { stdio: ["ignore", "ignore", "ignore"] });
    const client = createPublicClient({ transport: http(rpcUrl, { retryCount: 0 }) });
    for (let attempt = 0; ; attempt += 1) {
      try { assert.equal(await client.getChainId(), CHAIN_ID); break; }
      catch (error) {
        if (attempt === 99 || child.exitCode !== null) throw error;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    }

    const account = privateKeyToAccount(DEFAULT_ANVIL_KEY);
    const wallet = createWalletClient({ account, transport: http(rpcUrl, { retryCount: 0 }) });
    const provider = account.address;
    const expiry = 4_102_444_800;
    const eoaOperation = grantOperation(account.address, provider);
    const eoa = grantTypedData(eoaOperation, provider, expiry);
    const eoaSignature = await wallet.signTypedData(eoa);
    assert.equal(await client.getCode({ address: account.address }), undefined);
    const eoaResult = await verifyCustomerGrant({ operation: eoaOperation, requestId: eoa.requestId, signature: eoaSignature, expiry, providerAccount: `eip155:${CHAIN_ID}:${provider}`, rpcUrl });
    assert.equal(eoaResult.accountKind, "eoa");
    assert.deepEqual(eoaResult.domain, eoa.domain);
    assert.deepEqual(eoaResult.message, eoa.message);

    const deploymentHash = await wallet.sendTransaction({ data: ERC1271_ALWAYS_VALID_CREATION });
    const deployment = await client.waitForTransactionReceipt({ hash: deploymentHash });
    assert.equal(deployment.status, "success");
    assert.ok(deployment.contractAddress, "deployment must produce an ERC-1271 contract address");
    const contract = deployment.contractAddress;
    assert.notEqual(await client.getCode({ address: contract }), undefined);
    const rawReply = await client.call({ to: contract, data: "0x1626ba7e" });
    assert.equal(rawReply.data?.slice(0, 10), ERC1271_MAGIC);
    process.stdout.write(`bound-git live EIP-1271 receipt=${deploymentHash} contract=${contract}\n`);
    const contractOperation = grantOperation(contract, provider);
    const contractGrant = grantTypedData(contractOperation, provider, expiry);
    const contractResult = await verifyCustomerGrant({ operation: contractOperation, requestId: contractGrant.requestId, signature: "0x01", expiry, providerAccount: `eip155:${CHAIN_ID}:${provider}`, rpcUrl });
    assert.equal(contractResult.accountKind, "erc1271");
    assert.deepEqual(contractResult.domain, contractGrant.domain);
    assert.deepEqual(contractResult.message, contractGrant.message);
  } finally {
    if (child) await stop(child);
    rmSync(root, { recursive: true, force: true });
  }
});
