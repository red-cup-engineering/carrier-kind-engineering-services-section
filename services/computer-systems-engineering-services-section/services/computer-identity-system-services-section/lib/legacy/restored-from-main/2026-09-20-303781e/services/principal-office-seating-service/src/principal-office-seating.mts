/** A stable subject asserted by an authentication issuer. */
export interface PrincipalRef { readonly issuer: string; readonly subject: string }

/** Authentication has already been verified by an effectful adapter. */
export interface AuthenticationEvidence {
  readonly principal: PrincipalRef;
  readonly evidence: string;
  readonly audience: string;
  readonly authenticatedAt: string;
  readonly expiresAt: string;
}

/** A principal's bounded right to cause an actor to act for one audience. */
export interface PrincipalActorDelegation {
  readonly id: string;
  readonly evidence: string;
  readonly principal: PrincipalRef;
  readonly actor: string;
  readonly audience: string;
  readonly recognition: boolean;
  readonly induction: boolean;
  readonly notBefore: string;
  readonly expiresAt?: string;
  readonly revoked?: boolean;
}

/** A recognized actor/character/office relation. A model or session name is not a seating. */
export interface OfficeSeating {
  readonly id: string;
  readonly evidence: string;
  readonly actor: string;
  readonly character: string;
  readonly office: string;
  readonly incumbency: string;
  readonly recognition: boolean;
  readonly induction: boolean;
  readonly notBefore: string;
  readonly expiresAt?: string;
  readonly revoked?: boolean;
}

/** The four-valued reading of an office's two independent settlements. */
export type OfficeIncumbencyState = "vacant" | "recognition-only" | "munus-only" | "dignitas" | "repair" | "failed";

/**
 * Read an office seat without conflating it with the Actor that may hold it.
 * `t` and `f` are explicit affirmations and denials; `bottom` is no evidence;
 * `top` is conflicting evidence. An Actor can exist without an office and an
 * office can be vacant, so this law belongs to office seating, not Actor.
 */
export function officeIncumbencyState({ recognition, induction }: Readonly<{ recognition: "bottom" | "t" | "f" | "top"; induction: "bottom" | "t" | "f" | "top" }>): OfficeIncumbencyState {
  if (recognition === "top" || induction === "top") return "repair";
  if (recognition === "bottom" && induction === "bottom") return "vacant";
  if (recognition === "t" && induction === "t") return "dignitas";
  if (recognition === "f" || induction === "f") return "failed";
  if (recognition === "t") return "recognition-only";
  return "munus-only";
}

export interface ResolvePrincipalSessionInput {
  readonly authentication: AuthenticationEvidence;
  readonly actor: string;
  readonly seating: string;
  readonly audience: string;
  readonly now: string;
  readonly delegations: readonly PrincipalActorDelegation[];
  readonly seatings: readonly OfficeSeating[];
}

