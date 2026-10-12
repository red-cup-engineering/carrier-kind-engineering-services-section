import { HTTPFacilitatorClient } from "@x402/core/server";
import { VerifyError, SettleError } from "@x402/core/types";
import { canonicalizeHttpsUrl } from "@red-cup-engineering/http-services-section/canonicalize-https-url";

const NETWORK = /^eip155:[1-9][0-9]*$/u;
const PROBE_ASSET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PROBE_PAY_TO = "0x1111111111111111111111111111111111111111";
const PROBE_MISMATCHED_TO = "0x2222222222222222222222222222222222222222";
const PROBE_FROM = "0x000000000000000000000000000000000000dEaD";
const PROBE_SIGNATURE = `0x${"ab".repeat(65)}`;
const PROBE_NONCE = `0x${"11".repeat(32)}`;

function network(value) {
  if (typeof value !== "string" || !NETWORK.test(value)) {
    throw new TypeError("facilitator assay network must be one explicit EVM CAIP-2 identifier");
  }
  return value;
}

function probeRequirements(net) {
  return Object.freeze({
    scheme: "exact",
    network: net,
    amount: "1",
    asset: PROBE_ASSET,
    payTo: PROBE_PAY_TO,
    maxTimeoutSeconds: 60,
    extra: { name: "USD Coin", version: "2" },
  });
}

function mismatchedPayload(net, requirements) {
  return Object.freeze({
    x402Version: 2,
    accepted: requirements,
    payload: Object.freeze({
      authorization: Object.freeze({
        from: PROBE_FROM,
        to: PROBE_MISMATCHED_TO,
        value: requirements.amount,
        validAfter: "0",
        validBefore: "9999999999",
        nonce: PROBE_NONCE,
      }),
      signature: PROBE_SIGNATURE,
    }),
  });
}

/**
 * Classify one facilitator `verify()`/`settle()` outcome against the x402
 * protocol's refusal contract: a bounded operation either resolves with an
 * explicit `isValid`/`success` false, or throws the official library's typed
 * `VerifyError`/`SettleError` for a structured non-2xx refusal. Any other
 * outcome (an unstructured throw, or an `isValid`/`success` true for a
 * deliberately invalid probe) is a boundary failure.
 *
 * @param {() => Promise<{isValid?: boolean, success?: boolean}>} attempt bound facilitator call
 * @param {"verify"|"settle"} operation which protocol operation is being probed
 * @param {new (...args: unknown[]) => Error} typedErrorClass VerifyError or SettleError
 * @returns {Promise<{conformant: boolean, critical: boolean, mode: string, detail: Record<string, unknown>}>}
 */
async function classifyRefusal(attempt, operation, typedErrorClass) {
  const acceptedField = operation === "verify" ? "isValid" : "success";
  try {
    const result = await attempt();
    if (result[acceptedField] === false) {
      return { conformant: true, critical: false, mode: "structured-200-refusal", detail: { ...result } };
    }
    if (result[acceptedField] === true) {
      return { conformant: false, critical: true, mode: "accepted-invalid-probe", detail: { ...result } };
    }
    return { conformant: false, critical: true, mode: "malformed-success-shape", detail: { ...result } };
  } catch (error) {
    if (error instanceof typedErrorClass) {
      return {
        conformant: true,
        critical: false,
        mode: "structured-error-refusal",
        detail: { statusCode: error.statusCode, name: error.name, message: error.message },
      };
    }
    return {
      conformant: false,
      critical: false,
      mode: "unstructured-failure",
      detail: { name: error?.name, message: error instanceof Error ? error.message : String(error) },
    };
  }
}

/**
 * Read one address's on-chain footprint from a public, keyless EVM JSON-RPC
 * endpoint (no Basescan/Etherscan API key required — see the assay's
 * `basescanApiKeyless` finding for why the block-explorer JSON API itself
 * is excluded).
 *
 * @param {string} rpcUrl public HTTPS JSON-RPC endpoint
 * @param {string} address EVM address to inspect
 * @param {typeof fetch} fetchImpl injected fetch implementation
 * @returns {Promise<{address: string, isContract: boolean, balanceWei: string, transactionCount: number} | {address: string, rpcError: string}>}
 */
async function addressFootprint(rpcUrl, address, fetchImpl) {
  const batch = [
    { jsonrpc: "2.0", id: 1, method: "eth_getCode", params: [address, "latest"] },
    { jsonrpc: "2.0", id: 2, method: "eth_getBalance", params: [address, "latest"] },
    { jsonrpc: "2.0", id: 3, method: "eth_getTransactionCount", params: [address, "latest"] },
  ];
  let response;
  try {
    response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(batch),
    });
  } catch (error) {
    return { address, rpcError: error instanceof Error ? error.message : String(error) };
  }
  if (!response.ok) return { address, rpcError: `RPC returned HTTP ${response.status}` };
  const results = await response.json();
  if (!Array.isArray(results) || results.some((entry) => entry?.error)) {
    return { address, rpcError: "RPC batch returned a JSON-RPC error" };
  }
  const byId = new Map(results.map((entry) => [entry.id, entry.result]));
  return {
    address,
    isContract: byId.get(1) !== "0x",
    balanceWei: BigInt(byId.get(2) ?? "0x0").toString(10),
    transactionCount: Number(BigInt(byId.get(3) ?? "0x0")),
  };
}

