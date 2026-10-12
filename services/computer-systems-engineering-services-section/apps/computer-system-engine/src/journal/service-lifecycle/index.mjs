import { append } from "@red-cup-engineering/semiotic-eavt-services-section/store";

/** The store type of a service lifecycle log: one line per boundary event. */
export const SERVICE_LIFECYCLE_TYPE = "service-lifecycle";

const DETAIL_CHARS_MAX = 1024;

/** The plain line a boundary event is: what its readers read (who, which boundary, what happened, whether it went well) and when. */
export function serviceLifecycleLine(event) {
  return Object.freeze({
    at: event.at,
    service: event.service,
    boundary: event.boundary,
    event: event.event,
    ok: event.ok,
    ...(event.code === undefined ? {} : { code: event.code }),
    ...(event.signal === undefined ? {} : { signal: event.signal }),
    ...(event.detail === undefined ? {} : { detail: String(event.detail).slice(0, DETAIL_CHARS_MAX) }),
  });
}

/** Append one service lifecycle event to the day's log of `$root/data/logs/service-lifecycle-logs`. */
export function recordServiceLifecycleEvent(
  persistence,
  event,
) {
  append(persistence.dataRoot, SERVICE_LIFECYCLE_TYPE, serviceLifecycleLine(event));
}

/** Append a finite service lifecycle record as its ordered event lines. */
export function recordServiceLifecycleRecord(
  persistence,
  record,
) {
  for (const event of record.events) recordServiceLifecycleEvent(persistence, event);
}

/** Build the event sink used by process/protocol services with the resolved process data root. */
export function filesystemServiceLifecycleSink(
  dataRoot,
  rootName,
) {
  const persistence = Object.freeze({ dataRoot, rootName });
  return (event) => {
    recordServiceLifecycleEvent(persistence, event);
  };
}
