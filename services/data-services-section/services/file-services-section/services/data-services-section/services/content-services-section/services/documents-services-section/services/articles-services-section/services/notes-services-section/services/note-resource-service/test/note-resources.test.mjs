import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { catalogNodeNotes, depositNoteCarrier, NOTE_PROOF_PATH, NOTE_RESOURCE_CATALOG } from "../src/note-resources.mjs";

const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

test("declares the full typed restriction chain and recovered capability imports", () => {
  assert.deepEqual(NOTE_RESOURCE_CATALOG.nodes.map(({ type }) => type), NOTE_PROOF_PATH);
  assert.equal(NOTE_RESOURCE_CATALOG.nodes.at(-1).parent, "article");
  assert.ok(NOTE_RESOURCE_CATALOG.imports.includes("@red-cup-engineering/immutable-content-custody-service"));
});

test("deposits and catalogs one typed dated note", async () => {
  const root = await mkdtemp(join(tmpdir(), "note-resource-"));
  try {
    const body = "A provider claim with citations.";
    const deposited = await depositNoteCarrier({ nodeRoot: root, date: "2026-07-29", title: "A Report", carrier: { content: body, sha256: sha(body) }, source: { provider: "notebooklm", notebookId: "nb-1", artifactId: "report-1" } });
    assert.equal(deposited.disposition, "created");
    assert.equal(deposited.sourceResource, sha(body));
    assert.deepEqual(deposited.proofPath, NOTE_PROOF_PATH);
    const text = await readFile(join(root, deposited.path), "utf8");
    assert.match(text, /status: research/u);
    assert.match(text, /source-artifactId: "report-1"/u);
    const catalog = await catalogNodeNotes({ nodeRoot: root });
    assert.equal(catalog.resourceCount, 1);
    assert.equal(catalog.resources[0].path, deposited.path);
    assert.equal(catalog.resources[0].identity, deposited.resource);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("is idempotent for exact bytes and refuses digest mismatch", async () => {
  const root = await mkdtemp(join(tmpdir(), "note-resource-"));
  try {
    const input = { nodeRoot: root, date: "2026-07-29", title: "Same", carrier: { content: "same" }, mode: "upsert" };
    assert.equal((await depositNoteCarrier(input)).disposition, "created");
    assert.equal((await depositNoteCarrier(input)).disposition, "already-present");
    await assert.rejects(() => depositNoteCarrier({ ...input, title: "Bad", carrier: { content: "same", sha256: sha("different") } }), /do not match/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("equal source bytes at different proof paths are distinct resources", async () => {
  const root = await mkdtemp(join(tmpdir(), "note-resource-"));
  try {
    const left = await depositNoteCarrier({ nodeRoot: root, date: "2026-07-29", title: "Left", carrier: { content: "same" } });
    const right = await depositNoteCarrier({ nodeRoot: root, date: "2026-07-29", title: "Right", carrier: { content: "same" } });
    assert.notEqual(left.path, right.path);
    assert.notEqual(left.resource, right.resource);
    assert.equal(left.sourceResource, right.sourceResource);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("catalog does not follow symlinks outside the actuator node", async () => {
  const root = await mkdtemp(join(tmpdir(), "note-resource-"));
  const outside = await mkdtemp(join(tmpdir(), "note-resource-outside-"));
  try {
    await depositNoteCarrier({ nodeRoot: root, date: "2026-07-29", title: "Inside", carrier: { content: "inside" } });
    await symlink(outside, join(root, "content/documents/articles/notes/2026/07/29/outside"));
    assert.equal((await catalogNodeNotes({ nodeRoot: root })).resourceCount, 1);
  } finally { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
});
