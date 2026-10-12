/**
 * @packageDocumentation
 *
 * integrations/openai/economy — endpoint/cost material for OpenAI-
 * compatible inference calls. Describing an OpenAI-compatible endpoint's
 * default request path is vendor-specific integration data, not general
 * contract-verification calculus, so it belongs beside this integration's
 * own schema/codec, not in `src/lib`. A recorded cost artifact is
 * the existing `openai.usage-cost` record
 * (`src/integrations/openai/src/codec`); this module supplies the
 * arithmetic that feeds it. Cost is one reading of the "costed" energy
 * behavior every registered instrument already carries
 * (`EnergeticObligation`, `src/core/energetics.mts`) — see
 * the deleted instruments catalog's `withCostedEnergetics` — not a
 * standalone budget/accounting type system.
 */
export * from "./endpoint.mts";
export * from "./cost.mts";
export * from "./service.mts";
