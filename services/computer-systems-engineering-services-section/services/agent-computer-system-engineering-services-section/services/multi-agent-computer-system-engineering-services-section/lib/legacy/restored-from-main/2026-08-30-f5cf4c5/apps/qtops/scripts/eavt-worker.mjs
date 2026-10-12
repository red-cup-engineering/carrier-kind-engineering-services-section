// eavt-worker — the Node worker for qtOps's node-worker (WO-6). A thin stdio loop: reads
// newline-delimited JSON request frames ({id, verb, args}) on stdin, dispatches each to real
// exported functions from the packages that actually own each substrate law, and writes
// {id, ok, value} or {id, ok: false, error} reply frames on stdout — one reply line per
// request line.
//
// This worker invents nothing and ports nothing: every verb below is a direct call to a function
// an already-published package exports. Per the primitives-live-once law, no two of these laws
// live in the same package, so this worker composes three:
//   - @red-cup-engineering/computer         — traces: row assertion, dedupe, durable append, fold.
//   - @red-cup-engineering/cbor-codec-service — RFC 8949 core-deterministic canonical CBOR.
//   - @red-cup-engineering/cbor-ni-service     — RFC 6920 `ni:` URI naming of canonical CBOR bytes.
// (@561-group/computer is the same package's stale registry name — the live source has since
// moved to @red-cup-engineering/computer; see the report.) CBOR bytes cross the wire
// base64-encoded inside the JSON frames — the one plumbing encoding step this worker performs;
// it never interprets what the bytes mean.
//
// Run standalone: `node scripts/eavt-worker.mjs` (reads/writes stdio; no argv).

import { createInterface } from "node:readline";
import { assertRow, dedupe } from "@red-cup-engineering/computer/typed-resource-catalog/eavt";
import appendEavt from "@red-cup-engineering/computer/posix-holography/eavt-append";
import readText from "@red-cup-engineering/computer/posix-holography/read-text";
import { fold, settle, section, supersede, relate, relateFrom } from "@red-cup-engineering/computer/posix-holography/eavt-substrate";
import { encodeCanonical, decodeCanonical } from "@red-cup-engineering/cbor-codec-service";
import { canonicalCborToNiUri } from "@red-cup-engineering/cbor-ni-service";

// NOTE (finding, not worked around here): @red-cup-engineering/computer's package.json
// "exports" map does not publish posix-holography/src/eavt.mjs's readEavt/writeEavt/settleEavt
// under any subpath — only appendEavt (via eavt-append.mjs) and the generic read-text.mjs are
// exported. So this worker cannot read an eavt trace back off disk as a parsed presheaf; it can
// only append durably and read the raw bytes back as text. Verbs below reflect that real,
// narrower surface rather than inventing a parse step the leaf itself does not publish.

// verbs — the handshake surface: every verb name this worker exposes, checked by the node-worker at
// session start (WO-6's "the contract is one typed spec file naming every verb either side
// exposes, checked at session start"). Kept as the literal dispatch table's own keys below so the
// handshake can never drift from what is actually callable.
const VERBS = {
  // "verbs" itself is answered specially (see dispatch), so it is not in this table.

  // row assertion: exactly {e,a,v,t}, or throws. Returns the row unchanged on success.
  "assert-row": ({ row }) => assertRow(row),

  // RFC 8949 core-deterministic canonical CBOR encoding of any admitted JSON-shaped value.
  // Binary output, so it crosses the wire base64-encoded (plumbing only).
  "encode-cbor": ({ value }) => encodeCanonical(value).toString("base64"),

  // the inverse: base64-encoded canonical CBOR bytes back to the value. Rejects any input that
  // is not itself in RFC 8949 core deterministic form.
  "decode-cbor": ({ bytes }) => decodeCanonical(Buffer.from(bytes, "base64")),

  // content identity of a row (or any value): its RFC 6920 `ni:` URI over its RFC 8949 canonical
  // CBOR encoding — composes cbor-codec-service and cbor-ni-service, each the real owner of one
  // half of WO-3/WO-6's "canonical CBOR, ni: row identity" law.
  "row-id": ({ row }) => canonicalCborToNiUri(encodeCanonical(row)),

  // G-Set dedupe of a row array by content id, first occurrence kept, order preserved.
  "dedupe": ({ rows }) => dedupe(rows),

  // durable single-row append (fsync'd, canonical bytes on disk). Returns the path appended to.
  "append": ({ path, row }) => appendEavt(path, row),

  // raw utf8 text of a file — the only exported disk-read (no eavt-parsing published; see NOTE).
  "read-text": ({ path }) => readText(path),

  // the latest-t functional projection over a raw row array (opts.functional: array of predicate
  // names treated as a Set; omit for none).
  "supersede": ({ rows, functional }) => supersede(rows, Array.isArray(functional) ? new Set(functional) : functional),

  // fold one subject's {e,a,v,t} trace into its settled fiber of {predicate,object,value} cells.
  "fold": ({ subject, rows, opts }) => fold(subject, rows, opts ?? {}),

  // supersede + fold in one call.
  "settle": ({ subject, rows, opts }) => settle(subject, rows, opts ?? {}),

  // project a folded section to {affirmed, denied, contradicted}.
  "section": ({ folded }) => section(folded),

  // general relational reads over a raw row array.
  "relate": ({ rows, predicate, object }) => relate(rows, predicate, object),
  "relate-from": ({ rows, subject, predicate }) => relateFrom(rows, subject, predicate),
};

function dispatch(verb, args) {
  if (verb === "verbs") return Object.keys(VERBS);
  const fn = VERBS[verb];
  if (!fn) throw new TypeError(`eavt-worker: unknown verb ${JSON.stringify(verb)}`);
  return fn(args ?? {});
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let id;
  try {
    const frame = JSON.parse(trimmed);
    id = frame.id;
    const value = dispatch(frame.verb, frame.args);
    process.stdout.write(JSON.stringify({ id, ok: true, value }) + "\n");
  } catch (err) {
    process.stdout.write(JSON.stringify({ id, ok: false, error: String(err && err.message || err) }) + "\n");
  }
});
