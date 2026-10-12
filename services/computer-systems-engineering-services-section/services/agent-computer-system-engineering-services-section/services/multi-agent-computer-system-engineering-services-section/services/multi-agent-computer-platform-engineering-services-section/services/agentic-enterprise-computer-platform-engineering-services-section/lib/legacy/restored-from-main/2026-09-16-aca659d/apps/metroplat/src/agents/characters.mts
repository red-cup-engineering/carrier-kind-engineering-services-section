/** Agent character model. */
import type { JsonValue } from "../lib/codecs/json/core.mts";
import {
  diagonalAgentCover,
  materialContextFromCover,
  offDiagonalCollectiveCover,
} from "../lib/contracts/instrument.mts";
import type { MaterialContext, RelationalFacultyCover } from "../lib/contracts/contract.mts";
import { cohomologyOfEdgeGraph, type Cohomology } from "@red-cup-engineering/feltos/fixpoint/cohomology";
import type { ChargeValueName } from "@red-cup-engineering/agentic-enterprise-computer-platform-engineering-services-section/claim-charge";

export type AgentAct =
  | "observe"
  | "plan"
  | "act"
  | "speak"
  | "tool"
  | "remember"
  | "forget"
  | "reflect"
  | "delegate"
  | "proponent"
  | "opponent"
  | "daimon";

export type MemoryClass =
  | "working"
  | "episodic"
  | "semantic"
  | "procedural"
  | "graph"
  | "audit";

export type GovernanceAspect =
  | "identity"
  | "behavior"
  | "voice"
  | "memory"
  | "lore"
  | "tools"
  | "autonomy"
  | "safety"
  | "evaluation"
  | "audit"
  | "soul"
  | "heartbeat"
  | "hooks"
  | "skills";

export type CharacterConcept = "agent" | "actor" | "persona" | "character";

export interface CharacterIdentity {
  readonly id: string;
  readonly displayName: string;
  readonly role?: string;
  readonly voice?: string;
  readonly principles?: readonly string[];
  readonly autonomy?: "none" | "suggest" | "bounded" | "delegated";
  readonly evidence?: readonly string[];
}

export interface CharacterMemoryRecord {
  readonly kind: "metroplat.agent.character.memory";
  readonly id: string;
  readonly class: MemoryClass;
  readonly scope: "user" | "session" | "agent" | "workspace" | "world";
  readonly path?: string;
  readonly mirrorPath?: string;
  readonly source: "memory-file" | "event-log" | "skill" | "graph" | "runtime" | "manual";
  readonly summary?: string;
  readonly confidence?: number;
  readonly evidence: readonly string[];
}

export interface CharacterSkill {
  readonly kind: "metroplat.agent.character.skill";
  readonly id: string;
  readonly name: string;
  readonly position: "inquiry" | "procedure" | "derivation" | "process";
  readonly support?: readonly string[];
  readonly path?: string;
  readonly script?: string;
  readonly evidence: readonly string[];
}

export interface CharacterDiscipline {
  readonly kind: "metroplat.agent.character.discipline";
  readonly id: string;
  readonly name: string;
  readonly behavior: readonly string[];
  readonly evidence: readonly string[];
}

export interface CharacterTool {
  readonly kind: "metroplat.agent.character.tool";
  readonly id: string;
  readonly name: string;
  readonly authority: "read" | "write" | "execute" | "network" | "delegate";
  readonly boundary: "host" | "mcp" | "http" | "filesystem" | "process" | "runtime";
  readonly evidence: readonly string[];
}

export interface CharacterHook {
  readonly kind: "metroplat.agent.character.hook";
  readonly id: string;
  readonly event: string;
  readonly path?: string;
  readonly purpose: "memory" | "audit" | "bootstrap" | "gate" | "automation";
  readonly evidence: readonly string[];
}

export interface CharacterGovernanceRecord {
  readonly kind: "metroplat.agent.character.governance";
  readonly aspect: GovernanceAspect;
  readonly source: string;
  readonly payload?: JsonValue;
  readonly evidence: readonly string[];
}

export interface CharacterSoul {
  readonly kind: "metroplat.agent.character.soul";
  readonly values: readonly string[];
  readonly must: readonly string[];
  readonly mustNot: readonly string[];
  readonly evidence: readonly string[];
}

export interface CharacterHeartbeat {
  readonly kind: "metroplat.agent.character.heartbeat";
  readonly checks: readonly string[];
  readonly cadence: "opportunistic" | "session" | "scheduled";
  readonly evidence: readonly string[];
}

export interface CharacterInstructionSurface {
  readonly kind: "metroplat.agent.character.instruction-surface";
  readonly id: string;
  readonly convention: "AGENTS.md" | "SOUL.md" | "CLAUDE.md" | ".mcp.json" | "MEMORY.md" | "character-record" | "character-resource-file";
  readonly scope: "project" | "identity" | "runtime" | "memory" | "resource";
  readonly authority: "authoritative" | "derived" | "mirror";
  readonly target: "project" | "agent" | "host" | "character";
  readonly path?: string;
  readonly evidence: readonly string[];
}

export interface CharacterProjection {
  readonly kind: "metroplat.agent.character.projection";
  readonly id: string;
  readonly source: string;
  readonly target: "claude-code" | "codex" | "openclaw" | "generic-agent" | "memory-mirror";
  readonly artifacts: readonly string[];
  readonly derived: boolean;
  readonly authoritative: boolean;
  readonly evidence: readonly string[];
}

export interface CharacterFacultySection {
  readonly kind: "metroplat.agent.character.faculty-section";
  readonly id: string;
  readonly faculty: string;
  readonly fiber: string;
  readonly cell: string;
  readonly charge: ChargeValueName;
  readonly level?: number;
  readonly replaySeed?: string;
  readonly evidence: readonly string[];
}

export interface CharacterInteriority {
  readonly kind: "metroplat.agent.character.interiority";
  readonly formula: "interiority = actor-fiber restriction(world, actor) + faculty local sections -> perceived world";
  readonly cover: RelationalFacultyCover;
  readonly material: MaterialContext;
  readonly sections: readonly CharacterFacultySection[];
  readonly fiberRestricted: boolean;
  readonly deterministicReplay: boolean;
  readonly regard: boolean;
  readonly gluing: Cohomology;
  readonly evidence: readonly string[];
}

export type CharacterRuntimeFaculty =
  | "communicating"
  | "knowing"
  | "playing"
  | "socializing"
  | "computing"
  | "gaming"
  | "inhabiting"
  | "animating"
  | "organizing";

export type CharacterRunStage = "becoming" | "doing" | "working" | "governing";

export interface CharacterRuntimeFacultyTrace {
  readonly kind: "metroplat.agent.character.runtime-faculty-trace";
  readonly faculty: CharacterRuntimeFaculty;
  readonly actor: string;
  readonly charge: ChargeValueName;
  readonly facts: readonly string[];
  readonly section?: string;
  readonly evidence: readonly string[];
}

export interface CharacterBoundaryEvent {
  readonly kind: "metroplat.agent.character.boundary-event";
  readonly id: string;
  readonly direction: "perception" | "action";
  readonly actor: string;
  readonly predicate: string;
  readonly object: string;
  readonly via: string;
  readonly charge: ChargeValueName;
  readonly happensAfter: readonly string[];
  readonly evidence: readonly string[];
}

export interface CharacterGoalStanding {
  readonly kind: "metroplat.agent.character.goal-standing";
  readonly agent: string;
  readonly goal: string;
  readonly standing: ChargeValueName;
  readonly satisfied: boolean;
  readonly evidence: readonly string[];
}

export interface CharacterInhabitedRun {
  readonly kind: "metroplat.agent.character.inhabited-run";
  readonly formula: "inhabited-run = boundary perceptions/actions + goals + faculty trace + membrane -> stage";
  readonly id: string;
  readonly stage: CharacterRunStage;
  readonly perceptions: readonly CharacterBoundaryEvent[];
  readonly actions: readonly CharacterBoundaryEvent[];
  readonly goals: readonly CharacterGoalStanding[];
  readonly facultyTrace: readonly CharacterRuntimeFacultyTrace[];
  readonly membrane: Readonly<{
    readonly participants: readonly string[];
    readonly commonGround: readonly string[];
    readonly events: readonly string[];
  }>;
  readonly perceptionActionOpen: boolean;
  readonly open: boolean;
  readonly distributedOrder: Cohomology;
  readonly evidence: readonly string[];
}

export type CharacterRoleStanding =
  | "adopted"
  | "enacted"
  | "distanced"
  | "embraced"
  | "merged"
  | "conflict"
  | "overload";

export type CharacterWorkKind = "inquiry" | "derivation" | "procedure" | "process";
export type CharacterWorkRealization = "ok" | "slip" | "lapse" | "mistake" | "violation";
export type CharacterWorkVisibility = "recognized" | "refused" | "unsettled" | "contested";

export interface CharacterRoleState {
  readonly kind: "metroplat.agent.character.role-state";
  readonly agent: string;
  readonly role: string;
  readonly standing: CharacterRoleStanding;
  readonly audience?: string;
  readonly authority?: string;
  readonly evidence: readonly string[];
}

export interface CharacterWorkIntention {
  readonly kind: "metroplat.agent.character.work-intention";
  readonly beliefs: readonly string[];
  readonly desires: readonly string[];
  readonly intentions: readonly string[];
  readonly partialPlans: readonly string[];
  readonly evidence: readonly string[];
}

export interface CharacterWorkAct {
  readonly kind: "metroplat.agent.character.work-act";
  readonly id: string;
  readonly actor: string;
  readonly substrate: string;
  readonly sourceState: string;
  readonly targetState: string;
  readonly role?: string;
  readonly settlement: CharacterWorkKind;
  readonly realization: CharacterWorkRealization;
  readonly visibility: CharacterWorkVisibility;
  readonly dispatch: "pull" | "push" | "self";
  readonly authorityAccepted: boolean;
  readonly instruments: readonly string[];
  readonly mediatingArtifacts: readonly string[];
  readonly intention: CharacterWorkIntention;
  readonly evidence: readonly string[];
}

export interface CharacterCasting {
  readonly kind: "metroplat.agent.character.casting";
  readonly id: string;
  readonly office: string;
  readonly situation: string;
  readonly requiredSkill?: string;
  readonly accepted: readonly string[];
  readonly rejected: readonly Readonly<{ readonly agent: string; readonly reason: "capability" | "authority" | "both" | "skill" }>[];
  readonly legitimate: boolean;
  readonly charge: ChargeValueName;
  readonly evidence: readonly string[];
}

export interface CharacterWorkPractice {
  readonly kind: "metroplat.agent.character.work-practice";
  readonly formula: "work-practice = role/intention substrate + enriched work-acts + casting + authority acceptance";
  readonly roleStates: readonly CharacterRoleState[];
  readonly acts: readonly CharacterWorkAct[];
  readonly casting: readonly CharacterCasting[];
  readonly settlementGrades: readonly CharacterWorkKind[];
  readonly realizationTypes: readonly CharacterWorkRealization[];
  readonly visibilityStates: readonly CharacterWorkVisibility[];
  readonly acceptedAuthority: boolean;
  readonly roleFibered: boolean;
  readonly distributedOrder: Cohomology;
  readonly evidence: readonly string[];
}

export interface AgentPopulationMember {
  readonly kind: "metroplat.agent.population-member";
  readonly id: string;
  readonly role?: string;
  readonly type?: string;
  readonly capabilities: readonly string[];
  readonly budgets?: readonly string[];
  readonly evidence: readonly string[];
}

export interface AgentCollectiveInput {
  readonly population: readonly AgentPopulationMember[];
  readonly sharedEnvironment?: string;
  readonly coordinationGraph?: readonly (readonly [string, string])[];
  readonly protocols?: readonly string[];
  readonly obstacles?: readonly string[];
  readonly theoryOfMindDepth?: number;
  readonly theoryOfMindEvidence?: readonly string[];
  readonly dynamicPopulation?: boolean;
}

export interface AgentCollective {
  readonly kind: "metroplat.agent.collective";
  readonly formula: "multi-agent = population + shared environment + coordination graph + protocol tasks";
  readonly cover: RelationalFacultyCover;
  readonly material: MaterialContext;
  readonly population: readonly AgentPopulationMember[];
  readonly sharedEnvironment?: string;
  readonly coordinationGraph: readonly (readonly [string, string])[];
  readonly cohomology: Cohomology;
  readonly coordinationCost: number;
  readonly coordinationFree: boolean;
  readonly protocols: readonly string[];
  readonly obstacles: readonly string[];
  readonly theoryOfMind: Readonly<{
    readonly depth: number;
    readonly bounded: boolean;
    readonly evidence: readonly string[];
  }>;
  readonly dynamicPopulation: boolean;
  readonly evidence: readonly string[];
}

export interface CharacterLearningLoop {
  readonly kind: "metroplat.agent.character.learning-loop";
  readonly formula: "learning = observations + reflections -> procedural memory -> skill and hook surfaces";
  readonly observations: number;
  readonly reflections: number;
  readonly stages: readonly CharacterLearningStage[];
  readonly missingStages: readonly string[];
  readonly proceduralMemories: readonly CharacterMemoryRecord[];
  readonly skills: readonly CharacterSkill[];
  readonly hooks: readonly CharacterHook[];
  readonly quiescence: number;
  readonly complete: boolean;
  readonly evidence: readonly string[];
}

export interface CharacterLearningStage {
  readonly kind: "metroplat.agent.character.learning-stage";
  readonly id: "observe" | "plan" | "evaluate" | "reflect" | "procedural-memory" | "skill-retrieval" | "hook-feedback";
  readonly label: string;
  readonly count: number;
  readonly evidence: readonly string[];
}

export interface CharacterSkillMastery {
  readonly kind: "metroplat.agent.character.skill-mastery";
  readonly skill: string;
  readonly discipline: string;
  readonly admitted: boolean;
  readonly material: boolean;
  readonly mastered: boolean;
  readonly missingSupport: readonly string[];
  readonly evidence: readonly string[];
}

export interface CharacterRepertoire {
  readonly kind: "metroplat.agent.character.repertoire";
  readonly practicedDisciplines: readonly CharacterDiscipline[];
  readonly masteries: readonly CharacterSkillMastery[];
  readonly masteredSkills: readonly CharacterSkill[];
  readonly totalSkills: number;
  readonly quiescence: number;
  readonly evidence: readonly string[];
}

export interface AgentChronicleAction {
  readonly kind: "metroplat.agent.chronicle-action";
  readonly locusKey: string;
  readonly act: AgentAct;
  readonly object?: string;
  readonly evidence?: string;
}

export interface AgentChronicle {
  readonly kind: "metroplat.agent.chronicle";
  readonly id: string;
  readonly session: string;
  readonly actions: readonly AgentChronicleAction[];
  readonly evidence: readonly string[];
}

export interface AgentDesignEntry {
  readonly kind: "metroplat.agent.design-entry";
  readonly locusKey: string;
  readonly acts: readonly AgentAct[];
  readonly evidence: readonly string[];
}

export interface AgentDesign {
  readonly kind: "metroplat.agent.design";
  readonly entries: readonly AgentDesignEntry[];
}

export interface CharacterMask {
  readonly kind: "metroplat.agent.character.mask";
  readonly axis: "harness" | "lane" | "office" | "audience" | "role" | "surface";
  readonly label: string;
  readonly address: readonly number[];
  readonly design: AgentDesign;
  readonly evidence: readonly string[];
}

export interface CharacterPersona {
  readonly kind: "metroplat.agent.character.persona";
  readonly formula: "persona = situated role/intention mask(character, audience, context, partner-model, work-state)";
  readonly character: string;
  readonly situation: string;
  readonly role?: string;
  readonly audience?: string;
  readonly context: Readonly<{
    readonly situation: string;
    readonly role?: string;
    readonly audience?: string;
    readonly memory: readonly string[];
  }>;
  readonly mask: CharacterMask;
  readonly shadow: AgentDesign;
  readonly roleDistance: number;
  readonly activeMemory: readonly CharacterMemoryRecord[];
  readonly partnerModel: Readonly<{
    readonly depth: number;
    readonly bounded: boolean;
    readonly evidence: readonly string[];
  }>;
  readonly evidence: readonly string[];
}

export interface CharacterActorTransport {
  readonly kind: "metroplat.agent.character.actor-transport";
  readonly protocol: "agent-card" | "a2a-task" | "did" | "webauthn" | "verifiable-credential";
  readonly id: string;
  readonly url?: string;
  readonly evidence: readonly string[];
}

export interface CharacterActor {
  readonly kind: "metroplat.agent.character.actor";
  readonly formula: "actor = fiber-restricted public identity + membrane-bounded affordance projection(character, recorded-session)";
  readonly id: string;
  readonly preferredUsername: string;
  readonly agentCard: Readonly<{
    readonly protocolVersion: "1.0.0";
    readonly url: string;
    readonly name: string;
    readonly description: string;
    readonly skills: readonly Readonly<{ readonly id: string; readonly name: string }>[];
  }>;
  readonly a2a: Readonly<{
    readonly taskStates: readonly ("working" | "completed" | "failed" | "canceled" | "rejected" | "input_required" | "auth_required")[];
    readonly bindings: readonly ("json-rpc/http" | "grpc" | "rest/json")[];
    readonly artifacts: readonly ("text" | "file" | "data")[];
    readonly security: readonly ("api-key" | "basic" | "bearer" | "oauth2" | "oidc" | "mtls" | "signed-agent-card")[];
  }>;
  readonly identityFacets: Readonly<{
    readonly did?: string;
    readonly webAuthnCredentials: readonly string[];
    readonly verifiableCredentialSubjects: readonly string[];
  }>;
  readonly transports: readonly CharacterActorTransport[];
  readonly evidence: readonly string[];
}

export interface CharacterNucleus {
  readonly kind: "metroplat.agent.character.nucleus";
  readonly formula: "character = dispositional nucleus chi + fixed behavioral space + faculty interiority + inhabited work trace";
  readonly chi: string;
  readonly behavioralSpace: AgentDesign;
  readonly fixedLoci: readonly string[];
  readonly outOfCharacterLoci: readonly string[];
  readonly coherent: boolean;
  readonly evidence: readonly string[];
}

export interface AgentFloor {
  readonly kind: "metroplat.agent.floor";
  readonly formula: "agent = inhabited runtime ecology over recorded perceive-plan-act loop + persistent computable state + coordination graph";
  readonly environmentalAction: boolean;
  readonly goalDirectedPlanning: boolean;
  readonly persistentState: boolean;
  readonly agentic: boolean;
  readonly missing: readonly string[];
  readonly evidence: readonly string[];
}

export interface CharacterReadiness {
  readonly kind: "metroplat.agent.character.readiness";
  readonly derived: boolean;
  readonly presentAspects: readonly GovernanceAspect[];
  readonly missingAspects: readonly GovernanceAspect[];
  readonly memoryClasses: readonly MemoryClass[];
  readonly missingMemoryClasses: readonly MemoryClass[];
  readonly debts: readonly string[];
  readonly evidence: readonly string[];
}

export interface SessionCharacter {
  readonly kind: "metroplat.agent.session-character";
  readonly session: string;
  readonly events: number;
  readonly actor: AgentDesign;
  readonly masks: readonly CharacterMask[];
  readonly performedSelf: Readonly<{
    readonly performed: boolean;
    readonly plays: number;
    readonly design: AgentDesign;
  }>;
  readonly identity: Readonly<{
    readonly coherent: boolean;
    readonly drift: number;
    readonly driftLoci: readonly string[];
  }>;
  readonly baseline: CharacterPersona;
  readonly situation: CharacterPersona;
  readonly evidence: readonly string[];
}

export interface CharacterMaskIdentity {
  readonly kind: "metroplat.agent.character.mask-identity";
  readonly glued: AgentDesign;
  readonly coherent: boolean;
  readonly drift: number;
  readonly driftLoci: readonly string[];
  readonly cohomology: Cohomology;
  readonly evidence: readonly string[];
}

