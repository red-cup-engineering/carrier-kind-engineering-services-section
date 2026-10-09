/**
 * SPIFFE-shaped workload identity binding for agent/runtime processes.
 *
 * This module parses SPIFFE IDs and records an optional external verification
 * receipt reference. It does NOT verify X.509-SVID/JWT-SVID material itself and
 * does NOT promote workload authentication into represented-principal, office,
 * custody, capability, or effect authority.
 */

const TRUST_DOMAIN = /^[a-z0-9._-]+$/u;
const PATH_SEGMENT = /^[A-Za-z0-9._-]+$/u;
const SPIFFE_CANONICAL = /^spiffe:\/\/([^/?#]+)(\/[^?#]*)?$/u;

function nonempty(value, label) {
  if (value.trim().length === 0) throw new TypeError(label + ": expected non-empty string");
  return value;
}

/**
 * Parse the conservative SPIFFE ID subset used at this boundary.
 *
 * Scheme must be exactly spiffe, authority must be a lowercase trust-domain,
 * userinfo/port/query/fragment are refused, and path segments may not be empty,
 * "." or "..". This is an identifier parser, not SVID verification.
 */
export function parseSpiffeId(value) {
  const source = nonempty(value, "SPIFFE ID");
  if (Buffer.byteLength(source, "ascii") > 2048) {
    throw new TypeError("SPIFFE ID: exceeds 2048-byte interoperability bound");
  }
  if (source.includes("%")) throw new TypeError("SPIFFE ID: percent encoding is not allowed");

  const match = SPIFFE_CANONICAL.exec(source);
  if (match === null) throw new TypeError("SPIFFE ID: expected canonical spiffe://trust-domain/path form");
  const [, trustDomain, rawPath] = match;

  if (trustDomain.length > 255 || !TRUST_DOMAIN.test(trustDomain)) {
    throw new TypeError("SPIFFE ID: invalid trust domain");
  }
  if (trustDomain !== trustDomain.toLowerCase()) {
    throw new TypeError("SPIFFE ID: trust domain must be lowercase");
  }
  if (trustDomain.includes("@") || trustDomain.includes(":")) {
    throw new TypeError("SPIFFE ID: userinfo and port are not allowed");
  }

  const path = rawPath ?? "";
  if (path === "/") throw new TypeError("SPIFFE ID: trailing root slash is not canonical");
  if (path.endsWith("/")) throw new TypeError("SPIFFE ID: trailing slash is not allowed");

  if (path !== "") {
    const segments = path.slice(1).split("/");
    if (
      segments.some((segment) =>
        segment.length === 0
        || segment === "."
        || segment === ".."
        || !PATH_SEGMENT.test(segment))
    ) {
      throw new TypeError("SPIFFE ID: invalid path segment");
    }
  }

  return Object.freeze({
    kind: "spiffe.id",
    value: source,
    trustDomain,
    path,
  });
}

/**
 * Bind one parsed workload identifier to MetroPlat without widening authority.
 *
 * verificationRef may point at an external SPIFFE/SVID verification receipt.
 * The reference proves only that some verifier attested workload identity under
 * its own semantics. Local principal/office/effect authority must still be
 * resolved independently.
 */
export function agentWorkloadIdentityBinding(input

 ) {
  const workload = parseSpiffeId(input.spiffeId);
  const verificationRef = input.verificationRef === undefined
    ? undefined
    : nonempty(input.verificationRef, "SPIFFE verification ref");

  return Object.freeze({
    kind: "organizing.cell.workload-identity-binding",
    workload,
    authentication: verificationRef === undefined
      ? "identifier-only"
      : "verification-referenced",
    ...(verificationRef === undefined ? {} : { verificationRef }),
    representedPrincipalAuthority: "none",
    officeAuthority: "none",
    custodyAuthority: "none",
    effectAuthority: "none",
    evidence: Object.freeze([...(input.evidence ?? [])]),
  });
}