/**
 * Assay one x402 facilitator's protocol conformance before real settlement
 * volume relies on it: validates its `/supported` declaration, confirms it
 * refuses malformed `verify`/`settle` payloads in the protocol's own
 * structured refusal shape rather than crashing, and confirms the "exact"
 * scheme's recipient-binding boundary — a facilitator can only submit or
 * refuse the payer's pre-signed EIP-3009 `TransferWithAuthorization`
 * authorization to the `payTo` that authorization's own EIP-712 signature
 * covers; it cannot redirect settlement to a different recipient, because
 * doing so invalidates the signature the settlement contract itself checks
 * on-chain (verified directly in the pinned `@x402/evm@2.19.0` reference
 * implementation: `_verify()`'s `ErrRecipientMismatch` guard plus
 * `verifyTypedDataSignature()` over the EIP-712 `TransferWithAuthorization`
 * struct, both in `src/exact/facilitator/scheme.ts`; the on-chain contract
 * call is `transferWithAuthorization` per EIP-3009). This assay proves the
 * negative operationally: it sends a well-formed-shape probe whose
 * `authorization.to` deliberately differs from the declared `payTo` and
 * requires the facilitator to refuse it, never to report it valid.
 *
 * @param {object} [args]
 * @param {string} args.facilitatorUrl facilitator base URL, must be HTTPS
 * @param {string} [args.network] required CAIP-2 EVM network, default Base mainnet
 * @param {string} [args.rpcUrl] public keyless EVM JSON-RPC endpoint for signer reputation
 * @param {typeof fetch} [args.fetchImpl] injected fetch for the RPC reputation probe
 * @param {(url: string) => {getSupported: Function, verify: Function, settle: Function}} [args.clientFactory]
 *   constructs the facilitator client; defaults to the official `HTTPFacilitatorClient`
 * @returns {Promise<object>} the full assay result, `qualified` true only if every boundary property held
 */
export async function assayX402Facilitator({
  facilitatorUrl,
  network: requiredNetwork = "eip155:8453",
  rpcUrl = "https://mainnet.base.org",
  fetchImpl = globalThis.fetch,
  clientFactory = (url) => new HTTPFacilitatorClient({ url }),
} = {}) {
  const url = canonicalizeHttpsUrl(facilitatorUrl, "x402 facilitator URL");
  const net = network(requiredNetwork);
  if (typeof fetchImpl !== "function") throw new TypeError("facilitator assay requires one fetch implementation");
  const client = clientFactory(url);
  const problems = [];

  let supported;
  try {
    const raw = await client.getSupported();
    const hasRequiredKind = (raw.kinds ?? []).some(
      (kind) => kind.x402Version === 2 && kind.scheme === "exact" && kind.network === net,
    );
    const signerAddresses = [
      ...new Set([...(raw.signers?.[net] ?? []), ...(raw.signers?.["eip155:*"] ?? [])]),
    ];
    supported = { ok: true, hasRequiredKind, extensions: raw.extensions ?? [], signerAddresses };
    if (!hasRequiredKind) problems.push(`/supported does not declare x402Version 2, scheme "exact", network "${net}"`);
  } catch (error) {
    supported = { ok: false, error: error instanceof Error ? error.message : String(error) };
    problems.push(`/supported failed or returned schema-invalid data: ${supported.error}`);
  }

  const requirements = probeRequirements(net);
  const malformedVerify = await classifyRefusal(() => client.verify({}, {}), "verify", VerifyError);
  if (!malformedVerify.conformant) problems.push(`/verify did not refuse a malformed payload in protocol-conformant shape (${malformedVerify.mode})`);

  const malformedSettle = await classifyRefusal(() => client.settle({}, {}), "settle", SettleError);
  if (!malformedSettle.conformant) problems.push(`/settle did not refuse a malformed payload in protocol-conformant shape (${malformedSettle.mode})`);

  const recipientMismatchPayload = mismatchedPayload(net, requirements);
  const recipientMismatchVerify = await classifyRefusal(
    () => client.verify(recipientMismatchPayload, requirements),
    "verify",
    VerifyError,
  );
  if (recipientMismatchVerify.critical) {
    problems.push(`/verify reported isValid:true for a recipient-mismatched probe (exact-scheme boundary violation)`);
  }

  const signerReputation = await Promise.all(
    (supported.signerAddresses ?? []).slice(0, 8).map(async (address) => ({
      ...(await addressFootprint(rpcUrl, address, fetchImpl)),
      basescanUrl: `https://basescan.org/address/${address}`,
    })),
  );

  return Object.freeze({
    facilitatorUrl: url,
    network: net,
    supported,
    malformedVerify,
    malformedSettle,
    recipientMismatchVerify,
    signerReputation: Object.freeze(signerReputation),
    basescanApiKeyless: Object.freeze({
      attempted: "api.basescan.org and api.etherscan.io/v2 (chainid=8453)",
      result: "both require a registered API key as of the Etherscan V2 migration (api.basescan.org: \"deprecated V1 endpoint\"; api.etherscan.io/v2 free tier: \"Free API access is not supported for this chain\") -- verified live, no key satisfies either without registration",
      substitution: "signer reputation instead read directly from the public Base JSON-RPC endpoint (eth_getCode/eth_getBalance/eth_getTransactionCount), which is genuinely keyless; basescanUrl is supplied per address for a human label/tag check",
    }),
    qualified: problems.length === 0,
    problems: Object.freeze(problems),
  });
}
