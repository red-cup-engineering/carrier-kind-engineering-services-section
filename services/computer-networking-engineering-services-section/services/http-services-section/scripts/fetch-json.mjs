// fetch-json — the house's one "call fetch, refuse a non-ok status, parse
// the body as JSON" client helper: the shape almost every hand-rolled
// `await (await fetch(url)).json()` call across the house independently
// grew a version of, minus each copy's own inconsistent handling of a
// non-2xx status and a non-JSON body.
//
// No Node builtins: this module names only the platform `fetch`/`AbortSignal`
// globals, so it is exactly as usable inside a browser bundle as it is under
// Node's own global fetch. Callers whose law is genuinely different --
// custom auth headers plus retryWithBackoff, streaming bodies, a
// non-JSON-on-failure API -- are not this function and should not be forced
// through it.

/** Thrown by {@link fetchJson} on a failed request, a non-ok HTTP status, or an unparsable JSON body. */
export class FetchJsonError extends Error {
  status;
  url;
  constructor(message, { status, url, cause } = {}) {
    super(message, { cause });
    this.name = "FetchJsonError";
    this.status = status;
    this.url = url;
  }
}

/**
 * Fetch `url`, refuse a non-ok status, and parse the response body as JSON.
 *
 * @param {string|URL} url
 * @param {object} [options] - forwarded to `fetch` (method, headers, body, ...), plus:
 * @param {number} [options.timeoutMs] - aborts the request after this many milliseconds.
 * @param {AbortSignal} [options.signal] - an additional signal to abort on; combined with `timeoutMs` when both are given.
 * @returns {Promise<*>} the parsed JSON body.
 * @throws {FetchJsonError} carrying `status` and `url` when the network request fails, the response status is not ok, or the body is not valid JSON.
 */
export async function fetchJson(url, options = {}) {
  const { timeoutMs, signal: suppliedSignal, ...init } = options;
  const href = String(url);
  const signal = combineSignals(suppliedSignal, timeoutMs);

  let response;
  try {
    response = await fetch(url, signal === undefined ? init : { ...init, signal });
  } catch (cause) {
    throw new FetchJsonError(`fetchJson: request to ${href} failed`, { url: href, cause });
  }

  if (!response.ok) {
    throw new FetchJsonError(`fetchJson: ${href} responded ${response.status}`, { status: response.status, url: href });
  }

  try {
    return await response.json();
  } catch (cause) {
    throw new FetchJsonError(`fetchJson: ${href} response body was not valid JSON`, { status: response.status, url: href, cause });
  }
}

function combineSignals(suppliedSignal, timeoutMs) {
  if (timeoutMs === undefined) return suppliedSignal;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (suppliedSignal === undefined) return timeoutSignal;
  return AbortSignal.any([suppliedSignal, timeoutSignal]);
}
