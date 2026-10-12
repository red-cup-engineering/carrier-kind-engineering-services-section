// eavt-worker — the Node worker for qtOps's node-worker (WO-6): a stdio loop dispatching
// {id, verb, args} JSON frames to real functions the owning packages already publish
// (@red-cup-engineering/eavt, cbor-codec-service, cbor-ni-service, systemd-unit-inventory-
// observation-service, and FeltOS's Flatfile world operations), replying
// {id, ok, value} or {id, ok: false, error}. Invents and ports nothing.
// Run: `node scripts/eavt-worker.mjs` (stdio only, no argv).

import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";
import { unique } from "@red-cup-engineering/eavt/deduplicate-rows";
import { foldEavtEvidence } from "@red-cup-engineering/eavt/fold-eavt-evidence";
import { entities } from "@red-cup-engineering/eavt/list-entities";
import { readEavtEntries } from "@red-cup-engineering/eavt/read-eavt-entries";
import { appendEavtRow } from "@red-cup-engineering/eavt/append-eavt-row";
import { relateEavtRows } from "@red-cup-engineering/eavt/relate-eavt-rows";
import { relateFromEavtRows } from "@red-cup-engineering/eavt/relate-from-eavt-rows";
import { supersedeEavtRows } from "@red-cup-engineering/eavt/supersede-eavt-rows";
import { constitute } from "@red-cup-engineering/eavt/constitute-entity";
import { eavtRow } from "@red-cup-engineering/eavt/row";
import { encodeCanonical, decodeCanonical } from "@red-cup-engineering/computer-data-engine/identity";
import { canonicalCborToNiUri } from "@red-cup-engineering/computer-data-engine/identity";
import { observeUnitInventory } from "@red-cup-engineering/systemd-unit-inventory-observation-service";
import { COMPUTER_ENGINEERING_SPECIFICATION_ID, collectTypeSystem, defineType, typeSystemDocument } from "@red-cup-engineering/computer-data-engine";
import { admitOperation } from "@red-cup-engineering/computer-platform/operations";
import { createComputerPlatform, bindingsProviders } from "@red-cup-engineering/computer-platform";
import { INFERENCE_WORK_OPERATION } from "@red-cup-engineering/inference-dispatch-service/carriers";
import { dispatchInference } from "@red-cup-engineering/inference-dispatch-service/inference-dispatch";
import {
  inspectFlatfileResourceInputSchema,
  inspectFlatfileResourceOutputSchema,
  inspectFlatfileResourceWithProviders,
} from "@red-cup-engineering/flatfile-resource-graph-service/inspection";
import * as lagoonWorld from "@red-cup-engineering/flatfile-resource-graph-service/lagoon-world";


// A strict {e,a,v,t} row, reused by every verb whose args or return value is one.
const ROW_SCHEMA = {
  type: "object",
  properties: { e: { type: "string" }, a: { type: "string" }, v: {}, t: { type: "number" } },
  required: ["e", "a", "v", "t"],
};

// dispatch's catch-all replies {id, ok: false, error: <message>} on any thrown error,
// uniformly across every verb — so every verb's refusal/error schema is this one shape.
const REFUSAL_SCHEMA = {
  type: "object",
  properties: { error: { type: "string" } },
  required: ["error"],
};

// a folded fiber, as returned by fold/fold-trace/settle.
const FOLDED_SCHEMA = {
  type: "object",
  properties: { entity: { type: "string" }, fiber: { type: "array" } },
  required: ["entity", "fiber"],
};

// eavt used to ship dedupe/fold/settle/section/supersede/constituteEntity/entityAddress and the
// two capability-battery functions below directly (the pre-decomposition monolith, deleted at
// 84927d48667). The package has since decomposed into single-function subpaths; these recompose
// the same behavior from the current primitives rather than reimplementing it from scratch.
function settle(subject, rows, opts = {}) {
  return foldEavtEvidence({ subject, rows: unique(rows), ...opts });
}

function section(folded) {
  const out = { affirmed: [], denied: [], contradicted: [] };
  for (const cell of folded.fiber) {
    const { pos, neg } = cell.value;
    const projected = { predicate: cell.predicate, object: cell.object };
    if (pos && neg) out.contradicted.push(projected);
    else if (pos) out.affirmed.push(projected);
    else if (neg) out.denied.push(projected);
  }
  return out;
}

