

import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { toEavt } from "@red-cup-engineering/eavt-services-section/row";

function lifecycleEntity(event) {
  return Object.freeze(["node-process/services/lifecycle", event.service, event.boundary]);
}

function lifecycleAttribute(event) {
  return Object.freeze({
    event: event.event,
    ok: event.ok,
  });
}

function lifecycleValue(event) {
  return requireJsonValue(Object.freeze({
    kind: event.kind,
    service: event.service,
    boundary: event.boundary,
    event: event.event,
    at: event.at,
    ok: event.ok,
    ...(event.code === undefined ? {} : { code: event.code }),
    ...(event.signal === undefined ? {} : { signal: event.signal }),
    ...(event.detail === undefined ? {} : { detail: event.detail }),
    evidence: Object.freeze([...event.evidence]),
  }), "service lifecycle event");
}

/** The service lifecycle feed: one concrete boundary event becomes one source EAVT row. */
export const serviceLifecycleFeed = Object.freeze({
  name: "service-lifecycle",
  functional: Object.freeze([]),
  cellize: (event, at) => Object.freeze([
    toEavt({
      e: lifecycleEntity(event),
      a: lifecycleAttribute(event),
      v: lifecycleValue(event),
      t: requireJsonValue(at, "service lifecycle event time"),
    }),
  ]),
});

/** Cellize one service lifecycle event through the package-owned feed. */
export function serviceLifecycleEventRows(event) {
  return serviceLifecycleFeed.cellize(event, event.at);
}

/** Cellize a finite lifecycle record as its ordered service event rows. */
export function serviceLifecycleRecordRows(record) {
  return Object.freeze(record.events.flatMap((event) => [...serviceLifecycleEventRows(event)]));
}
