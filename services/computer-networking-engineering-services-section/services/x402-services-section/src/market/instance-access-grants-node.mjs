import { readFileSync } from "node:fs";
import { requireInstanceAccessGrants } from "./instance-access-grants.mjs";

/** Read only explicitly bound Node instance authority, before starting instance effects. */
export function readInstanceAccessGrants(env) {
  if (!env.X402_SIGN_IN_SECRET) return undefined;
  const path = env.MARKET_ACCESS_GRANTS_PATH;
  if (typeof path !== "string" || path.trim() === "" || path.includes("\0")) {
    const error = new TypeError("enabled Node market sign-in requires MARKET_ACCESS_GRANTS_PATH");
    error.code = "MARKET_ACCESS_AUTHORITY_REQUIRED";
    throw error;
  }
  return requireInstanceAccessGrants(readFileSync(path, "utf8"));
}
