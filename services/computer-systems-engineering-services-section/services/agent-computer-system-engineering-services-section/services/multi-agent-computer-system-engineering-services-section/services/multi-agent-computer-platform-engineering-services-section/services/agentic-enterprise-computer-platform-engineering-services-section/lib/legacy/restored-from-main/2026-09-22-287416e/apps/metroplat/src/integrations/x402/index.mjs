// integrations/x402 is the x402 value-settlement integration surface.
// The x402/ap2/l402 codec, ledger-conservation law, and settlement-log
// reading are owned by the published
// `@red-cup-engineering/x402-value-settlement-service`
// (`561-group/.../computer-networking-engineering-services-section/
// services/x402-services-section/services/x402-value-settlement-service`);
// callers reach it directly by that import specifier, not through here.
// The only thing this integration owns is `receipt-record.mts`, which
// depends the published receipt vocabulary into metroplat's own generic
// journal engine — that composition is metroplat's to keep.
export * from "./receipt-record.mjs";
