import type {
  ServiceLifecycleEvent,
  ServiceLifecycleRecord,
} from "@red-cup-engineering/node-process-services-section/lifecycle-schema";
import {
  serviceLifecycleEventRows,
  serviceLifecycleFeed,
  serviceLifecycleRecordRows,
} from "../../monitoring/service-lifecycle/eavt-rows.mts";
import {
  openJournal,
  type EventWriteResult,
} from "../../journal/index.mts";

export interface ServiceLifecyclePersistence {
  readonly dataRoot: string;
  readonly rootName: string;
}

/** Persist one service lifecycle event under `$root/data/journals/...`. */
export function recordServiceLifecycleEvent(
  persistence: ServiceLifecyclePersistence,
  event: ServiceLifecycleEvent,
): EventWriteResult {
  return openJournal(persistence.dataRoot).appendRows(serviceLifecycleFeed.name, serviceLifecycleEventRows(event), {
    at: event.at,
    rootName: persistence.rootName,
    // One daily service-lifecycle feed: the subject token names the material,
    // and each row's caller carries its service.
    caller: Object.freeze({
      service: event.service,
      boundary: event.boundary,
      event: event.event,
    }),
  });
}

/** Persist a finite service lifecycle record under `$root/data/journals/...`. */
export function recordServiceLifecycleRecord(
  persistence: ServiceLifecyclePersistence,
  record: ServiceLifecycleRecord,
): EventWriteResult {
  const at = record.events[record.events.length - 1]?.at ?? "0000-00-00";
  return openJournal(persistence.dataRoot).appendRows(serviceLifecycleFeed.name, serviceLifecycleRecordRows(record), {
    at,
    rootName: persistence.rootName,
    caller: Object.freeze({
      service: record.service,
      boundary: record.boundary,
      record: "service-lifecycle",
    }),
  });
}

/** Build the event sink used by process/protocol services with the resolved process data root. */
export function filesystemServiceLifecycleSink(
  dataRoot: string,
  rootName: string,
): (event: ServiceLifecycleEvent) => void {
  const persistence = Object.freeze({ dataRoot, rootName });
  return (event: ServiceLifecycleEvent): void => {
    recordServiceLifecycleEvent(persistence, event);
  };
}
