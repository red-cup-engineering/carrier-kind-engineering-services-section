import { createHash } from "node:crypto";

function optionalText(value) { if (value === undefined || value === null) return null; const text = String(value).trim(); return text === "" ? null : text; }
function requiredText(value, name) { const text = optionalText(value); if (text === null) throw new TypeError(`${name} must be a nonempty string`); return text; }
function hash(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 56) || "goal"; }
function priority(value) { const number = Number(value ?? 50); return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 50; }
function titleFor(value, goalText) { const explicit = optionalText(value); if (explicit !== null) return explicit.slice(0, 120); return (goalText.split(/\r?\n/u).find((line) => line.trim() !== "") ?? goalText).trim().replace(/\s+/gu, " ").slice(0, 88) || "Untitled goal"; }

/** Admit one goal submission without acquiring or mutating its journal. */
export function admitGoalSubmission(params, options = {}) {
  const at = requiredText(options.at ?? params.at, "at");
  const text = requiredText(params.text ?? params.q, "goal text");
  const title = titleFor(params.title, text);
  const focus = optionalText(params.focus);
  const goalPriority = priority(params.priority);
  const source = optionalText(params.source) ?? "planned-transition-admission-service";
  const eventId = `goal-event:${hash({ at, text, title, focus, priority: goalPriority, source }).slice(0, 24)}`;
  const id = `goal:${slug(title)}:${hash({ text, title, at }).slice(0, 12)}`;
  const value = Object.freeze({ kind: "planned-transition.goal.event", event: "submitted", eventId, at, title, text, status: "proposed", priority: goalPriority, ...(focus === null ? {} : { focus }), source });
  return Object.freeze({ kind: "planned-transition.goal-event-admission", accepted: true, id, value, event: Object.freeze([id, "planned-transition.goal.submitted", value, Object.freeze({ at, eventId })]) });
}
