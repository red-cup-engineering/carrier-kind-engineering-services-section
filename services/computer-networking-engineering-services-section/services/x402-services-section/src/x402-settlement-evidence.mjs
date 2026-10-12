import { evmNetwork } from "./evm-network.mjs";

export function x402SettlementEvidence(context, { identify } = {}) {
  if (typeof identify !== "function") throw new TypeError("x402 settlement identity function is required");
  const result = context?.result;
  if (result?.success !== true) throw new TypeError("one successful x402 settlement result is required");
  if (typeof result.transaction !== "string" || !/^0x[0-9a-fA-F]{64}$/u.test(result.transaction)) {
    throw new TypeError("x402 settlement transaction must be one EVM transaction hash");
  }
  const accepted = context?.paymentPayload?.accepted?.amount;
  const amount = result.amount === undefined ? (accepted === undefined ? null : String(accepted)) : String(result.amount);
  if (amount !== null && !/^(?:0|[1-9][0-9]*)$/u.test(amount)) throw new TypeError("x402 settlement amount must be canonical atomic units");
  if (accepted !== undefined && result.amount !== undefined && String(accepted) !== amount) throw new TypeError("settlement amount disagrees with signed x402 payment");
  return Object.freeze({
    type: "X402SettlementEvidence",
    invocation: identify(context.paymentPayload),
    success: true,
    network: evmNetwork(result.network),
    transaction: result.transaction.toLowerCase(),
    payer: typeof result.payer === "string" && /^0x[0-9a-fA-F]{40}$/u.test(result.payer) ? result.payer.toLowerCase() : null,
    amount,
  });
}