export interface PrincipalSession {
  readonly version: 1;
  readonly principal: PrincipalRef;
  readonly actor: string;
  readonly seating: Readonly<Pick<OfficeSeating, "id" | "evidence" | "character" | "office" | "incumbency">>;
  readonly authenticationEvidence: string;
  readonly delegationEvidence: string;
  readonly audience: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export type PrincipalSessionResolution =
  | Readonly<{ ok: true; session: PrincipalSession }>
  | Readonly<{ ok: false; reason: "invalid-input" | "authentication-expired" | "authentication-audience-mismatch" | "delegation-not-admitted" | "seating-not-admitted" }>;

/** A bounded, independently admitted authority to execute one declared office duty. */
export interface DutyAuthorization {
  readonly id: string;
  readonly evidence: string;
  readonly actor: string;
  readonly office: string;
  readonly duty: string;
  readonly capabilities: readonly string[];
  readonly allowedEffects: readonly string[];
  readonly recognition: boolean;
  readonly induction: boolean;
  readonly notBefore: string;
  readonly expiresAt?: string;
  readonly revoked?: boolean;
}

/** An immutable requested effect.  Its payload is deliberately outside this authority carrier. */
export interface ControlMessage {
  readonly type: "ControlMessage";
  readonly version: 1;
  readonly identity: string;
  readonly evidence: string;
  readonly channelIdentity: string;
}

/** An addressable delivery route, distinct from both a machine and RelationalMachinePort. */
export interface RuntimeChannel {
  readonly type: "RuntimeChannel";
  readonly version: 1;
  readonly identity: string;
  readonly evidence: string;
  readonly audience: string;
}

/** Current machine identity and observation, without a transport locator. */
export interface MachineBinding {
  readonly type: "MachineBinding";
  readonly version: 1;
  readonly machineIdentity: string;
  readonly observationEvidenceIdentity: string;
  readonly observedAt: string;
  readonly validUntil: string;
  readonly allowedEffects: readonly string[];
}

/** A concrete runtime transport locator.  This is not RelationalMachinePort. */
export interface RuntimeEndpoint {
  readonly type: "RuntimeEndpoint";
  readonly version: 1;
  readonly transport: string;
  readonly address: string;
}

/** The resource account/window and durable reservation selected for the requested effect. */
export interface ResourceReservationBinding {
  readonly providerIdentity: string;
  readonly accountIdentity: string;
  readonly windowIdentity: string;
  readonly reservationIdentity: string;
}

export interface ControlCommand {
  readonly type: "ControlCommand";
  readonly version: 1;
  readonly identity: string;
  readonly actor: string;
  readonly office: string;
  readonly duty: string;
  readonly requiredCapabilities: readonly string[];
  readonly effect: string;
  readonly message: ControlMessage;
  readonly channel: RuntimeChannel;
  readonly machine: MachineBinding;
  readonly runtimeEndpoint: RuntimeEndpoint;
  readonly resourceReservation: ResourceReservationBinding;
}

export interface AdmitControlCommandInput {
  readonly session: PrincipalSession;
  readonly command: ControlCommand;
  readonly dutyAuthorizations: readonly DutyAuthorization[];
  readonly now: string;
}

export type ControlCommandAdmission =
  | Readonly<{ type: "ControlCommandAdmission"; version: 1; disposition: "admitted"; command: ControlCommand; session: PrincipalSession; dutyAuthorization: Readonly<Pick<DutyAuthorization, "id" | "evidence" | "duty" | "office">>; expiresAt: string }>
  | Readonly<{ type: "ControlCommandAdmission"; version: 1; disposition: "refused"; reason: "invalid-command" | "session-expired" | "duty-not-admitted" | "capability-not-admitted" | "effect-not-admitted" | "machine-effect-not-admitted" | "machine-observation-expired" }>;

/**
 * Purely resolve a session from independently verified authentication and
 * durable delegation/incumbency records. It performs no authentication,
 * persistence, network operation, or fallback from a model/session label.
 */
export function resolvePrincipalSession(input: ResolvePrincipalSessionInput): PrincipalSessionResolution {
  const now = instant(input.now);
  if (!now || !nonEmpty(input.actor) || !nonEmpty(input.seating) || !nonEmpty(input.audience) || !validAuthentication(input.authentication)) return refuse("invalid-input");
  if (input.authentication.audience !== input.audience) return refuse("authentication-audience-mismatch");
  const authenticatedAt = instant(input.authentication.authenticatedAt), authenticationExpiry = instant(input.authentication.expiresAt);
  if (!authenticatedAt || !authenticationExpiry) return refuse("invalid-input");
  if (now < authenticatedAt || now >= authenticationExpiry) return refuse("authentication-expired");

  const delegation = oneActive(input.delegations, (candidate) =>
    samePrincipal(candidate.principal, input.authentication.principal)
      && candidate.actor === input.actor
      && candidate.audience === input.audience,
  );
  if (!delegation) return refuse("delegation-not-admitted");
  const delegationExpiry = activeExpiry(delegation, now);
  if (!delegationExpiry) return refuse("delegation-not-admitted");

  const seating = oneActive(input.seatings, (candidate) => candidate.id === input.seating && candidate.actor === input.actor);
  if (!seating) return refuse("seating-not-admitted");
  const seatingExpiry = activeExpiry(seating, now);
  if (!seatingExpiry) return refuse("seating-not-admitted");

  return Object.freeze({ ok: true, session: Object.freeze({
    version: 1,
    principal: Object.freeze({ ...input.authentication.principal }),
    actor: input.actor,
    seating: Object.freeze({ id: seating.id, evidence: seating.evidence, character: seating.character, office: seating.office, incumbency: seating.incumbency }),
    authenticationEvidence: input.authentication.evidence,
    delegationEvidence: delegation.evidence,
    audience: input.audience,
    issuedAt: input.now,
    expiresAt: new Date(Math.min(authenticationExpiry.getTime(), delegationExpiry.getTime(), seatingExpiry.getTime())).toISOString(),
  }) });
}

/**
 * Admit one command only when its resolved session, declared duty, capabilities,
 * effect, message/channel evidence, machine observation, endpoint, and resource
 * reservation are all current and mutually bound.  This pure function performs
 * neither authentication nor an effect; adapters must supply verified evidence.
 */
export function admitControlCommand(input: AdmitControlCommandInput): ControlCommandAdmission {
  const now = instant(input?.now);
  const session = input?.session;
  const command = input?.command;
  if (!now || !validSession(session) || !validCommand(command) || now < new Date(session.issuedAt) || now >= new Date(session.expiresAt)) return commandRefusal(!now || !validCommand(command) ? "invalid-command" : "session-expired");
  if (command.actor !== session.actor || command.office !== session.seating.office) return commandRefusal("invalid-command");
  if (command.channel.audience !== session.audience) return commandRefusal("invalid-command");
  if (now >= new Date(command.machine.validUntil)) return commandRefusal("machine-observation-expired");
  const duty = oneActive(input.dutyAuthorizations, (candidate) => candidate.actor === session.actor && candidate.office === session.seating.office && candidate.duty === command.duty);
  if (!duty || !activeExpiry(duty, now)) return commandRefusal("duty-not-admitted");
  if (!command.requiredCapabilities.every((capability) => duty.capabilities.includes(capability))) return commandRefusal("capability-not-admitted");
  if (!duty.allowedEffects.includes(command.effect)) return commandRefusal("effect-not-admitted");
  if (!command.machine.allowedEffects.includes(command.effect)) return commandRefusal("machine-effect-not-admitted");
  return Object.freeze({
    type: "ControlCommandAdmission" as const,
    version: 1 as const,
    disposition: "admitted" as const,
    command: Object.freeze(command),
    session: Object.freeze(session),
    dutyAuthorization: Object.freeze({ id: duty.id, evidence: duty.evidence, duty: duty.duty, office: duty.office }),
    expiresAt: new Date(Math.min(new Date(session.expiresAt).getTime(), activeExpiry(duty, now)!.getTime(), new Date(command.machine.validUntil).getTime())).toISOString(),
  });
}

/** Re-check a received admission against the receiver's current, effect-specific binding. */
export function verifyControlCommandAdmission(value: ControlCommandAdmission | undefined, requirements: Readonly<{ now: string; effect: string; machineIdentity: string; observationEvidenceIdentity: string; observedAt: string; runtimeEndpoint: RuntimeEndpoint; providerIdentity: string; accountIdentity: string; windowIdentity: string; reservationIdentity: string }>): boolean {
  if (!value || value.type !== "ControlCommandAdmission" || value.version !== 1 || value.disposition !== "admitted") return false;
  const now = instant(requirements.now);
  if (!now || now < new Date(value.session.issuedAt) || now >= new Date(value.expiresAt) || !validSession(value.session) || !validCommand(value.command)) return false;
  const command = value.command;
  return command.channel.audience === value.session.audience && now < new Date(command.machine.validUntil) && command.effect === requirements.effect
    && command.machine.machineIdentity === requirements.machineIdentity
    && command.machine.observationEvidenceIdentity === requirements.observationEvidenceIdentity
    && command.machine.observedAt === requirements.observedAt
    && sameEndpoint(command.runtimeEndpoint, requirements.runtimeEndpoint)
    && command.resourceReservation.providerIdentity === requirements.providerIdentity
    && command.resourceReservation.accountIdentity === requirements.accountIdentity
    && command.resourceReservation.windowIdentity === requirements.windowIdentity
    && command.resourceReservation.reservationIdentity === requirements.reservationIdentity;
}

function refuse(reason: Exclude<PrincipalSessionResolution, { readonly ok: true }> ["reason"]): PrincipalSessionResolution { return Object.freeze({ ok: false, reason }); }
function nonEmpty(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function instant(value: unknown): Date | undefined { if (!nonEmpty(value) || !/([zZ]|[+-]\d\d:\d\d)$/u.test(value)) return undefined; const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? parsed : undefined; }
function samePrincipal(left: PrincipalRef, right: PrincipalRef): boolean { return left.issuer === right.issuer && left.subject === right.subject; }
function contentAddress(value: unknown): value is string { return typeof value === "string" && /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(value); }
function validAuthentication(value: AuthenticationEvidence): boolean { return Boolean(value) && nonEmpty(value.principal?.issuer) && nonEmpty(value.principal?.subject) && contentAddress(value.evidence) && nonEmpty(value.audience); }
function validSession(value: PrincipalSession | undefined): value is PrincipalSession { if (!value) return false; return value.version === 1 && nonEmpty(value.actor) && nonEmpty(value.seating?.office) && contentAddress(value.authenticationEvidence) && contentAddress(value.delegationEvidence) && nonEmpty(value.audience) && Boolean(instant(value.issuedAt)) && Boolean(instant(value.expiresAt)); }
function validCommand(value: ControlCommand | undefined): value is ControlCommand {
  if (!value) return false;
  const resource = value.resourceReservation;
  return value.type === "ControlCommand" && value.version === 1 && nonEmpty(value.identity) && nonEmpty(value.actor) && nonEmpty(value.office) && nonEmpty(value.duty) && Array.isArray(value.requiredCapabilities) && value.requiredCapabilities.every(nonEmpty) && nonEmpty(value.effect)
    && value.message?.type === "ControlMessage" && value.message.version === 1 && nonEmpty(value.message.identity) && contentAddress(value.message.evidence)
    && value.channel?.type === "RuntimeChannel" && value.channel.version === 1 && nonEmpty(value.channel.identity) && contentAddress(value.channel.evidence) && nonEmpty(value.channel.audience) && value.message.channelIdentity === value.channel.identity
    && value.machine?.type === "MachineBinding" && value.machine.version === 1 && nonEmpty(value.machine.machineIdentity) && contentAddress(value.machine.observationEvidenceIdentity) && Boolean(instant(value.machine.observedAt)) && Boolean(instant(value.machine.validUntil)) && new Date(value.machine.observedAt) < new Date(value.machine.validUntil) && Array.isArray(value.machine.allowedEffects) && value.machine.allowedEffects.every(nonEmpty)
    && value.runtimeEndpoint?.type === "RuntimeEndpoint" && value.runtimeEndpoint.version === 1 && nonEmpty(value.runtimeEndpoint.transport) && nonEmpty(value.runtimeEndpoint.address)
    && Boolean(resource) && [resource.providerIdentity, resource.accountIdentity, resource.windowIdentity, resource.reservationIdentity].every(nonEmpty);
}
function sameEndpoint(left: RuntimeEndpoint, right: RuntimeEndpoint): boolean { return left.type === "RuntimeEndpoint" && left.version === 1 && right.type === "RuntimeEndpoint" && right.version === 1 && left.transport === right.transport && left.address === right.address; }
function commandRefusal(reason: Exclude<ControlCommandAdmission, { readonly disposition: "admitted" }> ["reason"]): ControlCommandAdmission { return Object.freeze({ type: "ControlCommandAdmission", version: 1, disposition: "refused", reason }); }
function oneActive<T extends { readonly recognition: boolean; readonly induction: boolean; readonly revoked?: boolean; readonly evidence: string; readonly notBefore: string; readonly expiresAt?: string }>(values: readonly T[], matches: (value: T) => boolean): T | undefined {
  const candidates = values.filter((value) => matches(value) && value.recognition && value.induction && !value.revoked && contentAddress(value.evidence));
  return candidates.length === 1 ? candidates[0] : undefined;
}
function activeExpiry(value: { readonly notBefore: string; readonly expiresAt?: string }, now: Date): Date | undefined {
  const notBefore = instant(value.notBefore), expiry = value.expiresAt === undefined ? new Date("9999-12-31T23:59:59.999Z") : instant(value.expiresAt);
  return notBefore && expiry && now >= notBefore && now < expiry ? expiry : undefined;
}
