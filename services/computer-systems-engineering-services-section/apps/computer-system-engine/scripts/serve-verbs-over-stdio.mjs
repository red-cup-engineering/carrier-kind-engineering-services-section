#!/usr/bin/env node
// serve-verbs-over-stdio — the one generic stdio verb server in the tree: a stdio loop dispatching
// {id, verb, args} JSON frames to named-export functions from a caller-supplied ES module, replying
// {id, ok, value} or {id, ok: false, error}. Invents and ports nothing of its own domain logic —
// every verb is a direct call to a function its --verbs module already publishes.
//
// Generalized from @red-cup-engineering/eavt's former standalone stdio worker script (itself
// split out of computer-deployment-engine's former composite worker script on 2026-09-22), so
// this is the only stdio verb loop in the tree: every owner that used to hand-roll its own loop,
// or compose itself into someone else's, now just exports a plain verbs module for this server to
// load (rule 10: no parallel implementations).
//
// A verb module's named exports are the verb functions themselves. Each may carry a `.spec`
// property — {args, returns, refusal} JSON Schema documents (and, for a verb whose domain/codomain
// are already-established computer-system-engine type declarations rather than bare schema
// literals, `.spec.domainType`/`.spec.codomainType` in place of `.spec.args`/`.spec.returns`) — and
// an optional `.effects` array naming the effect names that verb requires. When every verb carries
// a spec, this server composes one shared, content-addressed type catalog (this package's own
// identity/type-system machinery — no computer-platform, no jsnode-engine: this is computer-system,
// downstream of nothing) that the "verbs" and "type-system" frames answer with, exactly as the
// worker(s) this replaces already did. There is no separate --catalog input: the catalog is this
// server's own internal composition of its --verbs module, never an externally supplied artifact —
// read against the Guile callers this replaces (computer-deployment-engine's (node-worker)), the
// shared type catalog is genuinely load-bearing for them (every frame carries its identity, checked
// on every call), but nothing about it is an input a caller must separately supply.
//
// Run: node scripts/serve-verbs-over-stdio.mjs --verbs <module specifier> [--verbs <module specifier> ...]
//
// --verbs may repeat: a caller composing several owners' verb modules into one handshake (one
// worker, one shared type catalog) for a single spawned process passes it once per module, rather
// than maintaining a merge module of its own — no owning package writes a second stdio loop, and
// no composing caller writes so much as a merge file, to get one composed worker (rule 10). Each
// named --verbs module is imported independently; one module's own import failure is logged to
// stderr and that module is served without, rather than taking the whole composed worker down —
// this server is generic, so it cannot tell a merely-missing owner from a truly fatal one, and
// degrading gracefully (rather than refusing to start at all) is the safer default for a
// multi-owner spawn.
//
// Test-only environment knobs (read only by this file's own standalone run below, never by
// buildVerbsWorker's own callers, who pass the equivalent options directly):
//   VERBS_ALLOWED_EFFECTS         - JSON array of effect names this process grants; absent means
//                                    every effect any loaded verb declares is granted.
//   VERBS_STRIP_SPEC_ARGS_VERB    - a verb name whose "verbs" handshake reply should omit its own
//                                    "args" key (the handler's real, full spec is untouched) so a
//                                    caller's own spec-incompleteness refusal can be exercised
//                                    against a real handshake reply without a second script to
//                                    maintain.

import { createInterface } from "node:readline";
import { defineType, collectTypeSystem, admit } from "@red-cup-engineering/computer-data-services-section/type-system";
import { typeSystemDocument } from "@red-cup-engineering/computer-data-services-section/type-system/document";
import { REFUSAL_SCHEMA } from "../src/verb-refusal-schema.mjs";

// Re-exported for convenience (this is the path most of the tree already imported it from, back
// when it lived on the eavt worker this replaces); a verbs module should prefer importing it from
// ./verb-refusal-schema directly, never from this file — this file is the server's OWN executable
// entry, dynamically imported BY a --verbs module's own server process, so a verbs module
// importing this path back would be a circular import onto a module stuck at its own top-level
// await.
export { REFUSAL_SCHEMA };

function accepted(result) {
  if (!result.ok) throw new TypeError(JSON.stringify(result.refusal));
  return result.value;
}

/**
 * Compose a runnable worker (verbs module -> per-verb domain/codomain types -> one shared type
 * catalog -> dispatch) over any module whose named exports are verb functions, each optionally
 * carrying a `.spec` ({args, returns, refusal} or {domainType, codomainType, refusal}) and an
 * `.effects` array.
 * @param {Record<string, Function>} verbsModule
 * @param {{platformId?: string, allowedEffects?: string[], stripSpecArgsVerb?: string|null}} [opts]
 */
