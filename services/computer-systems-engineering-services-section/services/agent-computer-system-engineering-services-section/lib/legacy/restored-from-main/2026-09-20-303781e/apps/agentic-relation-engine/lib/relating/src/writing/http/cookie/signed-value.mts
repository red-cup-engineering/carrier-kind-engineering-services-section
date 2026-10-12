// signed-value.mts — HMAC-signed cookie values.
//
// Semantic value: a string. Wire form: "value.signature" with an HMAC
// over a salt-scoped key. The pair is a RETRACTION onto the image of
// sign: unsignCookieValue ∘ signCookieValue = id, and everything outside
// the image (tampered or unsigned text) decodes to null. Verification is
// timing-safe.

import { hmacSha256Base64Url, timingSafeStringEqual } from "../../../codecs/host/javascript/crypto/index.mjs";
import { unsignCookieValue } from "@red-cup-engineering/sign-http-cookie-value-service";
export { unsignCookieValue };

export function signCookieValue(value: string, secret: string, salt = "cookie"): string {
  if (!secret) throw new TypeError("signCookieValue: secret is required");
  const signature = hmacSha256Base64Url(secret, [salt, "\0", value]);
  return `${value}.${signature}`;
}



function safeEqual(left: string, right: string): boolean {
  return timingSafeStringEqual(left, right);
}
