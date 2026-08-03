#!/usr/bin/env node
/**
 * @skill writing-a-schema
 * @verb-phrase writing a schema
 * @closure-kind process
 * @description Writes a JSON Schema into the schema pool from data, refusing one that is unsatisfiable, self-contradictory, or names references that do not resolve; and with --check, validates every seated schema. Use when adding a record type, changing a type's contract, or proving the pool still says what it claims. A schema is a record like any other, so it is written by a script and checked by a machine rather than typed and hoped over.
 *
 * @precondition the data is valid JSON and declares $schema, $id and type
 * @precondition $id agrees with the filename, so a schema resolves by the name it is filed under
 * @precondition every required key is declarable, so the schema is satisfiable by some document
 * @precondition every $ref resolves, to a local $def or to a sibling schema's $id in the pool
 * @postcondition the schema is seated in the pool and reads back byte-identical
 * @postcondition every other schema in the pool still parses and still resolves against it
 * @witness the $id written and the path it was written to
 * @witness on refusal, which invariant failed and the exact JSON pointer it failed at
 * @witness on --check, every schema checked and every unsatisfiable or dangling one named
 *
 * A schema is a record. It is not a special thing that lives outside the system
 * that governs records — that exemption is what let the pool reach a state where
 * `office.schema.json` required a key its own `properties` did not declare under
 * `additionalProperties: false`, which is a contract **no document can satisfy**,
 * sitting in the pool reading as authority.
 *
 * ## What it refuses, and why that is the skill
 *
 * Writing JSON is trivial. These are the states a schema can reach that read as
 * correct and are not:
 *
 * - **Unsatisfiable.** `additionalProperties: false` plus a `required` key that
 *   `properties` does not declare. Every document fails; the failure looks like
 *   the documents' fault. This has already happened here.
 * - **A dangling `$ref`.** A `$ref` to a `$def` that does not exist, or to a
 *   sibling `$id` not in the pool. The reference reads as a constraint and
 *   constrains nothing.
 * - **`$id` disagreeing with its filename.** The pool resolves a schema by the
 *   name it is filed under; a mismatch means a record validated against a
 *   contract other than the one its author named.
 * - **An unparseable sibling.** A schema mid-write breaks every schema that
 *   refs it, so the pool is checked whole rather than one file at a time.
 *
 * ## The validator
 *
 * The canonical JSON Schema service owns schema semantics. This node-local
 * writer owns only pool discovery, filename seating, atomic write/retraction,
 * and the negative control against the schema after it has been seated.
 *
 * It implements the subset this pool actually uses — type, required, properties,
 * additionalProperties, enum, const, pattern, minLength, minItems, minProperties,
 * uniqueItems, items, propertyNames, $ref, $defs, oneOf — and **refuses a schema
 * using a keyword it does not implement**, rather than ignoring it. Silently
 * ignoring an unimplemented keyword is how a schema comes to report itself
 * enforced while enforcing nothing.
 *
 * ## Run it
 *
 * ```sh
 * node .../write-a-schema.js --check                 # validate the whole pool
 * echo '{...}' | node .../write-a-schema.js          # seat a new schema
 * echo '{...}' | node .../write-a-schema.js --amend  # change a seated one
 * ```
 *
 * `--pool` names the pool directly. Otherwise resolution walks up from
 * `--from` (default: the caller's working directory), and only where that
 * walk finds nothing does it walk up from this script's own file location
 * before refusing — a bare invocation run from above the pool, such as the
 * repository root, still finds the pool this script is seated beside.
 *
 * Input is JSON. Output is JSON.
 *
 * ## When NOT to use
 *
 * - Not for writing a record against a schema — that is write-an-office and its
 *   siblings.
 * - Not for inventing a record type nobody asked for. A schema is a claim that a
 *   kind of thing exists; making one is a decision, and this only performs it.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectSchema } from "@red-cup-engineering/json-schema-services-section";

// ── resolution ─────────────────────────────────────────────────────────────
// Walk from the asking point UP, testing <D>/<shape> at each D. Nearest wins,
// neighbours or upward, never downward: resolving downward lets one venture's
// private answer capture a question asked outside it.
//
// No repo root, and no `git rev-parse`. A node may be a submodule, so the
// enclosing git toplevel is some other tree's root and says nothing about where
// THIS unit's glossary is. Asking up by shape is well-defined only because every
// unit carries the same subdirectory vocabulary.
function findUp(from, shape) {
  let d = resolve(from);
  for (;;) {
    const at = join(d, shape);
    if (existsSync(at)) return at;
    const up = dirname(d);
    if (up === d) return null; // no unit above the asking point carries it
    d = up;
  }
}

// A skill is one file: it CALLS its siblings as subprocesses rather than
// importing them, because project-a-skill copies a skill as a single file and an
// imported sibling would not travel with it. So a sibling must be FOUND, and two
// shapes answer — the flat pool a skill's source lives in, and a node it was
// projected into, where the harness wants a directory per skill.
function findSkill(flatName, from) {
  const beside = join(dirname(fileURLToPath(import.meta.url)), flatName);
  if (existsSync(beside)) return beside; // the flat source pool
  const pooled = findUp(from, join("lib/management/skills", flatName));
  if (pooled) return pooled;
  let d = resolve(from);
  for (;;) {
    const projected = join(d, ".claude/skills");
    if (existsSync(projected)) {
      for (const entry of readdirSync(projected)) {
        const at = join(projected, entry, "scripts", flatName);
        if (existsSync(at)) return at;
      }
    }
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

const HERE = dirname(fileURLToPath(import.meta.url));
const FROM = argValue("--from") ?? process.cwd();
const CHECK = process.argv.includes("--check");
const AMEND = process.argv.includes("--amend");
const DRY_RUN = process.argv.includes("--dry-run");
// FROM (explicit --from, or its cwd default) walks first; only where that
// finds no pool does the walk retry from this script's own file location — a
// fallback, never a preference, so nothing that resolves today changes what
// it resolves to.
const POOL = argValue("--pool") ?? findUp(FROM, "lib/schemas") ?? findUp(HERE, "lib/schemas");

// Which keywords are implemented is READING-A-SCHEMA's fact, not this script's.
// A copy here would drift from it the first time the validator grows a keyword —
// and did, within the hour: this list refused allOf/if/then while the validator
// implemented them. One fact, one home.

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

const die = (message) => out({ ok: false, error: message }, 1);

// ⊥ — no unit at or above the asking point carries a schema pool. An absence,
// not an empty pool: seating a class into a pool that does not exist would
// create the unit's schema pool as a side effect of writing one class into it.
if (!POOL) {
  die(`⊥ no schema pool at or above ${FROM} — nothing carries lib/schemas. Pass --pool to name one, or --from to ask from somewhere else.`);
}

/** The invariants a schema must hold to be a contract rather than a decoration. */
function schemaErrors(schema, poolIds) {
  try {
    const inspected = inspectSchema(schema, poolIds);
    const errs = inspected.errors.map(({ pointer, keyword, message }) => `${pointer || "$"}: ${keyword}: ${message}`);
    if (schema.type !== undefined && typeof schema.type !== "string") errs.push("$: type must be a single string in this pool");
    return errs;
  } catch (error) {
    return [`$: schema inspection failed: ${error instanceof Error ? error.message : String(error)}`];
  }
}

