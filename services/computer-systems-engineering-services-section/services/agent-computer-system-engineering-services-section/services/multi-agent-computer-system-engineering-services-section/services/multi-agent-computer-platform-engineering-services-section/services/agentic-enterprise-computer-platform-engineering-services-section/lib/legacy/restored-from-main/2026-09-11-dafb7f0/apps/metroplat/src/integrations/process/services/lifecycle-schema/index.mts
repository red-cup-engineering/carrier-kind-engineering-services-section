import type {
  ServiceLifecycleEvent,
  ServiceLifecycleRecord,
} from "./schema.mts";
import { requireJsonValue, type JsonValue } from "../../../../lib/codecs/json/core.mts";
import { toEavt, type EAVT } from "../../../../lib/codecs/json/jsonl/eavt/index.mts";
import type { Feed } from "../../../../lib/addressing/index.mts";
import type { StatementCoordinate, StatementValue } from "@red-cup-engineering/feltos/records/persistence";

function lifecycleEntity(event: ServiceLifecycleEvent): JsonValue {
  return Object.freeze(["metroplat/services/lifecycle", event.service, event.boundary]);
}

function lifecycleAttribute(event: ServiceLifecycleEvent): JsonValue {
  return Object.freeze({
    event: event.event,
    ok: event.ok,
  });
}

function lifecycleValue(event: ServiceLifecycleEvent): StatementValue {
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
  }), "service lifecycle event") as StatementValue;
}

/** The service lifecycle feed: one concrete boundary event becomes one source EAVT row. */
export const serviceLifecycleFeed: Feed<ServiceLifecycleEvent> = Object.freeze({
  name: "service-lifecycle",
  functional: Object.freeze([]),
  cellize: (event: ServiceLifecycleEvent, at: StatementCoordinate): readonly EAVT[] => Object.freeze([
    toEavt({
      e: lifecycleEntity(event),
      a: lifecycleAttribute(event),
      v: lifecycleValue(event),
      t: requireJsonValue(at, "service lifecycle event time"),
    }),
  ]),
});

/** Cellize one service lifecycle event through the package-owned feed. */
export function serviceLifecycleEventRows(event: ServiceLifecycleEvent): readonly EAVT[] {
  return serviceLifecycleFeed.cellize(event, event.at);
}

/** Cellize a finite lifecycle record as its ordered service event rows. */
export function serviceLifecycleRecordRows(record: ServiceLifecycleRecord): readonly EAVT[] {
  return Object.freeze(record.events.flatMap((event) => [...serviceLifecycleEventRows(event)]));
}
