import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createRepositoryObservationHandlers } from "@red-cup-engineering/computer-system-engine/repository-observation";

test("repository observations are bounded beneath the admitted root", async (t) => {
  const fixture = await mkdtemp(join(tmpdir(), "receiver-tools-"));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const root = join(fixture, "repository");
  await mkdir(root);
  await writeFile(join(root, "theory.md"), "alpha\nbeta attention\ngamma\n", "utf8");
  const handlers = createRepositoryObservationHandlers({ root });
  const read = await handlers.read_repository_file({ path: "theory.md", startLine: 2, maximumLines: 1 });
  assert.equal(read.text, "beta attention");
  const search = await handlers.search_repository({ query: "attention", maximumMatches: 2 });
  assert.deepEqual(search.paths, ["theory.md"]);
  const absent = await handlers.search_repository({ query: "attention", path: "invented" });
  assert.equal(absent.type, "RepositorySearchRefusal");
  assert.equal(absent.suggestedPath, ".");
  const paths = await handlers.find_repository_paths({ fragment: "theory", maximumPaths: 2 });
  assert.deepEqual(paths.paths, ["theory.md"]);
  await assert.rejects(handlers.read_repository_file({ path: "../foreign" }), /beneath the admitted root/u);

  const absentPaths = await handlers.find_repository_paths({ fragment: "theory", path: "invented" });
  assert.equal(absentPaths.type, "RepositoryPathRefusal");
  assert.equal(absentPaths.suggestedPath, ".");

  // All data, including the out-of-root target, is synthetic and fixture-local.
  const outside = join(fixture, "outside");
  await mkdir(join(outside, "sub"), { recursive: true });
  await writeFile(join(outside, "sub", "probe.md"), "synthetic outside marker\n", "utf8");
  await symlink(outside, join(root, "outside-link"), "dir");
  await symlink(join(outside, "sub", "probe.md"), join(root, "outside-file.md"), "file");
  for (const path of ["outside-file.md", "outside-link/sub/probe.md"]) {
    await assert.rejects(handlers.read_repository_file({ path }), /resolve beneath the admitted root/u);
  }
  for (const path of ["outside-file.md", "outside-link", "outside-link/sub"]) {
    await assert.rejects(handlers.search_repository({ query: "synthetic outside", path }), /resolve beneath the admitted root/u);
    await assert.rejects(handlers.find_repository_paths({ fragment: "probe", path }), /resolve beneath the admitted root/u);
  }

  // In-root links and an admitted root that is itself a link keep their spelling.
  await mkdir(join(root, "nested"));
  await writeFile(join(root, "nested", "inside.md"), "synthetic inside marker\n", "utf8");
  await symlink(join(root, "nested"), join(root, "inside-link"), "dir");
  const insideRead = await handlers.read_repository_file({ path: "inside-link/inside.md", maximumLines: 1 });
  assert.equal(insideRead.text, "synthetic inside marker");
  assert.equal(insideRead.path, "inside-link/inside.md");
  const insideSearch = await handlers.search_repository({ query: "synthetic inside", path: "inside-link" });
  assert.deepEqual(insideSearch.paths, ["inside-link/inside.md"]);
  const insidePaths = await handlers.find_repository_paths({ fragment: "inside", path: "inside-link" });
  assert.deepEqual(insidePaths.paths, ["inside-link/inside.md"]);

  const alias = join(fixture, "admitted-root-link");
  await symlink(root, alias, "dir");
  const aliasedHandlers = createRepositoryObservationHandlers({ root: alias });
  assert.equal((await aliasedHandlers.read_repository_file({ path: "theory.md", startLine: 2, maximumLines: 1 })).text, "beta attention");
  assert.deepEqual((await aliasedHandlers.search_repository({ query: "attention" })).paths, ["theory.md"]);
  assert.deepEqual((await aliasedHandlers.find_repository_paths({ fragment: "theory" })).paths, ["theory.md"]);
});

test("machine observation exposes quantities without granting mutation", async () => {
  const observation = await createRepositoryObservationHandlers({ root: process.cwd() }).observe_machine_territory();
  assert.equal(observation.type, "MachineTerritoryObservation");
  assert.ok(observation.cpuCount > 0);
  assert.ok(observation.totalMemoryBytes >= observation.freeMemoryBytes);
});
