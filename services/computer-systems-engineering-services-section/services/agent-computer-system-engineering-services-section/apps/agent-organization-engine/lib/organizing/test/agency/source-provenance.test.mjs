import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readAgency } from "@red-cup-engineering/organizing/agency";
import { sourceWorkingCopies } from "@red-cup-engineering/computer-code-development-engine/git/working-tree";
import { gitRepositoryObservationPlan, gitHistoryPlan, takeBatchRecord, readTreeEntries } from "@red-cup-engineering/git-services-section/git-command-codec";
import { each, get, put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { isNiUri, makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { AGENCY_SOURCE_IMPORT_TYPE, AGENCY_SOURCE_PROJECTION_TYPE, agencySourceProjectionReceiving, prepareAgencySourceProjection, selectAgencySourceProjection } from "../../src/agency/source-provenance.mjs";

const AT = "2026-10-08T12:00:00Z";
const SOURCE = "services/engineering/lib/agency/offices/operator.json";
const LEAF = "lib/agency/offices/operator.json";
const BODY = JSON.stringify({ id: "operator", name: "Operator", privateContext: "Original private agency text" }, null, 2) + "\n";
const reidentify = copy => {
  const { id: _id, ...content } = copy;
  return { ...content, id: artifactId(content) };
};

async function fixture(t, { nested = false, foreignImport = false, objectFormat = "sha1", targetSource = SOURCE, extraLeafFiles = {}, parentPath = "services/engineering" } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "agency-source-proof-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const environment = { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0",
    GIT_AUTHOR_DATE: AT, GIT_COMMITTER_DATE: AT };
  const git = (directory, args, input) => {
    const result = spawnSync("git", args, { cwd: directory, env: environment, input });
    assert.equal(result.status, 0, result.stderr.toString());
    return result.stdout;
  };
  const repository = (name, files, gitlink) => {
    const directory = path.join(root, name);
    mkdirSync(directory);
    git(directory, ["init", "--initial-branch=main", `--object-format=${objectFormat}`]);
    git(directory, ["config", "user.name", "Fixture"]);
    git(directory, ["config", "user.email", "fixture@example.invalid"]);
    for (const [file, bytes] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      writeFileSync(path.join(directory, file), bytes);
    }
    git(directory, ["add", "."]);
    for (const entry of gitlink ? (Array.isArray(gitlink) ? gitlink : [gitlink]) : [])
      git(directory, ["update-index", "--add", "--cacheinfo", `160000,${entry.commit},${entry.path}`]);
    git(directory, ["commit", "-m", "authored fixture records"]);
    return { sourceRepository: pathToFileURL(directory).href, ref: "refs/heads/main", commit: git(directory, ["rev-parse", "HEAD"]).toString().trim() };
  };
  const leaf = repository("leaf", { [nested ? LEAF : targetSource]: BODY, ...extraLeafFiles });
  const parent = nested ? repository("parent", {
    ".gitmodules": `[submodule "engineering"]\n  path = ${parentPath}\n  url = ${leaf.sourceRepository}\n`,
  }, { commit: leaf.commit, path: parentPath }) : undefined;
  const requests = new Map([leaf, ...(parent ? [parent] : [])].map(value => [value.sourceRepository, value]));
  const workspaceRoot = path.join(root, "copies");
  mkdirSync(workspaceRoot);
  const copies = sourceWorkingCopies({
    resolveCustody: request => requests.has(request.sourceRepository) ? {
      id: `fixture-custody:${request.sourceRepository}`, revision: "fixture-1", evidence: ["fixture:admitted-source-owner"],
      ...request, workspaceRoot,
    } : undefined,
    bindGit: () => async (directory, plan) => {
      const result = spawnSync(plan.command, plan.arguments, { cwd: directory,
        env: { ...environment, ...plan.environment }, input: plan.input, encoding: "utf8" });
      return { status: result.status, stdout: result.stdout };
    },
  });
  const leafCopy = (await copies.acquire(leaf)).sourceBinding;
  const parentCopy = parent ? (await copies.acquire(parent)).sourceBinding : undefined;
  const entryAt = (copy, file) => {
    const plan = gitRepositoryObservationPlan.tree(copy.commit);
    const entry = readTreeEntries(git(copy.repository, plan.arguments).toString()).find(row => row.path === file);
    assert.ok(entry);
    return entry;
  };
  const observe = (copy, file) => {
    const entry = entryAt(copy, file);
    const blob = gitHistoryPlan.blobs([entry.object]);
    const observed = takeBatchRecord(git(copy.repository, blob.arguments, blob.input));
    assert.equal(observed.object, entry.object);
    assert.equal(observed.type, "blob");
    assert.equal(observed.rest.length, 0);
    return { sourceBinding: copy, path: file, entry, bytes: observed.body };
  };
  const source = observe(leafCopy, nested ? LEAF : targetSource);
  const parents = parentCopy ? [{ gitmodules: observe(parentCopy, ".gitmodules"),
    gitlink: { sourceBinding: parentCopy, ...entryAt(parentCopy, parentPath) } }] : [];
  const agencyRoot = path.join(root, "agency");
  mkdirSync(path.dirname(path.join(agencyRoot, targetSource)), { recursive: true });
  writeFileSync(path.join(agencyRoot, targetSource), BODY);
  const received = () => ({ pool: "offices", record: [...readAgency(agencyRoot, { acts: [] }).offices.values()].find(record => record.source === targetSource), bytes: readFileSync(path.join(agencyRoot, targetSource)) });
  const importRoot = path.join(root, foreignImport ? "foreign-native" : "native");
  const observations = new Map();
  const makeImport = (observation = { source, parents }, at = AT, receiving = received()) => {
    const record = receiving.record;
    const target = { pool: "offices", key: record.key, source: record.source, sectionPath: record.sectionPath, id: record.id, revision: record.revision };
    const selection = { sourceBinding: observation.source.sourceBinding.id, sourcePath: observation.source.path, target,
      parents: observation.parents.map(edge => ({ sourceBinding: edge.gitmodules.sourceBinding.id, path: edge.gitlink.path })) };
    selection.exact = makeNiUri(Buffer.from(JSON.stringify([
      selection.sourceBinding, selection.sourcePath,
      [target.pool, target.key, target.source, target.sectionPath, target.id, target.revision],
      selection.parents.map(edge => [edge.sourceBinding, edge.path]),
    ]), "utf8"));
    const imported = put(importRoot, AGENCY_SOURCE_IMPORT_TYPE, { ...selection, at });
    observations.set(imported, observation);
    return imported;
  };
  const witness = makeImport();
  const journalRoot = path.join(root, "native");
  // The projections the receiving custody holds: each with its address and the record as stored.
  const projections = () => [...each(journalRoot, AGENCY_SOURCE_PROJECTION_TYPE)].map(({ address, record }) => ({ id: address, record }));
  const readImport = id => {
    const held = isNiUri(id) ? get(importRoot, AGENCY_SOURCE_IMPORT_TYPE, id) : undefined;
    if (held === undefined) return undefined;
    const { at, ...selection } = held;
    return { ...selection, witness: id, at };
  };
  const receiver = options => agencySourceProjectionReceiving({ root: journalRoot,
    readImport, observeSource: imported => observations.get(imported.witness), readReceived: received, ...options });
  return { root, agencyRoot, source, parents, received, journalRoot, projections, witness, receiver, readImport, makeImport,
    async additionalSource(name, files, gitlink) { const request = repository(name, files, gitlink); requests.set(request.sourceRepository, request); return (await copies.acquire(request)).sourceBinding; },
    observe, entryAt,
    prepare: () => prepareAgencySourceProjection({ source, parents, ...received(), receivedBytes: received().bytes, imported: readImport(witness) }) };
}

test("a genuine direct Git source is retained in the existing native journal and exact replay is one witness", async t => {
  const f = await fixture(t);
  const receiver = f.receiver();
  const first = await receiver.receive(f.witness);
  const again = await receiver.receive(f.witness);
  assert.equal(first.state, "held", JSON.stringify({first, rows:f.projections()}));
  assert.equal(again.witness, first.witness);
  assert.equal(again.appended, 0);
  const rows = f.projections();
  assert.equal(rows.length, 1);
  assert.equal(Buffer.from(rows[0].record.source.material.bytes, "base64").toString(), BODY);
  assert.deepEqual(rows[0].record.causes, [{ type: AGENCY_SOURCE_IMPORT_TYPE, id: f.witness }]);
  assert.equal(JSON.stringify(first.selection).includes("Original private agency text"), false);
  assert.equal(JSON.stringify(first.selection).includes(f.source.sourceBinding.repository), false);
});

test("a genuine parent .gitmodules and gitlink proof retains the full original composition", async t => {
  const f = await fixture(t, { nested: true });
  const result = await f.receiver().receive(f.witness);
  assert.equal(result.state, "held");
  assert.equal(result.selection.correspondence.parents[0].path, "services/engineering");
  const row = f.projections()[0];
  assert.equal(row.record.parents[0].gitlink.commit, f.source.sourceBinding.commit);
  assert.equal(Buffer.from(row.record.parents[0].parent.material.bytes, "base64").toString(), f.parents[0].gitmodules.bytes.toString());
});

test("changed blob bytes or receiving revision fail before any successful source write", async t => {
  const f = await fixture(t);
  const original = f.source.bytes;
  f.source.bytes = Buffer.from("changed source");
  await assert.rejects(f.receiver().receive(f.witness), /selected Git blob/);
  f.source.bytes = original;
  writeFileSync(path.join(f.agencyRoot, SOURCE), BODY.replace("Operator", "Changed"));
  await assert.rejects(f.receiver().receive(f.witness), /not received unchanged/);
  assert.equal(f.projections().length, 0);
});

test("wrong parent pin or custody refuses without writing a projection", async t => {
  const f = await fixture(t, { nested: true });
  const edge = f.parents[0];
  edge.gitlink.object = "0".repeat(40);
  await assert.rejects(f.receiver().receive(f.witness), /child's exact commit/);
  edge.gitlink.object = f.source.sourceBinding.commit;
  edge.gitlink.sourceBinding = reidentify({ ...edge.gitlink.sourceBinding,
    custody: { ...edge.gitlink.sourceBinding.custody, revision: "other-owner-revision" } });
  await assert.rejects(f.receiver().receive(f.witness), /different parent custody/);
  assert.equal(f.projections().length, 0);
});

test("unavailable native import witness cannot be replaced by caller assertions", async t => {
  const f = await fixture(t);
  let observed = false;
  await assert.rejects(f.receiver({ observeSource: () => { observed = true; return { source: f.source }; } }).receive("invented-import"), /original native import is unavailable/);
  assert.equal(observed, false);
  assert.equal(f.projections().length, 0);
});

test("a later agency revision and an unrelated record never inherit an earlier source witness", async t => {
  const f = await fixture(t);
  const receiver = f.receiver();
  await receiver.receive(f.witness);
  assert.equal(receiver.read({ ...f.received().record, key: "services/other#operator", source: "services/other/lib/agency/offices/operator.json" }).state, "unresolved");
  writeFileSync(path.join(f.agencyRoot, SOURCE), BODY.replace("Operator", "Revised"));
  assert.equal(receiver.read(f.received().record).reason, "source-provenance-absent");
  assert.equal(f.projections().length, 1);
});

test("native against evidence remains distinct and prevents automatic selection", async t => {
  const f = await fixture(t);
  const receiver = f.receiver();
  await receiver.receive(f.witness);
  const record = f.projections()[0].record;
  put(f.journalRoot, AGENCY_SOURCE_PROJECTION_TYPE, { ...record, told: { for: false, against: true } });
  assert.equal(receiver.read(f.received().record).reason, "source-evidence-refused");
});

test("a lost receipt after native append reconciles the same original import without another witness", async t => {
  const f = await fixture(t);
  let reads = 0;
  const receiver = f.receiver({ readReceived: () => {
    if (++reads === 2) throw Error("receipt interrupted");
    return f.received();
  } });
  await assert.rejects(receiver.receive(f.witness), /receipt interrupted/);
  const first = f.projections()[0].id;
  const result = await receiver.receive(f.witness);
  assert.equal(result.witness, first);
  assert.equal(result.appended, 0);
  assert.equal(result.state, "held");
  assert.equal(f.projections().length, 1);
});

test("an authentic import from another custody is not reported as locally received", async t => {
  const f = await fixture(t, { foreignImport: true });
  const result = await f.receiver().receive(f.witness);
  assert.equal(result.state, "unresolved");
  assert.equal(result.recorded, false);
  assert.equal(result.witness, undefined);
  assert.equal(typeof result.proposed, "string");
  assert.equal(f.projections().length, 0);
});

test("different genuine repositories with equal record bytes remain ambiguous source correspondences", async t => {
  const f = await fixture(t);
  const receiver = f.receiver();
  await receiver.receive(f.witness);
  const other = await f.additionalSource("other", { [SOURCE]: BODY });
  const witness = f.makeImport({ source: f.observe(other, SOURCE), parents: [] });
  const result = await receiver.receive(witness);
  assert.equal(result.selection.reason, "ambiguous-source-correspondence");
  assert.equal(result.selection.candidates.length, 2);
  assert.equal(f.projections().length, 2);
});

test("equal correspondence retains distinct original import witness histories", async t => {
  const f = await fixture(t);
  const receiver = f.receiver();
  await receiver.receive(f.witness);
  const next = f.makeImport(undefined, "2026-10-08T12:01:00Z");
  const result = await receiver.receive(next);
  assert.equal(result.state, "held");
  assert.equal(result.selection.witnesses.length, 2);
  assert.notEqual(result.selection.witnesses[0].id, result.selection.witnesses[1].id);
  assert.equal(f.projections().length, 2);
});

test("a valid source observation cannot be substituted under a different original import", async t => {
  const f = await fixture(t);
  const other = await f.additionalSource("other", { [SOURCE]: BODY });
  await assert.rejects(f.receiver({ observeSource: () => ({ source: f.observe(other, SOURCE), parents: [] }) }).receive(f.witness), /original native import does not bind/);
  assert.equal(f.projections().length, 0);
});

test("duplicate and multiply mounted parent declarations refuse before projection admission", async t => {
  const f = await fixture(t, { nested: true });
  for (const [name, secondPath] of [["duplicate", "services/engineering"], ["multiple", "services/other"]]) {
    const commit = f.source.sourceBinding.commit;
    const url = f.source.sourceBinding.sourceRepository;
    const parent = await f.additionalSource(name, {
      ".gitmodules": `[submodule "one"]\n path = services/engineering\n url = ${url}\n[submodule "two"]\n path = ${secondPath}\n url = ${url}\n`,
    }, [...new Set(["services/engineering", secondPath])].map(path => ({ path, commit })));
    const observation = { source: f.source, parents: [{ gitmodules: f.observe(parent, ".gitmodules"),
      gitlink: { sourceBinding: parent, ...f.entryAt(parent, "services/engineering") } }] };
    await assert.rejects(f.receiver().receive(f.makeImport(observation)), /missing, ambiguous, or not composed/);
  }
  assert.equal(f.projections().length, 0);
});

test("source paths and nonregular Git entries cannot turn into source ownership", async t => {
  const f = await fixture(t);
  const source = f.source;
  for (const invalid of ["../outside", "/absolute", "services/./record", "services\\record", "services/.git/config"]) {
    await assert.rejects(f.receiver({ observeSource: () => ({ source: { ...source, path: invalid }, parents: [] }) }).receive(f.witness), /exact relative source path/);
  }
  await assert.rejects(f.receiver({ observeSource: () => ({ source: { ...source, entry: { ...source.entry, mode: "120000" } }, parents: [] }) }).receive(f.witness), /regular Git blob/);
  assert.equal(f.projections().length, 0);
});


test("a genuine SHA-256 Git repository uses its own blob identity format", async t => {
  const f = await fixture(t, { objectFormat: "sha256" });
  assert.equal(f.source.sourceBinding.commit.length, 64);
  assert.equal(f.source.entry.object.length, 64);
  assert.equal((await f.receiver().receive(f.witness)).state, "held");
});

test("the native source carrier preserves an exact decomposed Unicode Git path", async t => {
  const source = "services/cafe\u0301/lib/agency/offices/operator.json";
  const f = await fixture(t, { targetSource: source });
  const result = await f.receiver().receive(f.witness);
  assert.equal(result.state, "held");
  assert.equal(result.selection.correspondence.source.path, source);
});

test("NFC-equivalent paths in one genuine Git tree retain distinct byte commitments", async t => {
  const composed = "services/caf\u00e9/lib/agency/offices/operator.json";
  const decomposed = "services/cafe\u0301/lib/agency/offices/operator.json";
  const f = await fixture(t, { targetSource: composed, extraLeafFiles: { [decomposed]: BODY } });
  const observation = { source: f.observe(f.source.sourceBinding, decomposed), parents: [] };
  assert.equal(observation.source.entry.object, f.source.entry.object);
  mkdirSync(path.dirname(path.join(f.agencyRoot, decomposed)), { recursive: true });
  writeFileSync(path.join(f.agencyRoot, decomposed), BODY);
  const secondReceived = () => ({ pool: "offices",
    record: [...readAgency(f.agencyRoot, { acts: [] }).offices.values()].find(record => record.source === decomposed),
    bytes: readFileSync(path.join(f.agencyRoot, decomposed)) });
  const one = await f.receiver().receive(f.witness);
  const two = await f.receiver({ readReceived: secondReceived }).receive(f.makeImport(observation, AT, secondReceived()));
  assert.equal(one.state, "held");
  assert.equal(two.state, "held");
  const { exact: firstExact, id: _firstId, ...first } = one.selection.correspondence;
  const { exact: secondExact, id: _secondId, ...second } = two.selection.correspondence;
  assert.equal(artifactId(first), artifactId(second));
  assert.notEqual(firstExact.id, secondExact.id);
  assert.notEqual(one.selection.correspondence.id, two.selection.correspondence.id);
  assert.equal(two.selection.correspondence.source.path, decomposed);
});

test("an NFC-equivalent parent path cannot replace the original native import selection", async t => {
  const parentPath = "services/caf\u00e9";
  const f = await fixture(t, { nested: true, parentPath, targetSource: `${parentPath}/${LEAF}` });
  const changed = { source: f.source, parents: f.parents.map(edge => ({ ...edge,
    gitlink: { ...edge.gitlink, path: "services/cafe\u0301" } })) };
  const witness = f.makeImport(changed);
  await assert.rejects(f.receiver({ observeSource: () => ({ source: f.source, parents: f.parents }) }).receive(witness), /original native import does not bind/);
  assert.equal(f.projections().length, 0);
});


test("malformed persisted source evidence cannot disclose private validation details", async t => {
  const f = await fixture(t);
  const sentinel = "PRIVATE_ORIGINAL_PAYLOAD_DO_NOT_DISCLOSE";
  const record = structuredClone(f.prepare());
  record.source[sentinel] = sentinel;
  const selected = selectAgencySourceProjection([{ id: sentinel, record, told: { for: true, against: false } }], f.received().record);
  assert.deepEqual(selected, { state: "unresolved", reason: "source-evidence-refused",
    refused: [{ reason: "invalid-source-projection" }] });
  assert.equal(JSON.stringify(selected).includes(sentinel), false);
});

test("changed second readback keeps the recorded witness but refuses current receiving", async t => {
  const f = await fixture(t);
  let reads = 0;
  const receiver = f.receiver({ readReceived: () => {
    const current = f.received();
    return ++reads === 1 ? current : { ...current, bytes: Buffer.from("changed after original receiving") };
  } });
  const result = await receiver.receive(f.witness);
  assert.equal(result.recorded, true);
  assert.equal(typeof result.witness, "string");
  assert.equal(result.state, "unresolved");
  assert.equal(result.selection.reason, "current-readback-invalid");
  assert.equal(f.projections().length, 1);
});