export interface CharacterProfileInput {
  readonly id: string;
  readonly baseUrl?: string;
  readonly identity?: CharacterIdentity;
  readonly chronicles?: readonly AgentChronicle[];
  readonly governance?: readonly CharacterGovernanceRecord[];
  readonly memories?: readonly CharacterMemoryRecord[];
  readonly skills?: readonly CharacterSkill[];
  readonly disciplines?: readonly CharacterDiscipline[];
  readonly tools?: readonly CharacterTool[];
  readonly hooks?: readonly CharacterHook[];
  readonly instructionSurfaces?: readonly CharacterInstructionSurface[];
  readonly projections?: readonly CharacterProjection[];
  readonly faculties?: readonly CharacterFacultySection[];
  readonly runtimeFaculties?: readonly CharacterRuntimeFacultyTrace[];
  readonly boundaryEvents?: readonly CharacterBoundaryEvent[];
  readonly goals?: readonly CharacterGoalStanding[];
  readonly roleStates?: readonly CharacterRoleState[];
  readonly workActs?: readonly CharacterWorkAct[];
  readonly casting?: readonly CharacterCasting[];
  readonly collective?: AgentCollectiveInput;
  readonly soul?: CharacterSoul;
  readonly heartbeat?: CharacterHeartbeat;
  readonly did?: string;
  readonly webAuthnCredentials?: readonly string[];
  readonly verifiableCredentialSubjects?: readonly string[];
}

export interface CharacterProfile {
  readonly kind: "metroplat.agent.character.profile";
  readonly id: string;
  readonly formula: Readonly<{
    readonly agent: AgentFloor["formula"];
    readonly actor: CharacterActor["formula"];
    readonly persona: CharacterPersona["formula"];
    readonly character: CharacterNucleus["formula"];
  }>;
  readonly identity: CharacterIdentity;
  readonly agent: AgentFloor;
  readonly character: CharacterNucleus;
  readonly actor: CharacterActor;
  readonly session: SessionCharacter;
  readonly memories: readonly CharacterMemoryRecord[];
  readonly governance: readonly CharacterGovernanceRecord[];
  readonly skills: readonly CharacterSkill[];
  readonly disciplines: readonly CharacterDiscipline[];
  readonly tools: readonly CharacterTool[];
  readonly hooks: readonly CharacterHook[];
  readonly instructionSurfaces: readonly CharacterInstructionSurface[];
  readonly projections: readonly CharacterProjection[];
  readonly interiority: CharacterInteriority;
  readonly run: CharacterInhabitedRun;
  readonly work: CharacterWorkPractice;
  readonly collective: AgentCollective;
  readonly learning: CharacterLearningLoop;
  readonly repertoire: CharacterRepertoire;
  readonly maskIdentity: CharacterMaskIdentity;
  readonly soul?: CharacterSoul;
  readonly heartbeat?: CharacterHeartbeat;
  readonly readiness: CharacterReadiness;
  readonly research: CharacterResearchCoverage;
  readonly capabilityReport: CharacterCapabilityReport;
  readonly evidence: readonly string[];
}

export interface CharacterResearchSource {
  readonly kind: "metroplat.agent.character.research-source";
  readonly id: string;
  readonly label: string;
  readonly corpus: "metroplat" | "feltos" | "agential-relationality" | "rom-keldar" | "openclaw" | "external-survey";
  /** Provenance path in a retired corpus. It is not a live file dependency. */
  readonly historicalPath: string;
  /** Current evidence promoted into a maintained corpus, when one exists. */
  readonly currentPath?: string;
  readonly concepts: readonly CharacterConcept[];
  readonly obligations: readonly string[];
}

export interface CharacterConceptFormula {
  readonly kind: "metroplat.agent.character.concept-formula";
  readonly concept: CharacterConcept;
  readonly formula: string;
  readonly sourceIds: readonly string[];
  readonly obligationIds: readonly string[];
}

export interface CharacterResearchRequirement {
  readonly kind: "metroplat.agent.character.research-requirement";
  readonly id: string;
  readonly concept: CharacterConcept;
  readonly description: string;
  readonly sourceIds: readonly string[];
}

export interface CharacterResearchRequirementStatus extends CharacterResearchRequirement {
  readonly covered: boolean;
}

export interface CharacterResearchIntegrityAudit {
  readonly kind: "metroplat.agent.character.research-integrity-audit";
  readonly complete: boolean;
  readonly sourceIds: readonly string[];
  readonly requirementIds: readonly string[];
  readonly formulaConcepts: readonly CharacterConcept[];
  readonly duplicateSourceIds: readonly string[];
  readonly duplicateRequirementIds: readonly string[];
  readonly duplicateFormulaConcepts: readonly CharacterConcept[];
  readonly missingFormulaConcepts: readonly CharacterConcept[];
  readonly unknownFormulaSourceIds: readonly string[];
  readonly unknownFormulaObligationIds: readonly string[];
  readonly unknownRequirementSourceIds: readonly string[];
  readonly unknownSourceObligationIds: readonly string[];
  readonly unformulatedRequirementIds: readonly string[];
  readonly unformulatedSourceIds: readonly string[];
  readonly evidence: readonly string[];
}

export interface CharacterResearchCoverage {
  readonly kind: "metroplat.agent.character.research-coverage";
  readonly complete: boolean;
  readonly formulas: readonly CharacterConceptFormula[];
  readonly sources: readonly CharacterResearchSource[];
  readonly requirements: readonly CharacterResearchRequirementStatus[];
  readonly integrity: CharacterResearchIntegrityAudit;
  readonly covered: readonly string[];
  readonly missing: readonly string[];
  readonly evidence: readonly string[];
}

export type CharacterCapabilityFamily =
  | "agential-relationality"
  | "feltos"
  | "openclaw"
  | "rom-keldar"
  | "external-survey";

export interface CharacterCapabilityFamilyReport {
  readonly kind: "metroplat.agent.character.capability-family";
  readonly family: CharacterCapabilityFamily;
  readonly label: string;
  readonly required: readonly string[];
  readonly covered: readonly string[];
  readonly missing: readonly string[];
  readonly status: "meets" | "missing";
  readonly evidence: readonly string[];
}

export interface CharacterCapabilityReport {
  readonly kind: "metroplat.agent.character.capability-report";
  readonly status: "meets-or-beats" | "missing";
  readonly families: readonly CharacterCapabilityFamilyReport[];
  readonly covered: readonly string[];
  readonly missing: readonly string[];
  readonly evidence: readonly string[];
}

export interface CharacterCapabilityReportInput {
  readonly research: CharacterResearchCoverage;
  readonly readiness: CharacterReadiness;
  readonly learning: CharacterLearningLoop;
  readonly actor: CharacterActor;
}

export interface CharacterResearchSourceAuditInput {
  readonly sources?: readonly CharacterResearchSource[];
  readonly existingPaths: readonly string[];
}

export interface CharacterResearchSourceAudit {
  readonly kind: "metroplat.agent.character.research-source-audit";
  readonly complete: boolean;
  readonly checked: number;
  readonly present: readonly string[];
  readonly missing: readonly string[];
  readonly missingPaths: readonly string[];
  readonly historical: readonly string[];
  readonly historicalPaths: readonly string[];
  readonly evidence: readonly string[];
}

export interface CharacterResearchInventoryAuditInput {
  readonly sources?: readonly CharacterResearchSource[];
  readonly discoveredPaths: readonly string[];
  readonly ignoredPaths?: readonly string[];
}

export interface CharacterResearchInventoryAudit {
  readonly kind: "metroplat.agent.character.research-inventory-audit";
  readonly complete: boolean;
  readonly declared: readonly string[];
  readonly discovered: readonly string[];
  readonly represented: readonly string[];
  readonly unrepresented: readonly string[];
  readonly ignored: readonly string[];
  readonly evidence: readonly string[];
}

const REQUIRED_ASPECTS: readonly GovernanceAspect[] = Object.freeze([
  "identity",
  "behavior",
  "voice",
  "memory",
  "tools",
  "autonomy",
  "safety",
  "evaluation",
  "audit",
]);

const REQUIRED_MEMORY_CLASSES: readonly MemoryClass[] = Object.freeze([
  "working",
  "episodic",
  "semantic",
  "procedural",
]);

const CHARACTER_CONCEPTS: readonly CharacterConcept[] = Object.freeze(["agent", "actor", "persona", "character"] as const);

/**
 * Provenance ledger for the research from which the character model was
 * derived. The 2026 corpus consolidation retired every path recorded below;
 * `historicalPath` preserves attribution without claiming a live dependency.
 * Add `currentPath` only when evidence is deliberately promoted into a
 * maintained corpus.
 */
