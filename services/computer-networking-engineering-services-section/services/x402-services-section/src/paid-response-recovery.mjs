import { decodePaymentSignatureHeader } from "@x402/core/http";

const utf8 = new TextEncoder();

async function sha256(value) {
  const bytes = typeof value === "string" ? utf8.encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function lowerAddress(value, label) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/u.test(value)) {
    throw new TypeError(`exact-EVM ${label} must be a 20-byte address`);
  }
  return value.toLowerCase();
}

/**
 * Identify one EIP-3009 authorization independently of incidental payload fields.
 * A signature digest is retained separately to reject altered credentials which
 * reuse the same network/asset/from/nonce tuple.
 */
export async function identifyPaidResponseAuthorization(paymentPayload, recoveryToken) {
  const accepted = paymentPayload?.accepted;
  const authorization = paymentPayload?.payload?.authorization;
  const signature = paymentPayload?.payload?.signature;
  if (paymentPayload?.x402Version !== 2 || accepted?.scheme !== "exact") return null;
  if (typeof accepted.network !== "string" || !/^eip155:[1-9][0-9]*$/u.test(accepted.network)) return null;
  if (typeof authorization?.nonce !== "string" || !/^0x[0-9a-fA-F]{64}$/u.test(authorization.nonce)) return null;
  if (typeof signature !== "string" || signature.length === 0
    || typeof recoveryToken !== "string" || !/^[0-9a-f]{64}$/u.test(recoveryToken)) return null;
  let identityValue;
  let authorizationValue;
  let paymentValue;
  try {
    identityValue = {
      network: accepted.network,
      asset: lowerAddress(accepted.asset, "asset"),
      from: lowerAddress(authorization.from, "authorization.from"),
      nonce: authorization.nonce.toLowerCase(),
    };
    authorizationValue = {
      from: identityValue.from,
      to: lowerAddress(authorization.to, "authorization.to"),
      value: String(authorization.value ?? ""),
      validAfter: String(authorization.validAfter ?? ""),
      validBefore: String(authorization.validBefore ?? ""),
      nonce: identityValue.nonce,
    };
    paymentValue = {
      scheme: accepted.scheme,
      network: accepted.network,
      asset: identityValue.asset,
      amount: String(accepted.amount ?? ""),
      payTo: lowerAddress(accepted.payTo, "payment payTo"),
    };
  } catch { return null; }
  return Object.freeze({
    identity: await sha256(JSON.stringify(identityValue)),
    credentialDigest: await sha256(`${signature}\n${recoveryToken}\n${JSON.stringify(paymentValue)}`),
    identityValue: Object.freeze(identityValue),
    authorization: Object.freeze(authorizationValue),
    accepted: Object.freeze(paymentValue),
  });
}

/** Hash the exact request representation without retaining its body. */
export async function paidResponseRequestDigest(request) {
  const body = new Uint8Array(await request.clone().arrayBuffer());
  const prefix = utf8.encode(`${request.method.toUpperCase()}\n${request.url}\n`);
  const bytes = new Uint8Array(prefix.length + body.length);
  bytes.set(prefix);
  bytes.set(body, prefix.length);
  return sha256(bytes);
}

function storedResponse(response) {
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

function retryResponse(status, message) {
  return Response.json({ error: message }, { status, headers: { "retry-after": "2", "cache-control": "no-store" } });
}

/** Parse a candidate authorization and digest the request body without persisting it. */
export async function inspectPaidResponseRequest(request) {
  const header = request.headers.get("payment-signature");
  if (!header) return null;
  const recoveryToken = request.headers.get("x-payment-recovery");
  if (typeof recoveryToken !== "string" || !/^[0-9a-f]{64}$/u.test(recoveryToken)) return null;
  let paymentPayload;
  try { paymentPayload = decodePaymentSignatureHeader(header); }
  catch { return null; }
  const credential = await identifyPaidResponseAuthorization(paymentPayload, recoveryToken);
  if (credential === null) return null;
  return Object.freeze({
    ...credential,
    requestDigest: await paidResponseRequestDigest(request),
    method: request.method.toUpperCase(),
    path: new URL(request.url).pathname,
    paymentPayload,
  });
}

function responseFromStored(value) {
  if (value instanceof Response) return storedResponse(value);
  if (value === null || typeof value !== "object" || !(value.body instanceof ArrayBuffer || ArrayBuffer.isView(value.body))) {
    throw new TypeError("recovered purchase response is malformed");
  }
  return new Response(value.body, {
    status: value.status,
    statusText: value.statusText,
    headers: value.headers,
  });
}

/**
 * Recover a completed opt-in digital-content purchase before the x402 library
 * rejects its already-used authorization. Stores implement atomic claim,
 * response preparation, and settlement finalization in the app's durable store.
 * An explicit lazy store supplier is resolved only after signed-request and
 * recovery-token inspection; a held proposal never opens storage on discovery.
 */
export async function recoverPaidResponse(request, store) {
  if (store === undefined) return null;
  if (!request.headers.has("payment-signature")) return null;
  const inspected = await inspectPaidResponseRequest(request);
  if (inspected === null) return Response.json({ error: "recoverable purchases require a valid X-Payment-Recovery token" }, { status: 400, headers: { "cache-control": "no-store" } });
  let result;
  try {
    const receivedStore = typeof store === "function" ? store() : store;
    result = await receivedStore.recover(inspected);
  }
  catch { return retryResponse(503, "purchase status is temporarily unavailable; retry this exact request shortly"); }
  if (result?.state === "complete") {
    const response = responseFromStored(result.response);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(result.settlementHeaders ?? {})) headers.set(name, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  if (result?.state === "pending") return retryResponse(503, "purchase is settling; retry this exact request shortly");
  if (result?.state === "expired") return Response.json({ error: "authorization expired without settlement; create a new purchase authorization" }, { status: 410, headers: { "cache-control": "no-store" } });
  if (result?.state === "conflict") return Response.json({ error: "payment authorization is already bound to a different request" }, { status: 409, headers: { "cache-control": "no-store" } });
  return null;
}