// The verification direction of constitute()'s own <kind>:<digest> address law: split the
// address on its first ":" to recover kind, then recompute the same address from a/v/t.
function entityAddress(genesisRow) {
  const kind = genesisRow.e.slice(0, genesisRow.e.indexOf(":"));
  return constitute({ kind, attributes: genesisRow.v, t: genesisRow.t }).address;
}

function eavtTraceCapabilityOperations(refusalSchema) {
  return {
    "assert-row": {
      handler: ({ row }) => eavtRow(row),
      spec: { args: { type: "object", properties: { row: ROW_SCHEMA }, required: ["row"] }, returns: ROW_SCHEMA, refusal: refusalSchema },
    },
    "append": {
      handler: ({ path, row }) => appendEavtRow({ path, row }),
      spec: { args: { type: "object", properties: { path: { type: "string" }, row: ROW_SCHEMA }, required: ["path", "row"] }, returns: { type: "string" }, refusal: refusalSchema },
    },
    "read": {
      handler: ({ path }) => readEavtEntries({ path }),
      spec: { args: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }, returns: { type: "array", items: ROW_SCHEMA }, refusal: refusalSchema },
    },
    "entities": {
      handler: ({ path }) => entities(readEavtEntries({ path })),
      spec: { args: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }, returns: { type: "array", items: { type: "string" } }, refusal: refusalSchema },
    },
    "fold-trace": {
      handler: ({ path, subject, opts }) => foldEavtEvidence({ subject, rows: readEavtEntries({ path }), ...(opts ?? {}) }),
      spec: { args: { type: "object", properties: { path: { type: "string" }, subject: { type: "string" }, opts: { type: "object" } }, required: ["path", "subject"] }, returns: FOLDED_SCHEMA, refusal: refusalSchema },
    },
  };
}

function eavtRelationCapabilityOperations(refusalSchema) {
  const rowsSchema = { type: "array", items: ROW_SCHEMA };
  return {
    "relate": {
      handler: ({ rows, predicate, object }) => relateEavtRows({ rows, predicate, object }).subjects,
      spec: { args: { type: "object", properties: { rows: rowsSchema, predicate: { type: "string" }, object: {} }, required: ["rows", "predicate", "object"] }, returns: { type: "array" }, refusal: refusalSchema },
    },
    "relate-from": {
      handler: ({ rows, subject, predicate }) => relateFromEavtRows({ rows, subject, predicate }).objects,
      spec: { args: { type: "object", properties: { rows: rowsSchema, subject: { type: "string" }, predicate: { type: "string" } }, required: ["rows", "subject", "predicate"] }, returns: { type: "array" }, refusal: refusalSchema },
    },
  };
}

const FELTOS_INSPECT_RESOURCE_SPEC = Object.freeze({
  args: inspectFlatfileResourceInputSchema,
  returns: inspectFlatfileResourceOutputSchema,
  refusal: REFUSAL_SCHEMA,
});

// Unit observation is an explicit process authority: normal workers receive
// the published systemd observer, while tests may supply a complete fixture.
// The fixture is selected before the process observer is reachable, so an
// unavailable user D-Bus cannot turn a unit-contract test into a host probe.
function unitInventoryAuthority() {
  const fixturePath = process.env.LAGOON_TEST_UNIT_INVENTORY_FIXTURE;
  if (fixturePath === undefined) return Object.freeze({ observe: observeUnitInventory });
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  if (fixture === null || typeof fixture !== "object"
      || typeof fixture.host !== "string"
      || !Array.isArray(fixture.units)
      || !Array.isArray(fixture.timers)) {
    throw new TypeError("LAGOON_TEST_UNIT_INVENTORY_FIXTURE must name a unit inventory with host, units, and timers");
  }
  return Object.freeze({
    observe(host) {
      if (host !== fixture.host) throw new RangeError(`unit inventory fixture is for '${fixture.host}', not '${host}'`);
      return fixture;
    },
  });
}

const UNIT_INVENTORY_AUTHORITY = unitInventoryAuthority();

