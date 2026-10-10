import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const GOVERNANCE = "data/records/governance";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

/**
 * Load the Turntide governance records the civic kernel reads. The records live
 * in the Turntide public checkout, not beside this code, so the caller names
 * that root (the steward passes TURNTIDE_PUBLIC_ROOT); no location is guessed.
 */
export async function loadZeloCivicContext(root) {
  if (typeof root !== "string" || root.trim() === "") {
    throw new TypeError("loadZeloCivicContext requires the Turntide public root (TURNTIDE_PUBLIC_ROOT) holding data/records/governance");
  }
  const governance = resolve(root, GOVERNANCE);
  const [standing, protocol, mandate, routines, runtime, routinePatterns, civicPlaces, standingPathways, tidepoolStatus, tidepoolParticipantGovernance, contestability, decisionProcedures] = await Promise.all([
    readJson(resolve(governance, "current-standing.json")),
    readJson(resolve(governance, "civic-action-protocol.json")),
    readJson(resolve(governance, "zelo-civic-steward.json")),
    readJson(resolve(governance, "civic-routines.json")),
    readJson(resolve(governance, "zelo-civic-runtime.json")),
    readJson(resolve(governance, "routine-pattern-library.json")),
    readJson(resolve(governance, "place-civic-affordances.json")),
    readJson(resolve(governance, "standing-pathways.json")),
    readJson(resolve(governance, "tidepool-civic-status.json")),
    readJson(resolve(governance, "tidepool-participant-governance.json")),
    readJson(resolve(governance, "contestability-pathways.json")),
    readJson(resolve(governance, "decision-procedures.json")),
  ]);
  const actsRoot = resolve(governance, "acts");
  const acts = [];
  for (const name of (await readdir(actsRoot)).filter((name) => name.endsWith(".json")).sort()) {
    acts.push(await readJson(resolve(actsRoot, name)));
  }
  return Object.freeze({ root, standing, protocol, mandate, routines, runtime, routinePatterns, civicPlaces, standingPathways, tidepoolStatus, tidepoolParticipantGovernance, contestability, decisionProcedures, acts: Object.freeze(acts) });
}

function artifact(context, kind) {
  const value = context.protocol.artifactKinds?.[kind];
  if (!value) throw new TypeError(`unknown Turntide civic artifact kind ${JSON.stringify(kind)}`);
  return value;
}

export function civicState(context, { artifactKind, state }) {
  const spec = artifact(context, artifactKind);
  const current = state ?? spec.initialState;
  const transitions = (spec.transitions ?? []).filter((transition) => transition.from === current);
  return Object.freeze({
    type: "ZeloCivicStateAnswer",
    version: 1,
    artifactKind,
    state: current,
    transitions: Object.freeze(transitions.map((transition) => Object.freeze({
      to: transition.to,
      mayBePerformedBy: Object.freeze([...(transition.mayBePerformedBy ?? [])]),
      requires: Object.freeze([...(transition.requires ?? [])]),
      effect: transition.effect,
    }))),
    bindingEffect: "informational-only",
  });
}

export function orientTurntider(context) {
  const active = context.standing.entries
    .filter((entry) => String(entry.state).includes("active"))
    .map((entry) => ({ id: entry.id, kind: entry.kind, state: entry.state, scope: entry.scope }));
  return Object.freeze({
    type: "ZeloCivicOrientation",
    version: 1,
    polity: "Turntide Islands",
    governance: context.protocol.authorityDomain,
    model: "decentralized-autonomous-organization",
    activeStanding: Object.freeze(active),
    ordinaryPath: Object.freeze([
      "ask a question",
      "open discussion when something may need to change",
      "draft a proposal",
      "place the proposal before recorded governance",
      "execute only after authority exists",
      "receive only when the stated receiving evidence exists",
    ]),
    askZelo: Object.freeze([
      "what state is this in?",
      "what is the smallest lawful next move?",
      "who can make that move?",
      "what evidence or authority is missing?",
      "walk me through this as a nonbinding rehearsal",
      "does this belong to Turntide governance or Tidepool governance?",
    ]),
    bindingEffect: "informational-only",
  });
}


export function explainTurntide(context) {
  return Object.freeze({
    type: "ZeloTurntideExplanation",
    version: 1,
    polity: Object.freeze({
      name: "Turntide Islands",
      kind: "DAO community",
      authority: "recorded standing, delegations, and governing acts",
    }),
    layers: Object.freeze([
      Object.freeze({
        id: "community",
        title: "Community",
        explanation: "Turntide is the people and agents participating in the islands: asking, learning, sharing observations, organizing, making, and helping each other.",
        bindingEffect: "participation itself grants no governance standing",
      }),
      Object.freeze({
        id: "governance",
        title: "DAO governance",
        explanation: "Questions and discussion are open participation; proposals ask for explicit acts; binding decisions require current recorded authority; execution and receiving are tracked separately.",
        bindingEffect: "only recorded authority can create binding Turntide acts",
      }),
      Object.freeze({
        id: "instruments",
        title: "Instruments",
        explanation: "Discord, the public site, Zelo, provider systems, and Tidepool are instruments or adjacent systems. Capability to act does not make an instrument sovereign.",
        bindingEffect: "none",
      }),
    ]),
    usefulQuestions: Object.freeze([
      "How can I help without being a governor?",
      "What state is this matter in?",
      "How do I turn this into a proposal?",
      "Could this repeated work become a routine?",
      "What can Zelo do here, and what still needs a person or governing act?",
      "Is this Turntide governance or Tidepool governance?",
    ]),
    bindingEffect: "informational-only",
  });
}

