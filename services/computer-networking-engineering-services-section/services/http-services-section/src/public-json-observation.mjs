import { fetchWithPolicy } from "./fetch-policy.mjs";
import { BodyReadError, collectBody } from "./body/body.mjs";

export const DEFAULT_PUBLIC_JSON_TIMEOUT_MS = 10_000;
export const DEFAULT_PUBLIC_JSON_MAX_BYTES = 1_048_576;

function unknown({ requestedUrl, observedAt, reason, httpStatus = null, detail = null, url = null }) {
  return Object.freeze({
    kind: "red-cup.http.public-json-observation",
    requestedUrl,
    url,
    observedAt,
    state: "unknown",
    reason,
    httpStatus,
    detail,
    body: null,
  });
}

function validateRequest({ url, timeoutMs, maxBytes }) {
  if (typeof url !== "string" || url.length === 0) throw new TypeError("url must be a non-empty string");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
    throw new RangeError("timeoutMs must be an integer from 1 through 60000");
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 8 * 1024 * 1024) {
    throw new RangeError("maxBytes must be an integer from 1 through 8388608");
  }
}

function timeoutReason(error) {
  return error?.name === "AbortError" || error?.name === "TimeoutError";
}

/**
 * Observe one public JSON resource through Red Cup's outbound public-network policy.
 *
 * This function answers only whether this observer acquired valid JSON from the public
 * receiving surface. It does not decide whether that JSON conforms to a caller's business,
 * product, standards, or market contract.
 */
export async function observePublicJson(
  request,
  {
    fetchImpl = globalThis.fetch,
    boundary = {},
    clock = () => new Date().toISOString(),
  } = {},
) {
  const {
    url,
    timeoutMs = DEFAULT_PUBLIC_JSON_TIMEOUT_MS,
    maxBytes = DEFAULT_PUBLIC_JSON_MAX_BYTES,
  } = request ?? {};
  validateRequest({ url, timeoutMs, maxBytes });

  const observedAt = clock();
  const signal = AbortSignal.timeout(timeoutMs);
  let response;
  try {
    response = await fetchWithPolicy(
      url,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "user-agent": "red-cup-public-json-observer/1",
        },
        signal,
      },
      "public-json-observation",
      { ...boundary, fetchImpl },
    );
  } catch (error) {
    return unknown({
      requestedUrl: url,
      observedAt,
      reason: timeoutReason(error) ? "timeout" : "request-or-policy-error",
      detail: String(error?.message ?? error),
    });
  }

  const finalUrl = response.url || url;
  if (!response.ok) {
    return unknown({
      requestedUrl: url,
      url: finalUrl,
      observedAt,
      reason: "http-non-success",
      httpStatus: response.status,
    });
  }

  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) {
    void response.body?.cancel().catch(() => {});
    return unknown({
      requestedUrl: url,
      url: finalUrl,
      observedAt,
      reason: "body-too-large",
      httpStatus: response.status,
      detail: `content-length ${length} exceeds maxBytes ${maxBytes}`,
    });
  }

  let bytes;
  try {
    bytes = await collectBody(response.body, maxBytes, "public JSON response", signal);
  } catch (error) {
    return unknown({
      requestedUrl: url,
      url: finalUrl,
      observedAt,
      reason: error instanceof BodyReadError && error.code === "body-too-large" ? "body-too-large" : "body-read-error",
      httpStatus: response.status,
      detail: String(error?.message ?? error),
    });
  }

  let body;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    return unknown({
      requestedUrl: url,
      url: finalUrl,
      observedAt,
      reason: "invalid-json",
      httpStatus: response.status,
      detail: String(error?.message ?? error),
    });
  }

  return Object.freeze({
    kind: "red-cup.http.public-json-observation",
    requestedUrl: url,
    url: finalUrl,
    observedAt,
    state: "observed",
    reason: "public-json-observed",
    httpStatus: response.status,
    detail: null,
    body,
  });
}