// The handshake surface: verb name -> {handler, spec}, kept as this table's own keys so
// the session-start handshake ("verbs") can never drift from what is actually callable.
// WO-6's typed contract: spec names the verb's args schema, return schema, and
// error/refusal schema — checked by the Guile body at session start; this table is its
// one source, so a verb's contract cannot silently drift from its handler.
const VERBS = {
  // "verbs" itself is answered specially in dispatch, so it is not in this table.

  // The existing work system supplies its complete operation and declarations.
  // Procurement authority must be granted by the worker's process owner.
  "contract-inference-work": {
    operation: INFERENCE_WORK_OPERATION,
    handler: dispatchInference,
    spec: { args: INFERENCE_WORK_OPERATION.domain.schema, returns: INFERENCE_WORK_OPERATION.codomain.schema, refusal: REFUSAL_SCHEMA },
  },

  // FeltOS owns Node-MUD flatfile inspection; LAGOON only transports the admitted
  // request across its Guile process boundary.
  "inspect-resource": {
    handler: inspectFlatfileResourceWithProviders,
    spec: FELTOS_INSPECT_RESOURCE_SPEC,
  },

  // EAVT owns durable trace operations and their contracts; LAGOON transports them only.
  ...eavtTraceCapabilityOperations(REFUSAL_SCHEMA),

  // RFC 8949 canonical CBOR encoding of any admitted JSON-shaped value, base64 on the wire.
  "encode-cbor": {
    handler: ({ value }) => encodeCanonical(value).toString("base64"),
    spec: {
      args: { type: "object", properties: { value: {} }, required: ["value"] },
      returns: { type: "string" },
      refusal: REFUSAL_SCHEMA,
    },
  },

  // the inverse: base64 canonical CBOR bytes back to the value.
  "decode-cbor": {
    handler: ({ bytes }) => decodeCanonical(Buffer.from(bytes, "base64")),
    spec: {
      args: { type: "object", properties: { bytes: { type: "string" } }, required: ["bytes"] },
      returns: {},
      refusal: REFUSAL_SCHEMA,
    },
  },

  // content identity of a row (or any value): its RFC 6920 `ni:` URI over its canonical CBOR bytes.
  "row-id": {
    handler: ({ row }) => canonicalCborToNiUri(encodeCanonical(row)),
    spec: {
      args: { type: "object", properties: { row: {} }, required: ["row"] },
      returns: { type: "string" },
      refusal: REFUSAL_SCHEMA,
    },
  },

  // G-Set dedupe of a row array by content id, first occurrence kept, order preserved.
  "dedupe": {
    handler: ({ rows }) => unique(rows),
    spec: {
      args: { type: "object", properties: { rows: { type: "array", items: ROW_SCHEMA } }, required: ["rows"] },
      returns: { type: "array", items: ROW_SCHEMA },
      refusal: REFUSAL_SCHEMA,
    },
  },

  // fold one subject's {e,a,v,t} trace (already in hand) into its settled fiber.
  "fold": {
    handler: ({ subject, rows, opts }) => foldEavtEvidence({ subject, rows, ...(opts ?? {}) }),
    spec: {
      args: {
        type: "object",
        properties: { subject: { type: "string" }, rows: { type: "array", items: ROW_SCHEMA }, opts: { type: "object" } },
        required: ["subject", "rows"],
      },
      returns: FOLDED_SCHEMA,
      refusal: REFUSAL_SCHEMA,
    },
  },

  // dedupe + fold in one call.
  "settle": {
    handler: ({ subject, rows, opts }) => settle(subject, rows, opts ?? {}),
    spec: {
      args: {
        type: "object",
        properties: { subject: { type: "string" }, rows: { type: "array", items: ROW_SCHEMA }, opts: { type: "object" } },
        required: ["subject", "rows"],
      },
      returns: FOLDED_SCHEMA,
      refusal: REFUSAL_SCHEMA,
    },
  },

  // project a folded section to {affirmed, denied, contradicted}.
  "section": {
    handler: ({ folded }) => section(folded),
    spec: {
      args: { type: "object", properties: { folded: FOLDED_SCHEMA }, required: ["folded"] },
      returns: {
        type: "object",
        properties: { affirmed: { type: "array" }, denied: { type: "array" }, contradicted: { type: "array" } },
        required: ["affirmed", "denied", "contradicted"],
      },
      refusal: REFUSAL_SCHEMA,
    },
  },

  // the latest-t functional projection over a raw row array (opts.functional names a Set).
  "supersede": {
    handler: ({ rows, functional }) => supersedeEavtRows({ rows, functionalAttributes: functional }).rows,
    spec: {
      args: {
        type: "object",
        properties: { rows: { type: "array", items: ROW_SCHEMA }, functional: { type: "array", items: { type: "string" } } },
        required: ["rows", "functional"],
      },
      returns: { type: "array", items: ROW_SCHEMA },
      refusal: REFUSAL_SCHEMA,
    },
  },

  // EAVT owns relation reads and their contracts; LAGOON transports them only.
  ...eavtRelationCapabilityOperations(REFUSAL_SCHEMA),

  // birth an entity by its ONE constituting utterance: {address, genesisRow} (the EAVT
  // sketch-lane <kind>:<ni-digest> address rule; see @red-cup-engineering/eavt's src/eavt.mjs).
  "constitute": {
    handler: ({ kind, attributes, t }) => {
      const { address, genesis } = constitute({ kind, attributes, t });
      return { address, genesisRow: genesis };
    },
    spec: {
      args: {
        type: "object",
        properties: { kind: { type: "string" }, attributes: { type: "object" }, t: { type: "number" } },
        required: ["kind", "attributes", "t"],
      },
      returns: {
        type: "object",
        properties: { address: { type: "string" }, genesisRow: ROW_SCHEMA },
        required: ["address", "genesisRow"],
      },
      refusal: REFUSAL_SCHEMA,
    },
  },

  // the verification direction: recompute a genesis row's own address from its content.
  "verify-address": {
    handler: ({ row }) => entityAddress(row),
    spec: {
      args: { type: "object", properties: { row: ROW_SCHEMA }, required: ["row"] },
      returns: { type: "string" },
      refusal: REFUSAL_SCHEMA,
    },
  },

  // Unit/timer inventory through the process authority: production uses a
  // read-only systemd --user observer; tests supply an explicit fixture.
  "observe-unit-inventory": {
    handler: ({ host }) => UNIT_INVENTORY_AUTHORITY.observe(host ?? "local"),
    spec: {
      args: { type: "object", properties: { host: { type: "string" } }, required: [] },
      returns: {
        type: "object",
        properties: { host: { type: "string" }, units: { type: "array" }, timers: { type: "array" } },
        required: ["host", "units", "timers"],
      },
      refusal: REFUSAL_SCHEMA,
    },
  },

  // compose a place + its located-in things + their folded fibers off an on-disk trace (see
  // FeltOS's Flatfile world owner).
  "look": {
    handler: ({ path, place }) => lagoonWorld.lookWorld(path, place),
    spec: {
      args: {
        type: "object",
        properties: { path: { type: "string" }, place: { type: "string" } },
        required: ["path", "place"],
      },
      returns: {
        type: "object",
        properties: {
          address: {},
          placeAttributes: {},
          things: { type: "array" },
          recentDuties: { type: "array" },
        },
        required: ["address", "placeAttributes", "things"],
      },
      refusal: REFUSAL_SCHEMA,
    },
  },

  // move an already-constituted actor to a named place through FeltOS's Flatfile world owner.
  "go": {
    handler: ({ path, actor, place, t }) => lagoonWorld.moveInWorld(path, actor, place, t),
    spec: {
      args: {
        type: "object",
        properties: {
          path: { type: "string" },
          actor: { type: "string" },
          place: { type: "string" },
          t: { type: "number" },
        },
        required: ["path", "actor", "place", "t"],
      },
      returns: {
        type: "object",
        properties: { address: { type: "string" }, actor: { type: "string" }, place: { type: "string" } },
        required: ["address", "actor", "place"],
      },
      refusal: REFUSAL_SCHEMA,
    },
  },

  // constitute+append an utterance attributed to its speaker and place through FeltOS's Flatfile world owner.
  "say": {
    handler: ({ path, speaker, place, text, t }) => lagoonWorld.speakInWorld(path, speaker, place, text, t),
    spec: {
      args: {
        type: "object",
        properties: {
          path: { type: "string" },
          speaker: { type: "string" },
          place: { type: "string" },
          text: { type: "string" },
          t: { type: "number" },
        },
        required: ["path", "speaker", "place", "text", "t"],
      },
      returns: {
        type: "object",
        properties: { address: { type: "string" }, place: { type: "string" }, genesisRow: ROW_SCHEMA },
        required: ["address", "place", "genesisRow"],
      },
      refusal: REFUSAL_SCHEMA,
    },
  },
};

