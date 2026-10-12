import { ACTIVITYSTREAMS_CONTEXT } from "@red-cup-engineering/animating/writing/activitypub/index";
import { revoke } from "@red-cup-engineering/animating/writing/activitypub/capability";
import * as activitypub from "./activitypub.mjs";
import {
  organizingTheatreWorkLocusCapability,
  organizingTheatreWorkLocusClaimFrom,

} from "./work-locus.mjs";

export function organizingTheatreActivityForEvent(
  input                                     ,
  config                                ,
  options                                        = {},
)           {
  const actor = activitypub.organizingTheatreAgentActorId(config, input.harness, input.session);
  const base = trimmedBase(config.baseUrl);
  const extra = input.extra ?? {};
  const locusClaim = organizingTheatreWorkLocusClaimFrom(extra.locusClaim, options);
  const locusCapability = locusClaim === null ? null : organizingTheatreWorkLocusCapability(locusClaim, config, options);
  const revoked = locusCapability !== null && locusClaim?.action === "release"
    ? revoke(locusCapability, actor)
    : null;
  const object                          = {
    type: revoked !== null ? "Capability" : OrganizingTheatreActivityObjectTypeForEvent(extra, options),
    id: locusCapability?.id ?? `${base}/objects/${encodeURIComponent(input.id)}`,
    content: locusCapability?.grants ?? OrganizingTheatreActivityClaimForEvent(input, options),
    source: input.source,
    hookEventName: input.hookEventName,
    session: input.session,
    harness: input.harness,
    ...(locusCapability === null ? {} : { capability: locusCapability }),
    ...(input.objectExtra ?? {}),
    ...OrganizingTheatreActivityObjectExtra(extra, options),
  };
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: `${base}/activities/${encodeURIComponent(input.id)}`,
    type: revoked?.type ?? (locusClaim?.action === "release" ? "Undo" : "Create"),
    actor,
    object: object                      ,
    published: input.at,
    to: [activitypub.organizingTheatreServiceProjection(config).actor.id],
    cc: [...(options.publicAudience ?? [`${base}/agents`])],
  };
}

export function admittedOrganizingTheatreActionActivities(
  actions                                              ,
  config                                ,
  options                                          ,
)                      {
  const projection = activitypub.organizingTheatreServiceProjection(config);
  const actorId = options.actorId ?? projection.actor.id;
  const outboxId = options.outboxId ?? projection.outboxId;
  const subjectId = options.subjectId ?? projection.actionSubjectId;
  const audience = options.audience ?? [`${trimmedBase(config.baseUrl)}/agents`];
  const summaryObject                          = {
    type: "Collection",
    id: subjectId,
    name: `${new URL(projection.actor.id).hostname} admitted OrganizingTheatre actions`,
    content: `${options.packageName} admits ${actions.length} OrganizingTheatre actions through ${options.admission}.`,
    url: outboxId,
    totalItems: actions.length,
    admission: options.admission,
    ...(options.sourceAdmission === undefined ? {} : { sourceAdmission: options.sourceAdmission }),
  };
  const summary           = {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: `${trimmedBase(config.baseUrl)}/activities/OrganizingTheatre-admitted-actions`,
    type: "Create",
    actor: actorId,
    object: summaryObject                      ,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [...audience],
  };
  return Object.freeze([
    summary,
    ...actions.map((action) => admittedOrganizingTheatreActionActivity(action, config, {
      actorId,
      admission: options.admission,
      ...(options.sourceAdmission === undefined ? {} : { sourceAdmission: options.sourceAdmission }),
      audience,
    })),
  ]);
}

function OrganizingTheatreActivityClaimForEvent(input                                     , options                                       )         {
  const extra = input.extra ?? {};
  const locusClaim = organizingTheatreWorkLocusClaimFrom(extra.locusClaim, options);
  if (locusClaim !== null) {
    const action = locusClaim.action === "release" ? "releases" : "claims";
    const paths = locusClaim.paths.length === 0 ? "workspace locus" : locusClaim.paths.join(", ");
    return `${locusClaim.harness}:${locusClaim.session} ${action} ${paths}`;
  }
  const handoff = extra.handoffCarrier;
  if (handoff !== null && typeof handoff === "object" && (handoff                           ).kind === (options.handoffKind ?? "organizing.theatre.agent-session-handoff")) {
    const payload = input.payload ?? {};
    return `${String(payload.harness ?? input.harness)}:${String(payload.session_id ?? payload.session ?? input.session)} publishes a OrganizingTheatre session handoff`;
  }
  const tool = typeof input.payload?.tool_name === "string" ? ` tool:${input.payload.tool_name}` : "";
  return `${input.source} ${input.hookEventName}${tool}`.trim();
}

function OrganizingTheatreActivityObjectTypeForEvent(extra                         , options                                       )         {
  if (organizingTheatreWorkLocusClaimFrom(extra.locusClaim, options) !== null) return "Capability";
  const handoff = extra.handoffCarrier;
  if (handoff !== null && typeof handoff === "object" && (handoff                           ).kind === (options.handoffKind ?? "organizing.theatre.agent-session-handoff")) return "Article";
  if (typeof extra.gate === "string") return "Question";
  return "Note";
}

function OrganizingTheatreActivityObjectExtra(extra                         , options                                       )                          {
  const out                          = {};
  if (organizingTheatreWorkLocusClaimFrom(extra.locusClaim, options) !== null) out.locusClaim = extra.locusClaim;
  const handoff = extra.handoffCarrier;
  if (handoff !== null && typeof handoff === "object" && (handoff                           ).kind === (options.handoffKind ?? "organizing.theatre.agent-session-handoff")) out.handoffCarrier = handoff;
  if (typeof extra.gate === "string") out.gate = extra.gate;
  if (typeof extra.reason === "string") out.reason = extra.reason;
  if (Array.isArray(extra.activeClaims)) out.activeClaims = extra.activeClaims;
  if (Array.isArray(extra.claimConflicts)) out.claimConflicts = extra.claimConflicts;
  return out;
}

function admittedOrganizingTheatreActionActivity(
  action                                   ,
  config                                ,
  options

    ,
)           {
  const base = trimmedBase(config.baseUrl);
  const object                          = {
    type: "Service",
    id: `${base}/actions/${encodeURIComponent(action.name)}`,
    name: action.name,
    content: action.summary ?? action.description ?? `Admitted OrganizingTheatre action ${action.name}.`,
    url: new URL(action.href, `${base}/`).href,
    ...(action.input === undefined ? {} : { mediaType: action.input }),
    ...(action.output === undefined ? {} : { output: action.output }),
    ...(action.term === undefined ? {} : { term: action.term }),
    ...(action.strategyTerm === undefined ? {} : { strategyTerm: action.strategyTerm }),
    ...(action.sessionTerm === undefined ? {} : { sessionTerm: action.sessionTerm }),
    admission: options.admission,
    ...(options.sourceAdmission === undefined ? {} : { sourceAdmission: options.sourceAdmission }),
  };
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: `${base}/activities/OrganizingTheatre-action/${encodeURIComponent(action.name)}`,
    type: "Create",
    actor: options.actorId,
    object: object                      ,
    to: [options.actorId],
    cc: [...options.audience],
  };
}

function trimmedBase(baseUrl        )         {
  const trimmed = baseUrl.trim().replace(/\/+$/u, "");
  if (trimmed === "") throw new TypeError("OrganizingTheatre baseUrl must not be empty");
  return trimmed;
}
