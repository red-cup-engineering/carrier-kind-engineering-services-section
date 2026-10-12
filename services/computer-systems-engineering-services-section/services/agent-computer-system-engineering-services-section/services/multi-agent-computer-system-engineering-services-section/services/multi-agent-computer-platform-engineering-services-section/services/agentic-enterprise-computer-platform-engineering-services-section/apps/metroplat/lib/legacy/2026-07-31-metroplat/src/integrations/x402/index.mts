// integrations/x402 is the x402 value-settlement integration surface.
// It exports the codec/schema material and the receipt-record projection that depends into runtime journal without making runtime depend on x402.
export * from "./codec.mts";
export * from "./schema.mts";
export * from "./receipt-record.mts";
