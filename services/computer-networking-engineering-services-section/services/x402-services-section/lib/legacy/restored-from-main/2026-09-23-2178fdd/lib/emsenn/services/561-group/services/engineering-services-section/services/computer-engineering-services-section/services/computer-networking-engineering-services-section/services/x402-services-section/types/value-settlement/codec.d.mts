export type X402Rail = "x402" | "ap2" | "l402";

export interface ValueQuantity {
  readonly kind: "value-settlement.quantity";
  readonly num: number;
  readonly den: number;
  readonly commodity: string;
}

export interface X402Challenge {
  readonly kind: "x402.challenge";
  readonly id: string;
  readonly resource: string;
  readonly payee: string;
  readonly amount: ValueQuantity;
  readonly rails: readonly X402Rail[];
  readonly issuedAt: string;
  readonly memo?: string;
}

export interface X402Payment {
  readonly kind: "x402.payment";
  readonly id: string;
  readonly challengeId: string;
  readonly resource: string;
  readonly payer: string;
  readonly payee: string;
  readonly amount: ValueQuantity;
  readonly rail: X402Rail;
  readonly authorization: string;
  readonly paidAt: string;
  readonly membrane: "across";
}

export type X402EavtTuple = readonly [unknown, unknown, unknown, unknown];

export interface X402StatementLogReference {
  readonly kind: "metroplat.witness-ledger-reference";
  readonly path: string;
  readonly mediaType: string;
  readonly rows: number;
  readonly malformed?: number;
}

export interface X402Receipt {
  readonly kind: "x402.receipt";
  readonly id: string;
  readonly challengeId: string;
  readonly paymentId: string;
  readonly resource: string;
  readonly payer: string;
  readonly payee: string;
  readonly debit: ValueQuantity;
  readonly credit: ValueQuantity;
  readonly rail: X402Rail;
  readonly settledAt: string;
  readonly valueConserved: boolean;
  readonly statementLog?: readonly X402EavtTuple[];
  readonly statementLogReference?: X402StatementLogReference;
}

export interface LedgerEntry {
  readonly quantity: ValueQuantity;
  readonly sign: "debit" | "credit";
}

export interface LedgerConservationResult {
  readonly conserved: boolean;
  readonly residual: readonly ValueQuantity[];
}

export interface LedgerCompletionResult {
  readonly residual: readonly ValueQuantity[];
}

/** A `@red-cup-engineering/computer-system-engine/contracts` JSON Schema contract. */
export interface Contract<T> {
  assert(value: unknown, context?: string): T;
  readonly [key: string]: unknown;
}

export const valueQuantitySchema: Readonly<Record<string, unknown>>;
export const x402ChallengeSchema: Readonly<Record<string, unknown>>;
export const x402PaymentSchema: Readonly<Record<string, unknown>>;
export const x402ReceiptSchema: Readonly<Record<string, unknown>>;
export const valueQuantityContract: Contract<ValueQuantity>;
export const x402ChallengeContract: Contract<X402Challenge>;
export const x402PaymentContract: Contract<X402Payment>;
export const x402ReceiptContract: Contract<X402Receipt>;

export function valueQuantity(num: number, den: number, commodity: string): ValueQuantity;
export const valueQuantityView: typeof valueQuantity;
export function x402Challenge(input: {
  readonly id: string;
  readonly resource: string;
  readonly payee: string;
  readonly amount: ValueQuantity;
  readonly rails: readonly X402Rail[];
  readonly issuedAt: string;
  readonly memo?: string;
}): X402Challenge;

export function ledgerConserved(entries: readonly LedgerEntry[]): LedgerConservationResult;
export function ledgerComplete(known: readonly LedgerEntry[]): LedgerCompletionResult;
export function valueConserved(debit: ValueQuantity, credit: ValueQuantity): boolean;

export function admitX402Receipt(value: unknown, context?: string): X402Receipt;
export function receiptFromPayment(
  challenge: X402Challenge,
  payment: X402Payment,
  options?: { readonly settledAt?: string; readonly id?: string },
): X402Receipt;
export function statementLogFromReceipt(receipt: unknown): readonly X402EavtTuple[];

export interface X402ReceiptStatementCollector {
  push(row: X402EavtTuple): void;
  read(): X402Receipt & { readonly statementRows: number };
}

export function x402ReceiptStatementCollector(): X402ReceiptStatementCollector;
export function receiptFromStatementLog(rows: readonly X402EavtTuple[]): X402Receipt;
export function isCompleteExchange(receipt: unknown): boolean;
export interface X402PaymentJudgment {
  readonly kind: "x402.settlement:witness" | "x402.settlement-obstruction";
  readonly challenge: X402Challenge;
  readonly payment: X402Payment;
  readonly receipt: X402Receipt;
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

export function verifyX402Payment(challenge: unknown, payment: unknown, receipt: unknown): X402PaymentJudgment;
export function x402ReceiptFingerprint(receipt: X402Receipt): string;
