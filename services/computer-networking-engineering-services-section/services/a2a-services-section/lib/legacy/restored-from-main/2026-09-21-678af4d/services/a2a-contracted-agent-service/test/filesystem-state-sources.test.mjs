import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createFilesystemContractedAgentSources,
  createFilesystemContractedAgentSourcesFromEnvironment,
} from "../src/filesystem-state-sources.mjs";
import { resolveContractedAgentState } from "../src/serve-contracted-agent.mjs";

test("filesystem sources persist task and coordination records across compositions", async (t) => {
  const stateRoot = await mkdtemp(join(tmpdir(), "contracted-agent-state-"));
  t.after(() => rm(stateRoot, { recursive: true, force: true }));
  const first = createFilesystemContractedAgentSources({ stateRoot, provider: "provider-a" });
  await first.taskSource.put({ taskId: "task-1", tenant: "tenant-a", state: "submitted" });
  const coordinated = await first.coordinationSource.put({ namespace: "push", tenant: "tenant-a", key: "task-1", state: "ready" });

  const restarted = createFilesystemContractedAgentSources({ stateRoot, provider: "provider-a" });
  assert.deepEqual(await restarted.taskSource.get({ taskId: "task-1", tenant: "tenant-a" }), {
    taskId: "task-1", tenant: "tenant-a", state: "submitted",
  });
  assert.deepEqual(await restarted.taskSource.list({ tenant: "tenant-a" }), [{
    taskId: "task-1", tenant: "tenant-a", state: "submitted",
  }]);
  assert.deepEqual(await restarted.coordinationSource.get({ namespace: "push", tenant: "tenant-a", key: "task-1" }), coordinated);
});

test("provider identities partition one explicit state root", async (t) => {
  const stateRoot = await mkdtemp(join(tmpdir(), "contracted-agent-state-"));
  t.after(() => rm(stateRoot, { recursive: true, force: true }));
  const first = createFilesystemContractedAgentSources({ stateRoot, provider: "provider-a" });
  const second = createFilesystemContractedAgentSources({ stateRoot, provider: "provider-b" });
  await first.taskSource.put({ taskId: "same", state: "first" });
  await second.taskSource.put({ taskId: "same", state: "second" });
  assert.equal((await first.taskSource.get({ taskId: "same" })).state, "first");
  assert.equal((await second.taskSource.get({ taskId: "same" })).state, "second");
});

test("filesystem sources isolate stored records from caller mutation", async (t) => {
  const stateRoot = await mkdtemp(join(tmpdir(), "contracted-agent-state-"));
  t.after(() => rm(stateRoot, { recursive: true, force: true }));
  const { taskSource } = createFilesystemContractedAgentSources({ stateRoot, provider: "provider-a" });
  const input = { taskId: "task-1", state: { phase: "submitted" } };
  const stored = await taskSource.put(input);
  input.state.phase = "changed-input";
  stored.state.phase = "changed-result";
  const read = await taskSource.get({ taskId: "task-1" });
  assert.deepEqual(read, { taskId: "task-1", state: { phase: "submitted" } });
  read.state.phase = "changed-read";
  const listed = await taskSource.list();
  listed[0].state.phase = "changed-list";
  assert.deepEqual(await taskSource.get({ taskId: "task-1" }), {
    taskId: "task-1", state: { phase: "submitted" },
  });
});

test("coordination records retain digest and etag behavior and remove idempotently", async (t) => {
  const stateRoot = await mkdtemp(join(tmpdir(), "contracted-agent-state-"));
  t.after(() => rm(stateRoot, { recursive: true, force: true }));
  const { coordinationSource } = createFilesystemContractedAgentSources({ stateRoot, provider: "provider-a" });
  const record = { namespace: "push", tenant: "tenant-a", key: "task-1", state: "ready" };
  const stored = await coordinationSource.put(record);
  assert.equal(stored.contentSha256, createHash("sha256").update(JSON.stringify(record)).digest("hex"));
  assert.match(stored.etag, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
  assert.deepEqual(await coordinationSource.get(record), stored);
  assert.equal(await coordinationSource.remove(record), true);
  assert.equal(await coordinationSource.remove(record), false);
  assert.equal(await coordinationSource.get(record), null);
});

test("filesystem sources write private records without temporary-file residue", async (t) => {
  const stateRoot = await mkdtemp(join(dirname(fileURLToPath(import.meta.url)), ".contracted-agent-state-"));
  t.after(() => rm(stateRoot, { recursive: true, force: true }));
  const { taskSource } = createFilesystemContractedAgentSources({ stateRoot, provider: "provider-a" });
  await taskSource.put({ taskId: "task-1", state: "submitted" });
  const taskDirectory = join(stateRoot, "provider-a", "tasks");
  const names = await readdir(taskDirectory);
  assert.equal(names.length, 1);
  assert.match(names[0], /^[0-9a-f]{64}\.json$/u);
  assert.equal((await stat(join(taskDirectory, names[0]))).mode & 0o777, 0o600);
});

test("environment composition refuses ambient, relative, and traversal authority", () => {
  assert.throws(() => createFilesystemContractedAgentSourcesFromEnvironment({}), /absolute path/u);
  assert.throws(() => createFilesystemContractedAgentSources({ stateRoot: "relative", provider: "provider-a" }), /absolute path/u);
  assert.throws(() => createFilesystemContractedAgentSources({ stateRoot: "/state", provider: "../foreign" }), /bounded lowercase identifier/u);
  const sources = createFilesystemContractedAgentSourcesFromEnvironment({
    EMSWEB_A2A_STATE_ROOT: "/state/a2a",
    EMSWEB_PROVIDER_NAME: "provider-a",
  });
  assert.equal(typeof sources.taskSource.put, "function");
  assert.equal(typeof sources.coordinationSource.put, "function");
});

test("contracted agent state resolution uses either complete injection or the explicit filesystem environment", () => {
  const injected = {
    taskStore: { kind: "task-store" },
    coordinationSource: { kind: "coordination-source" },
  };
  assert.deepEqual(resolveContractedAgentState(injected, {}), injected);
  assert.throws(
    () => resolveContractedAgentState({ taskStore: injected.taskStore }, {}),
    /one explicit composition/u,
  );
  const composed = resolveContractedAgentState({}, {
    EMSWEB_A2A_STATE_ROOT: "/state/a2a",
    EMSWEB_PROVIDER_NAME: "provider-a",
  });
  assert.equal(typeof composed.taskStore.save, "function");
  assert.equal(typeof composed.coordinationSource.put, "function");
});
