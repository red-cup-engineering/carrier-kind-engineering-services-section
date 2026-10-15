import { isPaymentRequiredV2 } from "@x402/core/schemas";
import { decodePaymentResponseHeader } from "@x402/core/http";
import { exactMerchantTermsMatch } from "../offer.mjs";

function decodePaymentRequired(value) {
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}

function containsSameDeclaredFields(actual, expected) {
  if (actual === null || typeof actual !== "object") return Object.is(actual, expected);
  if (expected === null || typeof expected !== "object") return false;
  if (Array.isArray(actual)) {
    return Array.isArray(expected) && actual.length === expected.length
      && actual.every((value, index) => containsSameDeclaredFields(value, expected[index]));
  }
  return Object.entries(actual).every(([key, value]) => Object.hasOwn(expected, key)
    && containsSameDeclaredFields(value, expected[key]));
}

/** Receive the merchant's native public challenge and preserve its header and body bytes.
 * The transport address is not the priced resource. The selected offer may name
 * its canonical endpoint while the actual HTTP request carries query inputs. */
export async function projectProxyResponse(upstream, { publicUrl, resourceUrl = publicUrl, expectedTerms, signedRequest = false } = {}) {
  if (upstream.status !== 402) {
    // The backend is trusted to execute its own x402 facilitator, but the
    // public merchant must not blindly relay a successful *paid* response
    // whose settlement evidence contradicts the accepted merchant rails.
    // Access-granted or ordinary unpriced 2xx responses remain unchanged.
    if (signedRequest && upstream.ok) {
      const encoded = upstream.headers.get("PAYMENT-RESPONSE");
      let settlement;
      if (encoded && encoded.length <= 65_536) {
        try { settlement = decodePaymentResponseHeader(encoded); } catch { /* refuse below */ }
      }
      const termsValid = typeof expectedTerms?.network === "string" &&
        /^eip155:[1-9][0-9]*$/u.test(expectedTerms.network) &&
        typeof expectedTerms?.amount === "string" &&
        /^(0|[1-9][0-9]*)$/u.test(expectedTerms.amount);
      const matched = termsValid &&
        settlement?.success === true &&
        settlement.network === expectedTerms.network &&
        /^0x[0-9a-fA-F]{64}$/u.test(settlement.transaction ?? "") &&
        (settlement.amount === undefined || settlement.amount === expectedTerms.amount);
      if (!matched) {
        await upstream.body?.cancel();
        return Response.json({ error: "upstream paid response has no matching successful merchant settlement" },
          { status: 502, headers: { "cache-control": "no-store" } });
      }
    }
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: upstream.headers });
  }
  const encoded = upstream.headers.get("PAYMENT-REQUIRED");
  // A native payment boundary must never relay an unusable or unbounded quote.
  // Otherwise buyers could receive an apparently legitimate 402 from the market
  // with no verifiable terms (or force huge base64 decode allocations).
  if (encoded === null || encoded.length === 0 || encoded.length > 65_536) {
    return Response.json({ error: "upstream payment challenge is missing or oversized" }, { status: 502 });
  }

  const challenge = decodePaymentRequired(encoded);
  if (!isPaymentRequiredV2(challenge)) return Response.json({ error: "upstream payment challenge is invalid" }, { status: 502 });
  let challengedUrl;
  try { challengedUrl = new URL(challenge.resource.url).href; } catch { /* refusal below */ }
  const admittedUrls = [publicUrl, resourceUrl].map(value => new URL(value).href);
  if (!admittedUrls.includes(challengedUrl)) return Response.json({ error: "upstream payment challenge names a different resource" }, { status: 502 });

  // Runtime receiving uses the deployment's *actual* settlement authority
  // and the same owner tariff that the direct boundary uses. The Node origin
  // cannot unilaterally substitute another payee, network, token or quote.
  if (expectedTerms !== undefined) {
    const { network, asset, payTo, amount } = expectedTerms;
    if (typeof network !== "string" || !/^eip155:[1-9][0-9]*$/u.test(network) ||
        !/^0x[0-9a-fA-F]{40}$/u.test(asset ?? "") ||
        !/^0x[0-9a-fA-F]{40}$/u.test(payTo ?? "") ||
        !/^(0|[1-9][0-9]*)$/u.test(amount ?? "")) {
      throw new TypeError("trusted proxy expectedTerms must supply network, asset, recipient and atomic quote");
    }
    if (!exactMerchantTermsMatch(challenge, expectedTerms)) {
      return Response.json({ error: "upstream payment challenge contradicts the merchant's admitted offer or payout terms" }, { status: 502 });
    }
  }

  // x402 v2 places payment requirements in the bounded header. The optional
  // response body is transport material, not a license for unbounded memory
  // consumption by a public Worker (or a malicious upstream origin).
  const MAX_CHALLENGE_BODY_BYTES = 262_144;
  const indicated = upstream.headers.get("content-length");
  if (indicated !== null && /^[0-9]+$/u.test(indicated) &&
      BigInt(indicated) > BigInt(MAX_CHALLENGE_BODY_BYTES)) {
    await upstream.body?.cancel();
    return Response.json({ error: "upstream payment challenge body exceeds the admitted bound" }, { status: 502 });
  }
  const reader = upstream.body?.getReader();
  let body;
  if (!reader) {
    body = new Uint8Array(0);
  } else {
    const chunks = [];
    let total = 0, exceeded = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_CHALLENGE_BODY_BYTES) {
          exceeded = true;
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    if (exceeded) return Response.json({
      error: "upstream payment challenge body exceeds the admitted bound",
    }, { status: 502 });
    body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  }
  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("json")) {
    let inline;
    try {
      inline = JSON.parse(new TextDecoder().decode(body));
    } catch {
      // A JSON-labeled 402 with unreadable JSON is not a trustworthy
      // merchant representation, even when its header parses correctly.
      return Response.json({ error: "upstream JSON payment challenge is malformed" }, { status: 502 });
    }
    // A malformed body that *purports* to be PaymentRequired must not be
    // passed along merely because it fails the official schema predicate.
    // Ordinary JSON error documents without these x402 fields remain valid.
    const advertisesTerms = inline !== null && typeof inline === "object" &&
      !Array.isArray(inline) && ["x402Version", "resource", "accepts"]
        .some((key) => Object.hasOwn(inline, key));
    if (advertisesTerms &&
        (!isPaymentRequiredV2(inline) || !containsSameDeclaredFields(inline, challenge))) {
      return Response.json({ error: "inline payment challenge is invalid or contradicts PAYMENT-REQUIRED" }, { status: 502 });
    }
  }

  return new Response(body, { status: upstream.status, statusText: upstream.statusText, headers: upstream.headers });
}
