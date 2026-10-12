/**
 * Verification tournament - claim/refutation play over the gaming swarm.
 *
 * This composes the surfaces gaming already owns:
 * - Dialectica object-map: claims are witnesses U, refutations are challenges X.
 * - libp2p swarm: agents are FSym names in the peer roster.
 * - matchmake: participants are admitted once into deterministic brackets.
 * - reachability: dominance edges settle monotonically to a fixed-point reading.
 *
 * The certificate is built+green game data with a narrow Lean-backed certificate
 * theorem. The full Dialectica/Nash fixed-point correspondence remains an explicit
 * formalization obligation.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { dialecticaObject } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/proving/dialectica";
import { encodeArena } from "./encoding/arena.mjs";
import { projectLibp2pPubsub, projectLibp2pSwarm } from "./encoding/network-model.mjs";
import { createPool, encodeMatchmakingResult, formMatches, queueTicket } from "./running/lobby.mjs";
import { dialecticaObjectToArena } from "./structuring/concurrent-game/with-symmetry/embedding.mjs";
import { libp2pDialStream, libp2pPublish, libp2pSwarm, libp2pPeerIds } from "./structuring/concurrent-game/with-symmetry/libp2p.mjs";
import { reachability } from "./reachability.mjs";
import { verificationTournamentCarrier } from "./carriers/index.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const ref = (id) => Object.freeze({ $ref: id });

const tournamentRequestCarrier = schemaFrom({
  $id: "gaming/verification-tournament-request",
  type: "object",
  properties: {
    id: { type: "string" },
    swarm: ref("gaming/libp2p-swarm"),
    agents: { type: "array", items: { type: "string" } },
    organization: { type: "object" },
    organizationSignal: { type: "object" },
    claims: { type: "array" },
    refutations: { type: "array" },
    outcomes: { type: "array" },
  },
  required: Object.freeze(["claims", "refutations"]),
});

function asRecord(input, verb) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a JSON object`);
  }
  return input;
}

function requiredString(record, key, verb) {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${verb}: requires string "${key}"`);
  return value.trim();
}

function optionalString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function stringArray(record, key) {
  const value = record[key];
  return Array.isArray(value) ? Object.freeze(value.filter((item) => typeof item === "string")) : [];
}

function stringAt(value, key) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const found = (value)[key];
  return typeof found === "string" && found.trim() !== "" ? found.trim() : undefined;
}

function recordArrayAt(value, key) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [];
  const found = (value)[key];
  return Array.isArray(found)
    ? Object.freeze(found.filter((item) => item !== null && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function claimOf(value, index) {
  const record = asRecord(value, "verification-tournament claim");
  const id = optionalString(record, "id") ?? `claim-${index + 1}`;
  return Object.freeze({
    id,
    text: optionalString(record, "text") ?? id,
    agent: optionalString(record, "agent") ?? `claimant:${id}`,
  });
}

function refutationOf(value, index) {
  const record = asRecord(value, "verification-tournament refutation");
  const id = optionalString(record, "id") ?? `refutation-${index + 1}`;
  return Object.freeze({
    id,
    against: requiredString(record, "against", "verification-tournament refutation"),
    text: optionalString(record, "text") ?? id,
    agent: optionalString(record, "agent") ?? `refuter:${id}`,
    defeats: record["defeats"] === true,
  });
}

function outcomeMap(values) {
  const out = new Map();
  if (!Array.isArray(values)) return out;
  for (const value of values) {
    const record = asRecord(value, "verification-tournament outcome");
    const claim = requiredString(record, "claim", "verification-tournament outcome");
    const refutation = requiredString(record, "refutation", "verification-tournament outcome");
    const winner = record["winner"] === "refutation" ? "refutation" : "claim";
    out.set(`${claim}\u0000${refutation}`, winner);
  }
  return out;
}

function swarmOf(record, agents, id) {
  const raw = record["swarm"];
  if (raw !== undefined) {
    const swarm = asRecord(raw, "verification-tournament swarm");
    const swarmId = requiredString(swarm, "id", "verification-tournament swarm");
    const peerRecords = swarm["peers"];
    const peers = Array.isArray(peerRecords)
      ? peerRecords.map((entry) => asRecord(entry, "verification-tournament swarm peer")["peerId"])
          .filter((peerId) => typeof peerId === "string")
      : stringArray(swarm, "peers");
    return libp2pSwarm(swarmId, [...peers, ...agents]);
  }
  return libp2pSwarm(`${id}:organization`, agents);
}

function swarmSource(record) {
  if (record["organizationSignal"] !== undefined || record["organization"] !== undefined) return "organization-signal";
  if (record["swarm"] !== undefined) return "swarm";
  return "agents";
}

function projectStream(stream) {
  return {
    kind: stream.kind,
    streamId: stream.streamId,
    protocol: stream.protocol,
    source: stream.source,
    target: stream.target,
    multiplexed: stream.multiplexed,
    namePassing: {
      kind: stream.namePassing.kind,
      mappings: stream.namePassing.mappings.map(([from, to]) => [from, to]),
    },
    subArena: encodeArena(stream.subArena),
  };
}

function tournamentAgents(
  explicitAgents,
  claims,
  refutations,
) {
  return Object.freeze([...new Set([
    ...explicitAgents,
    ...claims.map((claim) => claim.agent),
    ...refutations.map((refutation) => refutation.agent),
  ].filter((agent) => agent.trim() !== ""))].sort());
}

function organizationSignalPeerIds(value) {
  if (value === undefined) return [];
  const out = new Set();
  const add = (label) => {
    if (label !== undefined && label.trim() !== "") out.add(label.trim());
  };
  const observerSession = stringAt(value, "session");
  const observerHarness = stringAt(value, "harness");
  if (observerSession !== undefined) add(observerHarness === undefined ? observerSession : `${observerHarness}:${observerSession}`);
  for (const key of ["activeClaims", "yourClaims", "peerClaims"]) {
    for (const claim of recordArrayAt(value, key)) {
      const session = stringAt(claim, "session");
      const harness = stringAt(claim, "harness");
      if (session !== undefined) add(harness === undefined ? session : `${harness}:${session}`);
    }
  }
  for (const key of ["activeCapabilities", "yourCapabilities", "peerCapabilities"]) {
    const capabilities = recordArrayAt(value, key);
    for (const capability of capabilities) {
      const session = stringAt(capability, "session");
      const harness = stringAt(capability, "harness");
      const holder = stringAt(capability, "holder");
      if (session !== undefined) add(harness === undefined ? session : `${harness}:${session}`);
      else add(holder);
    }
  }
  const activityPub = value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value)["activityPub"]
    : undefined;
  for (const camp of recordArrayAt(activityPub, "camps")) {
    add(stringAt(camp, "id") ?? stringAt(camp, "name"));
  }
  return Object.freeze([...out].sort());
}

function organizationSignalSummary(record) {
  const value = record["organizationSignal"] ?? record["organization"];
  if (value === undefined) return undefined;
  const organizationRecord = value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  const activityPub = value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value)["activityPub"]
    : undefined;
  const actorCount = activityPub !== null && typeof activityPub === "object" && !Array.isArray(activityPub)
    ? (activityPub)["actorCount"]
    : undefined;
  const observerSession = stringAt(value, "session");
  const observerHarness = stringAt(value, "harness");
  return Object.freeze({
    kind: "gaming.verification.organization-signal",
    sourceKind: stringAt(value, "kind") ?? null,
    identity: stringAt(value, "identity") ?? null,
    observer: observerSession === undefined ? null : (observerHarness === undefined ? observerSession : `${observerHarness}:${observerSession}`),
    peerIds: organizationSignalPeerIds(value),
    members: typeof organizationRecord["members"] === "number" && Number.isFinite(organizationRecord["members"]) ? organizationRecord["members"] : null,
    glued: typeof organizationRecord["glued"] === "boolean" ? organizationRecord["glued"] : null,
    coordination: typeof organizationRecord["coordination"] === "string" ? organizationRecord["coordination"] : null,
    activeClaims: recordArrayAt(value, "activeClaims").length,
    peerClaims: recordArrayAt(value, "peerClaims").length,
    activityPubActors: typeof actorCount === "number" && Number.isFinite(actorCount) ? actorCount : null,
  });
}

function playsOf(
  id,
  claims,
  refutations,
  outcomes,
  arena,
  swarm,
) {
  const claimsById = new Map(claims.map((claim) => [claim.id, claim]));
  const plays = [];
  for (const refutation of refutations) {
    const claim = claimsById.get(refutation.against);
    if (claim === undefined) {
      throw new TypeError(`verification-tournament: refutation ${JSON.stringify(refutation.id)} targets unknown claim ${JSON.stringify(refutation.against)}`);
    }
    const winnerSide = outcomes.get(`${refutation.against}\u0000${refutation.id}`) ?? (refutation.defeats ? "refutation" : "claim");
    const claimWins = winnerSide === "claim";
    plays.push(Object.freeze({
      kind: "gaming.verification.play",
      claim: refutation.against,
      refutation: refutation.id,
      winner: claimWins ? refutation.against : refutation.id,
      loser: claimWins ? refutation.id : refutation.against,
      verdict: claimWins ? "claim-survives" : "claim-refuted",
      match: playMatchOf(id, arena, swarm, claim, refutation),
    }));
  }
  return Object.freeze(plays.sort((left, right) =>
    left.claim.localeCompare(right.claim) || left.refutation.localeCompare(right.refutation)));
}

function playMatchOf(
  tournamentId,
  arena,
  swarm,
  claim,
  refutation,
) {
  const poolId = `${tournamentId}:play:${claim.id}:vs:${refutation.id}:pool`;
  let pool = createPool({ id: poolId, arena, matchSize: 2 });
  pool = queueTicket(pool, claim.agent).pool;
  pool = queueTicket(pool, refutation.agent).pool;
  const matchmaking = formMatches(pool);
  const [match] = matchmaking.matches;
  if (match === undefined) {
    throw new TypeError(`verification-tournament: claim/refutation agents must be distinct for play ${JSON.stringify(claim.id)} vs ${JSON.stringify(refutation.id)}`);
  }
  const stream = libp2pDialStream(swarm, {
    streamId: `${tournamentId}:play:${claim.id}:vs:${refutation.id}`,
    protocol: "/emsenn/gaming/verification/1.0.0",
    source: claim.agent,
    target: refutation.agent,
  });
  return Object.freeze({
    kind: "gaming.verification.play-match",
    matchId: match.id,
    pool: matchmaking.pool.id,
    claimAgent: claim.agent,
    refutationAgent: refutation.agent,
    playerIds: Object.freeze([...match.playerIds]),
    ticketIds: Object.freeze([...match.ticketIds]),
    matchmaking: encodeMatchmakingResult(matchmaking),
    stream: projectStream(stream),
  });
}

function dominanceSeed(plays) {
  return plays.map((play) => `${play.winner}|${play.loser}`).join("\n");
}

function survivingClaims(
  claims,
  refutations,
  plays,
) {
  return Object.freeze(claims
    .filter((claim) => {
      const challengers = refutations.filter((refutation) => refutation.against === claim.id);
      return challengers.length > 0 && challengers.every((refutation) =>
        plays.some((play) =>
          play.claim === claim.id &&
          play.refutation === refutation.id &&
          play.verdict === "claim-survives"));
    })
    .map((claim) => claim.id)
    .sort());
}

function verdictOf(
  survivors,
  claims,
  settlements,
) {
  if (survivors.length === 0 && claims.length > 0) return "refuted";
  const stableClaims = settlements.filter((s) => s.role === "claim" && s.standing === "dominant");
  if (survivors.length === 1 && stableClaims.length === 1) return "survived";
  return "contested";
}

function matchmakingFor(id, arena, swarm) {
  let pool = createPool({ id: `${id}:pool`, arena, matchSize: 2 });
  for (const peer of libp2pPeerIds(swarm)) {
    pool = queueTicket(pool, peer).pool;
  }
  return formMatches(pool);
}

function strategySettlement(
  claims,
  refutations,
  plays,
) {
  const roles = new Map();
  for (const claim of claims) roles.set(claim.id, "claim");
  for (const refutation of refutations) roles.set(refutation.id, "refutation");

  const wins = new Map();
  const losses = new Map();
  for (const id of roles.keys()) {
    wins.set(id, 0);
    losses.set(id, 0);
  }
  for (const play of plays) {
    wins.set(play.winner, (wins.get(play.winner) ?? 0) + 1);
    losses.set(play.loser, (losses.get(play.loser) ?? 0) + 1);
  }

  const standingOf = (winCount, lossCount) => {
    if (winCount > 0 && lossCount === 0) return "dominant";
    if (winCount === 0 && lossCount > 0) return "dominated";
    if (winCount > 0 && lossCount > 0) return "contested";
    return "unplayed";
  };

  return Object.freeze([...roles.entries()].map(([strategyId, role]) => Object.freeze({
    kind: "gaming.verification.strategy-settlement",
    id: strategyId,
    role,
    wins: wins.get(strategyId) ?? 0,
    losses: losses.get(strategyId) ?? 0,
    standing: standingOf(wins.get(strategyId) ?? 0, losses.get(strategyId) ?? 0),
  })).sort((left, right) => left.role.localeCompare(right.role) || left.id.localeCompare(right.id)));
}

function namedEquilibrium(
  equilibrium,
  claims,
  settlements,
  survivors,
) {
  const stableStrategies = Object.freeze(settlements
    .filter((settlement) => settlement.standing === "dominant")
    .map((settlement) => settlement.id)
    .sort());
  const settledStrategy = stableStrategies.length === 1 ? stableStrategies[0] : undefined;
  const settled = settledStrategy === undefined
    ? undefined
    : settlements.find((settlement) => settlement.id === settledStrategy);
  const survivingClaim = survivors.length === 1 ? survivors[0] : undefined;
  const verdict = verdictOf(survivors, claims, settlements);
  const dialecticaWitnessSurvives =
    settled?.role === "claim" &&
    survivingClaim !== undefined &&
    settledStrategy === survivingClaim;
  const equilibriumMatchesSurvivor =
    verdict === "survived" &&
    dialecticaWitnessSurvives;
  return Object.freeze({
    kind: "gaming.verification.equilibrium",
    fixedPoint: equilibrium.converges,
    pure: stableStrategies.length === 1,
    mixed: stableStrategies.length !== 1 && equilibrium.mixed,
    stableStrategies,
    ...(settledStrategy !== undefined ? { settledStrategy } : {}),
    ...(settled?.role !== undefined ? { settledRole: settled.role } : {}),
    strategies: settlements,
    correspondence: Object.freeze({
      kind: "gaming.verification.equilibrium-correspondence",
      verdict,
      ...(survivingClaim !== undefined ? { survivingClaim } : {}),
      ...(settledStrategy !== undefined ? { settledStrategy } : {}),
      dialecticaWitnessSurvives,
      equilibriumMatchesSurvivor,
    }),
  });
}

function transportTranscript(
  id,
  swarm,
  claims,
  refutations,
  plays,
) {
  const topic = `${id}/verification`;
  const claimsById = new Map(claims.map((claim) => [claim.id, claim]));
  const refutationsById = new Map(refutations.map((refutation) => [refutation.id, refutation]));
  const messages = [];
  const append = (phase, messageId, from, about) => {
    const pubsub = libp2pPublish(swarm, { topic, messageId, from });
    messages.push(Object.freeze({
      kind: "gaming.verification.swarm-message",
      topic,
      messageId,
      from,
      about,
      phase,
      deliveryCount: pubsub.deliveries.length,
      pubsub: projectLibp2pPubsub(pubsub),
    }));
  };
  for (const claim of claims) append("claim", `${id}:claim:${claim.id}`, claim.agent, claim.id);
  for (const refutation of refutations) append("refutation", `${id}:refutation:${refutation.id}`, refutation.agent, refutation.id);
  for (const play of plays) {
    const winnerAgent = claimsById.get(play.winner)?.agent ?? refutationsById.get(play.winner)?.agent;
    if (winnerAgent !== undefined) append("play", `${id}:play:${play.winner}:beats:${play.loser}`, winnerAgent, `${play.winner}|${play.loser}`);
  }
  return Object.freeze(messages);
}

function proofStep(
  obligation,
  satisfied,
  evidence,
) {
  return Object.freeze({
    kind: "gaming.verification.proof-step",
    obligation,
    satisfied,
    maturity: "Built+green",
    evidence,
  });
}

function sameStringList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function pubsubSymmetryInvariant(message) {
  const pubsub = message.pubsub;
  if (pubsub === null || typeof pubsub !== "object" || Array.isArray(pubsub)) return false;
  return (pubsub)["symmetryInvariant"] === true;
}

function proofWitness(input

) {
  const peerIds = libp2pPeerIds(input.swarm);
  const claimsById = new Map(input.claims.map((claim) => [claim.id, claim]));
  const refutationsById = new Map(input.refutations.map((refutation) => [refutation.id, refutation]));
  const ticketedPlayers = input.matchmaking.pool.tickets.map((ticket) => ticket.player);
  const matchedPlayers = input.matchmaking.matches.flatMap((match) => match.playerIds);
  const ticketedOnce = new Set(ticketedPlayers).size === ticketedPlayers.length;
  const rosterAdmitted =
    ticketedOnce &&
    ticketedPlayers.length === peerIds.length &&
    peerIds.every((peerId) => ticketedPlayers.includes(peerId));
  const bracketedOnce = new Set(matchedPlayers).size === matchedPlayers.length;
  const knownPlayers = matchedPlayers.every((player) => peerIds.includes(player));
  const expectedMessages = input.claims.length + input.refutations.length + input.refutations.length;
  const transcriptWitnessed =
    input.messages.length === expectedMessages &&
    input.messages.every(pubsubSymmetryInvariant);
  const strategyPlayWitnessed = input.plays.every((play) => {
    const claim = claimsById.get(play.claim);
    const refutation = refutationsById.get(play.refutation);
    if (claim === undefined || refutation === undefined) return false;
    const expectedPlayers = [claim.agent, refutation.agent].sort();
    const stream = play.match.stream;
    const streamWitnessed = stream !== null &&
      typeof stream === "object" &&
      !Array.isArray(stream) &&
      (stream)["kind"] === "gaming.libp2p.stream" &&
      (stream)["source"] === claim.agent &&
      (stream)["target"] === refutation.agent;
    return claim !== undefined &&
      refutation !== undefined &&
      refutation.against === claim.id &&
      (play.winner === claim.id || play.winner === refutation.id) &&
      (play.loser === claim.id || play.loser === refutation.id) &&
      play.winner !== play.loser &&
      peerIds.includes(claim.agent) &&
      peerIds.includes(refutation.agent) &&
      play.match.claimAgent === claim.agent &&
      play.match.refutationAgent === refutation.agent &&
      sameStringList([...play.match.playerIds].sort(), expectedPlayers) &&
      play.match.ticketIds.length === 2 &&
      streamWitnessed;
  });
  const obligations = Object.freeze([
    proofStep(
      "dialectica-object-map",
      input.dialectica.witnesses.length === input.claims.length &&
        input.dialectica.challenges.length === input.refutations.length,
      `${input.dialectica.witnesses.length} witnesses and ${input.dialectica.challenges.length} challenges mapped into the CGS arena`,
    ),
    proofStep(
      "transport-roster-witnessed",
      transcriptWitnessed,
      `${input.messages.length} claim/refutation/play messages broadcast over ${peerIds.length} libp2p peers`,
    ),
    proofStep(
      "matchmaking-once-only",
      rosterAdmitted && bracketedOnce && knownPlayers,
      `${ticketedPlayers.length} libp2p peers admitted once; ${input.matchmaking.matches.length} deterministic brackets formed without repeating a matched peer`,
    ),
    proofStep(
      "strategy-play-witnessed",
      strategyPlayWitnessed,
      `${input.plays.length} claim/refutation plays are pairwise matchmade and streamed between admitted strategy agents in the libp2p roster`,
    ),
    proofStep(
      "monotone-fixed-point",
      input.equilibrium.reachable && input.named.fixedPoint,
      "gaming/reachability reports a convergent reachable fixed point for the dominance seed",
    ),
    proofStep(
      "nash-stability",
      input.noProfitableDeviation,
      "one pure dominant settled strategy leaves no profitable deviation in the finite bracket",
    ),
    proofStep(
      "survivor-correspondence",
      input.named.correspondence.equilibriumMatchesSurvivor,
      "the settled equilibrium strategy is the surviving Dialectica witness exactly when correspondence is true",
    ),
  ]);
  return Object.freeze({
    kind: "gaming.verification.proof-witness",
    stable: input.equilibrium.reachable && input.named.fixedPoint && input.noProfitableDeviation,
    fixedPoint: input.named.fixedPoint,
    correspondsToSurvivor: input.named.correspondence.equilibriumMatchesSurvivor,
    obligations,
  });
}

function formalizationBoundary() {
  return Object.freeze({
    kind: "gaming.verification.formalization-boundary",
    namedLaw: "monotone-settling-no-non-trivial-periodic-orbits",
    certificateTheorem: "RelMath.Gaming.VerificationTournament.runtime_tournament_settled_of_reading",
    certificateTheoremMaturity: "Proven-in-Lean",
    certificateMaturity: "Built+green",
    leanMaturity: "Roadmap",
    proofBoundary: "finite-runtime-certificate-not-lean-theorem",
    obligation: "formalize-verification-tournament-fixed-point-correspondence",
    leanArtifacts: Object.freeze([
      "RelMath.Gaming.VerificationTournament.runtime_tournament_settled_of_reading",
      "RelMath.Gaming.VerificationTournament.runtime_tournament_settled_of_obligations",
      "RelMath.Gaming.VerificationTournament.settled_verdict_of_closure_certificate",
    ]),
    evidence: "The runtime certificate now names a Lean theorem deriving Nash stability and survivor correspondence from the finite settled claim/refutation reading while carrying the operational witnesses; the broader theorem deriving every operational obligation from first-principles Dialectica/libp2p/matchmaking semantics is still not present.",
  });
}

export function verificationTournament(input) {
  const record = asRecord(input, "verification-tournament");
  const id = optionalString(record, "id") ?? "verification-tournament";
  const claimsRaw = record["claims"];
  const refutationsRaw = record["refutations"];
  if (!Array.isArray(claimsRaw) || claimsRaw.length === 0) {
    throw new TypeError("verification-tournament: requires non-empty array \"claims\"");
  }
  if (!Array.isArray(refutationsRaw)) {
    throw new TypeError("verification-tournament: requires array \"refutations\"");
  }
  const claims = Object.freeze(claimsRaw.map(claimOf));
  const refutations = Object.freeze(refutationsRaw.map(refutationOf));
  const organizationSignal = organizationSignalSummary(record);
  const agents = tournamentAgents([
    ...stringArray(record, "agents"),
    ...(organizationSignal?.peerIds ?? []),
  ], claims, refutations);
  const swarm = swarmOf(record, agents, id);
  const dialectica = dialecticaObject(claims.map((claim) => claim.id), refutations.map((refutation) => refutation.id));
  const arena = dialecticaObjectToArena(dialectica);
  const plays = playsOf(id, claims, refutations, outcomeMap(record["outcomes"]), arena, swarm);
  const seed = dominanceSeed(plays);
  const equilibrium = reachability(seed);
  const settlements = strategySettlement(claims, refutations, plays);
  const survivors = survivingClaims(claims, refutations, plays);
  const named = namedEquilibrium(equilibrium, claims, settlements, survivors);
  const survivingClaim = survivors.length === 1 ? survivors[0] : undefined;
  const noProfitableDeviation = named.pure && named.stableStrategies.length === 1;
  const messages = transportTranscript(id, swarm, claims, refutations, plays);
  const matchmaking = matchmakingFor(id, arena, swarm);
  const proof = proofWitness({
    claims,
    refutations,
    dialectica,
    swarm,
    messages,
    matchmaking,
    plays,
    equilibrium,
    named,
    noProfitableDeviation,
  });
  const certificate = Object.freeze({
    kind: "gaming.verification.nash-certificate",
    stable: proof.stable,
    fixedPoint: named.fixedPoint,
    noProfitableDeviation,
    dialecticaWitnessSurvives: named.correspondence.dialecticaWitnessSurvives,
    correspondence: named.correspondence.equilibriumMatchesSurvivor,
    ...(named.settledStrategy !== undefined ? { equilibriumStrategy: named.settledStrategy } : {}),
    ...(survivingClaim !== undefined ? { survivingClaim } : {}),
    proof,
    formalization: formalizationBoundary(),
    evidence: Object.freeze([
      "F: Dial(Eff) -> CGS arena maps claims to witnesses and refutations to challenges",
      "libp2p pubsub transcript broadcasts every claim/refutation/play over the swarm roster",
      "each claim/refutation play carries a pairwise matchmaker bracket and libp2p stream",
      "matchmake consumes each peer ticket once into deterministic brackets",
      "reachability applies monotone <=_k settling to a fixed point",
      "the unique dominant settled strategy is the surviving Dialectica witness exactly when correspondence is true",
    ]),
    theorem: "monotone-settling-no-non-trivial-periodic-orbits",
    maturity: "Built+green",
  });
  return Object.freeze({
    kind: "gaming.verification.tournament",
    id,
    swarm: projectLibp2pSwarm(swarm),
    dialectica: Object.freeze({
      kind: "gaming.verification.dialectica",
      witnesses: Object.freeze(dialectica.witnesses),
      challenges: Object.freeze(dialectica.challenges),
      arena: encodeArena(arena),
    }),
    transport: Object.freeze({
      kind: "gaming.verification.transport",
      swarm: "gaming.libp2p.structural-swarm",
      source: swarmSource(record),
      ...(organizationSignal !== undefined ? { organizationSignal } : {}),
      messages,
    }),
    matchmaking: encodeMatchmakingResult(matchmaking),
    plays,
    dominanceSeed: seed,
    equilibrium,
    namedEquilibrium: named,
    verdict: named.correspondence.verdict,
    survivingClaims: survivors,
    certificate,
  });
}

export const verificationTournamentAction = operation({
  verb: "verification-tournament",
  inputFormat: "json",
  outputFormat: "json",
  domain: tournamentRequestCarrier,
  codomain: verificationTournamentCarrier,
  summary: "Run a claim-vs-refutation verification tournament over gaming's Dialectica arena, libp2p swarm roster, matchmaker, and monotone equilibrium reading.",
  description: "Domain: { id?, swarm?|agents?, organization?|organizationSignal?, claims:[{id,text?,agent?}], refutations:[{id,against,text?,agent?,defeats?}], outcomes? }. Codomain: gaming/verification-tournament. Claims are Dialectica witnesses, refutations are challenges, organizing's organization/theatre signal supplies the social roster when present, matchmaking brackets the structural libp2p/FSym arena once, and reachability settles the dominance seed to a fixed-point Nash-style certificate for the surviving claim.",
  run: (input) =>
    jsonResource(verificationTournament(input), "gaming verification tournament"),
});
