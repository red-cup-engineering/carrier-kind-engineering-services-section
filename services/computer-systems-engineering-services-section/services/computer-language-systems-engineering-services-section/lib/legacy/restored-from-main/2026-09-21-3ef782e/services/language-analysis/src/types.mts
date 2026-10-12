// types.ts — the output vocabulary of the analysis layer.
// Inputs (ParseResult, ParsedWord, …) come from @emsenn/language-topology;
// the structures here are what analysis produces over a settled parse.
import type { GrammaticalCharge } from "@emsenn/language-algebra";

export type Charge = GrammaticalCharge;

// ── Entity linking ────────────────────────────────────────────────────────────

export interface KnowledgeBaseEntity {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly aliases: readonly string[];
}

export interface LinkResult {
  readonly status: "linked" | "ambiguous" | "nil";
  readonly entity: string | null;
  readonly candidates: readonly string[];
  readonly charge: Charge;
}

// ── Reference resolution ──────────────────────────────────────────────────────

export interface ReferenceResolution {
  readonly anaphor: string;
  readonly status: "resolved" | "ambiguous" | "void";
  readonly antecedent: string | null;
  readonly candidates: readonly string[];
}

export interface ReferenceResult {
  readonly resolutions: readonly ReferenceResolution[];
  readonly clusters: readonly (readonly string[])[];
}
