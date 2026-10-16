#!/usr/bin/env node
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-operation-engineering-services-section/operation";

const IDENTITY_ADMITTED_FOR_NO_KYC = new Set(["none", "email"]);

/**
 * Filters a No Buy surface catalog to the subset admitted by one tier, with each excluded surface's reason as a datum. no-kyc admits only requiresIdentity none or email; no-purchase admits only requiresPurchase false. A surface whose relevant field is "unknown" is excluded with reason "unknown", never guessed into either tier.
 * @param {object} request A record with `catalog` (a NoBuySurfaceCatalog) and `tier` ("no-purchase" | "no-kyc").
 * @returns {object} `{tier, admitted: object[], excluded: {id, provider, reason}[]}` — admitted carries the surfaces satisfying the tier, in the catalog's own order; excluded names every other surface with its exclusion reason.
 * @throws {TypeError} When request.catalog does not carry a surfaces array, or request.tier is not "no-purchase" or "no-kyc".
 */
export function filterSetOfSurfacesByTier(request) {
  if (!request || typeof request !== "object" || !Array.isArray(request.catalog?.surfaces)) {
    throw new TypeError("request.catalog must carry a surfaces array");
  }
  if (request.tier !== "no-purchase" && request.tier !== "no-kyc") {
    throw new TypeError('request.tier must be "no-purchase" or "no-kyc"');
  }
  const admitted = [];
  const excluded = [];
  for (const surface of request.catalog.surfaces) {
    if (request.tier === "no-purchase") {
      if (surface.requiresPurchase === false) {
        admitted.push(surface);
      } else {
        excluded.push({ id: surface.id, provider: surface.provider, reason: surface.requiresPurchase === true ? "requires-purchase" : "unknown" });
      }
    } else {
      if (IDENTITY_ADMITTED_FOR_NO_KYC.has(surface.requiresIdentity)) {
        admitted.push(surface);
      } else {
        excluded.push({ id: surface.id, provider: surface.provider, reason: surface.requiresIdentity === "unknown" ? "unknown" : `requires-identity-${surface.requiresIdentity}` });
      }
    }
  }
  return { tier: request.tier, admitted, excluded };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "filter-set-of-surfaces-by-tier", description: "Filters a No Buy surface catalog to the subset admitted by one tier, with each excluded surface's reason as a datum.", operation: filterSetOfSurfacesByTier }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