function readPool() {
  const schemas = new Map();
  const broken = new Map();
  if (!existsSync(POOL)) return { schemas, broken };
  for (const entry of readdirSync(POOL)) {
    if (!entry.endsWith(".schema.json")) continue;
    const path = join(POOL, entry);
    try {
      schemas.set(entry, { path, schema: JSON.parse(readFileSync(path, "utf8")) });
    } catch (e) {
      broken.set(entry, e.message);
    }
  }
  return { schemas, broken };
}

function fileNameFor(id) {
  // emsenn/schema/office -> office.schema.json
  return `${id.split("/").pop()}.schema.json`;
}

function check() {
  const { schemas, broken } = readPool();
  const poolIds = new Set([...schemas.values()].map((s) => s.schema.$id).filter(Boolean));
  const report = { ok: true, checked: schemas.size, schemas: [] };

  for (const [entry, { schema }] of schemas) {
    const errs = schemaErrors(schema, poolIds);
    if (schema.$id && fileNameFor(schema.$id) !== entry) {
      errs.push(`$: $id '${schema.$id}' would file as ${fileNameFor(schema.$id)}, but it is filed as ${entry}`);
    }
    if (errs.length) {
      report.ok = false;
      report.schemas.push({ file: entry, errors: errs });
    }
  }

  if (broken.size) {
    report.ok = false;
    report.broken = Object.fromEntries(broken);
  }
  if (schemas.size === 0) {
    report.ok = false;
    report.error = "the pool holds no schemas — an empty sweep is a broken sweep, not a clean one";
  }

  out(report, report.ok ? 0 : 1);
}

