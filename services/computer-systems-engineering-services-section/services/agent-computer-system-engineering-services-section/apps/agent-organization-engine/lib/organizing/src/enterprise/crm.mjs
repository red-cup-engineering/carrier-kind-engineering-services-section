/**
 * CRM/ICS readings over the enterprise journal.
 *
 * The journal stays append-only. These functions derive current party and
 * resource state without creating a second mutable CRM or inventory database.
 */
import { currentOrders, folded, interestReading, latest } from "./orders.mjs";

const text = (value) => typeof value === "string" && value.trim() !== "";

function latestAt(records) {
  return latest(records.filter((record) => text(record.recordedAt)));
}

/**
 * One counterparty as currently known by one enterprise.
 *
 * Party identity is the caller-supplied stable `party` key. Profile records
 * may change names, aliases, contact points, or policy without changing that key.
 */
export function enterprisePartyProfile({
  enterprise,
  party,
  partyRecords = [],
  contacts = [],
  orderRecords = [],
} = {}) {
  if (!text(enterprise) || !text(party)) throw new TypeError("a party profile names enterprise and party");
  const profiles = partyRecords.filter((record) => record.enterprise === enterprise && record.party === party);
  const partyContacts = contacts.filter((record) => record.enterprise === enterprise && record.party === party);
  const partyOrders = currentOrders(orderRecords.filter((record) => record.enterprise === enterprise && record.party === party));
  const profile = folded(profiles);
  const lastContact = latestAt(partyContacts);
  const orderEvents = partyOrders.flatMap((order) => order.history);
  const lastOrderEvent = latestAt(orderEvents);
  const lastInteraction = latestAt([...(lastContact ? [lastContact] : []), ...(lastOrderEvent ? [lastOrderEvent] : [])]);
  return Object.freeze({
    enterprise,
    party,
    profile: Object.freeze({
      ...(text(profile.name) ? { name: profile.name } : {}),
      ...(text(profile.kind) ? { kind: profile.kind } : {}),
      aliases: Object.freeze([...(profile.aliases ?? [])]),
      contactPoints: Object.freeze([...(profile.contactPoints ?? [])]),
      externalIds: Object.freeze([...(profile.externalIds ?? [])]),
      contactPolicy: profile.contactPolicy ?? "unknown",
      ...(text(profile.source) ? { source: profile.source } : {}),
      ...(text(profile.notes) ? { notes: profile.notes } : {}),
    }),
    interest: interestReading(partyContacts, { party, enterprise }),
    lastContact: lastContact ?? null,
    lastInteractionAt: lastInteraction?.recordedAt ?? null,
    nextCallbackAt: lastContact?.callbackAt ?? null,
    orders: Object.freeze(partyOrders.map((order) => Object.freeze({
      order: order.order,
      stage: order.stage,
      event: order.event ?? null,
      fee: order.fee,
      recordedAt: order.recordedAt,
      ...(order.scope === undefined ? {} : { scope: order.scope }),
      ...(order.amountUsd === undefined ? {} : { amountUsd: order.amountUsd }),
    }))),
  });
}

/** Current party profiles for every party observed in records, contacts or orders. */
export function enterprisePartyProfiles({
  enterprise,
  partyRecords = [],
  contacts = [],
  orderRecords = [],
} = {}) {
  if (!text(enterprise)) throw new TypeError("party profiles name their enterprise");
  const parties = new Set([
    ...partyRecords.filter((record) => record.enterprise === enterprise).map((record) => record.party),
    ...contacts.filter((record) => record.enterprise === enterprise).map((record) => record.party),
    ...orderRecords.filter((record) => record.enterprise === enterprise).map((record) => record.party),
  ].filter(text));
  return Object.freeze([...parties].sort().map((party) => enterprisePartyProfile({
    enterprise, party, partyRecords, contacts, orderRecords,
  })));
}

function resourceKey(record) {
  return JSON.stringify([
    record.resource,
    record.unit,
    record.state ?? "available",
    record.location ?? "",
    record.custodian ?? "",
    record.carrier ?? "",
  ]);
}

/**
 * Latest inventory/capacity observation for each resource coordinate.
 *
 * Amounts stay decimal text and no money value is invented. A later observation
 * supersedes an earlier observation only for the same resource/state/location/
 * custody/carrier coordinate.
 */
export function enterpriseResourceReadout(records, { enterprise } = {}) {
  if (!text(enterprise)) throw new TypeError("a resource readout names its enterprise");
  const latestByCoordinate = new Map();
  for (const record of records.filter((entry) => entry.enterprise === enterprise)) {
    const key = resourceKey(record);
    const held = latestByCoordinate.get(key);
    if (held === undefined || String(record.recordedAt).localeCompare(String(held.recordedAt)) >= 0) {
      latestByCoordinate.set(key, record);
    }
  }
  return Object.freeze([...latestByCoordinate.values()]
    .sort((a, b) => resourceKey(a).localeCompare(resourceKey(b)))
    .map((record) => Object.freeze({ ...record })));
}

/**
 * Validate one append-only order transition against an enterprise procedure.
 * Existing orders may repeat their current stage or advance; they may not move
 * backward or skip a procedure stage. Any stage may end as dead.
 */
export function validateOrderTransition(history, input, proc) {
  if (!text(input?.party) || !text(input?.order) || !text(input?.stage)) {
    throw new TypeError("an order transition names party, order and stage");
  }
  if (!proc?.names?.includes(input.stage)) {
    throw new TypeError(`unknown order stage ${input.stage}: expected ${proc?.names?.join(", ") ?? "a procedure stage"}`);
  }
  const ordered = [...history].sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)));
  if (ordered.some((record) => record.party !== input.party)) throw new TypeError(`order ${input.order} belongs to another party`);
  const current = ordered.at(-1);
  if (current === undefined) return input;
  const finalStage = proc.stages.at(-1)?.stage;
  if (current.stage === "dead" || current.stage === finalStage) {
    throw new TypeError(`order ${input.order} is terminal at ${current.stage}`);
  }
  if (input.stage === "dead") {
    const stage = proc.stages.find((entry) => entry.stage === current.stage);
    if ((stage?.deadReasons?.length ?? 0) > 0 && !stage.deadReasons.includes(input.deadReason)) {
      throw new TypeError(`order ${input.order} dying at ${current.stage} requires one of: ${stage.deadReasons.join(", ")}`);
    }
    return input;
  }
  const currentIndex = proc.stages.findIndex((entry) => entry.stage === current.stage);
  const nextIndex = proc.stages.findIndex((entry) => entry.stage === input.stage);
  if (nextIndex < currentIndex) throw new TypeError(`order ${input.order} cannot move backward from ${current.stage} to ${input.stage}`);
  if (nextIndex > currentIndex + 1) throw new TypeError(`order ${input.order} cannot skip from ${current.stage} to ${input.stage}`);
  return input;
}