export function participationPaths(context) {
  return Object.freeze({
    type: "ZeloParticipationPaths",
    version: 1,
    standingRequiredToBegin: false,
    paths: Object.freeze([
      Object.freeze({
        id: "ask",
        action: "Ask a question or challenge an explanation.",
        creates: "information or discussion",
        standingRequired: false,
        bindingEffect: "none",
      }),
      Object.freeze({
        id: "discuss",
        action: "Join discussion, add lived experience, objections, evidence, or alternatives.",
        creates: "deliberative input",
        standingRequired: false,
        bindingEffect: "none",
      }),
      Object.freeze({
        id: "propose",
        action: "Draft or submit a concrete proposal for Turntide to consider.",
        creates: "a governance artifact that current governance may enact, refuse, or supersede",
        standingRequired: false,
        bindingEffect: "proposal only",
      }),
      Object.freeze({
        id: "volunteer",
        action: "Offer to carry out an already-authorized task or ask for a bounded delegation.",
        creates: "an execution offer or delegation request",
        standingRequired: false,
        bindingEffect: "none until accepted or delegated",
      }),
      Object.freeze({
        id: "routine",
        action: "Point out repeated work and ask Zelo to turn it into a routine candidate.",
        creates: "a routine candidate",
        standingRequired: false,
        bindingEffect: "draft only",
      }),
      Object.freeze({
        id: "govern",
        action: "Exercise binding governance authority.",
        creates: "a binding civic transition when the applicable rule and evidence are satisfied",
        standingRequired: true,
        bindingEffect: "depends on recorded standing or delegation",
      }),
    ]),
    currentStandingRule: context.standing.principles.standingRequiresRecord === true
      ? "Binding authority requires a current record; participation does not."
      : "See the current standing ledger.",
    bindingEffect: "informational-only",
  });
}