function write() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) die("no data on stdin — a schema is written from data, never typed into a file");
  let schema;
  try {
    schema = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }

  if (typeof schema.$id !== "string" || !schema.$id) die("$: no $id — a schema with no address cannot be referenced");

  const { schemas, broken } = readPool();
  if (broken.size) die(`the pool holds unparseable schemas (${[...broken.keys()].join(", ")}) — nothing is written against a broken pool`);

  const entry = fileNameFor(schema.$id);
  const path = join(POOL, entry);
  const exists = existsSync(path);
  if (exists && !AMEND) die(`${entry} already exists — refused, never overwritten; use --amend`);
  if (!exists && AMEND) die(`${entry} seats nowhere — amend edits what exists`);

  const poolIds = new Set([...schemas.values()].map((s) => s.schema.$id).filter(Boolean));
  poolIds.add(schema.$id);

  const errs = schemaErrors(schema, poolIds);
  if (errs.length) die(`${entry} is not a usable contract: ${errs.join("; ")}`);

  // Amending must not break a sibling that refs this one.
  const orphaned = [];
  for (const [other, { schema: sibling }] of schemas) {
    if (other === entry) continue;
    const siblingErrs = schemaErrors(sibling, poolIds);
    if (siblingErrs.length) orphaned.push({ file: other, errors: siblingErrs });
  }
  if (orphaned.length) die(`writing ${entry} would leave siblings broken: ${JSON.stringify(orphaned)}`);

  const text = `${JSON.stringify(schema, null, 2)}\n`;
  if (DRY_RUN) out({ ok: true, dryRun: true, would: { write: relative(FROM, path) } });

  // Retraction, not repair. Every check below runs against the schema AS SEATED,
  // because that is the only state anything else will ever read it in — and a
  // schema that fails one is withdrawn whole rather than left half-seated for
  // the next reader to trust.
  const prior = exists ? readFileSync(path, "utf8") : null;
  const retract = () => (prior === null ? unlinkSync(path) : writeFileSync(path, prior));

  writeFileSync(path, text);

  const back = readFileSync(path, "utf8");
  if (back !== text) {
    retract();
    die(`${entry} was written but does not read back byte-identical; withdrawn`);
  }

  // The negative control: a term must be able to REFUSE something, or it judges
  // nothing. Run the seated schema against `{}` through reading-a-schema — the
  // one validator — because a schema whose emptiness passes is the silent-green
  // failure that makes a check worse than no check. This is why the validator is
  // called and never copied: a private copy would answer for a contract other
  // than the one the pool enforces.
  const reader = fileURLToPath(import.meta.resolve("@red-cup-engineering/json-schema-services-section/read-a-schema"));
  if (!reader) {
    retract();
    die("⊥ cannot find reading-a-schema — the one validator. Nothing is seated on an unproved contract; withdrawn");
  }
  const probe = spawnSync(process.execPath, [reader, schema.$id, "--pool", POOL], { input: "{}", encoding: "utf8" });
  let verdict = null;
  try {
    verdict = JSON.parse(probe.stdout);
  } catch {
    retract();
    die(`⊥ reading-a-schema returned nothing parseable probing ${entry}: ${(probe.stderr || probe.stdout || "").trim()}; withdrawn`);
  }
  if (verdict?.ok === true) {
    retract();
    die(`${entry} admits the empty object — this term refuses nothing and can judge nothing; withdrawn`);
  }

  out({ ok: true, [AMEND ? "amended" : "seated"]: { $id: schema.$id, path: relative(FROM, path) } });
}

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      "  node write-a-schema.js --check                 # validate the whole pool",
      "  echo '{...}' | node write-a-schema.js          # seat a new schema",
      "  echo '{...}' | node write-a-schema.js --amend  # change a seated one",
      "  node write-a-schema.js --help",
      "",
      "Input is JSON. Output is JSON.",
    ].join("\n") + "\n",
  );
}

if (process.argv.includes("--help")) printUsage();
else if (CHECK) check();
else write();