// Test-only: when set to a verb name, that verb's "verbs" handshake entry answers with no
// "args" schema (the JSON key dropped entirely — JSON.stringify drops an `undefined`
// property), so the Guile node-worker's test suite can exercise its own spec-incompleteness
// refusal against a real handshake reply without a second worker script to maintain. The
// handler itself is untouched: only the declared contract drifts, on purpose, for the test.
const STRIP_SPEC_ARGS_VERB = process.env.LAGOON_TEST_STRIP_SPEC_ARGS_VERB || null;

function accepted(result) {
  if (!result.ok) throw new TypeError(JSON.stringify(result.refusal));
  return result.value;
}

// This table declares the worker's effect boundaries. Request frames cannot grant
// themselves authority; a process owner can restrict the worker at launch.
const EFFECTS = {
  "inspect-resource": ["filesystem:read"],
  append: ["filesystem:write"], read: ["filesystem:read"], entities: ["filesystem:read"],
  "fold-trace": ["filesystem:read"], look: ["filesystem:read"],
  go: ["filesystem:read", "filesystem:write"], say: ["filesystem:write"],
  "observe-unit-inventory": ["process:execute"],
};

const operations = Object.entries(VERBS).map(([verb, { spec, operation }]) => operation ?? accepted(admitOperation({
  specification: COMPUTER_ENGINEERING_SPECIFICATION_ID,
  id: verb,
  domain: accepted(defineType({ id: `lagoon/worker/${verb}/input`, name: `${verb} input`, description: `Input to ${verb}.`, schema: spec.args, parents: [] })),
  codomain: accepted(defineType({ id: `lagoon/worker/${verb}/output`, name: `${verb} output`, description: `Output from ${verb}.`, schema: spec.returns, parents: [] })),
  effects: EFFECTS[verb] ?? [],
  body: { kind: "capability-effect", capability: verb },
}))); 

