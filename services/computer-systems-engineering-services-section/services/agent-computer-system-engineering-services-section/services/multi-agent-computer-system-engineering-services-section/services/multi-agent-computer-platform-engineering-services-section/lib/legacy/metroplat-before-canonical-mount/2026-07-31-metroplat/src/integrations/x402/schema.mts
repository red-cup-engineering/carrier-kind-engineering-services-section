// integrations/x402/schema exposes the schema and contract face for x402 value-settlement material.
// The executable codec lives beside it so integrations can import schema-only shape without reaching through coordination.
export {
  valueQuantitySchema,
  x402ChallengeSchema,
  x402PaymentSchema,
  x402ReceiptSchema,
  x402PaymentJudgmentSchema,
  webSubPublicationSchema,
  valueSettlementLogSchema,
  valueQuantityContract,
  x402ChallengeContract,
  x402PaymentContract,
  x402ReceiptContract,
  x402PaymentJudgmentContract,
  webSubPublicationContract,
  valueSettlementLogContract,
} from "./codec.mts";

export type {
  LedgerEntry,
  ValueConflict,
  ValueQuantity,
  WebSubPublication,
  ValueSettlementLog,
  X402Challenge,
  X402Payment,
  X402Receipt,
  X402PaymentJudgment,
} from "./codec.mts";
