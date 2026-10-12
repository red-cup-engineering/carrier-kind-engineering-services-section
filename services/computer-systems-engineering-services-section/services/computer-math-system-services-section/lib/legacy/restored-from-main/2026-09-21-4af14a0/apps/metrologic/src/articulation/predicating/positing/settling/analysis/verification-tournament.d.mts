/**
 * analysis/verification-tournament - finite certificate surface for
 * `RelMath.Gaming.VerificationTournament`.
 *
 * Lean keeps the runtime boundary honest: libp2p transport, global matchmaking,
 * and Dialectica game execution are supplied as finite transcript readings. This
 * module carries the part `relating` can compute: structural count equalities,
 * once-only uniqueness flags, survivor/equilibrium correspondence, and the
 * FOUR-closure fixed-point read used by the no-periodic-orbits theorem.
 */
import type { ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type ChargeClosureCarrier } from "../../closure-operator-fiber.mjs";
export type StrategyRole = "claim" | "refutation";
export interface Certificate {
    readonly kind: "verificationTournament.certificate";
    readonly noProfitableDeviation: boolean;
    readonly dialecticaWitnessSurvives: boolean;
    readonly equilibriumMatchesSurvivor: boolean;
}
export interface RuntimeObligations {
    readonly kind: "verificationTournament.runtimeObligations";
    readonly dialecticaObjectMap: boolean;
    readonly transportRosterWitnessed: boolean;
    readonly matchmakingOnceOnly: boolean;
    readonly strategyPlayWitnessed: boolean;
    readonly nashStable: boolean;
    readonly dialecticaWitnessSurvives: boolean;
    readonly equilibriumMatchesSurvivor: boolean;
}
export interface OperationalWitnesses {
    readonly kind: "verificationTournament.operationalWitnesses";
    readonly dialecticaObjectMap: boolean;
    readonly transportRosterWitnessed: boolean;
    readonly matchmakingOnceOnly: boolean;
    readonly strategyPlayWitnessed: boolean;
}
export interface StructuralOperationalReading {
    readonly kind: "verificationTournament.structuralOperationalReading";
    readonly claims: number;
    readonly refutations: number;
    readonly peers: number;
    readonly plays: number;
    readonly dialecticaWitnesses: number;
    readonly dialecticaChallenges: number;
    readonly transcriptMessages: number;
    readonly ticketedPeers: number;
    readonly matchedPlayers: number;
    readonly pairwiseMatches: number;
    readonly pairwiseStreams: number;
    readonly ticketsUnique: boolean;
    readonly matchedPlayersUnique: boolean;
    readonly matchedPlayersKnown: boolean;
}
export interface SurvivorReading {
    readonly kind: "verificationTournament.survivorReading";
    readonly settledStrategy: number;
    readonly survivingClaim: number;
    readonly settledRole: StrategyRole;
    readonly fixedPoint: boolean;
    readonly pure: boolean;
    readonly allRefutationsAnswered: boolean;
    readonly noDominantRefutation: boolean;
}
export interface SurvivorCorrespondenceWitness {
    readonly kind: "verificationTournament.survivorCorrespondence:witness";
    readonly reading: SurvivorReading;
    readonly nashNoDeviation: true;
    readonly dialecticaWitnessSurvives: true;
    readonly equilibriumMatchesSurvivor: true;
}
export interface SettledVerdictWitness {
    readonly kind: "verificationTournament.settledVerdict:witness";
    readonly closure: ChargeClosureCarrier;
    readonly seed: ChargeValueName;
    readonly period: number;
    readonly cycleReturns: true;
    readonly fixedPoint: true;
    readonly certificate: Certificate;
    readonly stableForSeed: true;
    readonly correspondsToSurvivor: true;
}
export interface RuntimeTournamentReceipt {
    readonly kind: "verificationTournament.receipt:witness";
    readonly structural: StructuralOperationalReading;
    readonly operational: OperationalWitnesses;
    readonly survivor: SurvivorReading;
    readonly survivorCorrespondence: SurvivorCorrespondenceWitness;
    readonly runtimeObligations: RuntimeObligations;
    readonly verdict: SettledVerdictWitness;
    readonly runtimeBoundary: "transport, matchmaking, and Dialectica execution are supplied transcript obligations";
}
export declare function structuralOperationalReading(input: Omit<StructuralOperationalReading, "kind">): StructuralOperationalReading;
export declare function survivorReading(input: Omit<SurvivorReading, "kind">): SurvivorReading;
export declare const dialecticaObjectMapped: (reading: StructuralOperationalReading) => boolean;
export declare const transportRosterWitnessed: (reading: StructuralOperationalReading) => boolean;
export declare const matchmakingOnceOnly: (reading: StructuralOperationalReading) => boolean;
export declare const strategyPlayWitnessed: (reading: StructuralOperationalReading) => boolean;
export declare function operationalWitnessesOfStructuralReading(reading: StructuralOperationalReading): OperationalWitnesses;
export declare const nashNoDeviation: (reading: SurvivorReading) => boolean;
export declare const dialecticaWitnessSurvives: (reading: SurvivorReading) => boolean;
export declare const equilibriumMatchesSurvivor: (reading: SurvivorReading) => boolean;
export declare function survivorCorrespondenceOfUniqueDominantClaim(reading: SurvivorReading): SurvivorCorrespondenceWitness;
export declare function runtimeObligationsOfReading(ops: OperationalWitnesses, reading: SurvivorReading): RuntimeObligations;
export declare function noPeriodicOrbitFixedPoint(closure: ChargeClosureCarrier, seed: ChargeValueName, period: number): boolean;
export declare function settledVerdictOfClosureCertificate(closure: ChargeClosureCarrier, seed: ChargeValueName, period: number, certificate: Certificate): SettledVerdictWitness;
export declare function receipt(): RuntimeTournamentReceipt;