const typeSystem = accepted(collectTypeSystem(operations.flatMap(operation => [operation.domain, operation.codomain])));
const catalog = accepted(typeSystemDocument(typeSystem));
const platform = createComputerPlatform({ id: "lagoon/worker", typeSystem, operations,
  providers: bindingsProviders(Object.fromEntries(Object.entries(VERBS).map(([verb, entry]) => [entry.operation?.body.capability ?? verb, entry.handler]))),
});
const allowedEffects = process.env.LAGOON_ALLOWED_EFFECTS === undefined
  ? [...new Set(Object.values(EFFECTS).flat())]
  : JSON.parse(process.env.LAGOON_ALLOWED_EFFECTS);
if (!Array.isArray(allowedEffects) || !allowedEffects.every(effect => typeof effect === "string")) throw new TypeError("LAGOON_ALLOWED_EFFECTS must be a JSON array of effect names");

function verbSpecs() {
  return Object.entries(VERBS).map(([verb, { spec }]) => ({
    verb,
    args: verb === STRIP_SPEC_ARGS_VERB ? undefined : spec.args,
    returns: spec.returns,
    refusal: spec.refusal,
    typeSystemIdentity: catalog.identity,
    domain: platform.operation(verb).domain.id,
    codomain: platform.operation(verb).codomain.id,
    effects: platform.operation(verb).effects,
    operation: { ...platform.operation(verb), domain: platform.operation(verb).domain.id, codomain: platform.operation(verb).codomain.id },
  }));
}

async function dispatch(verb, args, expectedCatalog) {
  if (verb === "verbs") return { ok: true, value: verbSpecs() };
  if (verb === "type-system") return { ok: true, value: catalog };
  if (expectedCatalog !== catalog.identity) return { ok: false, refusal: { code: "TypeSystemMismatch", message: "request must name the type catalog observed at handshake" } };
  return platform.execute(verb, args ?? {}, {
    allowedEffects,
  });
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

async function respond(line) {
  const trimmed = line.trim();
  if (!trimmed) return;
  let id;
  try {
    const frame = JSON.parse(trimmed);
    id = frame.id;
    const result = await dispatch(frame.verb, frame.args, frame.typeSystemIdentity);
    process.stdout.write(JSON.stringify({ id, ...result, typeSystemIdentity: catalog.identity, ...(frame.verb === "verbs" ? { typeSystem: catalog } : {}), ...(!result.ok ? { error: `${result.refusal.code}: ${result.refusal.message}` } : {}) }) + "\n");
  } catch (err) {
    process.stdout.write(JSON.stringify({ id, ok: false, error: String(err && err.message || err) }) + "\n");
  }
}

let pendingFrame = Promise.resolve();
rl.on("line", (line) => {
  pendingFrame = pendingFrame.then(() => respond(line), () => respond(line));
});

rl.on("close", () => { pendingFrame.finally(() => platform.close()); });
