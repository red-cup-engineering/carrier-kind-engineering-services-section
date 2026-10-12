import type { JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { ChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import type { FilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import { claimSessionFeed, claimSessionObservation, claimSessionStatementRows } from "../claims/session.mts";
import { journal, openJournal } from "../journal/index.mts";
import { workItemViewCollector } from "./read-models.mts";
import { workLedgerObligationOfRow, type WorkLedgerObligation } from "./observations.mts";
import {
  assign,
  juralRelationClaimCell,
  office,
  workItemOfCell,
} from "./model.mts";
import {
  agencyWorkAllocationAdmissionContract,
  agencyWorkAllocationContract,
  type AgencyWorkAllocation,
  type AgencyWorkAllocationAdmission,
  type EnterpriseRecordCharge,
} from "./schema.mts";
import type { ModelCharacter } from "./model-character.mts";
const ENTERPRISE_CHARGE: Readonly<Record<EnterpriseRecordCharge, ChargeValueName>> = Object.freeze({ bottom: "unknown", t: "held", f: "denied", top: "contested" });
/** Legacy codec kept for reading historical enterprise-record charges; allocation admission no longer accepts them from callers. */
export function chargeOfEnterpriseRecordCharge(charge: EnterpriseRecordCharge): ChargeValueName { return ENTERPRISE_CHARGE[charge]; }
/** Canonical records loaded by the configured firm-pool adapter.  The core verifies
 * their relation to the requested allocation; adapters never provide settled
 * allocation fields directly. */
export interface AgencyWorkAuthority {
  readonly office: { readonly id: string; readonly bearsDuty: readonly string[]; readonly deonticProfile: Readonly<Record<string, string>> };
  /** This is an admission restriction from the duty record, separate from the
   * rooted provider authority evaluated by the governance adapter. */
  readonly duty: { readonly id: string; readonly work: string; readonly claim: string; readonly skills: readonly string[]; readonly delegation: boolean };
  readonly work: { readonly id: string; readonly needs: readonly string[]; readonly receiverCondition: string };
  readonly skill: { readonly id: string; readonly closureKind: "procedure" | "inquiry" | "derivation" | "process"; readonly requiresCapabilities: readonly string[]; readonly method: string };
  readonly officeService: { readonly id: string; readonly requiredCapabilities: readonly string[] };
}

/** The authority owner evaluates a provider grant at admission and again at the
 * execution boundary. MetroPlat records this receipt; it does not interpret a
 * duty claim or fabricate authority from the firm pool. */
export interface ProviderDelegationAuthorization {
  readonly authority: string;
  readonly revision: string;
  readonly evidence: readonly string[];
}

export interface ProviderDelegationRequest {
  readonly holder: string;
  readonly provider: string;
  readonly scope: string;
  readonly operations: readonly string[];
  readonly effects: readonly string[];
  readonly authority: string;
  readonly at: string;
}

export type AuthorizeProviderDelegation = (request: ProviderDelegationRequest) => ProviderDelegationAuthorization;
export type ResolveModelCharacter = (character: Pick<ModelCharacter, "model" | "id">) => ModelCharacter;

function declaredScope(binding: FilesystemBinding, at: string, subject: string, scope: string): WorkLedgerObligation {
  const collector = workItemViewCollector();
  let obligation: WorkLedgerObligation | undefined;
  try {
    journal.scanCausalSubject(binding.dataRoot, subject, at, undefined, (_accum, row, event) => {
      collector.push(row, event);
      const candidate = workLedgerObligationOfRow(row, subject);
      if (candidate?.item === scope) obligation = candidate;
      return undefined;
    });
  } catch {
    throw new TypeError(`agency work allocation: target work feed ${subject} is unavailable`);
  }
  const readout = collector.read(subject, at) as Readonly<Record<string, JsonValue>> | undefined;
  const roadmap = readout?.["roadmap"];
  const nodes = roadmap !== null && typeof roadmap === "object" && !Array.isArray(roadmap)
    ? (roadmap as Readonly<Record<string, JsonValue>>)["nodes"]
    : undefined;
  const declared = Array.isArray(nodes) && nodes.some((node) =>
    node !== null && typeof node === "object" && !Array.isArray(node)
      && (node as Readonly<Record<string, JsonValue>>)["scope"] === scope);
  if (!declared || obligation === undefined) throw new TypeError(`agency work allocation: scope ${scope} is not declared in target work feed ${subject}`);
  return obligation;
}

function observation(
  allocation: AgencyWorkAllocation,
  at: string,
  item: number,
  cell: string,
  charge: ChargeValueName,
  role: string,
  authority?: AgencyWorkAuthority,
  delegationAuthorization?: ProviderDelegationAuthorization,
) {
  const delegationAuthorizationValue = delegationAuthorization === undefined
    ? undefined
    : Object.freeze({ authority: delegationAuthorization.authority, revision: delegationAuthorization.revision, evidence: Object.freeze([...delegationAuthorization.evidence]) });
  return claimSessionObservation({
    sessionId: `agency-work-allocation-${allocation.id}`,
    transport: "claim-session",
    claim: Object.freeze({ cell, charge }),
    session: Object.freeze({ claims: Object.freeze([]), closed: false }),
    judgement: Object.freeze({}),
    at: Object.freeze({ source: `agency-work-allocation:${allocation.id}`, item }),
    boundary: Object.freeze({
      protocol: "metroplat",
      surface: "work-coordination",
      operation: "agency-work-allocation-admit",
      role,
      source: allocation.id,
      text: role,
      ...(authority === undefined ? {} : {
        scope: allocation.allocation.scope,
        character: allocation.character.id,
        office: allocation.office.id,
        officeService: allocation.officeService.id,
        duty: allocation.duty,
        work: authority.work.id,
        skill: authority.skill.id,
        closureKind: authority.skill.closureKind,
        requiresCapabilities: authority.skill.requiresCapabilities,
        method: authority.skill.method,
        receiverCondition: authority.work.receiverCondition,
        ...(allocation.allocation.delegation === undefined ? {} : { delegation: allocation.allocation.delegation }),
        ...(delegationAuthorizationValue === undefined ? {} : { delegationAuthorization: delegationAuthorizationValue }),
      }),
      evidence: Object.freeze([`office:${allocation.office.id}`, `model:${allocation.character.model}`, `character:${allocation.character.id}`, `office-service:${allocation.officeService.id}`, `scope:${allocation.allocation.scope}`]),
    }),
    caller: Object.freeze({ transport: "agency-work-allocation", session: allocation.id }),
  });
}

export function admitAgencyWorkAllocation(
  binding: FilesystemBinding,
  input: unknown,
  options: { readonly at: string; readonly rootName?: string; readonly resolveAuthority?: (allocation: AgencyWorkAllocation) => AgencyWorkAuthority; readonly resolveModelCharacter?: ResolveModelCharacter; readonly authorizeProviderDelegation?: AuthorizeProviderDelegation },
): AgencyWorkAllocationAdmission {
  const allocation = agencyWorkAllocationContract.assert(input, "agency work allocation") as AgencyWorkAllocation;
  const workItem = workItemOfCell(allocation.allocation.scope);
  if (workItem == null) throw new TypeError(`agency work allocation: invalid work scope ${allocation.allocation.scope}`);
  const declared = declaredScope(binding, options.at, allocation.subject, allocation.allocation.scope);

  if (options.resolveAuthority === undefined) throw new TypeError("agency work allocation: current firm authority resolver is required");
  if (options.resolveModelCharacter === undefined) throw new TypeError("agency work allocation: current provider-admitted model resolver is required");
  const admittedCharacter = options.resolveModelCharacter({ model: allocation.character.model, id: allocation.character.id });
  if (admittedCharacter.model !== allocation.character.model || admittedCharacter.id !== allocation.character.id
    || admittedCharacter.capabilities.length !== allocation.character.capabilities.length
    || admittedCharacter.capabilities.some((capability) => !allocation.character.capabilities.includes(capability))) {
    throw new TypeError("agency work allocation: requested Character capabilities do not match its provider-admitted model");
  }
  const authority = options.resolveAuthority(allocation);
  if (authority.office.id !== allocation.office.id || authority.duty.id !== allocation.duty || authority.officeService.id !== allocation.officeService.id) throw new TypeError("agency work allocation: canonical authority does not match requested office, duty, and office service");
  if (!authority.office.bearsDuty.includes(allocation.duty) || authority.office.deonticProfile[authority.duty.work] !== "duty") throw new TypeError("agency work allocation: office does not bear the requested duty");
  if (authority.officeService.requiredCapabilities.length !== allocation.officeService.requiredCapabilities.length || authority.officeService.requiredCapabilities.some((capability) => !allocation.officeService.requiredCapabilities.includes(capability))) throw new TypeError("agency work allocation: canonical office-service capabilities do not match the request");
  if (!authority.officeService.requiredCapabilities.every((capability) => admittedCharacter.capabilities.includes(capability))) throw new TypeError("agency work allocation: character does not include all required office-service capabilities");
  const delegation = allocation.allocation.delegation;
  if (delegation !== undefined && !authority.duty.delegation) throw new TypeError("agency work allocation: this duty is not delegable");
  const delegationAuthorization = delegation === undefined ? undefined : options.authorizeProviderDelegation?.({
    holder: allocation.character.id, provider: delegation.provider, scope: allocation.allocation.scope,
    operations: delegation.operations, effects: delegation.effects, authority: delegation.authority, at: options.at,
  });
  if (delegation !== undefined && (delegationAuthorization === undefined || delegationAuthorization.authority !== delegation.authority || delegationAuthorization.evidence.length === 0)) throw new TypeError("agency work allocation: current canonical provider authority is required");
  if (declared.work !== authority.duty.work || declared.work !== authority.work.id || declared.skill === undefined || !authority.duty.skills.includes(declared.skill) || !authority.work.needs.includes(declared.skill) || authority.skill.id !== declared.skill) throw new TypeError("agency work allocation: declared work and skill do not satisfy the canonical duty");
  const officeContract = office(allocation.office.id, [{ kind: "duty", over: workItem, party: authority.duty.claim }]);
  const duty = assign(allocation.character.id, workItem, authority.duty.claim);
  const observations = Object.freeze([
    observation(allocation, options.at, 1, juralRelationClaimCell(duty), "held", "office-service-allocation", authority, delegationAuthorization),
  ]);
  const rows = observations.flatMap(claimSessionStatementRows);
  const appended = openJournal(binding.dataRoot).appendRows(claimSessionFeed.name, rows, {
    at: options.at,
    ...(options.rootName === undefined ? {} : { rootName: options.rootName }),
    subject: allocation.subject,
    caller: Object.freeze({ transport: "agency-work-allocation", session: allocation.id }),
  }).appended;
  const result = Object.freeze({
    kind: "metroplat.work.agency-work-allocation-admission" as const,
    allocation: allocation.id,
    subject: allocation.subject,
    office: allocation.office.id,
    character: allocation.character.id,
    officeService: allocation.officeService.id,
    scope: allocation.allocation.scope,
    appended,
    status: appended === 0 ? "already-admitted" as const : "admitted" as const,
  });
  return agencyWorkAllocationAdmissionContract.assert(result, "agency work allocation admission") as AgencyWorkAllocationAdmission;
}