function normalizePlace(place) {
  return String(place ?? "").trim().toLowerCase().replace(/^#/, "");
}

export function contestWayfinding(context, { kind = null } = {}) {
  const selected = kind === null
    ? context.contestability.pathways
    : context.contestability.pathways.filter((entry) => entry.id === String(kind).trim().toLowerCase());
  if (kind !== null && selected.length === 0) throw new TypeError(`unknown Turntide contestability path ${JSON.stringify(kind)}`);
  const executed = civicState(context, { artifactKind: "decision", state: "executed" }).transitions.find((move) => move.to === "contested");
  const received = civicState(context, { artifactKind: "decision", state: "received" }).transitions.find((move) => move.to === "reopened");
  return Object.freeze({
    type: "ZeloContestabilityWayfinding",
    version: 1,
    standingRequiredToRaiseEvidence: !context.contestability.rules.standingNotRequiredToRaiseEvidence,
    pathways: Object.freeze(selected.map((entry) => Object.freeze(structuredClone(entry)))),
    evidenceTemplate: Object.freeze({ ...context.contestability.evidenceTemplate }),
    protocol: Object.freeze({
      executedToContested: executed === undefined ? null : Object.freeze({
        mayBePerformedBy: Object.freeze([...executed.mayBePerformedBy]),
        requires: Object.freeze([...executed.requires]),
        effect: executed.effect,
      }),
      receivedToReopened: received === undefined ? null : Object.freeze({
        mayBePerformedBy: Object.freeze([...received.mayBePerformedBy]),
        requires: Object.freeze([...received.requires]),
        effect: received.effect,
      }),
    }),
    note: "Raising contradictory or missing evidence is open participation. Contesting evidence does not automatically reverse, suspend, reopen, or invalidate an act.",
    bindingEffect: "informational-and-draft-only",
  });
}


export function decisionProcedureWayfinding(context, { kind = null } = {}) {
  const selected = kind === null
    ? context.decisionProcedures.procedures
    : context.decisionProcedures.procedures.filter((entry) => entry.id === String(kind).trim().toLowerCase());
  if (kind !== null && selected.length === 0) {
    const foreign = context.decisionProcedures.foreignAuthorityRoutes.find((entry) => entry.id === String(kind).trim().toLowerCase());
    if (foreign) {
      return Object.freeze({
        type: "ZeloDecisionProcedureWayfinding",
        version: 1,
        kind: foreign.id,
        foreignAuthority: Object.freeze(structuredClone(foreign)),
        procedures: Object.freeze([]),
        numericVotingWeightsEstablished: context.standing.activeParticipation.numericVotingWeightsEstablished === true,
        note: "This matter is outside Turntide decision authority; Zelo can explain and route but cannot manufacture authority.",
        bindingEffect: "informational-only",
      });
    }
    throw new TypeError(`unknown Turntide decision procedure ${JSON.stringify(kind)}`);
  }
  return Object.freeze({
    type: "ZeloDecisionProcedureWayfinding",
    version: 1,
    kind: kind === null ? null : String(kind).trim().toLowerCase(),
    foreignAuthority: null,
    procedures: Object.freeze(selected.map((entry) => Object.freeze(structuredClone(entry)))),
    numericVotingWeightsEstablished: context.standing.activeParticipation.numericVotingWeightsEstablished === true,
    note: "Turntide selects a decision procedure by authority and consequence, not by reactions, message volume, popularity, or convenience. Proposal state, decision authority, execution, and receiving stay separate.",
    bindingEffect: "informational-only",
  });
}


export function standingWayfinding(context) {
  return Object.freeze({
    type: "ZeloStandingWayfinding",
    version: 1,
    authorityEffect: context.standingPathways.authorityEffect,
    standingRequiresRecord: context.standing.principles.standingRequiresRecord === true,
    pathways: Object.freeze(context.standingPathways.pathways.map((path) => Object.freeze({
      id: path.id,
      title: path.title,
      when: path.when,
      creates: path.creates,
      requires: path.requires,
      zeloCan: path.zeloCan,
      next: path.next,
    }))),
    currentStanding: Object.freeze(context.standing.entries.map((entry) => Object.freeze({
      id: entry.id,
      kind: entry.kind,
      state: entry.state,
      scope: entry.scope,
    }))),
    note: "Turntide has no automatic promotion ladder. Participation is open; authority must remain legible as a recorded standing or delegation.",
    bindingEffect: "informational-only",
  });
}


export function placeCivicGuide(context, { place } = {}) {
  const normalized = normalizePlace(place);
  if (normalized === "") throw new TypeError("Turntide place is required");
  const matches = context.civicPlaces.places.filter((entry) =>
    normalizePlace(entry.id) === normalized || (entry.aliases ?? []).map(normalizePlace).includes(normalized));
  if (matches.length === 0) {
    return Object.freeze({
      type: "ZeloPlaceCivicGuide",
      version: 1,
      place: normalized,
      known: false,
      note: "That place is not in Turntide's civic affordance map yet. Zelo can still help classify the work or draft a place-map improvement.",
      bindingEffect: "informational-only",
    });
  }
  const patterns = context.routinePatterns.patterns.filter((pattern) =>
    pattern.places.map(normalizePlace).includes(normalized));
  return Object.freeze({
    type: "ZeloPlaceCivicGuide",
    version: 1,
    place: normalized,
    known: true,
    affordances: Object.freeze(matches.map((entry) => Object.freeze({
      id: entry.id,
      title: entry.title,
      civicPurpose: entry.civicPurpose,
      ordinaryMoves: Object.freeze([...(entry.ordinaryMoves ?? [])]),
      routineSeeds: Object.freeze([...(entry.routineSeeds ?? [])]),
      escalation: entry.escalation,
      zeloPrompts: Object.freeze([...(entry.zeloPrompts ?? [])]),
      authorityBoundary: entry.authorityBoundary,
    }))),
    routinePatterns: Object.freeze(patterns.map((pattern) => Object.freeze({
      id: pattern.id,
      title: pattern.title,
      useWhen: pattern.useWhen,
    }))),
    next: "Pick an ordinary move, ask Zelo one of the prompts, or describe repeated work and ask for routine studio. Binding changes still follow Turntide's civic action protocol.",
    bindingEffect: "informational-only",
    createsAuthority: false,
    createsRoutine: false,
  });
}


export function routineStudio(context, { place, observation = "" } = {}) {
  const normalized = normalizePlace(place);
  const patterns = context.routinePatterns.patterns.filter((pattern) =>
    normalized === "" || pattern.places.map(normalizePlace).includes(normalized));
  return Object.freeze({
    type: "ZeloRoutineStudio",
    version: 1,
    place: normalized || null,
    observation: String(observation ?? "").trim() || null,
    patterns: Object.freeze(patterns.map((pattern) => Object.freeze({
      id: pattern.id,
      title: pattern.title,
      useWhen: pattern.useWhen,
      places: Object.freeze([...pattern.places]),
      draft: Object.freeze({
        observedRepetition: String(observation ?? "").trim() || pattern.useWhen,
        ...pattern.candidateDefaults,
      }),
      state: "advisory-pattern",
      bindingEffect: "none",
    }))),
    next: patterns.length === 0
      ? "Name a Turntide place or describe the repeated work so Zelo can draft a routine candidate from the civic routine schema."
      : "Choose a pattern and revise its draft around the actual observed repetition; proposing or enacting it remains a separate civic transition.",
    enactmentCreated: false,
    authorityCreated: false,
  });
}


export function routineFromPattern(context, { patternId, observation } = {}) {
  const pattern = context.routinePatterns.patterns.find((candidate) => candidate.id === patternId);
  if (!pattern) throw new TypeError(`unknown Turntide routine pattern ${JSON.stringify(patternId)}`);
  const observedRepetition = String(observation ?? "").trim();
  if (observedRepetition === "") {
    return Object.freeze({
      type: "ZeloRoutinePatternDraft",
      version: 1,
      state: "incomplete",
      patternId,
      missing: Object.freeze(["observedRepetition"]),
      note: "An advisory pattern is not evidence of demand; name the repeated work before Zelo can form a routine candidate.",
      bindingEffect: "none",
    });
  }
  const draft = draftRoutineCandidate(context, {
    observedRepetition,
    ...pattern.candidateDefaults,
  });
  return Object.freeze({
    type: "ZeloRoutinePatternDraft",
    version: 1,
    patternId,
    patternTitle: pattern.title,
    routine: draft,
    bindingEffect: draft.bindingEffect,
  });
}

export function tidepoolParticipantGuide(context, { lane = null } = {}) {
  const guide = context.tidepoolParticipantGovernance;
  const selected = lane === null
    ? guide.lanes
    : guide.lanes.filter((entry) => entry.id === String(lane).trim().toLowerCase());
  if (lane !== null && selected.length === 0) throw new TypeError(`unknown Tidepool governance lane ${JSON.stringify(lane)}`);
  return Object.freeze({
    type: "ZeloTidepoolParticipantGovernanceGuide",
    version: 1,
    authorityDomain: guide.authorityDomain,
    lanes: Object.freeze(selected.map((entry) => Object.freeze(structuredClone(entry)))),
    currentExecutionBoundary: Object.freeze(structuredClone(guide.currentExecutionBoundary)),
    currentState: Object.freeze({
      asOf: context.tidepoolStatus.observedAt,
      runtime: context.tidepoolStatus.runtime.operationState,
      protocolClerk: context.tidepoolStatus.executor.incumbentState,
      firstOperatingLoop: context.tidepoolStatus.firstOperatingLoop.state,
      blocker: context.tidepoolStatus.firstOperatingLoop.currentBlocker,
    }),
    bindingEffect: "informational-only",
    createsMembership: false,
    createsVote: false,
    createsFinancialAuthority: false,
  });
}

export function tidepoolCivicMap(context) {
  const status = context.tidepoolStatus;
  const participant = tidepoolParticipantGuide(context);
  return Object.freeze({
    type: "ZeloTidepoolCivicMap",
    version: 3,
    relationship: "Tidepool is Turntide-adjacent but financially governed in the separate tidepool-financial-membership authority domain.",
    asOf: status.observedAt,
    currentState: Object.freeze({
      runtime: status.runtime.operationState,
      installedOperations: Object.freeze([...status.runtime.operations]),
      generalCivicOfficeAvailability: status.runtime.availableToGeneralTurntideOrBoardOffice,
      protocolClerk: status.executor.incumbentState,
      protocolClerkSeatReady: status.executor.seatReady === true,
      participantIntentOperations: Object.freeze([...(status.executor.participantIntentOperations ?? [])]),
      protocolCloseCandidates: Object.freeze([...(status.executor.protocolCloseCandidates ?? [])]),
      staffing: status.staffing.state,
      firstOperatingLoop: status.firstOperatingLoop.state,
      blocker: status.firstOperatingLoop.currentBlocker,
    }),
    participantGovernance: participant.lanes,
    paths: Object.freeze([
      Object.freeze({
        id: "status",
        ask: "What is Tidepool and what is actually received or available?",
        route: "Zelo may explain current durable/public receipts and unavailable states.",
        authority: "informational",
        zeloMayDo: true,
      }),
      ...participant.lanes.map((lane) => Object.freeze({
        id: lane.id,
        ask: lane.participantQuestion,
        route: lane.zeloRole,
        authority: "tidepool-financial-membership",
        zeloMayDo: "explain-and-route-only",
      })),
      Object.freeze({
        id: "turntide-integration",
        ask: "Should Turntide link to, explain, host discussion about, or otherwise integrate Tidepool?",
        route: "This is a Turntide governance/product-surface question and may become Turntide discussion or a proposal.",
        authority: "turntide-governance",
        zeloMayDo: "draft-and-route",
      }),
      Object.freeze({
        id: "financial-operation",
        ask: "Can Zelo move principal, yield, or execute a Tidepool transaction for me?",
        route: "No. Financial execution requires Tidepool-authorized operations and the applicable member/protocol authority.",
        authority: "tidepool-financial-protocol",
        zeloMayDo: false,
      }),
    ]),
    tidepoolMembershipCreatesTurntideStanding: context.standing.principles.tidepoolMembershipCreatesTurntideStanding === true,
    turntideStandingCreatesTidepoolFinancialAuthority: false,
    zeloHasTidepoolProtocolExecutionAuthority: status.authorityBoundaries.zeloHasTidepoolProtocolExecutionAuthority,
    freshness: Object.freeze({ ...status.freshness }),
    bindingEffect: "informational-only",
  });
}

export function authorityBoundary(context, domain) {
  const value = String(domain ?? "").trim().toLowerCase();
  const boundaries = {
    turntide: {
      authorityDomain: "turntide-governance",
      rule: "Turntide-wide authority comes from recorded Turntide standing, delegation, or governing acts.",
    },
    discord: {
      authorityDomain: "turntide-discord-participation",
      rule: "Discord participation and roles are civic instruments; they do not create Turntide governance standing.",
    },
    tidepool: {
      authorityDomain: "tidepool-financial-membership",
      rule: "Tidepool financial membership and voting are governed by Tidepool's own rules and do not automatically grant Turntide-wide standing.",
    },
    provider: {
      authorityDomain: "provider-capability",
      rule: "A 561 Group or infrastructure capability can execute delegated work but does not become Turntide authority merely because it can act.",
    },
  };
  const selected = boundaries[value];
  if (!selected) throw new TypeError(`unknown authority domain ${JSON.stringify(domain)}`);
  return Object.freeze({
    type: "ZeloAuthorityBoundaryAnswer",
    version: 1,
    subject: value,
    ...selected,
    standingMustBeRecorded: context.standing.principles.standingRequiresRecord === true,
    bindingEffect: "informational-only",
  });
}

export function rehearseCivicMove(context, { artifactKind, state }) {
  const answer = civicState(context, { artifactKind, state });
  return Object.freeze({
    type: "ZeloGovernanceRehearsal",
    version: 1,
    nonbinding: true,
    creates: Object.freeze({
      standing: false,
      vote: false,
      decision: false,
      authority: false,
      execution: false,
    }),
    scenario: answer,
    note: "Choose any listed transition to discuss what would be required; rehearsal never performs it.",
  });
}


const PROPOSAL_FIELDS = Object.freeze([
  "proposer",
  "requestedAct",
  "affectedScope",
  "evidence",
  "authorityNeeded",
  "reversibility",
  "receivingCondition",
]);

export function draftProposal(context, input = {}) {
  const missing = PROPOSAL_FIELDS.filter((field) => typeof input[field] !== "string" || input[field].trim() === "");
  const state = civicState(context, { artifactKind: "proposal", state: "draft-proposal" });
  const proposal = state.transitions.find((transition) => transition.to === "proposed");
  if (missing.length > 0) {
    return Object.freeze({
      type: "ZeloProposalDraft",
      version: 1,
      state: "incomplete",
      missing: Object.freeze(missing),
      next: "draft-proposal",
      bindingEffect: "draft-only",
    });
  }
  return Object.freeze({
    type: "ZeloProposalDraft",
    version: 1,
    state: "draft-proposal",
    proposal: Object.freeze(Object.fromEntries(PROPOSAL_FIELDS.map((field) => [field, input[field].trim()]))),
    next: "proposed",
    nextAuthority: Object.freeze([...(proposal?.mayBePerformedBy ?? [])]),
    nextRequires: Object.freeze([...(proposal?.requires ?? [])]),
    note: "This is a private/draft civic artifact. It is not before governance until the separate draft-proposal → proposed transition is performed, and it is not enacted merely because it is proposed.",
    bindingEffect: "draft-only",
  });
}


const DELEGATION_FIELDS = Object.freeze([
  "delegate",
  "purpose",
  "scope",
  "grantedActions",
  "limits",
  "reviewOrExpiry",
  "revocationCondition",
  "receivingCondition",
]);

export function draftDelegationRequest(context, input = {}) {
  const missing = DELEGATION_FIELDS.filter((field) => typeof input[field] !== "string" || input[field].trim() === "");
  if (missing.length > 0) {
    return Object.freeze({
      type: "ZeloDelegationRequestDraft",
      version: 1,
      state: "incomplete",
      missing: Object.freeze(missing),
      bindingEffect: "none",
    });
  }
  const state = civicState(context, { artifactKind: "delegation", state: "requested" });
  const activation = state.transitions.find((transition) => transition.to === "active");
  return Object.freeze({
    type: "ZeloDelegationRequestDraft",
    version: 1,
    state: "requested-draft",
    request: Object.freeze(Object.fromEntries(DELEGATION_FIELDS.map((field) => [field, input[field].trim()]))),
    next: "active",
    activationAuthority: Object.freeze([...(activation?.mayBePerformedBy ?? [])]),
    activationRequires: Object.freeze([...(activation?.requires ?? [])]),
    note: "This draft requests bounded authority. It does not activate the delegation, create standing, or expand any existing scope.",
    bindingEffect: "draft-only",
  });
}

const ROUTINE_FIELD_MAP = Object.freeze({
  "observed repetition": "observedRepetition",
  beneficiary: "beneficiary",
  "trigger-or-cadence": "triggerOrCadence",
  actor: "actor",
  output: "output",
  "authority boundary": "authorityBoundary",
  "failure mode": "failureMode",
  "retirement condition": "retirementCondition",
});

export function draftRoutineCandidate(context, input) {
  const transitions = artifact(context, "routine-candidate").transitions;
  const proposal = transitions.find((transition) => transition.from === "draft" && transition.to === "proposed");
  const required = (proposal?.requires ?? []).map((label) => ROUTINE_FIELD_MAP[label] ?? label);
  const missing = required.filter((field) => typeof input?.[field] !== "string" || input[field].trim() === "");
  if (missing.length > 0) {
    return Object.freeze({
      type: "ZeloRoutineCandidateDraft",
      version: 1,
      state: "incomplete",
      missing: Object.freeze(missing),
      bindingEffect: "none",
    });
  }
  return Object.freeze({
    type: "ZeloRoutineCandidateDraft",
    version: 1,
    state: "draft",
    candidate: Object.freeze(Object.fromEntries(required.map((field) => [field, input[field].trim()]))),
    next: "proposed",
    nextAuthority: Object.freeze([...(proposal.mayBePerformedBy ?? [])]),
    bindingEffect: "draft-only",
  });
}

export function receivedTeachingExamples(context) {
  return Object.freeze(context.acts
    .filter((act) => act.state === "received" && act.teachingUse?.eligible === true)
    .map((act) => Object.freeze({
      id: act.id,
      requestedAct: act.requestedAct,
      authority: act.origin,
      execution: act.execution,
      receiving: act.receiving,
      lesson: act.teachingUse.lesson,
      precedentEffect: "none",
    })));
}


const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

function civicSnapshot(context) {
  return Object.freeze({
    standing: Object.freeze(context.standing.entries
      .map((entry) => `${entry.id}|${entry.state}|${entry.scope ?? ""}`)
      .sort()),
    acts: Object.freeze(context.acts
      .map((act) => `${act.id}|${act.state ?? ""}|${act.decision?.state ?? ""}|${act.execution?.state ?? ""}|${act.receiving?.state ?? ""}`)
      .sort()),
    routines: Object.freeze(context.routines.routines.map((routine) => routine.id).sort()),
  });
}

function snapshotDigest(snapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("base64url");
}

function due(lastAt, interval, nowMs) {
  if (typeof lastAt !== "string") return true;
  const last = Date.parse(lastAt);
  return !Number.isFinite(last) || nowMs - last >= interval;
}

function reconciliationExceptions(context) {
  const exceptions = [];
  for (const act of context.acts) {
    const decision = act.decision?.state;
    const execution = act.execution?.state;
    const receiving = act.receiving?.state;
    if (act.state === "contested") {
      exceptions.push(Object.freeze({ id: act.id, state: "contested", next: "resolve the specific contradiction or falsifying evidence before settlement" }));
    } else if (decision === "enacted" && !["executing", "executed"].includes(execution) && receiving !== "received") {
      exceptions.push(Object.freeze({ id: act.id, state: execution ?? "not-executing", next: "name or confirm the authorized executor and execution receipt" }));
    } else if (execution === "executed" && receiving !== "received") {
      exceptions.push(Object.freeze({ id: act.id, state: receiving ?? "unreceived", next: "supply receiving evidence matching the act's stated receiving condition" }));
    }
  }
  return Object.freeze(exceptions);
}

function standingExceptions(context) {
  return Object.freeze(context.standing.entries
    .filter((entry) => String(entry.state).includes("active") && (
      typeof entry.basis !== "string" || entry.basis.trim() === ""
      || typeof entry.scope !== "string" || entry.scope.trim() === ""
    ))
    .map((entry) => Object.freeze({ id: entry.id, state: entry.state, problem: "active standing lacks an explicit basis or scope" })));
}

function snapshotChanges(previous, current) {
  const priorStanding = new Set(previous?.standing ?? []);
  const priorActs = new Set(previous?.acts ?? []);
  const priorRoutines = new Set(previous?.routines ?? []);
  return Object.freeze({
    standing: current.standing.filter((entry) => !priorStanding.has(entry)),
    acts: current.acts.filter((entry) => !priorActs.has(entry)),
    routines: current.routines.filter((entry) => !priorRoutines.has(entry)),
  });
}

/**
 * Derive the bounded scheduled civic outputs that Zelo may deliver from durable
 * Turntide records. The adapter owns clocks and delivery; this function owns
 * meaning. First observation baselines silently so a bot restart cannot turn
 * historical state into unsolicited chatter.
 */
export function scheduledCivicReview(context, { state = {}, routineCandidates = [], proposalSubmissions = [], now = new Date().toISOString() } = {}) {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new TypeError("scheduled civic review requires an ISO timestamp");
  const snapshot = civicSnapshot(context);
  const digest = snapshotDigest(snapshot);
  const received = context.acts.filter((act) => act.state === "received").map((act) => act.id).sort();
  const candidateIds = routineCandidates.map((candidate) => candidate.id).filter((id) => typeof id === "string").sort();
  const proposalIds = proposalSubmissions
    .filter((submission) => submission?.state === "proposed" && typeof submission.proposalId === "string")
    .map((submission) => submission.proposalId)
    .sort();
  const eligibleTeaching = new Map(receivedTeachingExamples(context).map((example) => [example.id, example]));

  if (state.initialized !== true) {
    return Object.freeze({
      type: "ZeloScheduledCivicReview",
      version: 1,
      outputs: Object.freeze([]),
      nextState: Object.freeze({
        version: 1,
        initialized: true,
        reportedSnapshot: snapshot,
        reportedDigest: digest,
        knownReceivedActIds: Object.freeze(received),
        pendingTeachingIds: Object.freeze([]),
        taughtActIds: Object.freeze([]),
        seenRoutineCandidateIds: Object.freeze(candidateIds),
        seenProposalIds: Object.freeze(proposalIds),
        lastRunAt: Object.freeze({
          "governance-rock-sweep": now,
          "decision-action-reconciliation": now,
          "island-routine-discovery": now,
          "proposal-intake-review": now,
          "standing-delegation-review": now,
          "routine-retirement-review": now,
        }),
      }),
      bindingEffect: "informational-only",
    });
  }

  const lastRunAt = { ...(state.lastRunAt ?? {}) };
  const outputs = [];
  const knownReceived = new Set(state.knownReceivedActIds ?? []);
  const pendingTeaching = [...(state.pendingTeachingIds ?? [])];
  const taught = new Set(state.taughtActIds ?? []);
  for (const id of received) {
    if (!knownReceived.has(id)) {
      knownReceived.add(id);
      if (eligibleTeaching.has(id) && !taught.has(id) && !pendingTeaching.includes(id)) pendingTeaching.push(id);
    }
  }

  if (due(lastRunAt["governance-rock-sweep"], DAY_MS, nowMs)) {
    const changes = snapshotChanges(state.reportedSnapshot, snapshot);
    if (state.reportedDigest !== digest) {
      const labels = [];
      if (changes.standing.length > 0) labels.push(`${changes.standing.length} standing change(s)`);
      if (changes.acts.length > 0) labels.push(`${changes.acts.length} governance-act change(s)`);
      if (changes.routines.length > 0) labels.push(`${changes.routines.length} routine-catalog change(s)`);
      outputs.push(Object.freeze({
        routine: "governance-rock-sweep",
        channel: "governance-action",
        content: `Turntide civic state changed since the last quiet sweep: ${labels.join(", ") || "durable state changed"}. Ask Zelo “what changed?” or “what needs a next move?” for the current record-grounded path. No vote, standing, or consensus is inferred from this notice.`,
        bindingEffect: "status-only",
      }));
    }
    lastRunAt["governance-rock-sweep"] = now;
  }

  if (due(lastRunAt["decision-action-reconciliation"], DAY_MS, nowMs)) {
    const exceptions = reconciliationExceptions(context);
    if (exceptions.length > 0) {
      outputs.push(Object.freeze({
        routine: "decision-action-reconciliation",
        channel: "governance-action",
        content: `Decision/action reconciliation found ${exceptions.length} unsettled governance act(s): ${exceptions.map((entry) => `${entry.id} [${entry.state}] → ${entry.next}`).join("; ")}`,
        bindingEffect: "reconciliation-only",
      }));
    }
    lastRunAt["decision-action-reconciliation"] = now;
  }

  if (due(lastRunAt["island-routine-discovery"], WEEK_MS, nowMs)) {
    const seen = new Set(state.seenRoutineCandidateIds ?? []);
    const newCount = candidateIds.filter((id) => !seen.has(id)).length;
    if (newCount > 0) {
      outputs.push(Object.freeze({
        routine: "island-routine-discovery",
        channel: "governance-discussion",
        content: `Zelo has ${newCount} newly saved private draft routine candidate(s) since the last routine review. The digest exposes no author or observation text. Refine candidates in their original context before any proposal or enactment.`,
        bindingEffect: "draft-candidate-only",
      }));
    }
    lastRunAt["island-routine-discovery"] = now;
  }

  let seenProposalIds = [...(state.seenProposalIds ?? [])];
  if (due(lastRunAt["proposal-intake-review"], DAY_MS, nowMs)) {
    const seen = new Set(seenProposalIds);
    const newlyProposed = proposalIds.filter((id) => !seen.has(id));
    if (newlyProposed.length > 0) {
      outputs.push(Object.freeze({
        routine: "proposal-intake-review",
        channel: "governance-proposals",
        content: `Zelo received ${newlyProposed.length} new public proposal submission receipt(s) since the last proposal intake review: ${newlyProposed.join(", ")}. These are proposed, not enacted. Read the proposal posts in this lane for their authored scope and evidence; this notice does not rank proposals or infer support from reactions, message volume, silence, or popularity.`,
        bindingEffect: "status-only",
      }));
    }
    seenProposalIds = proposalIds;
    lastRunAt["proposal-intake-review"] = now;
  }

  if (due(lastRunAt["standing-delegation-review"], WEEK_MS, nowMs)) {
    const exceptions = standingExceptions(context);
    if (exceptions.length > 0) {
      outputs.push(Object.freeze({
        routine: "standing-delegation-review",
        channel: "governance-action",
        content: `Standing review found ${exceptions.length} active record(s) missing an explicit basis or scope: ${exceptions.map((entry) => entry.id).join(", ")}. This is a record-integrity exception, not an automatic revocation.`,
        bindingEffect: "review-only",
      }));
    }
    lastRunAt["standing-delegation-review"] = now;
  }

  if (pendingTeaching.length > 0 && due(lastRunAt["received-act-teaching-example"], WEEK_MS, nowMs)) {
    const id = pendingTeaching.shift();
    const example = eligibleTeaching.get(id);
    if (example) {
      outputs.push(Object.freeze({
        routine: "received-act-teaching-example",
        channel: "governance-questions",
        content: `How Turntide governed a real change: ${example.requestedAct} Lesson: ${example.lesson} This is a teaching example, not precedent and not a new grant of authority.`,
        subjectId: id,
        bindingEffect: "teaching-only",
      }));
      taught.add(id);
      lastRunAt["received-act-teaching-example"] = now;
    }
  }

  if (due(lastRunAt["routine-retirement-review"], MONTH_MS, nowMs)) {
    lastRunAt["routine-retirement-review"] = now;
  }

  return Object.freeze({
    type: "ZeloScheduledCivicReview",
    version: 1,
    outputs: Object.freeze(outputs),
    nextState: Object.freeze({
      version: 1,
      initialized: true,
      reportedSnapshot: snapshot,
      reportedDigest: digest,
      knownReceivedActIds: Object.freeze([...knownReceived].sort()),
      pendingTeachingIds: Object.freeze(pendingTeaching),
      taughtActIds: Object.freeze([...taught].sort()),
      seenRoutineCandidateIds: Object.freeze(candidateIds),
      seenProposalIds: Object.freeze(seenProposalIds),
      lastRunAt: Object.freeze(lastRunAt),
    }),
    bindingEffect: "informational-only",
  });
}

export function routineIntent(context, { routineId, subjectId = null, evidenceDigest = null }) {
  const routine = context.routines.routines.find((candidate) => candidate.id === routineId);
  const execution = context.runtime.routineExecution.find((candidate) => candidate.routine === routineId);
  if (!routine || !execution) throw new TypeError(`routine is not admitted to the Zelo civic runtime: ${JSON.stringify(routineId)}`);
  return Object.freeze({
    type: "ZeloCivicDeliveryIntent",
    version: 1,
    office: context.runtime.office,
    routine: routineId,
    mode: execution.mode,
    trigger: execution.trigger ?? null,
    cadence: execution.cadence ?? null,
    preferredDelivery: execution.preferredDelivery,
    dedupe: Object.freeze({
      rule: execution.dedupe,
      subjectId,
      evidenceDigest,
    }),
    silenceWhenEmpty: execution.silenceWhenEmpty === true || context.runtime.rules.silenceWhenNoMaterialOutput === true,
    autonomousEffect: execution.autonomousEffect,
    grantsAuthority: false,
    deliveryAdapterIsAuthority: false,
  });
}

export function formatZelo(value) {
  if (value.type === "ZeloCivicOrientation") {
    return [
      "Turntide is a DAO whose authority lives in recorded standing, delegations, and governing acts — not in Discord roles or whoever has credentials.",
      `Right now I can help you: ${value.askZelo.join(" ")}`,
    ].join("\n");
  }
  if (value.type === "ZeloTurntideExplanation") {
    return [
      "Turntide has three useful layers: the community, the DAO's recorded governance, and the instruments the community uses.",
      "You can participate without already holding governance standing: ask, discuss, propose, volunteer, or bring Zelo repeated work that might deserve a routine.",
      "Binding decisions are different: they require current recorded standing or delegation.",
    ].join("\n");
  }
  if (value.type === "ZeloParticipationPaths") {
    const paths = value.paths.map((path) => `- ${path.action} [${path.bindingEffect}]`).join("\n");
    return `You do not need Turntide-wide standing to begin participating.\n${paths}\n${value.currentStandingRule}`;
  }
  if (value.type === "ZeloContestabilityWayfinding") {
    const paths = value.pathways.map((path) => [
      `- ${path.id}: ${path.appliesWhen}`,
      `  You can: ${path.participantMay}`,
      `  What that does: ${path.stateEffect}`,
      `  Zelo can: ${path.zeloMay}`,
      ...(path.zeloMayNot === undefined ? [] : [`  Zelo cannot: ${path.zeloMayNot}`]),
    ].join("\n")).join("\n");
    return `${value.note}\n${paths}\nUseful evidence: subject, current claim, specific contradiction or missing receipt, checkable source, and the requested next move.`;
  }
  if (value.type === "ZeloDecisionProcedureWayfinding") {
    if (value.foreignAuthority) {
      return `${value.note}\n${value.foreignAuthority.appliesWhen}\nRoute: ${value.foreignAuthority.routeTo}. ${value.foreignAuthority.note}`;
    }
    const lines = value.procedures.map((procedure) => [
      `- ${procedure.title}`,
      `  Use when: ${procedure.appliesWhen}`,
      `  Decision rule: ${procedure.decisionMode}`,
      `  Authority: ${procedure.whoMayAuthorize.join(" or ")}`,
      `  Executor: ${procedure.executor}`,
      `  Receiving: ${procedure.receiving}`,
    ].join("\n")).join("\n");
    return `${value.note}\nNumeric voting weights currently established: ${value.numericVotingWeightsEstablished ? "yes" : "no"}.\n${lines}`;
  }
  if (value.type === "ZeloStandingWayfinding") {
    const lines = value.pathways.map((path) => [
      `- ${path.title}`,
      `  Use when: ${path.when}`,
      `  Requires: ${path.requires}`,
      `  Next: ${path.next}`,
    ].join("\n")).join("\n");
    return `${value.note}\n${lines}`;
  }
  if (value.type === "ZeloPlaceCivicGuide") {
    if (!value.known) return value.note;
    const sections = value.affordances.map((entry) => [
      entry.title,
      `What this place is for: ${entry.civicPurpose}`,
      `Things you can do: ${entry.ordinaryMoves.join("; ")}`,
      `Routine seeds: ${entry.routineSeeds.join("; ")}`,
      `If it needs to move: ${entry.escalation}`,
      `Authority boundary: ${entry.authorityBoundary}`,
    ].join("\n")).join("\n\n");
    const patterns = value.routinePatterns.length === 0 ? "" : `\n\nExisting routine patterns: ${value.routinePatterns.map((pattern) => pattern.title).join(", ")}.`;
    return `#${value.place}\n${sections}${patterns}\n\n${value.next}`;
  }
  if (value.type === "ZeloRoutineStudio") {
    if (value.patterns.length === 0) return value.next;
    const lines = value.patterns.map((pattern) => `- ${pattern.title}: ${pattern.useWhen}`).join("\n");
    return `Routine studio suggestions${value.place ? ` for #${value.place}` : ""}:\n${lines}\n${value.next}`;
  }
  if (value.type === "ZeloRoutinePatternDraft") {
    if (value.state === "incomplete") return value.note;
    return `${value.patternTitle}: ${formatZelo(value.routine)}`;
  }
  if (value.type === "ZeloTidepoolParticipantGovernanceGuide") {
    const lanes = value.lanes.map((lane) => {
      const states = (lane.states ?? []).map((state) => `${state.id}: ${state.meaning}`).join("; ");
      return `- ${lane.title}: ${lane.participantQuestion}\n  Participant: ${(lane.participantMay ?? []).join("; ")}\n  Authority: ${lane.authorityBoundary}\n  Zelo: ${lane.zeloRole}${states ? `\n  States: ${states}` : ""}`;
    }).join("\n");
    return `Tidepool participant governance (as of ${value.currentState.asOf}):\n${lanes}\nCurrent protocol clerk: ${value.currentState.protocolClerk}; first operating loop: ${value.currentState.firstOperatingLoop}. This explanation creates no membership, vote, or financial authority.`;
  }
  if (value.type === "ZeloTidepoolCivicMap") {
    const lines = value.paths.map((path) => `- ${path.ask} → ${path.route}`).join("\n");
    const current = [
      `As of ${value.asOf}: CRG runtime is ${value.currentState.runtime}; the dedicated Tidepool Protocol Clerk is ${value.currentState.protocolClerk}; the first operating loop is ${value.currentState.firstOperatingLoop}.`,
      `Current blocker: ${value.currentState.blocker}.`,
      `General Turntide/Board civic-office protocol availability: ${value.currentState.generalCivicOfficeAvailability ? "available" : "unavailable"}.`,
    ].join("\n");
    return `${value.relationship}\nTurntide-wide standing is not a substitute for Tidepool financial authority.\n${current}\n${lines}`;
  }
  if (value.type === "ZeloCivicStateAnswer") {
    if (value.transitions.length === 0) return `${value.artifactKind} is currently ${value.state}; the enacted protocol names no automatic next transition from there.`;
    const moves = value.transitions.map((move) => `${move.to} — by ${move.mayBePerformedBy.join(" or ")}; needs ${move.requires.join(", ")}`).join("\n");
    return `${value.artifactKind} is currently ${value.state}. Lawful next move(s):\n${moves}`;
  }
  if (value.type === "ZeloAuthorityBoundaryAnswer") return value.rule;
  if (value.type === "ZeloGovernanceRehearsal") {
    return `DRY RUN — no standing, vote, decision, authority, or execution is created.\n${formatZelo(value.scenario)}`;
  }
  if (value.type === "ZeloProposalDraft") {
    return value.state === "incomplete"
      ? `Proposal draft is incomplete; still needed: ${value.missing.join(", ")}. It remains private/draft-only.`
      : `Proposal draft is complete but not proposed or enacted. Next state is ${value.next}; moving it there requires ${value.nextAuthority.join(" or ")} and the protocol-required proposal fields.`;
  }
  if (value.type === "ZeloDelegationRequestDraft") {
    return value.state === "incomplete"
      ? `Delegation request draft is incomplete; still needed: ${value.missing.join(", ")}.`
      : `Delegation request drafted only. Activation still requires ${value.activationAuthority.join(" or ")} and a governing act; this draft creates no authority.`;
  }
  if (value.type === "ZeloRoutineCandidateDraft") {
    return value.state === "incomplete"
      ? `Routine draft is incomplete; still needed: ${value.missing.join(", ")}.`
      : `Routine candidate drafted only; next state is ${value.next}, which still requires a civic transition.`;
  }
  return JSON.stringify(value);
}
