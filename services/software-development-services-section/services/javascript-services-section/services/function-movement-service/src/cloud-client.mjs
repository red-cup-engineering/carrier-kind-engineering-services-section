import { createHash, sign } from "node:crypto";

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }

/** Invoke the deployed ephemeral Deno movement provider. */
export async function invokeCloudFunctionMovement({ baseUrl, input, privateKey, now = Date.now(), fetchImpl = fetch } = {}) {
  if (typeof baseUrl !== "string" || new URL(baseUrl).protocol !== "https:") throw new TypeError("baseUrl must be HTTPS");
  if (!input || typeof input !== "object" || !privateKey) throw new TypeError("input and privateKey are required");
  const body = JSON.stringify(input), endpoint = new URL("/v1/prepare-function-movement", baseUrl), timestamp = String(Math.floor(now / 1000));
  const message = `POST\n${endpoint.pathname}\n${timestamp}\n${sha256(body)}`;
  const signature = sign(null, Buffer.from(message), privateKey).toString("base64url");
  const response = await fetchImpl(endpoint, { method: "POST", headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(body)), "x-union-timestamp": timestamp, "x-union-signature": signature }, body });
  const result = await response.json();
  if (!response.ok) throw new Error(`cloud movement refused with ${response.status}: ${result.message ?? result.error ?? "unknown"}`);
  return result;
}
