import type { Action, Carrier } from "@red-cup-engineering/relating";

export type AuthorityStanding = "verified" | "unknown" | "contested" | "revoked";
export type AuthorityMembership = Readonly<{ id: string; actorId: string; groupId: string; standing: AuthorityStanding; effectiveFrom: string; effectiveUntil?: string; evidenceRef: string }>;
export type AuthorityGrant = Readonly<{ id: string; actorId: string; groupId: string; issuerId: string; authorities: readonly string[]; resources: readonly string[]; actions: readonly string[]; standing: AuthorityStanding; effectiveFrom: string; effectiveUntil?: string; evidenceRef: string; parentId?: string; fromActorId?: string }>;
export type TrustedAuthorityState<StateKind extends string = "governance.trusted-authority-state"> = Readonly<{ kind: StateKind; revision: string; observedAt: string; rootIssuerId: string; rootOfficeId: string; rootAuthorizedGroups: readonly string[]; memberships: readonly AuthorityMembership[]; offices: readonly AuthorityGrant[]; delegations: readonly AuthorityGrant[] }>;
export type AuthorityEvaluationRequest<RequestKind extends string = "governance.authority-evaluation-request", StateKind extends string = "governance.trusted-authority-state"> = Readonly<{ kind: RequestKind; actorId: string; groupId: string; resource: string; action: string; requiresAuthority: string; serverNow: string; maxStateAgeMs: number; trustedState: TrustedAuthorityState<StateKind> }>;
export type AuthorityEvaluationDecision<DecisionKind extends string = "governance.authority-evaluation-decision"> = Readonly<{ kind: DecisionKind; allowed: boolean; reason: string; snapshotRevision: string | null; evidenceRefs: readonly string[] }>;
export type AuthorityCarrier<T> = Carrier<T>;
export type AuthorityEvaluationSpecialization<RequestKind extends string, DecisionKind extends string, StateKind extends string> = Readonly<{
  requestSchema: object;
  decisionSchema: object;
  requestCarrier: AuthorityCarrier<AuthorityEvaluationRequest<RequestKind, StateKind>>;
  decisionCarrier: AuthorityCarrier<AuthorityEvaluationDecision<DecisionKind>>;
  evaluate(input: unknown): AuthorityEvaluationDecision<DecisionKind>;
}>;

export const authorityMembershipSchema: object;
export const authorityGrantSchema: object;
export const trustedAuthorityStateSchema: object;
/** Validates structure; evaluateAuthority checks freshness, identities, and ancestry. */
export const trustedAuthorityStateCarrier: AuthorityCarrier<TrustedAuthorityState>;
export const authorityEvaluationRequestSchema: object;
export const authorityEvaluationDecisionSchema: object;
export const authorityEvaluationRequestCarrier: AuthorityCarrier<AuthorityEvaluationRequest>;
export const authorityEvaluationDecisionCarrier: AuthorityCarrier<AuthorityEvaluationDecision>;
export function evaluateAuthority(input: unknown): AuthorityEvaluationDecision;
export const authorityEvaluationOperation: Action;
export function specializeAuthorityEvaluation<RequestKind extends string, DecisionKind extends string, StateKind extends string>(kinds: { requestKind: RequestKind; decisionKind: DecisionKind; stateKind: StateKind }): AuthorityEvaluationSpecialization<RequestKind, DecisionKind, StateKind>;
