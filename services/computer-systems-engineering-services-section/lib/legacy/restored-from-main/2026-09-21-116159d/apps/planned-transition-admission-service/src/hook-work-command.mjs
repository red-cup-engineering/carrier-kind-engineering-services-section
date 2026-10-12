function text(value) { if (value === undefined || value === null) return null; const result = String(value).trim(); return result === "" ? null : result; }
function promptText(payload) { for (const key of ["prompt", "user_prompt", "message", "text"]) if (text(payload?.[key]) !== null) return text(payload[key]); for (const nested of [payload?.event, payload?.payload]) if (nested && typeof nested === "object") for (const key of ["prompt", "user_prompt", "message", "text"]) if (text(nested[key]) !== null) return text(nested[key]); return null; }
function titleForPrompt(prompt) { return (prompt.split(/\r?\n/u).find((line) => line.trim() !== "") ?? prompt).trim().replace(/\s+/gu, " ").split(" ").slice(0, 12).join(" ").slice(0, 120) || "User prompt work"; }
function open(item) { return item.status !== "complete" && item.workStatus !== "done" && !["abandoned", "deferred"].includes(item.workStatus); }

/** Project a normalized hook and explicit work snapshot into at most one work command. */
export function projectHookWorkCommand(hook, snapshot, options = {}) {
  if (!hook || hook.kind !== "hook.event") throw new TypeError("hook must be a normalized hook.event");
  if (!snapshot || !Array.isArray(snapshot.items)) throw new TypeError("snapshot must expose work items");
  const session = hook.session === "unknown-session" ? null : hook.session;
  const active = session === null ? null : snapshot.items.find((item) => open(item) && item.gate === "stop" && item.session === session) ?? null;
  const evidence = Object.freeze(hook.paths);
  const source = text(options.source) ?? `${hook.harness}.hook`;
  if (hook.hookEventName === "UserPromptSubmit") {
    const prompt = promptText(hook.payload) ?? "User prompt submitted";
    if (active !== null) return Object.freeze({ kind: "hook-work.command", recorded: true, reason: "update active work from user prompt", command: "update", params: Object.freeze({ id: active.id, note: `UserPromptSubmit: ${prompt.slice(0, 1000)}`, ...(session === null ? {} : { session }), evidence, source }) });
    return Object.freeze({ kind: "hook-work.command", recorded: true, reason: "start work from user prompt", command: "start", params: Object.freeze({ title: titleForPrompt(prompt), intent: prompt, success: "Respond to the user prompt and complete this work item with outcome and evidence before stopping.", focus: hook.cwd ?? `${hook.harness}.session`, agent: hook.agent, ...(session === null ? {} : { session }), ...(Array.isArray(options.contributesTo) && options.contributesTo.length > 0 ? { contributesTo: options.contributesTo } : {}), evidence, source }) });
  }
  if (active === null) return Object.freeze({ kind: "hook-work.command", recorded: false, reason: "no active session work for non-prompt hook event", command: null, params: null });
  return Object.freeze({ kind: "hook-work.command", recorded: true, reason: "update active work from lifecycle hook", command: "update", params: Object.freeze({ id: active.id, note: `${hook.hookEventName} hook observed`, ...(session === null ? {} : { session }), evidence, source }) });
}

/** Project harness task lifecycle events into the shared work journal. */
export function projectHookTaskWorkCommand(hook, snapshot, options = {}) {
  if (!hook || hook.kind !== "hook.event") throw new TypeError("hook must be a normalized hook.event");
  if (!snapshot || !Array.isArray(snapshot.items)) throw new TypeError("snapshot must expose work items");
  const taskId = text(hook.payload.task_id ?? hook.payload.taskId ?? hook.payload.id);
  const subject = text(hook.payload.subject ?? hook.payload.title ?? hook.payload.description) ?? (taskId === null ? "harness task" : `harness task ${taskId}`);
  const tag = `task:${taskId ?? subject}`; const source = text(options.source) ?? `${hook.harness}.task-bridge`;
  if (hook.hookEventName === "TaskCreated") return Object.freeze({ kind: "hook-task-work.command", bridged: true, command: "start", params: Object.freeze({ title: subject, intent: subject, success: "Complete the harness task and let TaskCompleted settle this work item.", workKind: "task", gate: "record", agent: hook.agent, ...(hook.session === "unknown-session" ? {} : { session: hook.session }), evidence: Object.freeze([tag, `${hook.harness}.task`]), source }) });
  if (hook.hookEventName === "TaskCompleted") { const item = snapshot.items.find((candidate) => open(candidate) && candidate.evidence?.some((value) => value.includes(tag))); if (item === undefined) return Object.freeze({ kind: "hook-task-work.command", bridged: false, reason: `no open work tagged ${tag}`, command: null, params: null }); return Object.freeze({ kind: "hook-task-work.command", bridged: true, command: "complete", params: Object.freeze({ id: item.id, outcome: `Harness task completed: ${subject}`, evidence: Object.freeze([tag]), source }) }); }
  return Object.freeze({ kind: "hook-task-work.command", bridged: false, reason: `unbridged event ${hook.hookEventName}`, command: null, params: null });
}
