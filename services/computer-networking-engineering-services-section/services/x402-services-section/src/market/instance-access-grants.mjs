import { admitAccessGrants } from "./access-grants.mjs";

/** Parse explicitly bound instance authority without consulting package-owned records. */
export function requireInstanceAccessGrants(value) {
  if (value === undefined || value === null || value === "") {
    const error = new TypeError("enabled market sign-in requires explicit instance access grants");
    error.code = "MARKET_ACCESS_AUTHORITY_REQUIRED";
    throw error;
  }
  const record = typeof value === "string" ? JSON.parse(value) : value;
  if (record?.type !== "MarketAccessGrants" || record.version !== 1 || !Array.isArray(record.grants)) {
    throw new TypeError("instance access grants must be a MarketAccessGrants version 1 record");
  }
  return record;
}

/** Edge hosts bind structured authority (or its JSON encoding), not a package data file. */
export function boundInstanceAccessGrants(env) {
  return env.X402_SIGN_IN_SECRET ? requireInstanceAccessGrants(env.MARKET_ACCESS_GRANTS) : undefined;
}

/** Shared market-access construction; a merchant supplies its identity, catalog and verifier. */
export function instanceMarketAccess(env, { grants, operations, marketName, verifyContractSignature } = {}) {
  if (!env.X402_SIGN_IN_SECRET) return undefined;
  const record = requireInstanceAccessGrants(grants);
  if (typeof marketName !== "string" || marketName.trim() === "") throw new TypeError("instance market name is required");
  return {
    secret: env.X402_SIGN_IN_SECRET,
    origin: env.MARKET_ORIGIN ?? `https://${marketName}`,
    statement: `Sign in to use what this wallet has been granted at ${marketName}.`,
    grants: admitAccessGrants(record, { operations: typeof operations === "function" ? operations() : operations }),
    verifyContractSignature,
    onGrantUse: env.MARKET_SETTLEMENTS
      ? (use) => env.MARKET_SETTLEMENTS.put(`grant-uses/${use.operation}/${use.recordedAt}-${use.account}.json`, JSON.stringify(use), { httpMetadata: { contentType: "application/json" } })
      : undefined,
  };
}
