import assert from "node:assert/strict";
import test from "node:test";
import { projectHookTaskWorkCommand, projectHookWorkCommand } from "../src/hook-work-command.mjs";

const hook = Object.freeze({ kind: "hook.event", hookEventName: "UserPromptSubmit", session: "s1", harness: "codex", agent: "codex", cwd: "/repo", paths: Object.freeze(["/repo"]), payload: Object.freeze({ prompt: "Migrate the capability" }) });
test("projects prompt hooks to start then update commands from explicit work state", () => {
  assert.equal(projectHookWorkCommand(hook, { items: [] }).command, "start");
  const active = { id: "work:one", status: "active", workStatus: "open", gate: "stop", session: "s1" };
  const command = projectHookWorkCommand(hook, { items: [active] });
  assert.equal(command.command, "update");
  assert.equal(command.params.id, "work:one");
});

test("projects harness task creation and completion into work commands", () => {
  const createdHook = { ...hook, hookEventName: "TaskCreated", payload: { task_id: "t1", subject: "Inspect code" } };
  assert.equal(projectHookTaskWorkCommand(createdHook, { items: [] }).command, "start");
  const completedHook = { ...createdHook, hookEventName: "TaskCompleted" };
  const item = { id: "work:t1", status: "active", workStatus: "open", evidence: ["task:t1"] };
  assert.equal(projectHookTaskWorkCommand(completedHook, { items: [item] }).command, "complete");
});
