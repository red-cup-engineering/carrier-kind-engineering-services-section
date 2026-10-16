/**
 * Fetch one resource without forwarding a request to a redirect destination.
 * Workerd implements manual redirects but rejects redirect: "error".
 * https://github.com/cloudflare/workerd/blob/main/src/workerd/api/http.c%2B%2B
 */
export async function fetchWithoutRedirects(input, options = {}, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(input, { ...options, redirect: "manual" });
  if ([301, 302, 303, 307, 308].includes(response.status) || response.type === "opaqueredirect") {
    await response.body?.cancel();
    throw new TypeError("HTTP redirect refused for the selected resource");
  }
  return response;
}
