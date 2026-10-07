/** Operational/industrial control records for enterprise ERP/ICS/CRM state. */
export const CONTROL_EVENT_TYPES = Object.freeze([
  "command",
  "acknowledgement",
  "observation",
  "alarm",
  "correction",
  "release",
]);

export const CONTROL_DISPOSITIONS = Object.freeze([
  "recorded",
  "issued",
  "accepted",
  "rejected",
  "satisfied",
  "deviated",
  "faulted",
  "cleared",
  "cancelled",
]);

const authorityTypes = new Set(["command", "correction", "release"]);
const observationTypes = new Set(["observation", "alarm"]);

function nonempty(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

export function validateControlRecord(record) {
  nonempty(record.enterprise, "enterprise control enterprise");
  nonempty(record.control, "enterprise control id");
  nonempty(record.target, "enterprise control target");
  if (!CONTROL_EVENT_TYPES.includes(record.type)) throw new TypeError(`unknown enterprise control type: ${record.type}`);
  if (!CONTROL_DISPOSITIONS.includes(record.disposition)) throw new TypeError(`unknown enterprise control disposition: ${record.disposition}`);
  if (authorityTypes.has(record.type)) nonempty(record.authoritySource, "enterprise control authoritySource");
  if (observationTypes.has(record.type)) nonempty(record.observationSource, "enterprise control observationSource");
  if ((record.type === "command" || record.type === "correction")
    && !(typeof record.instruction === "string" && record.instruction.trim() !== "")
    && record.desiredState === undefined) {
    throw new TypeError("enterprise control command/correction requires instruction or desiredState");
  }
  return record;
}

export function currentControls(records) {
  const grouped = new Map();
  for (const record of records) {
    validateControlRecord(record);
    const list = grouped.get(record.control) ?? [];
    list.push(record);
    grouped.set(record.control, list);
  }
  return Object.freeze([...grouped.entries()].map(([control, history]) => {
    const sorted = [...history].sort((a,b)=>String(a.recordedAt).localeCompare(String(b.recordedAt)));
    let standing = "idle";
    let unresolvedAlarm = false;
    for (const event of sorted) {
      if (event.type === "command" || event.type === "correction") {
        standing = ["cancelled","rejected"].includes(event.disposition) ? "idle" : "commanded";
      } else if (event.type === "acknowledgement") {
        if (event.disposition === "accepted") standing = "acknowledged";
        if (event.disposition === "rejected") standing = "deviated";
      } else if (event.type === "observation") {
        if (event.disposition === "satisfied") standing = "satisfied";
        if (event.disposition === "deviated") standing = "deviated";
        if (event.disposition === "faulted") standing = "faulted";
      } else if (event.type === "alarm") {
        if (["faulted","deviated"].includes(event.disposition)) {
          unresolvedAlarm = true;
          standing = "faulted";
        } else if (event.disposition === "cleared") {
          unresolvedAlarm = false;
          standing = "acknowledged";
        }
      } else if (event.type === "release" && ["accepted","issued"].includes(event.disposition)) {
        unresolvedAlarm = false;
        standing = "released";
      }
    }
    return Object.freeze({
      control,
      enterprise: sorted.at(-1)?.enterprise,
      target: sorted.at(-1)?.target,
      standing,
      unresolvedAlarm,
      latest: sorted.at(-1),
      history: Object.freeze(sorted),
    });
  }));
}
