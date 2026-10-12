/**
 * analysis/verification-tournament - finite certificate surface for
 *
 * Lean keeps the runtime boundary honest: libp2p transport, global matchmaking,
 * and Dialectica game execution are supplied as finite transcript readings. This
 * module carries the part `metroplat` can compute: structural count equalities,
 * once-only uniqueness flags, survivor/equilibrium correspondence, and the
 * FOUR-closure fixed-point read used by the no-periodic-orbits theorem.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import type { ChargeValueName } from "@red-cup-engineering/agentic-enterprise-computer-platform-engineering-services-section/claim-charge";
import {
  applyChargeClosure,
  iterateChargeOperation,
  knowledgeJoinClosure,
  type ChargeClosure,
} from "@red-cup-engineering/agentic-enterprise-computer-platform-engineering-services-section/closure-operator-fiber";


export const verificationTournamentLeanModule = "Obsmetrologia.Relational.Gaming.VerificationTournament" as const;

export const verificationTournamentLeanTheorems = Object.freeze({
  settledVerdictOfClosureCertificate:
    "Obsmetrologia.Relational.Gaming.VerificationTournament.settled_verdict_of_closure_certificate",
  runtimeTournamentSettledOfObligations:
    "Obsmetrologia.Relational.Gaming.VerificationTournament.runtime_tournament_settled_of_obligations",
  survivorCorrespondenceOfUniqueDominantClaim:
    "Obsmetrologia.Relational.Gaming.VerificationTournament.survivor_correspondence_of_unique_dominant_claim",
  operationalChecksOfStructuralReading:
    "Obsmetrologia.Relational.Gaming.VerificationTournament.operational_witnesses_of_structural_reading",
  runtimeTournamentSettledOfReading:
    "Obsmetrologia.Relational.Gaming.VerificationTournament.runtime_tournament_settled_of_reading",
  runtimeTournamentSettledOfStructuralReading:
    "Obsmetrologia.Relational.Gaming.VerificationTournament.runtime_tournament_settled_of_structural_reading",
} as const);

export const verificationTournamentReceiptTheorems = Object.freeze([
  verificationTournamentLeanTheorems.operationalChecksOfStructuralReading,
  verificationTournamentLeanTheorems.survivorCorrespondenceOfUniqueDominantClaim,
  verificationTournamentLeanTheorems.settledVerdictOfClosureCertificate,
  verificationTournamentLeanTheorems.runtimeTournamentSettledOfStructuralReading,
] as const);

export type StrategyRole = "claim" | "refutation";

export const certificateSchema = {
  $id: "metroplat/closure/analysis/verification-tournament/certificate",
  type: "object",
  required: ["kind", "noProfitableDeviation", "dialecticaWitnessSurvives", "equilibriumMatchesSurvivor"],
  properties: {
    kind: { const: "verificationTournament.certificate" },
    noProfitableDeviation: { type: "boolean" },
    dialecticaWitnessSurvives: { type: "boolean" },
    equilibriumMatchesSurvivor: { type: "boolean" },
  },
  additionalProperties: false,
  title: "Certificate",
  description: "The verification tournament's settled-verdict certificate.",
} as const;

export type Certificate = FromJsonSchema<typeof certificateSchema>;

export const runtimeObligationsSchema = {
  $id: "metroplat/closure/analysis/verification-tournament/runtime-obligations",
  type: "object",
  required: [
    "kind", "dialecticaObjectMap", "transportRosterComplete", "matchmakingOnceOnly",
    "strategyPlayComplete", "nashStable", "dialecticaWitnessSurvives", "equilibriumMatchesSurvivor",
  ],
  properties: {
    kind: { const: "verificationTournament.runtimeObligations" },
    dialecticaObjectMap: { type: "boolean" },
    transportRosterComplete: { type: "boolean" },
    matchmakingOnceOnly: { type: "boolean" },
    strategyPlayComplete: { type: "boolean" },
    nashStable: { type: "boolean" },
    dialecticaWitnessSurvives: { type: "boolean" },
    equilibriumMatchesSurvivor: { type: "boolean" },
  },
  additionalProperties: false,
  title: "RuntimeObligations",
  description: "The finite transcript obligations the runtime boundary must supply.",
} as const;

export type RuntimeObligations = FromJsonSchema<typeof runtimeObligationsSchema>;

export interface OperationalChecks {
  readonly kind: "verificationTournament.operationalWitnesses";
  readonly dialecticaObjectMap: boolean;
  readonly transportRosterComplete: boolean;
  readonly matchmakingOnceOnly: boolean;
  readonly strategyPlayComplete: boolean;
  readonly leanTheorem: typeof verificationTournamentLeanTheorems.operationalChecksOfStructuralReading;
}

export const structuralOperationalReadingSchema = {
  $id: "metroplat/closure/analysis/verification-tournament/structural-operational-reading",
  type: "object",
  required: [
    "kind", "claims", "refutations", "peers", "plays", "dialecticaWitnesses", "dialecticaChallenges",
    "transcriptMessages", "ticketedPeers", "matchedPlayers", "pairwiseMatches", "pairwiseStreams",
    "ticketsUnique", "matchedPlayersUnique", "matchedPlayersKnown",
  ],
  properties: {
    kind: { const: "verificationTournament.structuralOperationalReading" },
    claims: { type: "number" },
    refutations: { type: "number" },
    peers: { type: "number" },
    plays: { type: "number" },
    dialecticaWitnesses: { type: "number" },
    dialecticaChallenges: { type: "number" },
    transcriptMessages: { type: "number" },
    ticketedPeers: { type: "number" },
    matchedPlayers: { type: "number" },
    pairwiseMatches: { type: "number" },
    pairwiseStreams: { type: "number" },
    ticketsUnique: { type: "boolean" },
    matchedPlayersUnique: { type: "boolean" },
    matchedPlayersKnown: { type: "boolean" },
  },
  additionalProperties: false,
  title: "StructuralOperationalReading",
  description: "A finite transcript reading's structural counts and once-only uniqueness flags.",
} as const;

export type StructuralOperationalReading = FromJsonSchema<typeof structuralOperationalReadingSchema>;

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
  readonly leanTheorem: typeof verificationTournamentLeanTheorems.survivorCorrespondenceOfUniqueDominantClaim;
}

export interface SettledVerdictWitness {
  readonly kind: "verificationTournament.settledVerdict:witness";
  readonly closure: ChargeClosure;
  readonly seed: ChargeValueName;
  readonly period: number;
  readonly cycleReturns: true;
  readonly fixedPoint: true;
  readonly certificate: Certificate;
  readonly stableForSeed: true;
  readonly correspondsToSurvivor: true;
  readonly leanTheorem: typeof verificationTournamentLeanTheorems.settledVerdictOfClosureCertificate;
}

export interface RuntimeTournamentReceipt {
  readonly kind: "verificationTournament.receipt:witness";
  readonly capturedLeanModule: typeof verificationTournamentLeanModule;
  readonly structural: StructuralOperationalReading;
  readonly operational: OperationalChecks;
  readonly survivor: SurvivorReading;
  readonly survivorCorrespondence: SurvivorCorrespondenceWitness;
  readonly runtimeObligations: RuntimeObligations;
  readonly verdict: SettledVerdictWitness;
  readonly leanTheorems: typeof verificationTournamentReceiptTheorems;
  readonly runtimeBoundary: "transport, matchmaking, and Dialectica execution are supplied transcript obligations";
}

const assertNatural = (value: number, caller: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a natural number`);
};

export function structuralOperationalReading(input: Omit<StructuralOperationalReading, "kind">): StructuralOperationalReading {
  for (const value of [
    input.claims,
    input.refutations,
    input.peers,
    input.plays,
    input.dialecticaWitnesses,
    input.dialecticaChallenges,
    input.transcriptMessages,
    input.ticketedPeers,
    input.matchedPlayers,
    input.pairwiseMatches,
    input.pairwiseStreams,
  ]) assertNatural(value, "structuralOperationalReading");
  return Object.freeze({ kind: "verificationTournament.structuralOperationalReading" as const, ...input });
}

export function survivorReading(input: Omit<SurvivorReading, "kind">): SurvivorReading {
  assertNatural(input.settledStrategy, "survivorReading");
  assertNatural(input.survivingClaim, "survivorReading");
  return Object.freeze({ kind: "verificationTournament.survivorReading" as const, ...input });
}

export const dialecticaObjectMapped = (reading: StructuralOperationalReading): boolean =>
  reading.dialecticaWitnesses === reading.claims && reading.dialecticaChallenges === reading.refutations;

export const transportRosterComplete = (reading: StructuralOperationalReading): boolean =>
  reading.transcriptMessages === reading.claims + reading.refutations + reading.plays;

export const matchmakingOnceOnly = (reading: StructuralOperationalReading): boolean =>
  reading.ticketedPeers === reading.peers
  && reading.ticketsUnique
  && reading.matchedPlayersUnique
  && reading.matchedPlayersKnown;

export const strategyPlayComplete = (reading: StructuralOperationalReading): boolean =>
  reading.pairwiseMatches === reading.plays && reading.pairwiseStreams === reading.plays;

export function operationalChecksOfStructuralReading(reading: StructuralOperationalReading): OperationalChecks {
  return Object.freeze({
    kind: "verificationTournament.operationalWitnesses" as const,
    dialecticaObjectMap: dialecticaObjectMapped(reading),
    transportRosterComplete: transportRosterComplete(reading),
    matchmakingOnceOnly: matchmakingOnceOnly(reading),
    strategyPlayComplete: strategyPlayComplete(reading),
    leanTheorem: verificationTournamentLeanTheorems.operationalChecksOfStructuralReading,
  });
}

export const nashNoDeviation = (reading: SurvivorReading): boolean =>
  reading.fixedPoint && reading.pure && reading.noDominantRefutation;

export const dialecticaWitnessSurvives = (reading: SurvivorReading): boolean =>
  reading.settledRole === "claim"
  && reading.settledStrategy === reading.survivingClaim
  && reading.allRefutationsAnswered;

export const equilibriumMatchesSurvivor = (reading: SurvivorReading): boolean =>
  reading.fixedPoint && reading.pure && reading.settledStrategy === reading.survivingClaim;

export function survivorCorrespondenceOfUniqueDominantClaim(reading: SurvivorReading): SurvivorCorrespondenceWitness {
  const nashStable = nashNoDeviation(reading);
  const witnessSurvives = dialecticaWitnessSurvives(reading);
  const equilibriumMatches = equilibriumMatchesSurvivor(reading);
  if (!nashStable || !witnessSurvives || !equilibriumMatches) {
    throw new TypeError("survivorCorrespondenceOfUniqueDominantClaim: survivor reading does not settle a unique dominant claim");
  }
  return Object.freeze({
    kind: "verificationTournament.survivorCorrespondence:witness" as const,
    reading,
    nashNoDeviation: true as const,
    dialecticaWitnessSurvives: true as const,
    equilibriumMatchesSurvivor: true as const,
    leanTheorem: verificationTournamentLeanTheorems.survivorCorrespondenceOfUniqueDominantClaim,
  });
}

export function runtimeObligationsOfReading(ops: OperationalChecks, reading: SurvivorReading): RuntimeObligations {
  return Object.freeze({
    kind: "verificationTournament.runtimeObligations" as const,
    dialecticaObjectMap: ops.dialecticaObjectMap,
    transportRosterComplete: ops.transportRosterComplete,
    matchmakingOnceOnly: ops.matchmakingOnceOnly,
    strategyPlayComplete: ops.strategyPlayComplete,
    nashStable: nashNoDeviation(reading),
    dialecticaWitnessSurvives: dialecticaWitnessSurvives(reading),
    equilibriumMatchesSurvivor: equilibriumMatchesSurvivor(reading),
  });
}

export function noPeriodicOrbitFixedPoint(
  closure: ChargeClosure,
  seed: ChargeValueName,
  period: number,
): boolean {
  assertNatural(period, "noPeriodicOrbitFixedPoint");
  if (period < 1) throw new RangeError("noPeriodicOrbitFixedPoint: period must be positive");
  return iterateChargeOperation((value) => applyChargeClosure(closure, value), seed, period) !== seed
    || applyChargeClosure(closure, seed) === seed;
}

export function settledVerdictOfClosureCertificate(
  closure: ChargeClosure,
  seed: ChargeValueName,
  period: number,
  certificate: Certificate,
): SettledVerdictWitness {
  const cycleReturns = iterateChargeOperation((value) => applyChargeClosure(closure, value), seed, period) === seed;
  const fixedPoint = noPeriodicOrbitFixedPoint(closure, seed, period);
  if (
    !cycleReturns
    || !fixedPoint
    || !certificate.noProfitableDeviation
    || !certificate.dialecticaWitnessSurvives
    || !certificate.equilibriumMatchesSurvivor
  ) {
    throw new TypeError("settledVerdictOfClosureCertificate: certificate obligations did not settle");
  }
  return Object.freeze({
    kind: "verificationTournament.settledVerdict:witness" as const,
    closure,
    seed,
    period,
    cycleReturns: true as const,
    fixedPoint: true as const,
    certificate,
    stableForSeed: true as const,
    correspondsToSurvivor: true as const,
    leanTheorem: verificationTournamentLeanTheorems.settledVerdictOfClosureCertificate,
  });
}

export function verificationTournamentReceipt(): RuntimeTournamentReceipt {
  const structural = structuralOperationalReading({
    claims: 2,
    refutations: 1,
    peers: 3,
    plays: 2,
    dialecticaWitnesses: 2,
    dialecticaChallenges: 1,
    transcriptMessages: 5,
    ticketedPeers: 3,
    matchedPlayers: 2,
    pairwiseMatches: 2,
    pairwiseStreams: 2,
    ticketsUnique: true,
    matchedPlayersUnique: true,
    matchedPlayersKnown: true,
  });
  const operational = operationalChecksOfStructuralReading(structural);
  const survivor = survivorReading({
    settledStrategy: 1,
    survivingClaim: 1,
    settledRole: "claim",
    fixedPoint: true,
    pure: true,
    allRefutationsAnswered: true,
    noDominantRefutation: true,
  });
  const survivorCorrespondence = survivorCorrespondenceOfUniqueDominantClaim(survivor);
  const runtimeObligations = runtimeObligationsOfReading(operational, survivor);
  if (
    !runtimeObligations.dialecticaObjectMap
    || !runtimeObligations.transportRosterComplete
    || !runtimeObligations.matchmakingOnceOnly
    || !runtimeObligations.strategyPlayComplete
  ) {
    throw new TypeError("verificationTournament.receipt: structural operational witnesses failed");
  }
  const verdict = settledVerdictOfClosureCertificate(
    knowledgeJoinClosure("unknown"),
    "denied",
    1,
    Object.freeze({
      kind: "verificationTournament.certificate" as const,
      noProfitableDeviation: runtimeObligations.nashStable,
      dialecticaWitnessSurvives: runtimeObligations.dialecticaWitnessSurvives,
      equilibriumMatchesSurvivor: runtimeObligations.equilibriumMatchesSurvivor,
    }),
  );
  return Object.freeze({
    kind: "verificationTournament.receipt:witness" as const,
    capturedLeanModule: "Obsmetrologia.Relational.Gaming.VerificationTournament" as const,
    structural,
    operational,
    survivor,
    survivorCorrespondence,
    runtimeObligations,
    verdict,
    leanTheorems: verificationTournamentReceiptTheorems,
    runtimeBoundary: "transport, matchmaking, and Dialectica execution are supplied transcript obligations" as const,
  });
}
