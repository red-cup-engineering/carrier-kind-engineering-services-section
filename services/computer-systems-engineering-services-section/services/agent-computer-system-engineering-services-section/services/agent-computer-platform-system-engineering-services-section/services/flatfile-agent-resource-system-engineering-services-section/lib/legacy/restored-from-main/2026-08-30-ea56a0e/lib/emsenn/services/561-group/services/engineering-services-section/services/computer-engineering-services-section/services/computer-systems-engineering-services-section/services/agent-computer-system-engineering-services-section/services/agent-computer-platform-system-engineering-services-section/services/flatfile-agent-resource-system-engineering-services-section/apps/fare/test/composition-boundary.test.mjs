import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const SRC_ROOT = fileURLToPath(new URL("../src/", import.meta.url));

// The RMN runtime's WIT law belongs to kernel/four.mjs alone; the
// witness-journal services' SEAVT law belongs to kernel/seavt.mjs and
// kernel/event-log.mjs alone. Every other module reaches these laws only
// by importing the thin wrapper, never the underlying package.
const FOUR_WRAPPER = "kernel/four.mjs";
const SEAVT_WRAPPERS = new Set(["kernel/seavt.mjs", "kernel/event-log.mjs"]);

function listSourceFiles(dir, base = "") {
  const out = [];
  for (const entry of readdirSync(path.join(dir, base), { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listSourceFiles(dir, rel));
    else if (entry.name.endsWith(".mjs")) out.push(rel);
  }
  return out;
}

const SOURCE_FILES = listSourceFiles(SRC_ROOT);

function read(relativePath) {
  return readFileSync(path.join(SRC_ROOT, relativePath), "utf8");
}

test("only kernel/four.mjs imports the RMN runtime's FOUR/WIT law", () => {
  for (const file of SOURCE_FILES) {
    const importsRmnRuntime = read(file).includes("relation-model-notation-runtime");
    assert.equal(importsRmnRuntime, file === FOUR_WRAPPER, `${file}: unexpected relation-model-notation-runtime import`);
  }
});

test("only kernel/seavt.mjs and kernel/event-log.mjs import the witness-journal services", () => {
  for (const file of SOURCE_FILES) {
    const source = read(file);
    const importsJournalService = source.includes("witness-journal-entry-service") || source.includes("witness-journal-log-service");
    assert.equal(importsJournalService, SEAVT_WRAPPERS.has(file), `${file}: unexpected witness-journal service import`);
  }
});

test("no source file outside kernel/four.mjs hardcodes the WIT-law refusal code", () => {
  for (const file of SOURCE_FILES) {
    if (file === FOUR_WRAPPER) continue;
    assert.equal(read(file).includes("not-one-wit"), false, `${file}: reimplements the WIT-law refusal instead of composing witnessBit`);
  }
});

test("no source file outside the thin wrappers shapes a bare SEAVT {e,a,v,t} row", () => {
  const eavtObjectShape = /\be\s*:\s*[^,}]+,\s*a\s*:\s*[^,}]+,\s*v\s*:\s*[^,}]+,\s*t\s*:/;
  const eavtDestructure = /\[\s*e\s*,\s*a\s*,\s*v\s*,\s*t\s*\]/;
  for (const file of SOURCE_FILES) {
    if (SEAVT_WRAPPERS.has(file)) continue;
    const source = read(file);
    assert.equal(eavtObjectShape.test(source), false, `${file}: reimplements SEAVT row shaping as an object literal`);
    assert.equal(eavtDestructure.test(source), false, `${file}: reimplements SEAVT row shaping via tuple destructuring`);
  }
});

test("kernel/witness.mjs reaches the WIT gate only through kernel/four.mjs's re-export", () => {
  const source = read("kernel/witness.mjs");
  assert.match(source, /from ["']\.\/four\.mjs["']/);
  assert.equal(source.includes("relation-model-notation-runtime"), false);
});
