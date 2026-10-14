import { operation } from "./operation.mjs";

import { observePublicJson } from "@red-cup-engineering/http-services-section/public-json-observation";

export function publicHttpJsonObserveOperation({ clock = () => new Date().toISOString() } = {}) {
  return operation({
    verb: "public-http-json-observe",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Read one bounded public JSON resource through the SSRF-safe Red Cup HTTP policy.",
    description: "GETs one credential-free public HTTP(S) URL, checking every redirect against the public-network policy and bounding time/body size. Returns OBSERVED only when this node actually receives valid JSON; network/policy/status/body uncertainty remains UNKNOWN. This operation does not decide the caller's standards, product, scientific or market conformance.",
    reads: [],
    writes: [],
    effects: {
      class: "external",
      replay: "safe",
      coordination: "coordination-free",
      deterministic: "unmeasured",
      totality: "partial",
    },
    run: async (input = {}) => observePublicJson(input, { clock }),
  });
}

export function httpObservationOperations(binding = {}) {
  return Object.freeze([
    publicHttpJsonObserveOperation({ clock: binding.now ?? (() => new Date().toISOString()) }),
  ]);
}
