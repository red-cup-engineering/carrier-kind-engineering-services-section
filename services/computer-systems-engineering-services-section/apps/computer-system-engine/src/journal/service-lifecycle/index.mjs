

import {
  serviceLifecycleEventRows,
  serviceLifecycleFeed,
  serviceLifecycleRecordRows,
} from "./eavt-rows.mjs";
import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";

/** Persist one service lifecycle event under `$root/data/journals/...`. */
export function recordServiceLifecycleEvent(
  persistence,
  event,
) {
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
  persistence,
  record,
) {
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
  dataRoot,
  rootName,
) {
  const persistence = Object.freeze({ dataRoot, rootName });
  return (event) => {
    recordServiceLifecycleEvent(persistence, event);
  };
}
