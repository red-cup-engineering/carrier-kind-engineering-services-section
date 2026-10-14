import { isPaymentRequiredV2 } from "@x402/core/schemas";

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
export async function projectProxyResponse(upstream, { publicUrl, resourceUrl = publicUrl }) {
  if (upstream.status !== 402) return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: upstream.headers });
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

  const body = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("json")) {
    try {
      const inline = JSON.parse(new TextDecoder().decode(body));
      if (isPaymentRequiredV2(inline) && !containsSameDeclaredFields(inline, challenge)) {
        return Response.json({ error: "inline payment challenge contradicts PAYMENT-REQUIRED" }, { status: 502 });
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }

  return new Response(body, { status: upstream.status, statusText: upstream.statusText, headers: upstream.headers });
}
