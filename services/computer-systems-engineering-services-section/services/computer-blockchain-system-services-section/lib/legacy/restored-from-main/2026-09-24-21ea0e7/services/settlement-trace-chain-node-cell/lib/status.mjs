let rpcId = 0;
async function rpc(rpcUrl, method, params = []) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({jsonrpc: "2.0", id: ++rpcId, method, params})
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`${method} refused: ${body.error?.message ?? response.status}`);
  return body.result;
}

export async function observeTraceChain(rpcUrl) {
  const chainId = BigInt(await rpc(rpcUrl, "eth_chainId"));
  if (chainId !== 5615610n) throw new Error(`trace-chain node returned forbidden chain ${chainId}`);
  const numberHex = await rpc(rpcUrl, "eth_blockNumber");
  const block = await rpc(rpcUrl, "eth_getBlockByNumber", [numberHex, false]);
  if (!/^0x[0-9a-fA-F]{64}$/u.test(block?.hash ?? "")) throw new Error("latest trace-chain block has no canonical hash");
  return Object.freeze({
    kind: "org.emsenn.settlement-trace-chain.status.v1",
    chain: "eip155:5615610",
    blockNumber: Number(BigInt(numberHex)),
    blockHash: block.hash.toLowerCase(),
    productionEligible: false
  });
}