export function buildVerbsWorker(verbsModule, opts = {}) {
  const platformId = opts.platformId ?? "verbs/worker";
  const stripSpecArgsVerb = opts.stripSpecArgsVerb ?? null;

  const operations = Object.entries(verbsModule)
    .filter(([, value]) => typeof value === "function")
    .map(([verb, handler]) => {
      const spec = handler.spec;
      if (!spec || typeof spec !== "object") {
        throw new TypeError(`serve-verbs-over-stdio: verb "${verb}" has no .spec (args/returns/refusal)`);
      }
      const domain = spec.domainType ?? accepted(defineType({
        id: `${platformId}/${verb}/input`, name: `${verb} input`, description: `Input to ${verb}.`,
        schema: spec.args, references: spec.argsReferences ?? [], parents: [],
      }));
      const codomain = spec.codomainType ?? accepted(defineType({
        id: `${platformId}/${verb}/output`, name: `${verb} output`, description: `Output from ${verb}.`,
        schema: spec.returns, references: spec.returnsReferences ?? [], parents: [],
      }));
      const effects = Object.freeze([...(handler.effects ?? [])]);
      return [verb, { handler, spec, effects, domain, codomain }];
    });

  const byVerb = new Map(operations);
  const typeSystem = accepted(collectTypeSystem(operations.flatMap(([, op]) => [op.domain, op.codomain])));
  const catalog = accepted(typeSystemDocument(typeSystem));

  const allowedEffectsOverride = opts.allowedEffects;
  const allowedEffects = allowedEffectsOverride === undefined
    ? [...new Set(operations.flatMap(([, op]) => op.effects))]
    : allowedEffectsOverride;
  if (!Array.isArray(allowedEffects) || !allowedEffects.every((effect) => typeof effect === "string")) {
    throw new TypeError("allowedEffects must be an array of effect names");
  }

  function verbSpecs() {
    return operations.map(([verb, op]) => ({
      verb,
      args: verb === stripSpecArgsVerb ? undefined : op.domain.schema,
      returns: op.codomain.schema,
      refusal: op.spec.refusal,
      typeSystemIdentity: catalog.identity,
      domain: op.domain.id,
      codomain: op.codomain.id,
      effects: op.effects,
      operation: { domain: op.domain.id, codomain: op.codomain.id, effects: op.effects, body: { kind: "capability-effect", capability: verb } },
    }));
  }

  async function dispatch(verb, args, expectedCatalog) {
    if (verb === "verbs") return { ok: true, value: verbSpecs() };
    if (verb === "type-system") return { ok: true, value: catalog };
    const op = byVerb.get(verb);
    if (!op) return { ok: false, refusal: { code: "UnknownVerb", message: `no such verb: ${verb}` } };
    if (expectedCatalog !== catalog.identity) {
      return { ok: false, refusal: { code: "TypeSystemMismatch", message: "request must name the type catalog observed at handshake" } };
    }
    if (op.effects.some((effect) => !allowedEffects.includes(effect))) {
      return { ok: false, refusal: { code: "EffectRefused", message: `verb ${verb} requires an effect this process was not granted` } };
    }
    const admitted = admit(op.domain, args ?? {});
    if (!admitted.ok) {
      return { ok: false, refusal: { code: "InvalidInput", message: `${verb}: input does not admit its declared schema`, issues: admitted.refusal.issues ?? [] } };
    }
    try {
      const value = await op.handler(admitted.value);
      return { ok: true, value };
    } catch (error) {
      return { ok: false, refusal: { code: "HandlerError", message: String((error && error.message) || error) } };
    }
  }

  return { catalog, dispatch, close: () => {} };
}

// Runs a built worker's stdio loop against process.stdin/stdout.
export function runStdioWorker(worker) {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

  async function respond(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    let id;
    try {
      const frame = JSON.parse(trimmed);
      id = frame.id;
      const result = await worker.dispatch(frame.verb, frame.args, frame.typeSystemIdentity);
      process.stdout.write(JSON.stringify({ id, ...result, typeSystemIdentity: worker.catalog.identity, ...(frame.verb === "verbs" ? { typeSystem: worker.catalog } : {}), ...(!result.ok ? { error: `${result.refusal.code}: ${result.refusal.message}` } : {}) }) + "\n");
    } catch (error) {
      process.stdout.write(JSON.stringify({ id, ok: false, error: String((error && error.message) || error) }) + "\n");
    }
  }

  let pendingFrame = Promise.resolve();
  rl.on("line", (line) => {
    pendingFrame = pendingFrame.then(() => respond(line), () => respond(line));
  });
  rl.on("close", () => { pendingFrame.finally(() => worker.close()); });
}

// Every occurrence of `name` in argv, in order (so --verbs can repeat).
function flagAll(argv, name) {
  const values = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name) values.push(argv[i + 1]);
  }
  return values;
}

// A namespace object from `import * as ns`: its own named exports, whichever are functions.
function verbFunctionsOf(imported) {
  return Object.fromEntries(Object.entries(imported).filter(([, value]) => typeof value === "function"));
}

// Only run when invoked directly (so a composing caller, or a fixture test, can import
// buildVerbsWorker/runStdioWorker without starting a second stdio loop).
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const verbsSpecifiers = flagAll(argv, "--verbs");
  if (verbsSpecifiers.length === 0) {
    process.stderr.write("serve-verbs-over-stdio: --verbs <module specifier> is required (may repeat)\n");
    process.exit(1);
  }
  const verbsModule = {};
  for (const specifier of verbsSpecifiers) {
    try {
      Object.assign(verbsModule, verbFunctionsOf(await import(specifier)));
    } catch (error) {
      process.stderr.write(`serve-verbs-over-stdio: --verbs ${specifier} failed to import, serving without it (${(error && error.message) || error})\n`);
    }
  }
  const allowedEffects = process.env.VERBS_ALLOWED_EFFECTS === undefined ? undefined : JSON.parse(process.env.VERBS_ALLOWED_EFFECTS);
  const stripSpecArgsVerb = process.env.VERBS_STRIP_SPEC_ARGS_VERB || null;
  const worker = buildVerbsWorker(verbsModule, { platformId: "verbs/worker", allowedEffects, stripSpecArgsVerb });
  runStdioWorker(worker);
}