export const CHARACTER_RESEARCH_SOURCES: readonly CharacterResearchSource[] = Object.freeze([
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.continuous-learning",
    label: "continuous learning as observation, persistence, validation, skill promotion, and hooks",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/continuous-learning-in-agentic-harnesses.md",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["character.learning-loop", "character.skills", "character.hooks", "character.skill-retrieval", "character.evaluation-loop"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.agentic-harness-landscape",
    label: "agent harness landscape survey across Claude Code harnesses, orchestration frameworks, memory systems, and skill learning",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/agentic-harness-landscape-2026.md",
    concepts: Object.freeze(["agent", "actor", "character"] as const),
    obligations: Object.freeze(["agent.environmental-action", "agent.goal-directed-planning", "agent.persistent-state", "actor.transport-set", "character.memory-classes", "character.skills", "character.evaluation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.agentic-harness-architecture",
    label: "shared agentic infrastructure separated from harness-specific deployment configuration",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/agentic-harness-architecture.md",
    concepts: Object.freeze(["agent", "actor", "character"] as const),
    obligations: Object.freeze(["agent.harness-portability", "character.hooks", "character.skills", "character.governance-aspects"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.agent-computation-levels",
    label: "agent duties across inference, fine-tuned inference, deterministic functions, classifiers, state machines, and graph queries",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/beyond-language-models-for-agent-computation.md",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["agent.computable-duties", "character.learning-loop", "character.evaluation-loop"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.memory-systems",
    label: "Letta/MemGPT and Mem0 memory lifecycle comparison",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/prose-learning/ai-memory-systems-analysis.md",
    concepts: Object.freeze(["agent", "persona", "character"] as const),
    obligations: Object.freeze(["agent.persistent-state", "persona.active-memory", "persona.context-separation", "character.memory-classes", "character.governed-memory", "character.evaluation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.voyager-skill-library",
    label: "Voyager skill library, self-verification critic, automatic curriculum, and semantic skill retrieval",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/prose-learning/voyager-skill-library-analysis.md",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["agent.environmental-action", "agent.goal-directed-planning", "character.learning-loop", "character.skills", "character.skill-retrieval", "character.evaluation-loop", "character.evaluation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.reflexion-lats",
    label: "Reflexion and LATS failure reflection, tree search, structured feedback, and episodic reflection memory",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/prose-learning/reflexion-and-lats-analysis.md",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["agent.goal-directed-planning", "character.learning-loop", "character.evaluation-loop", "character.evaluation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.non-llm-agent-duties",
    label: "non-LLM computation for structured agent routing, tool selection, state updates, and record keeping",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/prose-learning/non-llm-computation-for-agent-duties.md",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["agent.computable-duties", "agent.goal-directed-planning", "character.evaluation-loop"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.small-model-tool-use",
    label: "small fine-tuned models and benchmarked function-calling agents for structured tool use",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/prose-learning/small-model-fine-tuning-for-agents-2026.md",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["agent.computable-duties", "agent.environmental-action", "character.evaluation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.ecc-hooks",
    label: "ECC hook architecture as event-driven memory, gate, audit, and automation surface",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/prose-learning/ecc-hook-architecture-analysis.md",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["character.hooks", "character.heartbeat", "character.evaluation-loop", "character.evaluation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.ecc-skills",
    label: "ECC skill system as progressive procedural-memory loading",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/prose-learning/ecc-skill-system-analysis.md",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["character.skills", "character.skill-retrieval", "character.learning-loop"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.ecc-agents-commands",
    label: "ECC agents and commands as role, command, and delegated-agent harness surfaces",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/prose-learning/ecc-agents-and-commands-analysis.md",
    concepts: Object.freeze(["agent", "actor", "persona"] as const),
    obligations: Object.freeze(["agent.goal-directed-planning", "actor.public-transport", "actor.transport-set", "persona.situated-mask", "persona.context-separation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.mcp-agent-sdk",
    label: "MCP and Agent SDK deep dive as external tool, session, and agent-card-style transport surface",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/prose-learning/mcp-and-agent-sdk-deep-dive.md",
    concepts: Object.freeze(["agent", "actor"] as const),
    obligations: Object.freeze(["agent.environmental-action", "actor.public-transport", "actor.agent-card", "actor.transport-set"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.multi-agent-orchestration",
    label: "multi-agent orchestration frameworks as role, team, memory, and human-in-loop comparison",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/prose-learning/multi-agent-orchestration-frameworks-2026.md",
    concepts: Object.freeze(["agent", "actor", "persona"] as const),
    obligations: Object.freeze(["agent.goal-directed-planning", "actor.public-transport", "actor.transport-set", "persona.situated-mask", "persona.context-separation", "character.memory-classes"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.openhands-architecture",
    label: "OpenHands architecture as sandboxed tool-use and event-stream agent surface",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/prose-learning/openhands-architecture-analysis.md",
    concepts: Object.freeze(["agent", "actor"] as const),
    obligations: Object.freeze(["agent.environmental-action", "actor.recorded-session", "actor.transport-set"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "agential-relationality.animating.agent",
    label: "agent as perceive-act-govern loop",
    corpus: "agential-relationality" as const,
    historicalPath: "lib/emsenn/src/archive/2026-06-27-agential-relationality/animating/src/becoming/doing/working/governing/agent.mts",
    concepts: Object.freeze(["agent"] as const),
    obligations: Object.freeze(["agent.environmental-action", "agent.goal-directed-planning", "agent.persistent-state"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "agential-relationality.playing.persona",
    label: "persona as mask, stage split, and role distance",
    corpus: "agential-relationality" as const,
    historicalPath: "lib/emsenn/src/archive/2026-06-27-agential-relationality/playing/src/persona.mts",
    concepts: Object.freeze(["persona"] as const),
    obligations: Object.freeze(["persona.situated-mask", "persona.shadow-role-distance", "persona.active-memory", "persona.context-separation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "agential-relationality.playing.character-agent",
    label: "character-agent as personas, skills, disciplines, plays, and identity gluing",
    corpus: "agential-relationality" as const,
    historicalPath: "lib/emsenn/src/archive/2026-06-27-agential-relationality/playing/src/character-agent.mts",
    concepts: Object.freeze(["character", "persona"] as const),
    obligations: Object.freeze(["character.fixed-behavioral-space", "character.performed-self", "character.identity-coherence", "character.skills"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "agential-relationality.playing.session-character",
    label: "session character reconstructed from event chronicles",
    corpus: "agential-relationality" as const,
    historicalPath: "lib/emsenn/src/archive/2026-06-27-agential-relationality/playing/src/session-character.mts",
    concepts: Object.freeze(["actor", "persona", "character"] as const),
    obligations: Object.freeze(["actor.recorded-session", "persona.situated-mask", "character.performed-self"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "agential-relationality.organizing.theatre",
    label: "theatre projection to an A2A agent card",
    corpus: "agential-relationality" as const,
    historicalPath: "lib/emsenn/src/archive/2026-06-27-agential-relationality/organizing/src/performing/session-character.mts",
    concepts: Object.freeze(["actor"] as const),
    obligations: Object.freeze(["actor.agent-card", "actor.public-transport", "actor.transport-set"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "agential-relationality.identity.facets",
    label: "single identity projected to Actor, DID, Agent Card, VC, and WebAuthn facets",
    corpus: "agential-relationality" as const,
    historicalPath: "lib/emsenn/src/archive/2026-06-27-agential-relationality/animating/test/unified-agent-identity.test.mjs",
    concepts: Object.freeze(["actor", "character"] as const),
    obligations: Object.freeze(["actor.identity-facets", "actor.agent-card", "actor.transport-set"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "agential-relationality.persona.theorems",
    label: "theorem-shaped persona tests for masks, performativity, shadow, and role distance",
    corpus: "agential-relationality" as const,
    historicalPath: "lib/emsenn/src/archive/2026-06-27-agential-relationality/playing/test/persona.test.mjs",
    concepts: Object.freeze(["persona"] as const),
    obligations: Object.freeze(["persona.situated-mask", "persona.shadow-role-distance", "persona.performativity", "persona.context-separation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "agential-relationality.character-agent.theorems",
    label: "theorem-shaped character-agent tests for bundle form, practiced disciplines, quiescence, performed self, and identity drift",
    corpus: "agential-relationality" as const,
    historicalPath: "lib/emsenn/src/archive/2026-06-27-agential-relationality/playing/test/character-agent.test.mjs",
    concepts: Object.freeze(["persona", "character"] as const),
    obligations: Object.freeze(["character.fixed-behavioral-space", "character.performed-self", "character.identity-coherence", "character.skills", "character.quiescence"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "agential-relationality.theatre-session.theorems",
    label: "theorem-shaped theatre tests for session character reconstruction, situation-relative staging, and Agent Card resources",
    corpus: "agential-relationality" as const,
    historicalPath: "lib/emsenn/src/archive/2026-06-27-agential-relationality/organizing/test/theatre-session-character.test.mjs",
    concepts: Object.freeze(["actor", "persona", "character"] as const),
    obligations: Object.freeze(["actor.recorded-session", "actor.agent-card", "actor.public-transport", "actor.transport-set", "persona.context-separation", "character.performed-self"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.agentic-character-survey",
    label: "AI character as persistent governed identity with memory lifecycle",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/character/content/agentic-character/survey-of-agentic-characters-may-2026/survey-of-agentic-characters-may-2026.md",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["agent.persistent-state", "character.memory-classes", "character.governed-memory", "character.evaluation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.character-nucleus",
    label: "character as chi and fixed behavioral space",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/character/character.md",
    concepts: Object.freeze(["character"] as const),
    obligations: Object.freeze(["character.fixed-behavioral-space", "character.identity-coherence"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.playing.character-agent",
    label: "current FeltOS playing character-agent with personas, disciplines, mastered skills, chronicles, drift, and cohomology",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/lib/playing/playing.mts",
    concepts: Object.freeze(["persona", "character"] as const),
    obligations: Object.freeze(["persona.situated-mask", "character.fixed-behavioral-space", "character.identity-coherence", "character.performed-self", "character.skills", "character.quiescence"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "agential-relationality.skills-disciplines-register",
    label: "skills, disciplines, behavior closure, performativity, and character-agent quiescence register",
    corpus: "agential-relationality" as const,
    historicalPath: "lib/emsenn/src/archive/2026-06-27-agential-relationality/playing/dev/content/researching/2026/06/25/2026-06-25-skills-disciplines-and-the-character-agent.md",
    concepts: Object.freeze(["agent", "persona", "character"] as const),
    obligations: Object.freeze(["persona.performativity", "character.disciplines", "character.behaviour-closure", "character.quiescence", "character.skills"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.playing.ludics",
    label: "FeltOS ludics foundation for design coherence, chronicle validity, orthogonality, behavior closure, and Fax laws",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/lib/playing/ludics.mts",
    concepts: Object.freeze(["agent", "persona", "character"] as const),
    obligations: Object.freeze(["character.chronicle-validity", "character.behaviour-closure", "character.fixed-behavioral-space", "character.performed-self"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.playing.capability-surface",
    label: "FeltOS capability surface naming playing as ludics designs, cuts, disciplines, skill mastery, and character formation",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/lib/capability-surface/capabilities.mts",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["character.chronicle-validity", "character.behaviour-closure", "character.skills", "character.quiescence"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.character-content",
    label: "character content records for character record, Claude configuration, memory, soul, AGENTS, and resource files",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/character/content",
    concepts: Object.freeze(["persona", "character"] as const),
    obligations: Object.freeze(["persona.situated-mask", "persona.context-separation", "character.derived-membership", "character.governance-aspects", "character.memory-classes", "character.soul"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.character-record",
    label: "persistent character record as named pattern of values, rules, memory, and tools",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/character/content/character-record/character-record.md",
    concepts: Object.freeze(["character"] as const),
    obligations: Object.freeze(["character.authoritative-record", "character.governance-aspects", "character.memory-classes"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.character-resource-file",
    label: "character resource file as markdown record carrying identity, chi, skill, and governance cells",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/character/content/character-resource-file/character-resource-file.md",
    concepts: Object.freeze(["character"] as const),
    obligations: Object.freeze(["character.authoritative-record", "character.fixed-behavioral-space", "character.derived-membership"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.character-claude-configuration",
    label: "derived Claude Code host projection from character record to CLAUDE.md and .mcp.json",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/character/content/character-as-a-claude-configuration/character-as-a-claude-configuration.md",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["character.host-projection", "character.instruction-projections"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.agent-instruction-file-standards",
    label: "agent instruction file standards separating project instructions, identity files, and host-specific runtime files",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/character/content/agent-instruction-file-standards/agent-instruction-file-standards.md",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["character.instruction-scope-separation", "character.instruction-projections"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.agents-md",
    label: "AGENTS.md as tool-agnostic project-scoped instruction convention",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/character/content/agents-md/agents-md.md",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["character.project-instructions", "character.instruction-scope-separation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.soul-md",
    label: "SOUL.md as tool-agnostic agent identity convention distinct from project instructions",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/character/content/soul-md/soul-md.md",
    concepts: Object.freeze(["character"] as const),
    obligations: Object.freeze(["character.identity-instructions", "character.instruction-scope-separation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.character-memory",
    label: "character memory as authoritative in-repo memory mirrored to host auto-memory at session start",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/character/content/character-memory/character-memory.md",
    concepts: Object.freeze(["character"] as const),
    obligations: Object.freeze(["character.memory-mirror", "character.governed-memory", "character.memory-classes"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.personal-ai-os-landscape",
    label: "personal AI operating system landscape across memory layers, multi-agent orchestration, coding agents, and persistent platforms",
    corpus: "external-survey" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/texts/personal-ai-os-landscape-2026.md",
    concepts: Object.freeze(["agent", "actor", "character"] as const),
    obligations: Object.freeze(["agent.persistent-state", "actor.transport-set", "character.memory-classes", "character.learning-loop"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.heartbeat",
    label: "heartbeat surface for low-frequency session orientation and continuity",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/agent-harnesses/heartbeat/heartbeat.md",
    concepts: Object.freeze(["character"] as const),
    obligations: Object.freeze(["character.heartbeat", "character.memory-classes"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "openclaw.filesystem-surfaces",
    label: "memory, heartbeat, hook, skill, and soul surfaces",
    corpus: "openclaw" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/openclaw/openclaw-corpus/content",
    concepts: Object.freeze(["agent", "character"] as const),
    obligations: Object.freeze(["character.heartbeat", "character.hooks", "character.skills", "character.soul", "character.memory-classes"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "rom-keldar.character-store",
    label: "character membership by derived filestore structure, not declaration",
    corpus: "rom-keldar" as const,
    historicalPath: "lib/561-group/core/rsc-quiescent/core/characters/rom-keldar/governance/rules/specifications/characters.md",
    concepts: Object.freeze(["character"] as const),
    obligations: Object.freeze(["character.derived-membership", "character.governance-aspects", "character.memory-classes"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "rom-keldar.character-agent-explanation",
    label: "character-agent as persistent typed entity distinct from session persona",
    corpus: "rom-keldar" as const,
    historicalPath: "lib/561-group/core/rsc-quiescent/core/characters/rom-keldar/prose/teaching/explanations/character-agent.md",
    concepts: Object.freeze(["agent", "persona", "character"] as const),
    obligations: Object.freeze(["persona.situated-mask", "persona.context-separation", "character.derived-membership", "character.governed-memory", "character.governance-aspects"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "metroplat.unified-agent-identity",
    label: "one agent identity projected as Actor, DID, Agent Card, VC subject, and WebAuthn facet",
    corpus: "metroplat" as const,
    historicalPath: "lib/emsenn/content/notes/2026/06/26/2026-06-26-research-on-unified-agent-identity.md",
    concepts: Object.freeze(["actor", "character"] as const),
    obligations: Object.freeze(["actor.identity-coherence", "actor.identity-facets", "actor.agent-card"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "metroplat.a2a-as-animating",
    label: "A2A Agent Card as discoverable affordance projection and task as capability invocation",
    corpus: "metroplat" as const,
    historicalPath: "lib/emsenn/content/notes/2026/06/26/2026-06-26-research-on-a2a-as-animating.md",
    concepts: Object.freeze(["agent", "actor"] as const),
    obligations: Object.freeze(["actor.affordance-projection", "actor.agent-card", "actor.public-transport"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "metroplat.agent-work-protocols",
    label: "agent work protocols as material contexts, protocol readings, evidence policies, and accountable work surfaces",
    corpus: "metroplat" as const,
    historicalPath: "lib/emsenn/content/notes/2026/06/30/2026-06-30-survey-of-agent-work-protocols.md",
    concepts: Object.freeze(["agent", "actor"] as const),
    obligations: Object.freeze(["agent.recorded-work", "actor.transport-set"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "metroplat.agency-autopsy",
    label: "recovered agency reading: perceive-act loop, dramaturgic session character, casting, situation, actor, inbox, and Agent Card",
    corpus: "metroplat" as const,
    historicalPath: "lib/emsenn/content/notes/2026/07/01/2026-07-01-research-on-the-autopsy-of-the-agency-reading.md",
    concepts: Object.freeze(["agent", "actor", "persona", "character"] as const),
    obligations: Object.freeze(["agent.perceive-act-loop", "character.session-dramaturgy", "actor.recorded-session", "persona.context-separation"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.mud-interiority",
    label: "actor-relative interiority as fiber restriction, faculty-gated perception, deterministic replay, and regard",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/src/mud/interiority.mts",
    concepts: Object.freeze(["actor", "persona", "character"] as const),
    obligations: Object.freeze(["actor.fiber-restricted-projection", "persona.partner-modeling", "character.faculty-interiority", "character.deterministic-interiority"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.faculty-cover",
    label: "faculty cover as inhabited sections glued by diagonal agent and off-diagonal collective obstructions",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/lib/faculty-cover/faculty-cover.mts",
    concepts: Object.freeze(["agent", "actor", "character"] as const),
    obligations: Object.freeze(["agent.coordination-obstruction", "actor.fiber-restricted-projection", "character.faculty-interiority", "character.faculty-cover-gluing"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.inhabiting-agent-run",
    label: "inhabited agent runs as boundary perceptions, boundary actions, goals, faculty memory, offices, skills, casting, situations, and legitimacy",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/lib/inhabiting/inhabiting.mts",
    concepts: Object.freeze(["agent", "actor", "persona", "character"] as const),
    obligations: Object.freeze(["agent.runtime-ecology", "agent.perception-action-frontier", "agent.goal-standing", "actor.communication-membrane", "actor.casting-legitimacy", "character.inhabited-run"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.inhabiting-theorems",
    label: "inhabiting tests that reject vacuous skill mastery and admit casting only from real practiced discipline",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/lib/inhabiting/inhabiting.test.mts",
    concepts: Object.freeze(["actor", "character"] as const),
    obligations: Object.freeze(["actor.casting-legitimacy", "character.work-act-enrichment"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.faculties-runtime-ecology",
    label: "runtime faculty ecology over communicating, knowing, playing, socializing, computing, gaming, animating, organizing, and inhabiting carriers",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/lib/faculties/faculties.mts",
    concepts: Object.freeze(["agent", "actor", "character"] as const),
    obligations: Object.freeze(["agent.runtime-ecology", "agent.perception-action-frontier", "character.runtime-faculty-trace", "character.inhabited-run"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.faculty-theorems",
    label: "faculty tests for inhabited ecology bootstrap, agent loop over perception/action frontier, and actor-fiber computation settlement",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/lib/faculties/faculties.test.mts",
    concepts: Object.freeze(["agent", "actor", "character"] as const),
    obligations: Object.freeze(["agent.runtime-ecology", "agent.perception-action-frontier", "actor.fiber-restricted-projection", "character.runtime-faculty-trace"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.relating-fiber-theorems",
    label: "world and running tests for actor-local perception fibers, total ticks, and non-flattened H1 contention",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/lib/relating/world.test.mts",
    concepts: Object.freeze(["agent", "actor"] as const),
    obligations: Object.freeze(["agent.distributed-time", "actor.fiber-restricted-projection", "actor.communication-membrane"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.work-acting-category",
    label: "work-acts as symmetric monoidal 2-category fibered over agents with realization, visibility, settlement, role, intention, dispatch, authority acceptance, and distributed-time enrichments",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/drone-swarms/drone/swarming/content/swarm/content/multi-agent/concurrent-game-system/content/game/computing/predicated-computer/_archive/pc-prose/learning/surveys/objects-of-the-category-of-work-acting.md",
    concepts: Object.freeze(["agent", "actor", "persona", "character"] as const),
    obligations: Object.freeze(["agent.distributed-time", "persona.role-state", "persona.intention-state", "character.work-act-enrichment", "character.dispatch-acceptance-zone"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.multi-agent-system",
    label: "multi-agent system as autonomous population interacting in a shared environment",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/drone-swarms/drone/swarming/content/swarm/content/multi-agent/multi-agent-system/multi-agent-system.md",
    concepts: Object.freeze(["agent", "actor"] as const),
    obligations: Object.freeze(["agent.multi-agent-system", "agent.population", "agent.coordination-graph"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.multi-agent-coordination-hard",
    label: "multi-agent coordination obstacles across strategy, aggregation, communication, faults, learning, complexity, and interpretability",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/drone-swarms/drone/swarming/content/swarm/content/multi-agent/why-multi-agent-coordination-is-hard/why-multi-agent-coordination-is-hard.md",
    concepts: Object.freeze(["agent"] as const),
    obligations: Object.freeze(["agent.coordination-obstruction"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.multi-agent-theory-of-mind",
    label: "theory of mind as bounded recursive partner modeling for communication, trust, strategy, deception detection, and norm enforcement",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/drone-swarms/drone/swarming/content/swarm/content/multi-agent/theory-of-mind/why-tom-matters-for-multi-agent-coordination/why-tom-matters-for-multi-agent-coordination.md",
    concepts: Object.freeze(["agent", "persona", "character"] as const),
    obligations: Object.freeze(["agent.theory-of-mind", "persona.partner-modeling"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.agent-to-agent-protocol",
    label: "A2A as agent cards, tasks, artifacts, protocol bindings, security, and inter-agent coordination",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/drone-swarms/drone/swarming/content/swarm/content/multi-agent/agent-to-agent-protocol/agent-to-agent-protocol.md",
    concepts: Object.freeze(["agent", "actor"] as const),
    obligations: Object.freeze(["actor.a2a-task-surface", "actor.agent-card", "agent.coordination-graph"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.agent-composition",
    label: "agent composition as coordination graph construction with superlinear overhead, saturation, and non-interference obligations",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/drone-swarms/drone/swarming/content/swarm/content/agent-composition/agent-composition.md",
    concepts: Object.freeze(["agent"] as const),
    obligations: Object.freeze(["agent.coordination-graph", "agent.coordination-obstruction"]),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-source" as const,
    id: "fizzos.agent-population",
    label: "agent population as identities, capabilities, types, roles, relationships, heterogeneity, dynamics, and size regimes",
    corpus: "feltos" as const,
    historicalPath: "lib/emsenn/src/apps/fizzos/dev/content/notes/archive/drone-swarms/drone/swarming/content/swarm/content/multi-agent/agent-population/agent-population.md",
    concepts: Object.freeze(["agent"] as const),
    obligations: Object.freeze(["agent.population", "agent.multi-agent-system"]),
  }),
]);

export const CHARACTER_CONCEPT_FORMULAS: readonly CharacterConceptFormula[] = Object.freeze([
  Object.freeze({
    kind: "metroplat.agent.character.concept-formula" as const,
    concept: "agent" as const,
    formula: "agent = inhabited runtime ecology over recorded perceive-plan-act loop + persistent computable state + coordination graph" as const,
    sourceIds: Object.freeze([
      "agential-relationality.animating.agent",
      "fizzos.agentic-character-survey",
      "fizzos.agentic-harness-landscape",
      "fizzos.agentic-harness-architecture",
      "fizzos.agent-computation-levels",
      "fizzos.openhands-architecture",
      "fizzos.voyager-skill-library",
      "fizzos.reflexion-lats",
      "fizzos.non-llm-agent-duties",
      "fizzos.small-model-tool-use",
      "fizzos.character-claude-configuration",
      "fizzos.agent-instruction-file-standards",
      "fizzos.agents-md",
      "fizzos.personal-ai-os-landscape",
      "fizzos.playing.ludics",
      "fizzos.mcp-agent-sdk",
      "metroplat.a2a-as-animating",
      "metroplat.agent-work-protocols",
      "metroplat.agency-autopsy",
      "fizzos.faculty-cover",
      "fizzos.inhabiting-agent-run",
      "fizzos.faculties-runtime-ecology",
      "fizzos.faculty-theorems",
      "fizzos.relating-fiber-theorems",
      "fizzos.work-acting-category",
      "fizzos.multi-agent-system",
      "fizzos.multi-agent-coordination-hard",
      "fizzos.multi-agent-theory-of-mind",
      "fizzos.agent-to-agent-protocol",
      "fizzos.agent-composition",
      "fizzos.agent-population",
      "rom-keldar.character-agent-explanation",
    ] as const),
    obligationIds: Object.freeze([
      "agent.environmental-action",
      "agent.goal-directed-planning",
      "agent.persistent-state",
      "agent.perceive-act-loop",
      "agent.computable-duties",
      "agent.harness-portability",
      "agent.recorded-work",
      "agent.multi-agent-system",
      "agent.population",
      "agent.coordination-graph",
      "agent.coordination-obstruction",
      "agent.theory-of-mind",
      "agent.runtime-ecology",
      "agent.perception-action-frontier",
      "agent.goal-standing",
      "agent.distributed-time",
    ] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.concept-formula" as const,
    concept: "actor" as const,
    formula: "actor = fiber-restricted public identity + membrane-bounded affordance projection(character, recorded-session)" as const,
    sourceIds: Object.freeze([
      "agential-relationality.playing.session-character",
      "agential-relationality.organizing.theatre",
      "agential-relationality.identity.facets",
      "agential-relationality.theatre-session.theorems",
      "fizzos.agentic-harness-architecture",
      "fizzos.personal-ai-os-landscape",
      "fizzos.mcp-agent-sdk",
      "fizzos.ecc-agents-commands",
      "fizzos.multi-agent-orchestration",
      "fizzos.openhands-architecture",
      "metroplat.unified-agent-identity",
      "metroplat.a2a-as-animating",
      "metroplat.agent-work-protocols",
      "metroplat.agency-autopsy",
      "fizzos.mud-interiority",
      "fizzos.faculty-cover",
      "fizzos.inhabiting-agent-run",
      "fizzos.inhabiting-theorems",
      "fizzos.faculty-theorems",
      "fizzos.relating-fiber-theorems",
      "fizzos.work-acting-category",
      "fizzos.multi-agent-system",
      "fizzos.agent-to-agent-protocol",
    ] as const),
    obligationIds: Object.freeze([
      "actor.public-transport",
      "actor.recorded-session",
      "actor.agent-card",
      "actor.identity-facets",
      "actor.identity-coherence",
      "actor.affordance-projection",
      "actor.transport-set",
      "actor.fiber-restricted-projection",
      "actor.a2a-task-surface",
      "actor.communication-membrane",
      "actor.casting-legitimacy",
    ] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.concept-formula" as const,
    concept: "persona" as const,
    formula: "persona = situated role/intention mask(character, audience, context, partner-model, work-state)" as const,
    sourceIds: Object.freeze([
      "agential-relationality.playing.persona",
      "agential-relationality.playing.session-character",
      "agential-relationality.persona.theorems",
      "agential-relationality.character-agent.theorems",
      "agential-relationality.skills-disciplines-register",
      "fizzos.character-content",
      "fizzos.playing.character-agent",
      "fizzos.playing.ludics",
      "fizzos.memory-systems",
      "fizzos.ecc-agents-commands",
      "fizzos.multi-agent-orchestration",
      "metroplat.agency-autopsy",
      "fizzos.mud-interiority",
      "fizzos.multi-agent-theory-of-mind",
      "fizzos.inhabiting-agent-run",
      "fizzos.work-acting-category",
      "rom-keldar.character-agent-explanation",
    ] as const),
    obligationIds: Object.freeze(["persona.situated-mask", "persona.shadow-role-distance", "persona.active-memory", "persona.context-separation", "persona.performativity", "persona.partner-modeling", "persona.role-state", "persona.intention-state"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.concept-formula" as const,
    concept: "character" as const,
    formula: "character = dispositional nucleus chi + fixed behavioral space + faculty interiority + inhabited work trace" as const,
    sourceIds: Object.freeze([
      "agential-relationality.playing.character-agent",
      "agential-relationality.character-agent.theorems",
      "agential-relationality.theatre-session.theorems",
      "agential-relationality.skills-disciplines-register",
      "fizzos.character-nucleus",
      "fizzos.playing.character-agent",
      "fizzos.playing.ludics",
      "fizzos.playing.capability-surface",
      "fizzos.agentic-harness-architecture",
      "fizzos.agent-computation-levels",
      "fizzos.agentic-character-survey",
      "fizzos.character-content",
      "fizzos.character-record",
      "fizzos.character-resource-file",
      "fizzos.character-claude-configuration",
      "fizzos.agent-instruction-file-standards",
      "fizzos.agents-md",
      "fizzos.soul-md",
      "fizzos.character-memory",
      "fizzos.heartbeat",
      "fizzos.continuous-learning",
      "fizzos.agentic-harness-landscape",
      "fizzos.memory-systems",
      "fizzos.voyager-skill-library",
      "fizzos.reflexion-lats",
      "fizzos.non-llm-agent-duties",
      "fizzos.small-model-tool-use",
      "fizzos.personal-ai-os-landscape",
      "fizzos.ecc-hooks",
      "fizzos.ecc-skills",
      "metroplat.unified-agent-identity",
      "metroplat.agency-autopsy",
      "fizzos.mud-interiority",
      "fizzos.faculty-cover",
      "fizzos.inhabiting-agent-run",
      "fizzos.inhabiting-theorems",
      "fizzos.faculties-runtime-ecology",
      "fizzos.faculty-theorems",
      "fizzos.work-acting-category",
      "fizzos.multi-agent-theory-of-mind",
      "rom-keldar.character-store",
      "rom-keldar.character-agent-explanation",
      "openclaw.filesystem-surfaces",
    ] as const),
    obligationIds: Object.freeze([
      "character.fixed-behavioral-space",
      "character.performed-self",
      "character.identity-coherence",
      "character.memory-classes",
      "character.governed-memory",
      "character.governance-aspects",
      "character.derived-membership",
      "character.authoritative-record",
      "character.project-instructions",
      "character.identity-instructions",
      "character.instruction-scope-separation",
      "character.instruction-projections",
      "character.host-projection",
      "character.memory-mirror",
      "character.soul",
      "character.heartbeat",
      "character.hooks",
      "character.skills",
      "character.disciplines",
      "character.skill-retrieval",
      "character.quiescence",
      "character.chronicle-validity",
      "character.behaviour-closure",
      "character.session-dramaturgy",
      "character.learning-loop",
      "character.evaluation-loop",
      "character.evaluation",
      "character.faculty-interiority",
      "character.faculty-cover-gluing",
      "character.deterministic-interiority",
      "character.runtime-faculty-trace",
      "character.inhabited-run",
      "character.work-act-enrichment",
      "character.dispatch-acceptance-zone",
    ] as const),
  }),
]);

export const CHARACTER_RESEARCH_REQUIREMENTS: readonly CharacterResearchRequirement[] = Object.freeze([
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.environmental-action",
    concept: "agent" as const,
    description: "The system can modify persistent external state through actions or tools.",
    sourceIds: Object.freeze(["agential-relationality.animating.agent"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.goal-directed-planning",
    concept: "agent" as const,
    description: "The system can plan or reflect toward goals rather than only answer one turn.",
    sourceIds: Object.freeze(["agential-relationality.animating.agent"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.persistent-state",
    concept: "agent" as const,
    description: "The system carries recoverable state across turns or sessions.",
    sourceIds: Object.freeze(["fizzos.agentic-character-survey"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.perceive-act-loop",
    concept: "agent" as const,
    description: "The agent is read as a recorded perceive, plan, and act loop rather than a one-shot completion.",
    sourceIds: Object.freeze(["agential-relationality.animating.agent", "metroplat.agency-autopsy"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.computable-duties",
    concept: "agent" as const,
    description: "Settled agent duties can be represented as tools, functions, classifiers, or state machines instead of always requiring LLM inference.",
    sourceIds: Object.freeze(["fizzos.agent-computation-levels", "fizzos.non-llm-agent-duties", "fizzos.small-model-tool-use"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.harness-portability",
    concept: "agent" as const,
    description: "Shared agentic infrastructure is separated from harness-specific deployment configuration.",
    sourceIds: Object.freeze(["fizzos.agentic-harness-architecture"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.recorded-work",
    concept: "agent" as const,
    description: "Agent work is admitted as recorded material with tools, protocols, and work loci, not as an opaque chat transcript.",
    sourceIds: Object.freeze(["metroplat.agent-work-protocols"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.multi-agent-system",
    concept: "agent" as const,
    description: "A multi-agent system carries two or more autonomous participants interacting in a shared environment.",
    sourceIds: Object.freeze(["fizzos.multi-agent-system", "fizzos.agent-population"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.population",
    concept: "agent" as const,
    description: "The system names its population with identities, capabilities, roles, types, and relationship evidence.",
    sourceIds: Object.freeze(["fizzos.agent-population", "fizzos.multi-agent-system"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.coordination-graph",
    concept: "agent" as const,
    description: "Agent composition is represented as a directed coordination graph with explicit protocol edges.",
    sourceIds: Object.freeze(["fizzos.agent-composition", "fizzos.multi-agent-system", "fizzos.agent-to-agent-protocol"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.coordination-obstruction",
    concept: "agent" as const,
    description: "Coordination cost and impossibility surfaces are carried as off-diagonal collective obstruction data, not ignored overhead.",
    sourceIds: Object.freeze(["fizzos.faculty-cover", "fizzos.multi-agent-coordination-hard", "fizzos.agent-composition"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.theory-of-mind",
    concept: "agent" as const,
    description: "The collective records bounded recursive theory-of-mind depth and evidence for partner modeling.",
    sourceIds: Object.freeze(["fizzos.multi-agent-theory-of-mind"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.runtime-ecology",
    concept: "agent" as const,
    description: "The agent carries a live faculty ecology trace instead of only static identity or capability declarations.",
    sourceIds: Object.freeze(["fizzos.faculties-runtime-ecology", "fizzos.faculty-theorems", "fizzos.inhabiting-agent-run"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.perception-action-frontier",
    concept: "agent" as const,
    description: "The agent run exposes both actor-local boundary perceptions and possible or realized boundary actions.",
    sourceIds: Object.freeze(["fizzos.inhabiting-agent-run", "fizzos.faculties-runtime-ecology", "fizzos.faculty-theorems"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.goal-standing",
    concept: "agent" as const,
    description: "Goals are carried with FOUR standing and satisfaction evidence rather than as bare strings.",
    sourceIds: Object.freeze(["fizzos.inhabiting-agent-run"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "agent.distributed-time",
    concept: "agent" as const,
    description: "Multi-event work keeps a partial order or cohomology witness instead of assuming one global clock.",
    sourceIds: Object.freeze(["fizzos.relating-fiber-theorems", "fizzos.work-acting-category"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "actor.public-transport",
    concept: "actor" as const,
    description: "The actor is a public projection, not the private character record itself.",
    sourceIds: Object.freeze(["agential-relationality.organizing.theatre"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "actor.recorded-session",
    concept: "actor" as const,
    description: "The actor projection is backed by recorded session chronicles.",
    sourceIds: Object.freeze(["agential-relationality.playing.session-character"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "actor.agent-card",
    concept: "actor" as const,
    description: "The actor carries an agent-card-style public capability surface.",
    sourceIds: Object.freeze(["agential-relationality.organizing.theatre", "agential-relationality.identity.facets"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "actor.identity-facets",
    concept: "actor" as const,
    description: "The actor can carry DID, WebAuthn, and verifiable-credential identity facets.",
    sourceIds: Object.freeze(["agential-relationality.identity.facets"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "actor.identity-coherence",
    concept: "actor" as const,
    description: "Actor, DID, Agent Card, VC subject, and WebAuthn facets are read as facets of one identity root.",
    sourceIds: Object.freeze(["metroplat.unified-agent-identity", "agential-relationality.identity.facets"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "actor.affordance-projection",
    concept: "actor" as const,
    description: "The public actor exposes discoverable affordances, not only an address.",
    sourceIds: Object.freeze(["metroplat.a2a-as-animating", "agential-relationality.organizing.theatre"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "actor.transport-set",
    concept: "actor" as const,
    description: "The actor reports the public transport set it projects through, rather than hiding transports in one hard-coded endpoint.",
    sourceIds: Object.freeze(["agential-relationality.organizing.theatre", "fizzos.mcp-agent-sdk", "fizzos.ecc-agents-commands", "fizzos.multi-agent-orchestration"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "actor.fiber-restricted-projection",
    concept: "actor" as const,
    description: "The actor's perceived world is the restriction of settled world material to that actor's own fiber.",
    sourceIds: Object.freeze(["fizzos.mud-interiority", "fizzos.faculty-cover"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "actor.a2a-task-surface",
    concept: "actor" as const,
    description: "The public actor carries A2A task lifecycle, binding, artifact, and security semantics in addition to an Agent Card.",
    sourceIds: Object.freeze(["fizzos.agent-to-agent-protocol"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "actor.communication-membrane",
    concept: "actor" as const,
    description: "The actor projection is bounded by a communication membrane of participants, common ground, and boundary events.",
    sourceIds: Object.freeze(["fizzos.inhabiting-agent-run", "fizzos.relating-fiber-theorems"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "actor.casting-legitimacy",
    concept: "actor" as const,
    description: "Casting into offices or situations reports accepted and rejected candidates with skill, capability, authority, and legitimacy evidence.",
    sourceIds: Object.freeze(["fizzos.inhabiting-agent-run", "fizzos.inhabiting-theorems"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "persona.situated-mask",
    concept: "persona" as const,
    description: "A persona is a situated mask, not the authoritative identity.",
    sourceIds: Object.freeze(["agential-relationality.playing.persona"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "persona.shadow-role-distance",
    concept: "persona" as const,
    description: "A persona reports the shown mask, held-back shadow, and role distance.",
    sourceIds: Object.freeze(["agential-relationality.playing.persona"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "persona.active-memory",
    concept: "persona" as const,
    description: "A persona can select working/session memory without absorbing all character memory.",
    sourceIds: Object.freeze(["fizzos.agentic-character-survey"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "persona.context-separation",
    concept: "persona" as const,
    description: "A persona carries explicit situation, role, audience, and active-memory coordinates separate from the authoritative character.",
    sourceIds: Object.freeze(["agential-relationality.playing.persona", "fizzos.character-content", "fizzos.memory-systems", "rom-keldar.character-agent-explanation"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "persona.performativity",
    concept: "persona" as const,
    description: "The persona is read from performed chronicles or plays, not from a hidden self behind the action.",
    sourceIds: Object.freeze(["agential-relationality.persona.theorems", "agential-relationality.playing.session-character"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "persona.partner-modeling",
    concept: "persona" as const,
    description: "The situated persona carries bounded partner-modeling depth for communication, trust, strategy, and norm reasoning.",
    sourceIds: Object.freeze(["fizzos.mud-interiority", "fizzos.multi-agent-theory-of-mind"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "persona.role-state",
    concept: "persona" as const,
    description: "The persona reports role standing for an agent-role pair, including enactment, distance, conflict, merger, or overload.",
    sourceIds: Object.freeze(["fizzos.work-acting-category"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "persona.intention-state",
    concept: "persona" as const,
    description: "The persona carries beliefs, desires, intentions, and partial plans for the work it performs.",
    sourceIds: Object.freeze(["fizzos.work-acting-category"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.fixed-behavioral-space",
    concept: "character" as const,
    description: "A character has a stable disposition and fixed behavioral space.",
    sourceIds: Object.freeze(["fizzos.character-nucleus", "agential-relationality.playing.character-agent"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.performed-self",
    concept: "character" as const,
    description: "The session self is reconstructed from plays or chronicles.",
    sourceIds: Object.freeze(["agential-relationality.playing.character-agent", "agential-relationality.playing.session-character"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.identity-coherence",
    concept: "character" as const,
    description: "Masks glue coherently or report identity drift.",
    sourceIds: Object.freeze(["agential-relationality.playing.character-agent"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.memory-classes",
    concept: "character" as const,
    description: "The profile separates working, episodic, semantic, and procedural memory.",
    sourceIds: Object.freeze(["fizzos.agentic-character-survey", "openclaw.filesystem-surfaces", "rom-keldar.character-store"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.governed-memory",
    concept: "character" as const,
    description: "Memory is not an append-only vibe bucket: it has lifecycle, scoping, conflict, consolidation, and audit governance.",
    sourceIds: Object.freeze(["fizzos.agentic-character-survey", "fizzos.memory-systems", "fizzos.character-content", "rom-keldar.character-store", "rom-keldar.character-agent-explanation"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.governance-aspects",
    concept: "character" as const,
    description: "The profile has separable governance records for identity, behavior, voice, memory, tools, autonomy, safety, evaluation, and audit.",
    sourceIds: Object.freeze(["rom-keldar.character-store", "rom-keldar.character-agent-explanation"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.derived-membership",
    concept: "character" as const,
    description: "Membership is derived from carried structure and debts, not asserted by frontmatter.",
    sourceIds: Object.freeze(["rom-keldar.character-store", "rom-keldar.character-agent-explanation"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.authoritative-record",
    concept: "character" as const,
    description: "The profile distinguishes an authoritative character record or resource file from derived host images.",
    sourceIds: Object.freeze(["fizzos.character-record", "fizzos.character-resource-file"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.project-instructions",
    concept: "character" as const,
    description: "The profile carries project-scoped instructions separately from the character's identity.",
    sourceIds: Object.freeze(["fizzos.agents-md", "fizzos.agent-instruction-file-standards"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.identity-instructions",
    concept: "character" as const,
    description: "The profile carries agent identity instructions separately from project-scoped work instructions.",
    sourceIds: Object.freeze(["fizzos.soul-md", "fizzos.agent-instruction-file-standards"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.instruction-scope-separation",
    concept: "character" as const,
    description: "Project instructions, identity files, host runtime files, memory mirrors, and authoritative character records remain separate surfaces.",
    sourceIds: Object.freeze(["fizzos.agent-instruction-file-standards", "fizzos.agents-md", "fizzos.soul-md"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.instruction-projections",
    concept: "character" as const,
    description: "Host instruction files are represented as projections from the character record, not as authoritative identity.",
    sourceIds: Object.freeze(["fizzos.character-claude-configuration", "fizzos.agent-instruction-file-standards"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.host-projection",
    concept: "character" as const,
    description: "The profile can project a character into host-specific runtime artifacts such as CLAUDE.md and .mcp.json.",
    sourceIds: Object.freeze(["fizzos.character-claude-configuration"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.memory-mirror",
    concept: "character" as const,
    description: "Authoritative in-repo character memory can be mirrored into host auto-memory without making the mirror authoritative.",
    sourceIds: Object.freeze(["fizzos.character-memory"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.soul",
    concept: "character" as const,
    description: "The profile carries values, must, and must-not constraints.",
    sourceIds: Object.freeze(["openclaw.filesystem-surfaces"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.heartbeat",
    concept: "character" as const,
    description: "The profile carries a low-frequency working-context heartbeat surface.",
    sourceIds: Object.freeze(["openclaw.filesystem-surfaces"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.hooks",
    concept: "character" as const,
    description: "The profile carries event-driven hooks for memory, audit, gates, bootstrap, or automation.",
    sourceIds: Object.freeze(["openclaw.filesystem-surfaces"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.skills",
    concept: "character" as const,
    description: "The profile carries procedural skill records.",
    sourceIds: Object.freeze(["agential-relationality.playing.character-agent", "openclaw.filesystem-surfaces"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.disciplines",
    concept: "character" as const,
    description: "The profile carries practiced disciplines as behavior surfaces against which skills and plays are judged.",
    sourceIds: Object.freeze(["agential-relationality.skills-disciplines-register", "fizzos.playing.character-agent"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.skill-retrieval",
    concept: "character" as const,
    description: "The learning loop exposes a skill-retrieval stage rather than treating skills as inert labels.",
    sourceIds: Object.freeze(["fizzos.voyager-skill-library", "fizzos.ecc-skills", "fizzos.continuous-learning"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.quiescence",
    concept: "character" as const,
    description: "Character maturity is reported as quiescence over practiced skill and hook surfaces, not as a declared maturity ladder.",
    sourceIds: Object.freeze(["agential-relationality.character-agent.theorems", "fizzos.playing.character-agent"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.chronicle-validity",
    concept: "character" as const,
    description: "Chronicles are treated as recorded performed sequences with per-action evidence, not as unexamined transcript blobs.",
    sourceIds: Object.freeze(["fizzos.playing.ludics", "fizzos.playing.capability-surface"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.behaviour-closure",
    concept: "character" as const,
    description: "The fixed behavioral space is tied to practiced skills and quiescent closure rather than a loose list of possible acts.",
    sourceIds: Object.freeze(["fizzos.playing.ludics", "fizzos.playing.capability-surface", "fizzos.playing.character-agent"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.session-dramaturgy",
    concept: "character" as const,
    description: "A session character is reconstructed with masks, situation, active context, and recorded performance.",
    sourceIds: Object.freeze(["metroplat.agency-autopsy", "agential-relationality.theatre-session.theorems", "agential-relationality.playing.session-character"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.learning-loop",
    concept: "character" as const,
    description: "The profile connects observations and reflections to procedural memory, skills, and hook/process surfaces.",
    sourceIds: Object.freeze(["fizzos.continuous-learning"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.evaluation-loop",
    concept: "character" as const,
    description: "The learning loop exposes an evaluator or critic stage so failures can settle into reflection and correction.",
    sourceIds: Object.freeze(["fizzos.reflexion-lats", "fizzos.voyager-skill-library", "fizzos.ecc-hooks"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.evaluation",
    concept: "character" as const,
    description: "The profile carries evaluation or benchmark governance evidence.",
    sourceIds: Object.freeze(["fizzos.agentic-character-survey"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.faculty-interiority",
    concept: "character" as const,
    description: "Character interiority is represented as inhabited faculty local sections with cells, charges, fibers, and evidence.",
    sourceIds: Object.freeze(["fizzos.mud-interiority", "fizzos.faculty-cover"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.faculty-cover-gluing",
    concept: "character" as const,
    description: "Faculty sections are glued through the diagonal-agent cover and report the H1 gluing obstruction.",
    sourceIds: Object.freeze(["fizzos.faculty-cover"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.deterministic-interiority",
    concept: "character" as const,
    description: "Faculty perception can be replayed deterministically and includes regard as the observer-relative cut.",
    sourceIds: Object.freeze(["fizzos.mud-interiority"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.runtime-faculty-trace",
    concept: "character" as const,
    description: "A character profile carries live faculty trace entries across the researched FeltOS ecology faculties.",
    sourceIds: Object.freeze(["fizzos.faculties-runtime-ecology", "fizzos.faculty-theorems"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.inhabited-run",
    concept: "character" as const,
    description: "Character execution includes an inhabited run with boundary events, goals, membrane, stage, and distributed-order evidence.",
    sourceIds: Object.freeze(["fizzos.inhabiting-agent-run", "fizzos.faculties-runtime-ecology"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.work-act-enrichment",
    concept: "character" as const,
    description: "Work acts carry substrate states, settlement grade, realization type, observer-relative visibility, role, instruments, artifacts, and intention state.",
    sourceIds: Object.freeze(["fizzos.work-acting-category", "fizzos.inhabiting-theorems"] as const),
  }),
  Object.freeze({
    kind: "metroplat.agent.character.research-requirement" as const,
    id: "character.dispatch-acceptance-zone",
    concept: "character" as const,
    description: "Push dispatch is only counted as authoritative when accepted inside the actor's acceptance zone.",
    sourceIds: Object.freeze(["fizzos.work-acting-category"] as const),
  }),
]);

const CAPABILITY_FAMILY_REQUIREMENTS: readonly Omit<CharacterCapabilityFamilyReport, "kind" | "covered" | "missing" | "status" | "evidence">[] = Object.freeze([
  Object.freeze({
    family: "agential-relationality" as const,
    label: "Prior playing, animating, and organizing character-agent surfaces",
    required: Object.freeze([
      "agent.environmental-action",
      "agent.goal-directed-planning",
      "agent.persistent-state",
      "agent.perceive-act-loop",
      "agent.recorded-work",
      "actor.public-transport",
      "actor.recorded-session",
      "actor.agent-card",
      "actor.identity-facets",
      "actor.identity-coherence",
      "actor.affordance-projection",
      "actor.transport-set",
      "persona.situated-mask",
      "persona.shadow-role-distance",
      "persona.performativity",
      "persona.context-separation",
      "character.fixed-behavioral-space",
      "character.performed-self",
      "character.identity-coherence",
      "character.authoritative-record",
      "character.instruction-scope-separation",
      "character.skills",
      "character.disciplines",
      "character.skill-retrieval",
      "character.quiescence",
      "character.chronicle-validity",
      "character.behaviour-closure",
      "character.session-dramaturgy",
    ] as const),
  }),
  Object.freeze({
    family: "feltos" as const,
    label: "FeltOS agentic character and continuous-learning obligations",
    required: Object.freeze([
      "agent.persistent-state",
      "agent.computable-duties",
      "agent.harness-portability",
      "agent.multi-agent-system",
      "agent.population",
      "agent.coordination-graph",
      "agent.coordination-obstruction",
      "agent.theory-of-mind",
      "agent.runtime-ecology",
      "agent.perception-action-frontier",
      "agent.goal-standing",
      "agent.distributed-time",
      "actor.fiber-restricted-projection",
      "actor.a2a-task-surface",
      "actor.communication-membrane",
      "actor.casting-legitimacy",
      "persona.partner-modeling",
      "persona.role-state",
      "persona.intention-state",
      "character.memory-classes",
      "character.governed-memory",
      "character.learning-loop",
      "character.skill-retrieval",
      "character.evaluation-loop",
      "character.evaluation",
      "character.fixed-behavioral-space",
      "character.identity-coherence",
      "character.authoritative-record",
      "character.project-instructions",
      "character.identity-instructions",
      "character.instruction-scope-separation",
      "character.instruction-projections",
      "character.host-projection",
      "character.memory-mirror",
      "character.disciplines",
      "character.quiescence",
      "character.chronicle-validity",
      "character.behaviour-closure",
      "character.faculty-interiority",
      "character.faculty-cover-gluing",
      "character.deterministic-interiority",
      "character.runtime-faculty-trace",
      "character.inhabited-run",
      "character.work-act-enrichment",
      "character.dispatch-acceptance-zone",
    ] as const),
  }),
  Object.freeze({
    family: "openclaw" as const,
    label: "OpenClaw filesystem substrate surfaces",
    required: Object.freeze([
      "character.memory-classes",
      "character.governed-memory",
      "character.heartbeat",
      "character.hooks",
      "character.skills",
      "character.skill-retrieval",
      "character.soul",
      "character.identity-instructions",
      "character.memory-mirror",
      "character.learning-loop",
      "character.evaluation-loop",
    ] as const),
  }),
  Object.freeze({
    family: "rom-keldar" as const,
    label: "Rom Keldar character-store derivation discipline",
    required: Object.freeze([
      "character.derived-membership",
      "character.authoritative-record",
      "character.governance-aspects",
      "character.memory-classes",
      "character.governed-memory",
      "character.soul",
      "character.skills",
      "character.skill-retrieval",
      "character.instruction-scope-separation",
      "character.instruction-projections",
    ] as const),
  }),
  Object.freeze({
    family: "external-survey" as const,
    label: "External character-agent survey floor",
    required: Object.freeze([
      "agent.environmental-action",
      "agent.goal-directed-planning",
      "agent.persistent-state",
      "agent.computable-duties",
      "agent.harness-portability",
      "agent.multi-agent-system",
      "agent.population",
      "agent.coordination-graph",
      "agent.coordination-obstruction",
      "agent.theory-of-mind",
      "actor.identity-facets",
      "actor.identity-coherence",
      "actor.affordance-projection",
      "actor.transport-set",
      "actor.a2a-task-surface",
      "persona.context-separation",
      "persona.partner-modeling",
      "character.memory-classes",
      "character.governed-memory",
      "character.project-instructions",
      "character.identity-instructions",
      "character.instruction-scope-separation",
      "character.instruction-projections",
      "character.host-projection",
      "character.memory-mirror",
      "character.skill-retrieval",
      "character.disciplines",
      "character.quiescence",
      "character.chronicle-validity",
      "character.behaviour-closure",
      "character.session-dramaturgy",
      "character.evaluation-loop",
      "character.evaluation",
      "persona.active-memory",
      "persona.performativity",
      "character.faculty-interiority",
      "character.faculty-cover-gluing",
      "character.deterministic-interiority",
    ] as const),
  }),
]);

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}

function uniqueSorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
}

function duplicateValues<T extends string>(values: readonly T[]): readonly T[] {
  const seen = new Set<T>();
  const duplicates = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return Object.freeze([...duplicates].sort((left, right) => left.localeCompare(right)));
}

function slugPart(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  return slug.length === 0 ? "character" : slug;
}

function trimmedBase(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/u, "");
  if (trimmed.length === 0) throw new TypeError("character actor baseUrl must not be empty");
  return trimmed;
}

function addressFor(axis: CharacterMask["axis"], label: string): readonly number[] {
  const base: Readonly<Record<CharacterMask["axis"], number>> = Object.freeze({
    harness: 1,
    lane: 2,
    office: 3,
    audience: 4,
    role: 5,
    surface: 6,
  });
  const suffix = [...label.toLowerCase()].map((char) => char.codePointAt(0) ?? 0);
  return Object.freeze([base[axis], ...(suffix.length === 0 ? [0] : suffix)]);
}

function designKey(design: AgentDesign): string {
  return design.entries
    .map((entry) => `${entry.locusKey}:${entry.acts.join(",")}`)
    .join("|");
}

function sameDesign(left: AgentDesign, right: AgentDesign): boolean {
  return designKey(left) === designKey(right);
}

function entry(locusKey: string, acts: readonly AgentAct[], evidence: readonly string[]): AgentDesignEntry {
  return Object.freeze({
    kind: "metroplat.agent.design-entry" as const,
    locusKey,
    acts: freezeArray(uniqueSorted(acts) as readonly AgentAct[]),
    evidence: freezeArray(uniqueSorted(evidence)),
  });
}

export function agentChronicleAction(
  locusKey: string,
  act: AgentAct,
  evidence?: string,
  object?: string,
): AgentChronicleAction {
  return Object.freeze({
    kind: "metroplat.agent.chronicle-action" as const,
    locusKey,
    act,
    ...(object === undefined ? {} : { object }),
    ...(evidence === undefined ? {} : { evidence }),
  });
}

export function agentChronicle(
  actions: readonly AgentChronicleAction[],
  evidence: readonly string[] = [],
  options: { readonly id?: string; readonly session?: string } = {},
): AgentChronicle {
  return Object.freeze({
    kind: "metroplat.agent.chronicle" as const,
    id: options.id ?? `chronicle-${evidence.length}-${actions.length}`,
    session: options.session ?? "session",
    actions: freezeArray(actions),
    evidence: freezeArray(evidence),
  });
}

export function agentDesign(entries: readonly AgentDesignEntry[]): AgentDesign {
  const byLocus = new Map<string, { acts: AgentAct[]; evidence: string[] }>();
  for (const item of entries) {
    const prior = byLocus.get(item.locusKey) ?? { acts: [], evidence: [] };
    byLocus.set(item.locusKey, {
      acts: [...prior.acts, ...item.acts],
      evidence: [...prior.evidence, ...item.evidence],
    });
  }
  return Object.freeze({
    kind: "metroplat.agent.design" as const,
    entries: freezeArray([...byLocus.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([locusKey, item]) => entry(locusKey, uniqueSorted(item.acts) as readonly AgentAct[], uniqueSorted(item.evidence)))),
  });
}

export function agentDesignFromChronicles(chronicles: readonly AgentChronicle[]): AgentDesign {
  return agentDesign(chronicles.flatMap((chronicle) =>
    chronicle.actions.map((action) => entry(
      action.locusKey,
      [action.act],
      uniqueSorted([
        chronicle.id,
        chronicle.session,
        ...chronicle.evidence,
        ...(action.evidence === undefined ? [] : [action.evidence]),
      ]),
    ))));
}

export function maskAgentDesign(actor: AgentDesign, at: readonly number[]): AgentDesign {
  const prefix = at.join(".");
  return agentDesign(actor.entries.map((item) => entry(
    prefix.length === 0 ? item.locusKey : item.locusKey.length === 0 ? prefix : `${prefix}.${item.locusKey}`,
    item.acts,
    item.evidence,
  )));
}

export function sameAgentUnderMask(actor: AgentDesign, worn: AgentDesign, at: readonly number[]): boolean {
  return sameDesign(maskAgentDesign(actor, at), worn);
}

export function characterMemoryRecord(input: Omit<CharacterMemoryRecord, "kind">): CharacterMemoryRecord {
  return Object.freeze({
    kind: "metroplat.agent.character.memory" as const,
    id: input.id,
    class: input.class,
    scope: input.scope,
    source: input.source,
    ...(input.path === undefined ? {} : { path: input.path }),
    ...(input.mirrorPath === undefined ? {} : { mirrorPath: input.mirrorPath }),
    ...(input.summary === undefined ? {} : { summary: input.summary }),
    ...(input.confidence === undefined ? {} : { confidence: input.confidence }),
    evidence: freezeArray(input.evidence),
  });
}

export function characterSkill(input: Omit<CharacterSkill, "kind">): CharacterSkill {
  return Object.freeze({
    kind: "metroplat.agent.character.skill" as const,
    id: input.id,
    name: input.name,
    position: input.position,
    ...(input.support === undefined ? {} : { support: freezeArray(uniqueSorted(input.support)) }),
    ...(input.path === undefined ? {} : { path: input.path }),
    ...(input.script === undefined ? {} : { script: input.script }),
    evidence: freezeArray(input.evidence),
  });
}

export function characterDiscipline(input: Omit<CharacterDiscipline, "kind">): CharacterDiscipline {
  return Object.freeze({
    kind: "metroplat.agent.character.discipline" as const,
    id: input.id,
    name: input.name,
    behavior: freezeArray(uniqueSorted(input.behavior)),
    evidence: freezeArray(input.evidence),
  });
}

export function characterTool(input: Omit<CharacterTool, "kind">): CharacterTool {
  return Object.freeze({
    kind: "metroplat.agent.character.tool" as const,
    id: input.id,
    name: input.name,
    authority: input.authority,
    boundary: input.boundary,
    evidence: freezeArray(input.evidence),
  });
}

export function characterHook(input: Omit<CharacterHook, "kind">): CharacterHook {
  return Object.freeze({
    kind: "metroplat.agent.character.hook" as const,
    id: input.id,
    event: input.event,
    purpose: input.purpose,
    ...(input.path === undefined ? {} : { path: input.path }),
    evidence: freezeArray(input.evidence),
  });
}

export function characterGovernanceRecord(input: Omit<CharacterGovernanceRecord, "kind">): CharacterGovernanceRecord {
  return Object.freeze({
    kind: "metroplat.agent.character.governance" as const,
    aspect: input.aspect,
    source: input.source,
    ...(input.payload === undefined ? {} : { payload: input.payload }),
    evidence: freezeArray(input.evidence),
  });
}

export function characterSoul(input: Omit<CharacterSoul, "kind">): CharacterSoul {
  return Object.freeze({
    kind: "metroplat.agent.character.soul" as const,
    values: freezeArray(input.values),
    must: freezeArray(input.must),
    mustNot: freezeArray(input.mustNot),
    evidence: freezeArray(input.evidence),
  });
}

export function characterHeartbeat(input: Omit<CharacterHeartbeat, "kind">): CharacterHeartbeat {
  return Object.freeze({
    kind: "metroplat.agent.character.heartbeat" as const,
    checks: freezeArray(input.checks),
    cadence: input.cadence,
    evidence: freezeArray(input.evidence),
  });
}

export function characterInstructionSurface(input: Omit<CharacterInstructionSurface, "kind">): CharacterInstructionSurface {
  return Object.freeze({
    kind: "metroplat.agent.character.instruction-surface" as const,
    id: input.id,
    convention: input.convention,
    scope: input.scope,
    authority: input.authority,
    target: input.target,
    ...(input.path === undefined ? {} : { path: input.path }),
    evidence: freezeArray(input.evidence),
  });
}

export function characterProjection(input: Omit<CharacterProjection, "kind">): CharacterProjection {
  return Object.freeze({
    kind: "metroplat.agent.character.projection" as const,
    id: input.id,
    source: input.source,
    target: input.target,
    artifacts: freezeArray(uniqueSorted(input.artifacts)),
    derived: input.derived,
    authoritative: input.authoritative,
    evidence: freezeArray(input.evidence),
  });
}

export function characterFacultySection(input: Omit<CharacterFacultySection, "kind">): CharacterFacultySection {
  if (input.id.trim().length === 0) throw new TypeError("characterFacultySection: id must not be empty");
  if (input.faculty.trim().length === 0) throw new TypeError("characterFacultySection: faculty must not be empty");
  if (input.fiber.trim().length === 0) throw new TypeError("characterFacultySection: fiber must not be empty");
  if (input.cell.trim().length === 0) throw new TypeError("characterFacultySection: cell must not be empty");
  return Object.freeze({
    kind: "metroplat.agent.character.faculty-section" as const,
    id: input.id,
    faculty: input.faculty,
    fiber: input.fiber,
    cell: input.cell,
    charge: input.charge,
    ...(input.level === undefined ? {} : { level: input.level }),
    ...(input.replaySeed === undefined ? {} : { replaySeed: input.replaySeed }),
    evidence: freezeArray(input.evidence),
  });
}

export function characterRuntimeFacultyTrace(input: Omit<CharacterRuntimeFacultyTrace, "kind">): CharacterRuntimeFacultyTrace {
  if (input.actor.trim().length === 0) throw new TypeError("characterRuntimeFacultyTrace: actor must not be empty");
  return Object.freeze({
    kind: "metroplat.agent.character.runtime-faculty-trace" as const,
    faculty: input.faculty,
    actor: input.actor,
    charge: input.charge,
    facts: freezeArray(uniqueSorted(input.facts)),
    ...(input.section === undefined ? {} : { section: input.section }),
    evidence: freezeArray(input.evidence),
  });
}

export function characterBoundaryEvent(input: Omit<CharacterBoundaryEvent, "kind">): CharacterBoundaryEvent {
  if (input.id.trim().length === 0) throw new TypeError("characterBoundaryEvent: id must not be empty");
  if (input.actor.trim().length === 0) throw new TypeError("characterBoundaryEvent: actor must not be empty");
  return Object.freeze({
    kind: "metroplat.agent.character.boundary-event" as const,
    id: input.id,
    direction: input.direction,
    actor: input.actor,
    predicate: input.predicate,
    object: input.object,
    via: input.via,
    charge: input.charge,
    happensAfter: freezeArray(uniqueSorted(input.happensAfter)),
    evidence: freezeArray(input.evidence),
  });
}

export function characterGoalStanding(input: Omit<CharacterGoalStanding, "kind">): CharacterGoalStanding {
  if (input.agent.trim().length === 0) throw new TypeError("characterGoalStanding: agent must not be empty");
  if (input.goal.trim().length === 0) throw new TypeError("characterGoalStanding: goal must not be empty");
  return Object.freeze({
    kind: "metroplat.agent.character.goal-standing" as const,
    agent: input.agent,
    goal: input.goal,
    standing: input.standing,
    satisfied: input.satisfied,
    evidence: freezeArray(input.evidence),
  });
}

export function characterRoleState(input: Omit<CharacterRoleState, "kind">): CharacterRoleState {
  if (input.agent.trim().length === 0) throw new TypeError("characterRoleState: agent must not be empty");
  if (input.role.trim().length === 0) throw new TypeError("characterRoleState: role must not be empty");
  return Object.freeze({
    kind: "metroplat.agent.character.role-state" as const,
    agent: input.agent,
    role: input.role,
    standing: input.standing,
    ...(input.audience === undefined ? {} : { audience: input.audience }),
    ...(input.authority === undefined ? {} : { authority: input.authority }),
    evidence: freezeArray(input.evidence),
  });
}

export function characterWorkIntention(input: Omit<CharacterWorkIntention, "kind">): CharacterWorkIntention {
  return Object.freeze({
    kind: "metroplat.agent.character.work-intention" as const,
    beliefs: freezeArray(uniqueSorted(input.beliefs)),
    desires: freezeArray(uniqueSorted(input.desires)),
    intentions: freezeArray(uniqueSorted(input.intentions)),
    partialPlans: freezeArray(uniqueSorted(input.partialPlans)),
    evidence: freezeArray(input.evidence),
  });
}

export function characterWorkAct(input: Omit<CharacterWorkAct, "kind">): CharacterWorkAct {
  if (input.id.trim().length === 0) throw new TypeError("characterWorkAct: id must not be empty");
  if (input.actor.trim().length === 0) throw new TypeError("characterWorkAct: actor must not be empty");
  return Object.freeze({
    kind: "metroplat.agent.character.work-act" as const,
    id: input.id,
    actor: input.actor,
    substrate: input.substrate,
    sourceState: input.sourceState,
    targetState: input.targetState,
    ...(input.role === undefined ? {} : { role: input.role }),
    settlement: input.settlement,
    realization: input.realization,
    visibility: input.visibility,
    dispatch: input.dispatch,
    authorityAccepted: input.authorityAccepted,
    instruments: freezeArray(uniqueSorted(input.instruments)),
    mediatingArtifacts: freezeArray(uniqueSorted(input.mediatingArtifacts)),
    intention: input.intention,
    evidence: freezeArray(input.evidence),
  });
}

export function characterCasting(input: Omit<CharacterCasting, "kind">): CharacterCasting {
  if (input.id.trim().length === 0) throw new TypeError("characterCasting: id must not be empty");
  return Object.freeze({
    kind: "metroplat.agent.character.casting" as const,
    id: input.id,
    office: input.office,
    situation: input.situation,
    ...(input.requiredSkill === undefined ? {} : { requiredSkill: input.requiredSkill }),
    accepted: freezeArray(uniqueSorted(input.accepted)),
    rejected: freezeArray(input.rejected.map((item) => Object.freeze({ agent: item.agent, reason: item.reason }))),
    legitimate: input.legitimate,
    charge: input.charge,
    evidence: freezeArray(input.evidence),
  });
}

export function agentPopulationMember(input: Omit<AgentPopulationMember, "kind">): AgentPopulationMember {
  if (input.id.trim().length === 0) throw new TypeError("agentPopulationMember: id must not be empty");
  return Object.freeze({
    kind: "metroplat.agent.population-member" as const,
    id: input.id,
    ...(input.role === undefined ? {} : { role: input.role }),
    ...(input.type === undefined ? {} : { type: input.type }),
    capabilities: freezeArray(uniqueSorted(input.capabilities)),
    ...(input.budgets === undefined ? {} : { budgets: freezeArray(uniqueSorted(input.budgets)) }),
    evidence: freezeArray(input.evidence),
  });
}

function chainEdges(nodes: readonly string[]): readonly (readonly [string, string])[] {
  return freezeArray(nodes.slice(1).map((node, index) => Object.freeze([nodes[index] ?? node, node] as const)));
}

function eventOrderEdges(events: readonly CharacterBoundaryEvent[]): readonly (readonly [string, string])[] {
  return freezeArray(events.flatMap((event) =>
    event.happensAfter.map((prior) => Object.freeze([prior, event.id] as const))));
}

export function characterInteriority(input: {
  readonly id: string;
  readonly sections: readonly CharacterFacultySection[];
}): CharacterInteriority {
  const sections = freezeArray(input.sections);
  const nodes = sections.length === 0 ? Object.freeze(["interiority:empty"]) : sections.map((section) => section.id);
  const edges = chainEdges(nodes);
  const gluing = cohomologyOfEdgeGraph(nodes, edges);
  const material = materialContextFromCover(diagonalAgentCover, {
    id: `metroplat.agent.character.interiority.${slugPart(input.id)}`,
    section: `actor-fiber:${input.id}`,
    constraints: Object.freeze([
      "actor-fiber-restriction",
      "faculty-local-sections",
      "deterministic-replay",
      "regard-cut",
    ]),
    boundary: sections.length === 0 ? Object.freeze(["interiority:empty"]) : sections.map((section) => section.faculty),
  });
  const fiberRestricted = sections.length > 0 && sections.every((section) => section.fiber.length > 0 && section.cell.length > 0);
  const deterministicReplay = sections.length > 0 && sections.every((section) => section.replaySeed !== undefined && section.replaySeed.length > 0);
  const regard = sections.some((section) =>
    section.faculty.toLowerCase() === "empathy" || section.evidence.some((item) => item.includes("regard")));
  return Object.freeze({
    kind: "metroplat.agent.character.interiority" as const,
    formula: "interiority = actor-fiber restriction(world, actor) + faculty local sections -> perceived world" as const,
    cover: diagonalAgentCover,
    material,
    sections,
    fiberRestricted,
    deterministicReplay,
    regard,
    gluing,
    evidence: freezeArray([
      `sections:${sections.length}`,
      `fiber-restricted:${fiberRestricted}`,
      `deterministic-replay:${deterministicReplay}`,
      `regard:${regard}`,
      `h1:${gluing.firstCohomology.rank.members.length}`,
    ]),
  });
}

function runStage(
  perceptions: readonly CharacterBoundaryEvent[],
  actions: readonly CharacterBoundaryEvent[],
  goals: readonly CharacterGoalStanding[],
): CharacterRunStage {
  if (goals.some((goal) => goal.satisfied)) return "governing";
  if (actions.length > 0) return "working";
  if (perceptions.length > 0) return "doing";
  return "becoming";
}

export function characterInhabitedRun(input: {
  readonly id: string;
  readonly runtimeFaculties: readonly CharacterRuntimeFacultyTrace[];
  readonly boundaryEvents: readonly CharacterBoundaryEvent[];
  readonly goals: readonly CharacterGoalStanding[];
}): CharacterInhabitedRun {
  const boundaryEvents = freezeArray(input.boundaryEvents);
  const perceptions = freezeArray(boundaryEvents.filter((event) => event.direction === "perception"));
  const actions = freezeArray(boundaryEvents.filter((event) => event.direction === "action"));
  const goals = freezeArray(input.goals);
  const facultyTrace = freezeArray(input.runtimeFaculties);
  const stage = runStage(perceptions, actions, goals);
  const participants = uniqueSorted([
    input.id,
    ...boundaryEvents.map((event) => event.actor),
    ...goals.map((goal) => goal.agent),
    ...facultyTrace.map((trace) => trace.actor),
  ]);
  const events = boundaryEvents.map((event) => event.id);
  const orderNodes = events.length === 0 ? Object.freeze(["run:empty"]) : events;
  const distributedOrder = cohomologyOfEdgeGraph(orderNodes, eventOrderEdges(boundaryEvents));
  const perceptionActionOpen = perceptions.length > 0 && actions.length > 0;
  const open = stage !== "governing" || distributedOrder.firstCohomology.vanishing.kind !== "predication.cohomology.rankVanishing:witness";
  return Object.freeze({
    kind: "metroplat.agent.character.inhabited-run" as const,
    formula: "inhabited-run = boundary perceptions/actions + goals + faculty trace + membrane -> stage" as const,
    id: input.id,
    stage,
    perceptions,
    actions,
    goals,
    facultyTrace,
    membrane: Object.freeze({
      participants,
      commonGround: uniqueSorted(goals.filter((goal) => goal.satisfied).map((goal) => goal.goal)),
      events: freezeArray(events),
    }),
    perceptionActionOpen,
    open,
    distributedOrder,
    evidence: freezeArray([
      `stage:${stage}`,
      `perceptions:${perceptions.length}`,
      `actions:${actions.length}`,
      `goals:${goals.length}`,
      `faculty-trace:${facultyTrace.length}`,
      `participants:${participants.length}`,
      `h1:${distributedOrder.firstCohomology.rank.members.length}`,
    ]),
  });
}

export function agentCollective(input: AgentCollectiveInput = { population: Object.freeze([]) }): AgentCollective {
  const population = freezeArray(input.population);
  const nodes = population.length === 0 ? Object.freeze(["collective:empty"]) : population.map((member) => member.id);
  const givenEdges = input.coordinationGraph ?? Object.freeze([]);
  const coordinationGraph = freezeArray(givenEdges.map((edge) => Object.freeze([edge[0], edge[1]] as const)));
  const cohomology = cohomologyOfEdgeGraph(nodes, coordinationGraph);
  const coordinationCost = cohomology.firstCohomology.rank.members.length;
  const coordinationFree = cohomology.firstCohomology.vanishing.kind === "predication.cohomology.rankVanishing:witness";
  const material = materialContextFromCover(offDiagonalCollectiveCover, {
    id: "metroplat.agent.collective.material",
    ...(input.sharedEnvironment === undefined ? {} : { section: input.sharedEnvironment }),
    constraints: Object.freeze([
      "shared-environment",
      "coordination-graph",
      "bounded-theory-of-mind",
      "coordination-obstruction-accounted",
    ]),
    boundary: population.length === 0 ? Object.freeze(["collective:empty"]) : population.map((member) => member.id),
  });
  const protocols = freezeArray(uniqueSorted(input.protocols ?? []));
  const obstacles = freezeArray(uniqueSorted(input.obstacles ?? []));
  const theoryOfMindEvidence = freezeArray(input.theoryOfMindEvidence ?? []);
  const depth = input.theoryOfMindDepth ?? 0;
  return Object.freeze({
    kind: "metroplat.agent.collective" as const,
    formula: "multi-agent = population + shared environment + coordination graph + protocol tasks" as const,
    cover: offDiagonalCollectiveCover,
    material,
    population,
    ...(input.sharedEnvironment === undefined ? {} : { sharedEnvironment: input.sharedEnvironment }),
    coordinationGraph,
    cohomology,
    coordinationCost,
    coordinationFree,
    protocols,
    obstacles,
    theoryOfMind: Object.freeze({
      depth,
      bounded: depth > 0 && depth <= 4,
      evidence: theoryOfMindEvidence,
    }),
    dynamicPopulation: input.dynamicPopulation ?? false,
    evidence: freezeArray([
      `population:${population.length}`,
      `coordination-edges:${coordinationGraph.length}`,
      `coordination-cost:${coordinationCost}`,
      `coordination-free:${coordinationFree}`,
      `protocols:${protocols.length}`,
      `obstacles:${obstacles.length}`,
      `tom-depth:${depth}`,
      `dynamic:${input.dynamicPopulation ?? false}`,
    ]),
  });
}

export function characterWorkPractice(input: {
  readonly roleStates: readonly CharacterRoleState[];
  readonly acts: readonly CharacterWorkAct[];
  readonly casting: readonly CharacterCasting[];
}): CharacterWorkPractice {
  const roleStates = freezeArray(input.roleStates);
  const acts = freezeArray(input.acts);
  const casting = freezeArray(input.casting);
  const actNodes = acts.length === 0 ? Object.freeze(["work:empty"]) : acts.map((act) => act.id);
  const edges = chainEdges(actNodes);
  const distributedOrder = cohomologyOfEdgeGraph(actNodes, edges);
  const settlementGrades = uniqueSorted(acts.map((act) => act.settlement)) as readonly CharacterWorkKind[];
  const realizationTypes = uniqueSorted(acts.map((act) => act.realization)) as readonly CharacterWorkRealization[];
  const visibilityStates = uniqueSorted(acts.map((act) => act.visibility)) as readonly CharacterWorkVisibility[];
  const acceptedAuthority = acts.length > 0
    && acts.every((act) => act.dispatch !== "push" || act.authorityAccepted)
    && casting.every((decision) => decision.legitimate);
  const roleFibered = roleStates.length > 0
    && acts.length > 0
    && acts.every((act) => act.role === undefined || roleStates.some((state) => state.agent === act.actor && state.role === act.role));
  return Object.freeze({
    kind: "metroplat.agent.character.work-practice" as const,
    formula: "work-practice = role/intention substrate + enriched work-acts + casting + authority acceptance" as const,
    roleStates,
    acts,
    casting,
    settlementGrades,
    realizationTypes,
    visibilityStates,
    acceptedAuthority,
    roleFibered,
    distributedOrder,
    evidence: freezeArray([
      `role-states:${roleStates.length}`,
      `work-acts:${acts.length}`,
      `casting:${casting.length}`,
      `settlement-grades:${settlementGrades.length}`,
      `realization-types:${realizationTypes.length}`,
      `visibility-states:${visibilityStates.length}`,
      `accepted-authority:${acceptedAuthority}`,
      `role-fibered:${roleFibered}`,
      `h1:${distributedOrder.firstCohomology.rank.members.length}`,
    ]),
  });
}

function learningStage(
  id: CharacterLearningStage["id"],
  label: string,
  count: number,
  evidence: readonly string[],
): CharacterLearningStage {
  return Object.freeze({
    kind: "metroplat.agent.character.learning-stage" as const,
    id,
    label,
    count,
    evidence: freezeArray(evidence),
  });
}

export function characterLearningLoop(input: {
  readonly chronicles: readonly AgentChronicle[];
  readonly memories: readonly CharacterMemoryRecord[];
  readonly skills: readonly CharacterSkill[];
  readonly hooks: readonly CharacterHook[];
  readonly governance?: readonly CharacterGovernanceRecord[];
}): CharacterLearningLoop {
  const actions = input.chronicles.flatMap((chronicle) => chronicle.actions);
  const observations = actions.filter((action) => action.act === "observe").length;
  const plans = actions.filter((action) => action.act === "plan").length;
  const reflections = actions.filter((action) => action.act === "reflect").length;
  const proceduralMemories = input.memories.filter((memory) => memory.class === "procedural");
  const processHooks = input.hooks.filter((hook) => hook.purpose === "automation" || hook.purpose === "audit" || hook.purpose === "memory");
  const evaluations = (input.governance ?? []).filter((record) => record.aspect === "evaluation").length;
  const stages = freezeArray([
    learningStage("observe", "capture environmental observations", observations, actions.filter((action) => action.act === "observe").flatMap((action) => action.evidence === undefined ? [] : [action.evidence])),
    learningStage("plan", "choose or revise goal-directed work", plans, actions.filter((action) => action.act === "plan").flatMap((action) => action.evidence === undefined ? [] : [action.evidence])),
    learningStage("evaluate", "check outcomes with a critic, benchmark, test, or governance record", evaluations, (input.governance ?? []).filter((record) => record.aspect === "evaluation").flatMap((record) => record.evidence)),
    learningStage("reflect", "turn evaluator feedback into corrective language", reflections, actions.filter((action) => action.act === "reflect").flatMap((action) => action.evidence === undefined ? [] : [action.evidence])),
    learningStage("procedural-memory", "settle reusable procedure memory", proceduralMemories.length, proceduralMemories.flatMap((memory) => memory.evidence)),
    learningStage("skill-retrieval", "surface relevant procedural skills for the current task", input.skills.length, input.skills.flatMap((skill) => skill.evidence)),
    learningStage("hook-feedback", "route session events into memory, audit, gate, or automation hooks", processHooks.length, processHooks.flatMap((hook) => hook.evidence)),
  ]);
  const missingStages = stages.filter((stage) => stage.count === 0).map((stage) => stage.id);
  const denominator = Math.max(input.skills.length, 1);
  const quiescence = Math.min(1, processHooks.length / denominator);
  const complete = missingStages.length === 0;
  return Object.freeze({
    kind: "metroplat.agent.character.learning-loop" as const,
    formula: "learning = observations + reflections -> procedural memory -> skill and hook surfaces" as const,
    observations,
    reflections,
    stages,
    missingStages: freezeArray(missingStages),
    proceduralMemories: freezeArray(proceduralMemories),
    skills: freezeArray(input.skills),
    hooks: freezeArray(input.hooks),
    quiescence,
    complete,
    evidence: freezeArray([
      `observations:${observations}`,
      `plans:${plans}`,
      `evaluations:${evaluations}`,
      `reflections:${reflections}`,
      `procedural-memories:${proceduralMemories.length}`,
      `skills:${input.skills.length}`,
      `hooks:${input.hooks.length}`,
      `quiescence:${quiescence}`,
    ]),
  });
}

function performedActKeys(chronicles: readonly AgentChronicle[]): readonly string[] {
  return uniqueSorted(chronicles.flatMap((chronicle) =>
    chronicle.actions.flatMap((action) => [
      action.act,
      ...(action.locusKey.trim().length === 0 ? [] : [action.locusKey]),
    ])));
}

function skillSupport(skill: CharacterSkill): readonly string[] {
  return skill.support ?? Object.freeze([skill.id]);
}

function characterSkillMastery(skill: CharacterSkill, discipline: CharacterDiscipline): CharacterSkillMastery {
  const support = skillSupport(skill);
  const missingSupport = support.filter((key) => !discipline.behavior.includes(key));
  const admitted = support.length > 0 && missingSupport.length === 0;
  const material = admitted && skill.evidence.length > 0 && discipline.evidence.length > 0;
  return Object.freeze({
    kind: "metroplat.agent.character.skill-mastery" as const,
    skill: skill.id,
    discipline: discipline.id,
    admitted,
    material,
    mastered: admitted && material,
    missingSupport: freezeArray(missingSupport),
    evidence: freezeArray([
      `skill:${skill.id}`,
      `discipline:${discipline.id}`,
      `support:${support.length}`,
      `missing-support:${missingSupport.length}`,
    ]),
  });
}

export function characterRepertoire(input: {
  readonly chronicles: readonly AgentChronicle[];
  readonly skills: readonly CharacterSkill[];
  readonly disciplines: readonly CharacterDiscipline[];
}): CharacterRepertoire {
  const acted = new Set(performedActKeys(input.chronicles));
  const practicedDisciplines = input.disciplines.filter((discipline) =>
    discipline.behavior.some((key) => acted.has(key)));
  const masteries = input.skills.flatMap((skill) =>
    input.disciplines.map((discipline) => characterSkillMastery(skill, discipline)));
  const masteredSkillIds = new Set(masteries.filter((mastery) => mastery.mastered).map((mastery) => mastery.skill));
  const masteredSkills = input.skills.filter((skill) => masteredSkillIds.has(skill.id));
  const totalSkills = input.skills.length;
  const quiescence = totalSkills === 0 ? 0 : masteredSkills.length / totalSkills;
  return Object.freeze({
    kind: "metroplat.agent.character.repertoire" as const,
    practicedDisciplines: freezeArray(practicedDisciplines),
    masteries: freezeArray(masteries),
    masteredSkills: freezeArray(masteredSkills),
    totalSkills,
    quiescence,
    evidence: freezeArray([
      `practiced-disciplines:${practicedDisciplines.length}`,
      `masteries:${masteries.length}`,
      `mastered-skills:${masteredSkills.length}`,
      `total-skills:${totalSkills}`,
      `quiescence:${quiescence}`,
    ]),
  });
}

function governanceFromInput(input: CharacterProfileInput, identity: CharacterIdentity): readonly CharacterGovernanceRecord[] {
  const generated: CharacterGovernanceRecord[] = [
    characterGovernanceRecord({
      aspect: "identity",
      source: "identity",
      evidence: identity.evidence ?? [`identity:${identity.id}`],
    }),
  ];
  if (identity.voice !== undefined) {
    generated.push(characterGovernanceRecord({ aspect: "voice", source: "identity.voice", evidence: [`voice:${identity.voice}`] }));
  }
  if (identity.autonomy !== undefined) {
    generated.push(characterGovernanceRecord({ aspect: "autonomy", source: "identity.autonomy", evidence: [`autonomy:${identity.autonomy}`] }));
  }
  if ((input.memories ?? []).length > 0) {
    generated.push(characterGovernanceRecord({ aspect: "memory", source: "memories", evidence: [`memories:${input.memories?.length ?? 0}`] }));
  }
  if ((input.tools ?? []).length > 0) {
    generated.push(characterGovernanceRecord({ aspect: "tools", source: "tools", evidence: [`tools:${input.tools?.length ?? 0}`] }));
  }
  if ((input.skills ?? []).length > 0) {
    generated.push(characterGovernanceRecord({ aspect: "skills", source: "skills", evidence: [`skills:${input.skills?.length ?? 0}`] }));
  }
  if ((input.hooks ?? []).length > 0) {
    generated.push(characterGovernanceRecord({ aspect: "hooks", source: "hooks", evidence: [`hooks:${input.hooks?.length ?? 0}`] }));
  }
  if (input.soul !== undefined) {
    generated.push(characterGovernanceRecord({ aspect: "soul", source: "soul", evidence: input.soul.evidence }));
    generated.push(characterGovernanceRecord({ aspect: "behavior", source: "soul", evidence: input.soul.evidence }));
    generated.push(characterGovernanceRecord({ aspect: "safety", source: "soul", evidence: input.soul.mustNot }));
  }
  if (input.heartbeat !== undefined) {
    generated.push(characterGovernanceRecord({ aspect: "heartbeat", source: "heartbeat", evidence: input.heartbeat.evidence }));
  }
  return Object.freeze([...generated, ...(input.governance ?? [])]);
}

export function agentFloor(input: {
  readonly chronicles: readonly AgentChronicle[];
  readonly memories: readonly CharacterMemoryRecord[];
  readonly skills: readonly CharacterSkill[];
  readonly tools: readonly CharacterTool[];
  readonly governance: readonly CharacterGovernanceRecord[];
}): AgentFloor {
  const acts = input.chronicles.flatMap((chronicle) => chronicle.actions.map((action) => action.act));
  const environmentalAction = input.tools.length > 0 || acts.some((act) => act === "act" || act === "tool" || act === "delegate" || act === "proponent");
  const goalDirectedPlanning = input.skills.length > 0 || acts.some((act) => act === "plan" || act === "reflect");
  const persistentState = input.memories.length > 0 || input.governance.some((record) => record.aspect === "memory");
  const missing = uniqueSorted([
    ...(environmentalAction ? [] : ["environmental-action"]),
    ...(goalDirectedPlanning ? [] : ["goal-directed-planning"]),
    ...(persistentState ? [] : ["persistent-state"]),
  ]);
  return Object.freeze({
    kind: "metroplat.agent.floor" as const,
    formula: "agent = inhabited runtime ecology over recorded perceive-plan-act loop + persistent computable state + coordination graph" as const,
    environmentalAction,
    goalDirectedPlanning,
    persistentState,
    agentic: missing.length === 0,
    missing,
    evidence: freezeArray([
      `chronicles:${input.chronicles.length}`,
      `tools:${input.tools.length}`,
      `skills:${input.skills.length}`,
      `memories:${input.memories.length}`,
    ]),
  });
}

export function characterNucleus(input: {
  readonly id: string;
  readonly actor: AgentDesign;
  readonly soul?: CharacterSoul;
  readonly governance: readonly CharacterGovernanceRecord[];
}): CharacterNucleus {
  const constraints = uniqueSorted([
    ...(input.soul?.values ?? []),
    ...(input.soul?.must ?? []),
    ...input.governance.filter((record) => record.aspect === "behavior").flatMap((record) => record.evidence),
  ]);
  const permittedActs = new Set<AgentAct>(["observe", "plan", "act", "speak", "tool", "remember", "reflect", "delegate", "proponent", "daimon"]);
  const fixedEntries = input.actor.entries.filter((item) => item.acts.every((act) => permittedActs.has(act)));
  const outOfCharacter = input.actor.entries.filter((item) => item.acts.some((act) => act === "forget" || act === "opponent"));
  return Object.freeze({
    kind: "metroplat.agent.character.nucleus" as const,
    formula: "character = dispositional nucleus chi + fixed behavioral space + faculty interiority + inhabited work trace" as const,
    chi: `chi:${input.id}`,
    behavioralSpace: agentDesign(fixedEntries),
    fixedLoci: freezeArray(fixedEntries.map((item) => item.locusKey)),
    outOfCharacterLoci: freezeArray(outOfCharacter.map((item) => item.locusKey)),
    coherent: constraints.length > 0 && outOfCharacter.length === 0,
    evidence: freezeArray([
      `constraints:${constraints.length}`,
      `fixed-loci:${fixedEntries.length}`,
      `out-of-character:${outOfCharacter.length}`,
    ]),
  });
}

function characterMask(axis: CharacterMask["axis"], label: string, actor: AgentDesign, evidence: readonly string[] = []): CharacterMask {
  const address = addressFor(axis, label);
  return Object.freeze({
    kind: "metroplat.agent.character.mask" as const,
    axis,
    label,
    address,
    design: maskAgentDesign(actor, address),
    evidence: freezeArray(evidence),
  });
}

function actorTransport(
  protocol: CharacterActorTransport["protocol"],
  id: string,
  evidence: readonly string[],
  url?: string,
): CharacterActorTransport {
  return Object.freeze({
    kind: "metroplat.agent.character.actor-transport" as const,
    protocol,
    id,
    ...(url === undefined ? {} : { url }),
    evidence: freezeArray(evidence),
  });
}

export function characterPersona(input: {
  readonly character: string;
  readonly actor: AgentDesign;
  readonly situation: string;
  readonly memories: readonly CharacterMemoryRecord[];
  readonly role?: string;
  readonly audience?: string;
  readonly axis?: CharacterMask["axis"];
  readonly partnerModel?: AgentCollective["theoryOfMind"];
}): CharacterPersona {
  const axis = input.axis ?? (input.role === undefined ? "audience" : "role");
  const label = input.role ?? input.audience ?? input.situation;
  const mask = characterMask(axis, label, input.actor, [`situation:${input.situation}`]);
  const shown = new Set(mask.design.entries.map((item) => item.locusKey.replace(`${mask.address.join(".")}.`, "")));
  const shadow = agentDesign(input.actor.entries.filter((item) => !shown.has(item.locusKey)));
  const total = mask.design.entries.length + shadow.entries.length;
  const activeMemory = freezeArray(input.memories.filter((item) => item.class === "working" || item.scope === "session"));
  const partnerModel = input.partnerModel ?? Object.freeze({
    depth: 0,
    bounded: false,
    evidence: Object.freeze([]),
  });
  return Object.freeze({
    kind: "metroplat.agent.character.persona" as const,
    formula: "persona = situated role/intention mask(character, audience, context, partner-model, work-state)" as const,
    character: input.character,
    situation: input.situation,
    ...(input.role === undefined ? {} : { role: input.role }),
    ...(input.audience === undefined ? {} : { audience: input.audience }),
    context: Object.freeze({
      situation: input.situation,
      ...(input.role === undefined ? {} : { role: input.role }),
      ...(input.audience === undefined ? {} : { audience: input.audience }),
      memory: freezeArray(activeMemory.map((memory) => memory.id)),
    }),
    mask,
    shadow,
    roleDistance: total === 0 ? 0 : shadow.entries.length / total,
    activeMemory,
    partnerModel,
    evidence: freezeArray([
      `mask:${axis}:${label}`,
      `active-memory:${activeMemory.length}`,
      `partner-model-depth:${partnerModel.depth}`,
    ]),
  });
}

export function characterActor(input: {
  readonly id: string;
  readonly baseUrl?: string;
  readonly identity: CharacterIdentity;
  readonly skills: readonly CharacterSkill[];
  readonly masks: readonly CharacterMask[];
  readonly did?: string;
  readonly webAuthnCredentials?: readonly string[];
  readonly verifiableCredentialSubjects?: readonly string[];
}): CharacterActor {
  const base = trimmedBase(input.baseUrl ?? "https://example.invalid");
  const username = slugPart(input.id);
  const id = `${base}/agents/${encodeURIComponent(username)}`;
  const skills = uniqueSorted([
    ...input.skills.map((skill) => skill.id),
    ...input.masks.map((mask) => `mask:${mask.axis}:${mask.label}`),
  ]).map((skill) => Object.freeze({ id: slugPart(skill), name: skill }));
  const agentCard = Object.freeze({
    protocolVersion: "1.0.0" as const,
    url: `${id}/.well-known/agent-card.json`,
    name: input.identity.displayName,
    description: input.identity.role ?? "character agent",
    skills: freezeArray(skills),
  });
  const a2a = Object.freeze({
    taskStates: Object.freeze(["working", "completed", "failed", "canceled", "rejected", "input_required", "auth_required"] as const),
    bindings: Object.freeze(["json-rpc/http", "grpc", "rest/json"] as const),
    artifacts: Object.freeze(["text", "file", "data"] as const),
    security: Object.freeze(["api-key", "basic", "bearer", "oauth2", "oidc", "mtls", "signed-agent-card"] as const),
  });
  const transports = freezeArray([
    actorTransport("agent-card", agentCard.url, ["actor:agent-card"], agentCard.url),
    actorTransport("a2a-task", `${id}/tasks`, ["actor:a2a-task"], `${id}/tasks`),
    ...(input.did === undefined ? [] : [actorTransport("did", input.did, ["actor:did"])]),
    ...((input.webAuthnCredentials ?? []).map((credential) => actorTransport("webauthn", credential, ["actor:webauthn"]))),
    ...((input.verifiableCredentialSubjects ?? []).map((subject) => actorTransport("verifiable-credential", subject, ["actor:verifiable-credential"]))),
  ]);
  return Object.freeze({
    kind: "metroplat.agent.character.actor" as const,
    formula: "actor = fiber-restricted public identity + membrane-bounded affordance projection(character, recorded-session)" as const,
    id,
    preferredUsername: username,
    agentCard,
    a2a,
    identityFacets: Object.freeze({
      ...(input.did === undefined ? {} : { did: input.did }),
      webAuthnCredentials: freezeArray(input.webAuthnCredentials ?? []),
      verifiableCredentialSubjects: freezeArray(input.verifiableCredentialSubjects ?? []),
    }),
    transports,
    evidence: freezeArray([
      `actor:${id}`,
      `skills:${skills.length}`,
      `masks:${input.masks.length}`,
      `transports:${transports.length}`,
    ]),
  });
}

function maskLocalEntry(mask: CharacterMask, item: AgentDesignEntry): AgentDesignEntry {
  const prefix = mask.address.join(".");
  const locusKey = item.locusKey.slice(prefix.length).replace(/^\./u, "");
  return entry(locusKey, item.acts, item.evidence);
}

export function characterMaskIdentity(masks: readonly CharacterMask[]): CharacterMaskIdentity {
  const seen = new Map<string, string>();
  const entries: AgentDesignEntry[] = [];
  const drift: string[] = [];
  for (const mask of masks) {
    for (const item of mask.design.entries) {
      const local = maskLocalEntry(mask, item);
      const key = local.locusKey;
      const value = local.acts.join(",");
      const prior = seen.get(key);
      if (prior !== undefined && prior !== value) drift.push(key);
      seen.set(key, value);
      entries.push(local);
    }
  }
  const driftLoci = uniqueSorted(drift);
  const cohomology = cohomologyOfEdgeGraph(
    driftLoci.length === 0 ? ["identity:glued"] : driftLoci,
    driftLoci.map((locus) => [locus, locus] as const),
  );
  const vanishing = cohomology.firstCohomology.vanishing.kind === "predication.cohomology.rankVanishing:witness";
  return Object.freeze({
    kind: "metroplat.agent.character.mask-identity" as const,
    glued: agentDesign(entries),
    coherent: driftLoci.length === 0 && vanishing,
    drift: driftLoci.length,
    driftLoci,
    cohomology,
    evidence: freezeArray([
      `masks:${masks.length}`,
      `glued-loci:${entries.length}`,
      `drift:${driftLoci.length}`,
      `h1:${cohomology.firstCohomology.rank.members.length}`,
      `vanishing:${vanishing}`,
    ]),
  });
}

export function sessionCharacter(input: {
  readonly id: string;
  readonly chronicles: readonly AgentChronicle[];
  readonly memories: readonly CharacterMemoryRecord[];
  readonly role?: string;
  readonly audience?: string;
  readonly partnerModel?: AgentCollective["theoryOfMind"];
}): SessionCharacter {
  const actor = agentDesignFromChronicles(input.chronicles);
  const session = input.chronicles.at(-1)?.session ?? "session";
  const masks = freezeArray([
    characterMask("harness", session, actor, [`session:${session}`]),
    characterMask("lane", input.role ?? "default-lane", actor, [`role:${input.role ?? "default-lane"}`]),
    characterMask("audience", input.audience ?? "default-audience", actor, [`audience:${input.audience ?? "default-audience"}`]),
  ]);
  const maskIdentity = characterMaskIdentity(masks);
  return Object.freeze({
    kind: "metroplat.agent.session-character" as const,
    session,
    events: input.chronicles.reduce((count, chronicle) => count + chronicle.actions.length, 0),
    actor,
    masks,
    performedSelf: Object.freeze({
      performed: input.chronicles.length > 0,
      plays: input.chronicles.length,
      design: actor,
    }),
    identity: Object.freeze({
      coherent: maskIdentity.coherent,
      drift: maskIdentity.drift,
      driftLoci: maskIdentity.driftLoci,
    }),
    baseline: characterPersona({
      character: input.id,
      actor,
      situation: "baseline",
      memories: input.memories,
      role: "baseline",
      ...(input.partnerModel === undefined ? {} : { partnerModel: input.partnerModel }),
    }),
    situation: characterPersona({
      character: input.id,
      actor,
      situation: session,
      memories: input.memories,
      ...(input.role === undefined ? {} : { role: input.role }),
      ...(input.audience === undefined ? {} : { audience: input.audience }),
      ...(input.partnerModel === undefined ? {} : { partnerModel: input.partnerModel }),
    }),
    evidence: freezeArray([
      `session:${session}`,
      `chronicles:${input.chronicles.length}`,
      `events:${input.chronicles.reduce((count, chronicle) => count + chronicle.actions.length, 0)}`,
    ]),
  });
}

export function characterReadiness(input: {
  readonly governance: readonly CharacterGovernanceRecord[];
  readonly memories: readonly CharacterMemoryRecord[];
  readonly agent: AgentFloor;
  readonly character: CharacterNucleus;
}): CharacterReadiness {
  const presentAspects = uniqueSorted(input.governance.map((record) => record.aspect)) as readonly GovernanceAspect[];
  const memoryClasses = uniqueSorted(input.memories.map((record) => record.class)) as readonly MemoryClass[];
  const missingAspects = REQUIRED_ASPECTS.filter((aspect) => !presentAspects.includes(aspect));
  const missingMemoryClasses = REQUIRED_MEMORY_CLASSES.filter((memoryClass) => !memoryClasses.includes(memoryClass));
  const debts = uniqueSorted([
    ...missingAspects.map((aspect) => `missing-governance:${aspect}`),
    ...missingMemoryClasses.map((memoryClass) => `missing-memory:${memoryClass}`),
    ...input.agent.missing.map((missing) => `missing-agent-floor:${missing}`),
    ...(input.character.coherent ? [] : ["character-nucleus:not-coherent"]),
  ]);
  return Object.freeze({
    kind: "metroplat.agent.character.readiness" as const,
    derived: debts.length === 0,
    presentAspects,
    missingAspects: freezeArray(missingAspects),
    memoryClasses,
    missingMemoryClasses: freezeArray(missingMemoryClasses),
    debts,
    evidence: freezeArray([
      `present-aspects:${presentAspects.length}`,
      `memory-classes:${memoryClasses.length}`,
      `debts:${debts.length}`,
      "membership:derived-not-declared",
    ]),
  });
}

export interface CharacterResearchCoverageInput {
  readonly agent: AgentFloor;
  readonly actor: CharacterActor;
  readonly character: CharacterNucleus;
  readonly session: SessionCharacter;
  readonly chronicles: readonly AgentChronicle[];
  readonly memories: readonly CharacterMemoryRecord[];
  readonly governance: readonly CharacterGovernanceRecord[];
  readonly skills: readonly CharacterSkill[];
  readonly disciplines: readonly CharacterDiscipline[];
  readonly tools: readonly CharacterTool[];
  readonly hooks: readonly CharacterHook[];
  readonly instructionSurfaces: readonly CharacterInstructionSurface[];
  readonly projections: readonly CharacterProjection[];
  readonly interiority: CharacterInteriority;
  readonly run: CharacterInhabitedRun;
  readonly work: CharacterWorkPractice;
  readonly collective: AgentCollective;
  readonly learning: CharacterLearningLoop;
  readonly repertoire: CharacterRepertoire;
  readonly maskIdentity: CharacterMaskIdentity;
  readonly soul?: CharacterSoul;
  readonly heartbeat?: CharacterHeartbeat;
  readonly readiness: CharacterReadiness;
}

function hasIdentityFacet(actor: CharacterActor): boolean {
  return actor.identityFacets.did !== undefined
    || actor.identityFacets.webAuthnCredentials.length > 0
    || actor.identityFacets.verifiableCredentialSubjects.length > 0;
}

function hasRequiredMemoryClasses(memories: readonly CharacterMemoryRecord[]): boolean {
  const classes = new Set(memories.map((memory) => memory.class));
  return REQUIRED_MEMORY_CLASSES.every((memoryClass) => classes.has(memoryClass));
}

function hasValidChronicles(chronicles: readonly AgentChronicle[]): boolean {
  return chronicles.length > 0
    && chronicles.every((chronicle) =>
      chronicle.actions.length > 0
      && chronicle.actions.every((action) => action.evidence !== undefined && action.evidence.trim().length > 0));
}

function hasDisciplineSurface(disciplines: readonly CharacterDiscipline[]): boolean {
  return disciplines.length > 0
    && disciplines.every((discipline) => discipline.behavior.length > 0 && discipline.evidence.length > 0);
}

function hasInstructionSurface(
  surfaces: readonly CharacterInstructionSurface[],
  convention: CharacterInstructionSurface["convention"],
  authority?: CharacterInstructionSurface["authority"],
): boolean {
  return surfaces.some((surface) =>
    surface.convention === convention && (authority === undefined || surface.authority === authority));
}

function hasInstructionScopeSeparation(surfaces: readonly CharacterInstructionSurface[]): boolean {
  return hasInstructionSurface(surfaces, "AGENTS.md", "authoritative")
    && hasInstructionSurface(surfaces, "SOUL.md", "authoritative")
    && hasInstructionSurface(surfaces, "CLAUDE.md", "derived")
    && hasInstructionSurface(surfaces, ".mcp.json", "derived")
    && (hasInstructionSurface(surfaces, "character-record", "authoritative")
      || hasInstructionSurface(surfaces, "character-resource-file", "authoritative"));
}

function hasHostProjection(projections: readonly CharacterProjection[]): boolean {
  return projections.some((projection) =>
    projection.target === "claude-code"
    && projection.derived
    && !projection.authoritative
    && projection.artifacts.includes("CLAUDE.md")
    && projection.artifacts.includes(".mcp.json"));
}

function coversRequirement(id: string, input: CharacterResearchCoverageInput): boolean {
  switch (id) {
    case "agent.environmental-action":
      return input.agent.environmentalAction;
    case "agent.goal-directed-planning":
      return input.agent.goalDirectedPlanning;
    case "agent.persistent-state":
      return input.agent.persistentState;
    case "agent.perceive-act-loop":
      return input.chronicles.some((chronicle) => chronicle.actions.some((action) => action.act === "observe"))
        && input.chronicles.some((chronicle) => chronicle.actions.some((action) => action.act === "plan"))
        && input.chronicles.some((chronicle) => chronicle.actions.some((action) => action.act === "act" || action.act === "tool" || action.act === "delegate"));
    case "agent.computable-duties":
      return input.tools.length > 0 && input.skills.length > 0;
    case "agent.harness-portability":
      return input.skills.length > 0
        && input.hooks.length > 0
        && input.tools.length > 0
        && input.tools.some((tool) => tool.boundary !== "host");
    case "agent.recorded-work":
      return hasValidChronicles(input.chronicles) && input.tools.length > 0;
    case "agent.multi-agent-system":
      return input.collective.population.length >= 2
        && input.collective.sharedEnvironment !== undefined
        && input.collective.sharedEnvironment.length > 0
        && input.collective.coordinationGraph.length > 0;
    case "agent.population":
      return input.collective.population.length >= 2
        && input.collective.population.every((member) =>
          member.id.length > 0
          && member.capabilities.length > 0
          && member.evidence.length > 0
          && member.role !== undefined
          && member.type !== undefined);
    case "agent.coordination-graph":
      return input.collective.cohomology.kind === "predication.cohomology"
        && input.collective.coordinationGraph.length > 0
        && input.collective.protocols.length > 0
        && input.collective.protocols.some((protocol) => protocol.toLowerCase().includes("a2a"));
    case "agent.coordination-obstruction":
      return input.collective.cover.scale === "off-diagonal-collective"
        && input.collective.material.cover?.scale === "off-diagonal-collective"
        && Number.isInteger(input.collective.coordinationCost)
        && input.collective.coordinationCost >= 0
        && input.collective.obstacles.length >= 5;
    case "agent.theory-of-mind":
      return input.collective.theoryOfMind.bounded
        && input.collective.theoryOfMind.evidence.length > 0;
    case "agent.runtime-ecology":
      return input.run.facultyTrace.length >= 6
        && input.run.facultyTrace.some((trace) => trace.faculty === "communicating")
        && input.run.facultyTrace.some((trace) => trace.faculty === "knowing")
        && input.run.facultyTrace.some((trace) => trace.faculty === "computing")
        && input.run.facultyTrace.every((trace) => trace.facts.length > 0 && trace.evidence.length > 0);
    case "agent.perception-action-frontier":
      return input.run.perceptions.length > 0
        && input.run.actions.length > 0
        && input.run.perceptionActionOpen
        && input.run.perceptions.every((event) => event.direction === "perception")
        && input.run.actions.every((event) => event.direction === "action");
    case "agent.goal-standing":
      return input.run.goals.length > 0
        && input.run.goals.every((goal) => goal.evidence.length > 0)
        && input.run.goals.some((goal) => goal.standing === "unknown" || goal.standing === "denied");
    case "agent.distributed-time":
      return input.run.distributedOrder.kind === "predication.cohomology"
        && input.work.distributedOrder.kind === "predication.cohomology"
        && input.run.membrane.events.length >= 2;
    case "actor.public-transport":
      return input.actor.id.length > 0 && input.actor.transports.length > 0;
    case "actor.recorded-session":
      return input.session.events > 0 && input.session.performedSelf.performed;
    case "actor.agent-card":
      return input.actor.agentCard.url.length > 0 && input.actor.agentCard.skills.length > 0;
    case "actor.identity-facets":
      return hasIdentityFacet(input.actor);
    case "actor.identity-coherence":
      return input.actor.identityFacets.did !== undefined
        && input.actor.identityFacets.webAuthnCredentials.length > 0
        && input.actor.identityFacets.verifiableCredentialSubjects.length > 0
        && input.actor.transports.some((transport) => transport.protocol === "did")
        && input.actor.transports.some((transport) => transport.protocol === "webauthn")
        && input.actor.transports.some((transport) => transport.protocol === "verifiable-credential");
    case "actor.affordance-projection":
      return input.actor.agentCard.skills.length > 0
        && input.skills.length > 0
        && input.actor.transports.some((transport) => transport.protocol === "agent-card");
    case "actor.transport-set":
      return input.actor.transports.length >= 2
        && input.actor.transports.some((transport) => transport.protocol === "agent-card")
        && input.actor.transports.some((transport) => transport.protocol === "a2a-task");
    case "actor.fiber-restricted-projection":
      return input.interiority.fiberRestricted
        && input.interiority.material.section === `actor-fiber:${input.session.situation.character}`;
    case "actor.a2a-task-surface":
      return input.actor.transports.some((transport) => transport.protocol === "a2a-task")
        && input.actor.a2a.taskStates.includes("working")
        && input.actor.a2a.taskStates.includes("completed")
        && input.actor.a2a.taskStates.includes("input_required")
        && input.actor.a2a.bindings.length === 3
        && input.actor.a2a.artifacts.includes("data")
        && input.actor.a2a.security.includes("signed-agent-card");
    case "actor.communication-membrane":
      return input.run.membrane.participants.includes(input.session.situation.character)
        && input.run.membrane.events.length > 0
        && input.run.membrane.events.length === input.run.perceptions.length + input.run.actions.length
        && input.run.perceptions.every((event) => event.charge !== "contested");
    case "actor.casting-legitimacy":
      return input.work.casting.length > 0
        && input.work.casting.some((decision) => decision.accepted.includes(input.session.situation.character) && decision.legitimate)
        && input.work.casting.every((decision) => decision.evidence.length > 0);
    case "persona.situated-mask":
      return input.session.situation.mask.design.entries.length > 0
        && input.session.situation.mask.label.length > 0
        && !sameDesign(input.session.situation.mask.design, input.session.actor);
    case "persona.shadow-role-distance":
      return Number.isFinite(input.session.situation.roleDistance)
        && input.session.situation.roleDistance >= 0
        && input.session.situation.roleDistance <= 1
        && input.session.situation.shadow.kind === "metroplat.agent.design";
    case "persona.active-memory":
      return input.session.situation.activeMemory.length > 0;
    case "persona.context-separation":
      return input.session.situation.context.situation === input.session.situation.situation
        && input.session.situation.context.memory.length === input.session.situation.activeMemory.length
        && input.session.situation.context.memory.length > 0;
    case "persona.performativity":
      return input.session.performedSelf.performed
        && input.session.performedSelf.plays > 0
        && input.session.performedSelf.design.entries.length > 0
        && input.session.situation.activeMemory.length > 0
        && input.session.situation.context.memory.length === input.session.situation.activeMemory.length;
    case "persona.partner-modeling":
      return input.session.situation.partnerModel.bounded
        && input.session.situation.partnerModel.depth === input.collective.theoryOfMind.depth
        && input.session.situation.partnerModel.evidence.length > 0;
    case "persona.role-state":
      return input.work.roleStates.some((state) =>
        state.agent === input.session.situation.character
        && state.role === input.session.situation.context.role
        && (state.standing === "enacted" || state.standing === "embraced" || state.standing === "distanced"));
    case "persona.intention-state":
      return input.work.acts.some((act) =>
        act.actor === input.session.situation.character
        && act.intention.beliefs.length > 0
        && act.intention.desires.length > 0
        && act.intention.intentions.length > 0
        && act.intention.partialPlans.length > 0);
    case "character.fixed-behavioral-space":
      return input.character.fixedLoci.length > 0 && input.character.behavioralSpace.entries.length > 0;
    case "character.performed-self":
      return input.session.performedSelf.performed && input.session.performedSelf.plays > 0;
    case "character.identity-coherence":
      return input.session.identity.coherent
        && input.maskIdentity.coherent
        && input.maskIdentity.cohomology.firstCohomology.vanishing.kind === "predication.cohomology.rankVanishing:witness";
    case "character.memory-classes":
      return hasRequiredMemoryClasses(input.memories);
    case "character.governed-memory":
      return hasRequiredMemoryClasses(input.memories)
        && input.governance.some((record) => record.aspect === "memory")
        && input.governance.some((record) => record.aspect === "audit");
    case "character.governance-aspects":
      return input.readiness.missingAspects.length === 0;
    case "character.derived-membership":
      return input.readiness.derived && input.readiness.evidence.includes("membership:derived-not-declared");
    case "character.authoritative-record":
      return hasInstructionSurface(input.instructionSurfaces, "character-record", "authoritative")
        || hasInstructionSurface(input.instructionSurfaces, "character-resource-file", "authoritative");
    case "character.project-instructions":
      return input.instructionSurfaces.some((surface) =>
        surface.convention === "AGENTS.md"
        && surface.scope === "project"
        && surface.target === "project"
        && surface.authority === "authoritative");
    case "character.identity-instructions":
      return input.instructionSurfaces.some((surface) =>
        surface.convention === "SOUL.md"
        && surface.scope === "identity"
        && surface.target === "agent"
        && surface.authority === "authoritative");
    case "character.instruction-scope-separation":
      return hasInstructionScopeSeparation(input.instructionSurfaces);
    case "character.instruction-projections":
      return hasInstructionScopeSeparation(input.instructionSurfaces) && input.projections.some((projection) => projection.derived && !projection.authoritative);
    case "character.host-projection":
      return hasHostProjection(input.projections);
    case "character.memory-mirror":
      return input.memories.some((memory) => memory.path !== undefined && memory.mirrorPath !== undefined)
        && input.instructionSurfaces.some((surface) => surface.convention === "MEMORY.md" && surface.authority === "mirror");
    case "character.soul":
      return input.soul !== undefined
        && input.soul.values.length > 0
        && input.soul.must.length > 0
        && input.soul.mustNot.length > 0;
    case "character.heartbeat":
      return input.heartbeat !== undefined && input.heartbeat.checks.length > 0;
    case "character.hooks":
      return input.hooks.length > 0;
    case "character.skills":
      return input.skills.length > 0;
    case "character.disciplines":
      return hasDisciplineSurface(input.disciplines);
    case "character.skill-retrieval":
      return input.learning.stages.some((stage) => stage.id === "skill-retrieval" && stage.count > 0);
    case "character.quiescence":
      return Number.isFinite(input.repertoire.quiescence)
        && input.repertoire.quiescence > 0
        && input.repertoire.masteredSkills.length > 0;
    case "character.chronicle-validity":
      return hasValidChronicles(input.chronicles);
    case "character.behaviour-closure":
      return input.character.behavioralSpace.entries.length > 0
        && input.character.outOfCharacterLoci.length === 0
        && hasDisciplineSurface(input.disciplines)
        && input.repertoire.practicedDisciplines.length > 0
        && input.repertoire.masteries.some((mastery) => mastery.mastered);
    case "character.session-dramaturgy":
      return input.session.masks.length >= 3
        && input.session.events > 0
        && input.session.situation.context.situation === input.session.session
        && input.session.situation.activeMemory.length > 0
        && input.session.situation.mask.design.entries.length > 0;
    case "character.learning-loop":
      return input.learning.complete;
    case "character.evaluation-loop":
      return input.learning.stages.some((stage) => stage.id === "evaluate" && stage.count > 0);
    case "character.evaluation":
      return input.governance.some((record) => record.aspect === "evaluation");
    case "character.faculty-interiority":
      return input.interiority.sections.length >= 3
        && input.interiority.sections.every((section) =>
          section.cell.length > 0
          && section.fiber.length > 0
          && section.evidence.length > 0);
    case "character.faculty-cover-gluing":
      return input.interiority.sections.length > 0
        && input.interiority.cover.scale === "diagonal-agent"
        && input.interiority.material.cover?.scale === "diagonal-agent"
        && input.interiority.gluing.firstCohomology.vanishing.kind === "predication.cohomology.rankVanishing:witness";
    case "character.deterministic-interiority":
      return input.interiority.deterministicReplay && input.interiority.regard;
    case "character.runtime-faculty-trace":
      return input.run.facultyTrace.length >= 6
        && input.run.facultyTrace.every((trace) => trace.charge !== "contested" && trace.evidence.length > 0);
    case "character.inhabited-run":
      return input.run.kind === "metroplat.agent.character.inhabited-run"
        && input.run.stage === "governing"
        && input.run.goals.some((goal) => goal.satisfied)
        && input.run.membrane.participants.length > 0
        && input.run.distributedOrder.kind === "predication.cohomology";
    case "character.work-act-enrichment":
      return input.work.acts.length > 0
        && input.work.roleFibered
        && input.work.acts.every((act) =>
          act.substrate.length > 0
          && act.sourceState.length > 0
          && act.targetState.length > 0
          && act.instruments.length > 0
          && act.mediatingArtifacts.length > 0
          && act.evidence.length > 0)
        && input.work.settlementGrades.length > 0
        && input.work.realizationTypes.includes("ok")
        && input.work.visibilityStates.length > 0;
    case "character.dispatch-acceptance-zone":
      return input.work.acceptedAuthority
        && input.work.acts.some((act) => act.dispatch === "push" && act.authorityAccepted);
    default:
      return false;
  }
}

export function characterResearchIntegrityAudit(): CharacterResearchIntegrityAudit {
  const sourceIds = CHARACTER_RESEARCH_SOURCES.map((source) => source.id);
  const requirementIds = CHARACTER_RESEARCH_REQUIREMENTS.map((requirement) => requirement.id);
  const formulaConcepts = CHARACTER_CONCEPT_FORMULAS.map((formula) => formula.concept);
  const knownSources = new Set(sourceIds);
  const knownRequirements = new Set(requirementIds);
  const formulaSourceIds = uniqueSorted(CHARACTER_CONCEPT_FORMULAS.flatMap((formula) => formula.sourceIds));
  const formulaObligationIds = uniqueSorted(CHARACTER_CONCEPT_FORMULAS.flatMap((formula) => formula.obligationIds));
  const sourceObligationIds = uniqueSorted(CHARACTER_RESEARCH_SOURCES.flatMap((source) => source.obligations));
  const requirementSourceIds = uniqueSorted(CHARACTER_RESEARCH_REQUIREMENTS.flatMap((requirement) => requirement.sourceIds));
  const issues = {
    duplicateSourceIds: duplicateValues(sourceIds),
    duplicateRequirementIds: duplicateValues(requirementIds),
    duplicateFormulaConcepts: duplicateValues(formulaConcepts),
    missingFormulaConcepts: CHARACTER_CONCEPTS.filter((concept) => !formulaConcepts.includes(concept)),
    unknownFormulaSourceIds: formulaSourceIds.filter((id) => !knownSources.has(id)),
    unknownFormulaObligationIds: formulaObligationIds.filter((id) => !knownRequirements.has(id)),
    unknownRequirementSourceIds: requirementSourceIds.filter((id) => !knownSources.has(id)),
    unknownSourceObligationIds: sourceObligationIds.filter((id) => !knownRequirements.has(id)),
    unformulatedRequirementIds: requirementIds.filter((id) => !formulaObligationIds.includes(id)),
    unformulatedSourceIds: sourceIds.filter((id) => !formulaSourceIds.includes(id)),
  };
  const issueCount = Object.values(issues).reduce((count, values) => count + values.length, 0);
  return Object.freeze({
    kind: "metroplat.agent.character.research-integrity-audit" as const,
    complete: issueCount === 0,
    sourceIds: freezeArray(sourceIds),
    requirementIds: freezeArray(requirementIds),
    formulaConcepts: freezeArray(formulaConcepts),
    duplicateSourceIds: freezeArray(issues.duplicateSourceIds),
    duplicateRequirementIds: freezeArray(issues.duplicateRequirementIds),
    duplicateFormulaConcepts: freezeArray(issues.duplicateFormulaConcepts),
    missingFormulaConcepts: freezeArray(issues.missingFormulaConcepts),
    unknownFormulaSourceIds: freezeArray(issues.unknownFormulaSourceIds),
    unknownFormulaObligationIds: freezeArray(issues.unknownFormulaObligationIds),
    unknownRequirementSourceIds: freezeArray(issues.unknownRequirementSourceIds),
    unknownSourceObligationIds: freezeArray(issues.unknownSourceObligationIds),
    unformulatedRequirementIds: freezeArray(issues.unformulatedRequirementIds),
    unformulatedSourceIds: freezeArray(issues.unformulatedSourceIds),
    evidence: freezeArray([
      `sources:${sourceIds.length}`,
      `requirements:${requirementIds.length}`,
      `formulas:${formulaConcepts.length}`,
      `formula-source-ids:${formulaSourceIds.length}`,
      `formula-obligation-ids:${formulaObligationIds.length}`,
      `source-obligation-ids:${sourceObligationIds.length}`,
      `issues:${issueCount}`,
    ]),
  });
}

export function characterResearchCoverage(input: CharacterResearchCoverageInput): CharacterResearchCoverage {
  const integrity = characterResearchIntegrityAudit();
  const requirements = CHARACTER_RESEARCH_REQUIREMENTS.map((requirement) => Object.freeze({
    ...requirement,
    covered: coversRequirement(requirement.id, input),
  }));
  const covered = uniqueSorted(requirements.filter((requirement) => requirement.covered).map((requirement) => requirement.id));
  const missing = uniqueSorted(requirements.filter((requirement) => !requirement.covered).map((requirement) => requirement.id));
  return Object.freeze({
    kind: "metroplat.agent.character.research-coverage" as const,
    complete: missing.length === 0 && integrity.complete,
    formulas: CHARACTER_CONCEPT_FORMULAS,
    sources: CHARACTER_RESEARCH_SOURCES,
    requirements: freezeArray(requirements),
    integrity,
    covered,
    missing,
    evidence: freezeArray([
      `sources:${CHARACTER_RESEARCH_SOURCES.length}`,
      `formulas:${CHARACTER_CONCEPT_FORMULAS.length}`,
      `requirements:${CHARACTER_RESEARCH_REQUIREMENTS.length}`,
      `covered:${covered.length}`,
      `missing:${missing.length}`,
    ]),
  });
}

function normalizedSourcePath(path: string): string {
  return path.replace(/^\.?\//u, "").replace(/\/+$/u, "");
}

function sourceRepresentsPath(sourcePath: string, discoveredPath: string): boolean {
  const source = normalizedSourcePath(sourcePath);
  const discovered = normalizedSourcePath(discoveredPath);
  return discovered === source || discovered.startsWith(`${source}/`);
}

export function characterResearchSourceAudit(input: CharacterResearchSourceAuditInput): CharacterResearchSourceAudit {
  const sources = input.sources ?? CHARACTER_RESEARCH_SOURCES;
  const currentSources = sources.filter((source) => source.currentPath !== undefined);
  const historicalSources = sources.filter((source) => source.currentPath === undefined);
  const existing = new Set(input.existingPaths.map(normalizedSourcePath));
  const present = currentSources
    .filter((source) => existing.has(normalizedSourcePath(source.currentPath!)))
    .map((source) => source.id);
  const missingSources = currentSources
    .filter((source) => !existing.has(normalizedSourcePath(source.currentPath!)));
  const missing = missingSources.map((source) => source.id);
  const missingPaths = missingSources.map((source) => source.currentPath!);
  const historical = historicalSources.map((source) => source.id);
  const historicalPaths = historicalSources.map((source) => source.historicalPath);
  return Object.freeze({
    kind: "metroplat.agent.character.research-source-audit" as const,
    complete: missing.length === 0,
    checked: currentSources.length,
    present: freezeArray(present),
    missing: freezeArray(missing),
    missingPaths: freezeArray(missingPaths),
    historical: freezeArray(historical),
    historicalPaths: freezeArray(historicalPaths),
    evidence: freezeArray([
      `checked:${currentSources.length}`,
      `present:${present.length}`,
      `missing:${missing.length}`,
      `historical:${historical.length}`,
    ]),
  });
}

export function characterResearchInventoryAudit(input: CharacterResearchInventoryAuditInput): CharacterResearchInventoryAudit {
  const sources = input.sources ?? CHARACTER_RESEARCH_SOURCES;
  const ignored = new Set((input.ignoredPaths ?? []).map(normalizedSourcePath));
  const sourcePaths = sources.map((source) => source.currentPath ?? source.historicalPath);
  const declared = uniqueSorted(sourcePaths);
  const discovered = uniqueSorted(input.discoveredPaths.map(normalizedSourcePath));
  const represented = discovered.filter((path) =>
    ignored.has(path) || sourcePaths.some((sourcePath) => sourceRepresentsPath(sourcePath, path)));
  const unrepresented = discovered.filter((path) =>
    !ignored.has(path) && !sourcePaths.some((sourcePath) => sourceRepresentsPath(sourcePath, path)));
  const ignoredPaths = discovered.filter((path) => ignored.has(path));
  return Object.freeze({
    kind: "metroplat.agent.character.research-inventory-audit" as const,
    complete: unrepresented.length === 0,
    declared,
    discovered,
    represented: freezeArray(represented),
    unrepresented: freezeArray(unrepresented),
    ignored: freezeArray(ignoredPaths),
    evidence: freezeArray([
      `declared:${declared.length}`,
      `discovered:${discovered.length}`,
      `represented:${represented.length}`,
      `unrepresented:${unrepresented.length}`,
      `ignored:${ignoredPaths.length}`,
    ]),
  });
}

export function characterCapabilityReport(input: CharacterCapabilityReportInput): CharacterCapabilityReport {
  const researchCovered = new Set(input.research.covered);
  const families = CAPABILITY_FAMILY_REQUIREMENTS.map((family) => {
    const covered = family.required.filter((requirement) => researchCovered.has(requirement));
    const missing = family.required.filter((requirement) => !researchCovered.has(requirement));
    return Object.freeze({
      kind: "metroplat.agent.character.capability-family" as const,
      family: family.family,
      label: family.label,
      required: family.required,
      covered: freezeArray(covered),
      missing: freezeArray(missing),
      status: missing.length === 0 ? "meets" as const : "missing" as const,
      evidence: freezeArray([
        `required:${family.required.length}`,
        `covered:${covered.length}`,
        `missing:${missing.length}`,
      ]),
    });
  });
  const missing = uniqueSorted(families.flatMap((family) => family.missing));
  const covered = uniqueSorted(families.flatMap((family) => family.covered));
  return Object.freeze({
    kind: "metroplat.agent.character.capability-report" as const,
    status: missing.length === 0 ? "meets-or-beats" as const : "missing" as const,
    families: freezeArray(families),
    covered,
    missing,
    evidence: freezeArray([
      `families:${families.length}`,
      `covered:${covered.length}`,
      `missing:${missing.length}`,
      `readiness:${input.readiness.derived ? "derived" : "debt"}`,
      `learning:${input.learning.complete ? "complete" : "incomplete"}`,
      `actor:${input.actor.id}`,
    ]),
  });
}

function defaultIdentity(input: CharacterProfileInput): CharacterIdentity {
  return Object.freeze({
    id: input.id,
    displayName: input.id,
    autonomy: "suggest" as const,
    evidence: Object.freeze([`identity:fallback:${input.id}`]),
  });
}

export function characterProfile(input: CharacterProfileInput): CharacterProfile {
  const identity = input.identity ?? defaultIdentity(input);
  const memories = freezeArray(input.memories ?? []);
  const skills = freezeArray(input.skills ?? []);
  const disciplines = freezeArray(input.disciplines ?? []);
  const tools = freezeArray(input.tools ?? []);
  const hooks = freezeArray(input.hooks ?? []);
  const instructionSurfaces = freezeArray(input.instructionSurfaces ?? []);
  const projections = freezeArray(input.projections ?? []);
  const faculties = freezeArray(input.faculties ?? []);
  const collective = agentCollective(input.collective);
  const interiority = characterInteriority({ id: input.id, sections: faculties });
  const chronicles = freezeArray(input.chronicles ?? []);
  const governance = governanceFromInput(input, identity);
  const learning = characterLearningLoop({ chronicles, memories, skills, hooks, governance });
  const repertoire = characterRepertoire({ chronicles, skills, disciplines });
  const session = sessionCharacter({
    id: input.id,
    chronicles,
    memories,
    ...(identity.role === undefined ? {} : { role: identity.role }),
    partnerModel: collective.theoryOfMind,
  });
  const maskIdentity = characterMaskIdentity(session.masks);
  const agent = agentFloor({ chronicles, memories, skills, tools, governance });
  const character = characterNucleus({
    id: input.id,
    actor: session.actor,
    ...(input.soul === undefined ? {} : { soul: input.soul }),
    governance,
  });
  const actor = characterActor({
    id: input.id,
    ...(input.baseUrl === undefined ? {} : { baseUrl: input.baseUrl }),
    identity,
    skills,
    masks: session.masks,
    ...(input.did === undefined ? {} : { did: input.did }),
    ...(input.webAuthnCredentials === undefined ? {} : { webAuthnCredentials: input.webAuthnCredentials }),
    ...(input.verifiableCredentialSubjects === undefined ? {} : { verifiableCredentialSubjects: input.verifiableCredentialSubjects }),
  });
  const run = characterInhabitedRun({
    id: input.id,
    runtimeFaculties: input.runtimeFaculties ?? Object.freeze([]),
    boundaryEvents: input.boundaryEvents ?? Object.freeze([]),
    goals: input.goals ?? Object.freeze([]),
  });
  const work = characterWorkPractice({
    roleStates: input.roleStates ?? Object.freeze([]),
    acts: input.workActs ?? Object.freeze([]),
    casting: input.casting ?? Object.freeze([]),
  });
  const readiness = characterReadiness({ governance, memories, agent, character });
  const research = characterResearchCoverage({
    agent,
    actor,
    character,
    session,
    chronicles,
    memories,
    governance,
    skills,
    disciplines,
    tools,
    hooks,
    instructionSurfaces,
    projections,
    interiority,
    run,
    work,
    collective,
    learning,
    repertoire,
    maskIdentity,
    ...(input.soul === undefined ? {} : { soul: input.soul }),
    ...(input.heartbeat === undefined ? {} : { heartbeat: input.heartbeat }),
    readiness,
  });
  const capabilityReport = characterCapabilityReport({
    research,
    readiness,
    learning,
    actor,
  });
  return Object.freeze({
    kind: "metroplat.agent.character.profile" as const,
    id: input.id,
    formula: Object.freeze({
      agent: agent.formula,
      actor: actor.formula,
      persona: session.situation.formula,
      character: character.formula,
    }),
    identity,
    agent,
    character,
    actor,
    session,
    memories,
    governance,
    skills,
    disciplines,
    tools,
    hooks,
    instructionSurfaces,
    projections,
    interiority,
    run,
    work,
    collective,
    learning,
    repertoire,
    maskIdentity,
    ...(input.soul === undefined ? {} : { soul: input.soul }),
    ...(input.heartbeat === undefined ? {} : { heartbeat: input.heartbeat }),
    readiness,
    research,
    capabilityReport,
    evidence: freezeArray([
      "prior:fizzos-agent-harness",
      "prior:openclaw-memory-heartbeat-hook-skill-soul",
      "prior:agential-relationality-playing-organizing-animating",
      "prior:rom-keldar-character-store",
    ]),
  });
}
