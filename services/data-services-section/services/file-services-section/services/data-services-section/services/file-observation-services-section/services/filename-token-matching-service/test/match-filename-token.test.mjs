import assert from "node:assert/strict";
import test from "node:test";

import { matchFilenameToken } from "../src/match-filename-token.mjs";

const FILES = Object.freeze([
  { path: "services/witness-journal-rdf-projection-service/README.md" },
  { path: "services/witness-journal-rdf-projection-service/package.json" },
  { path: "services/witness-journal-rdf-projection-service/ops/cloud-run/README.md" },
  { path: "services/cover-nerve-rank-readout-service/README.md" },
  { path: "services/other-service/WitnessJournal.md" },
  { path: "services/other-service/src/notes.mjs" },
]);

test("matches the token against the full relative path, not just the basename", () => {
  const matches = matchFilenameToken({ token: "WitnessJournal", files: FILES });
  const paths = matches.map((m) => m.path);
  assert.ok(paths.includes("services/witness-journal-rdf-projection-service/README.md"));
  assert.ok(paths.includes("services/witness-journal-rdf-projection-service/ops/cloud-run/README.md"));
  assert.equal(paths.includes("services/other-service/src/notes.mjs"), false);
});

test("is case-folded by default", () => {
  const matches = matchFilenameToken({ token: "witnessJournal", files: FILES });
  assert.ok(matches.some((m) => m.path === "services/witness-journal-rdf-projection-service/README.md"));
});

test("case-sensitive option excludes a differently-cased hit", () => {
  const matches = matchFilenameToken({ token: "witnessJournal", files: FILES, options: { caseSensitive: true } });
  assert.equal(matches.some((m) => m.path.includes("witness-journal-rdf-projection-service")), true);
  assert.equal(matches.some((m) => m.path === "services/other-service/WitnessJournal.md"), false);
});

test("an exact basename match outranks a path-substring match, then sorts alphabetically", () => {
  const files = Object.freeze([
    { path: "a/deep/RMN-notes.md" },
    { path: "b/RMN.md" },
    { path: "a/RMN.md" },
  ]);
  const matches = matchFilenameToken({ token: "RMN", files });
  assert.deepEqual(matches.map((m) => m.path), ["a/RMN.md", "b/RMN.md", "a/deep/RMN-notes.md"]);
});

test("word-boundary option rejects a substring embedded in a longer undelimited word", () => {
  const files = Object.freeze([
    { path: "services/sitemap-service/README.md" },
    { path: "services/map-projection-service/README.md" },
  ]);
  const noBoundary = matchFilenameToken({ token: "MAP", files });
  assert.equal(noBoundary.length, 2);
  const withBoundary = matchFilenameToken({ token: "MAP", files, options: { wordBoundary: true } });
  const paths = withBoundary.map((m) => m.path);
  assert.equal(paths.includes("services/map-projection-service/README.md"), true);
  assert.equal(paths.includes("services/sitemap-service/README.md"), false);
});

test("returned records are frozen and carry only the settled fields", () => {
  const matches = matchFilenameToken({ token: "WitnessJournal", files: FILES });
  assert.ok(Object.isFrozen(matches));
  assert.ok(Object.isFrozen(matches[0]));
  assert.deepEqual(Object.keys(matches[0]).sort(), ["matchKind", "matchedText", "path", "score"]);
  assert.equal(matches[0].matchKind, "filename-path");
});

test("throws on an empty token rather than silently matching everything", () => {
  assert.throws(() => matchFilenameToken({ token: "", files: FILES }), TypeError);
});

test("throws when files is not an array", () => {
  assert.throws(() => matchFilenameToken({ token: "x", files: null }), TypeError);
});

test("an empty files array yields no matches", () => {
  assert.deepEqual(matchFilenameToken({ token: "WitnessJournal", files: [] }), []);
});
