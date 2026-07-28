#!/usr/bin/env node

import { createServer } from "./tollbooth.mjs";

try {
  for (const name of ["RMN_CONFORMANCE_AGENT", "WIT_TRANSITION_ASSAY_AGENT", "RWIL_RDF_AGENT"]) {
    if (typeof process.env[name] !== "string" || !/^https?:\/\//u.test(process.env[name])) throw new Error(`${name} must name one explicit hired provider Agent Card URL`);
  }
  const admitted = createServer(process.env);
  process.stdout.write(`${JSON.stringify({
    type: "MeteredInferenceTollboothRuntimeAdmission",
    admitted: true,
    route: "/inference",
    network: admitted.network,
    payTo: admitted.payTo,
    price: admitted.price,
    facilitator: admitted.facilitatorUrl,
    rwilProvider: process.env.RWIL_RDF_AGENT,
    authority: {
      settlement: "contracted-x402-facilitator-only",
      providerSelection: "customer-contract-only",
      record: "hired-rwil-rdf-provider-only",
      syntheticReceipt: false,
    },
  })}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    type: "MeteredInferenceTollboothRuntimeAdmission",
    admitted: false,
    reason: error instanceof Error ? error.message : String(error),
    syntheticReceipt: false,
  })}\n`);
  process.exitCode = 1;
}
