const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;
const ACTOR = /^[a-z][a-z0-9+.-]*:[^\s]+$/iu;
const ACCOUNT = /^eip155:31337:0x[0-9a-fA-F]{40}$/u;
const KID = /^[^\u0000-\u001f\u007f]{1,128}$/u;
const ALGORITHM = /^[A-Za-z0-9-]{2,32}$/u;

function exact(value, keys) {
  return value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).sort().join("\0") === keys.slice().sort().join("\0");
}

function httpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) &&
      parsed.username === "" &&
      parsed.password === "";
  } catch {
    return false;
  }
}

export function normalizeAuthenticatedCardEvidence(value) {
  if (
    !exact(value, ["route", "evidence"]) ||
    !exact(value.route, ["actor", "agentCardUrl", "account"]) ||
    !exact(value.evidence, ["card", "signature", "kid", "jwks", "algorithm"])
  ) {
    throw new Error("authenticated-card-evidence-malformed");
  }
  const { route, evidence } = value;
  if (
    typeof route.actor !== "string" ||
    !ACTOR.test(route.actor) ||
    !httpUrl(route.agentCardUrl) ||
    !(route.account === null ||
      (typeof route.account === "string" && ACCOUNT.test(route.account))) ||
    typeof evidence.card !== "string" ||
    !NI.test(evidence.card) ||
    typeof evidence.signature !== "string" ||
    !NI.test(evidence.signature) ||
    typeof evidence.kid !== "string" ||
    !KID.test(evidence.kid) ||
    !httpUrl(evidence.jwks) ||
    typeof evidence.algorithm !== "string" ||
    !ALGORITHM.test(evidence.algorithm)
  ) {
    throw new Error("authenticated-card-evidence-malformed");
  }
  return Object.freeze({
    route: Object.freeze({
      actor: route.actor,
      agentCardUrl: route.agentCardUrl,
      account: route.account,
    }),
    evidence: Object.freeze({
      card: evidence.card,
      signature: evidence.signature,
      kid: evidence.kid,
      jwks: evidence.jwks,
      algorithm: evidence.algorithm,
    }),
  });
}
