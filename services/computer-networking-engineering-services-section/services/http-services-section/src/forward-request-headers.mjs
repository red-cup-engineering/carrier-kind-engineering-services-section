/**
 * End-to-end request fields for a Fetch request to a selected origin.
 * Fetch derives Host and framing from that target and the forwarded body.
 * Connection options belong only to the received transport (RFC 9110 §7.6.1).
 * https://www.rfc-editor.org/rfc/rfc9110.html#section-7.6.1
 */
export function forwardRequestHeaders(input) {
  const headers = new Headers(input);
  const options = (headers.get("connection") ?? "").split(",");
  for (const option of options) {
    const name = option.trim();
    if (/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u.test(name)) headers.delete(name);
  }
  for (const name of [
    "host", "content-length", "connection", "keep-alive",
    "proxy-authenticate", "proxy-authorization", "te", "trailer",
    "transfer-encoding", "upgrade",
  ]) headers.delete(name);
  return headers;
}
