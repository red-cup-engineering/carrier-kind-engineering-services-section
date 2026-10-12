#!/usr/bin/env node
/**
 * Emit golden vectors from the JS SignStuff libraries into test/vectors/js/*.json.
 *
 * Everything here is computed by the real `four`, `signcell` and `signchain` modules (or, where an
 * identity is chain-native, by the twin in scripts/lib). The Foundry tests read these files and must
 * reproduce every row byte for byte; a Lean-emitted set under test/vectors/lean/ is checked the same way.
 *
 *   node scripts/emit-golden-vectors.mjs           write test/vectors/js/*.json
 *   node scripts/emit-golden-vectors.mjs --check   fail if the files on disk differ from a fresh emission
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as four from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { cell, address, told, valueOf } from "@red-cup-engineering/signcell/cell";
import * as bilattice from "@red-cup-engineering/signchain/bilattice";
import { cohomologyOfCells } from "@red-cup-engineering/signgraph/cohomology";
import { semanticBytes } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import {
  accountWitness, bytesToHex, cellIdHex, encodeTerm, hexOfNi, niOfHex, scopedAccountWitness, sectionDigestHex,
  tellingIdHex, tellingRowIdHex, termIdHex, witnessIdHex,
} from "./lib/cell-address.mjs";
import { proofHex, rootHex, sortedUnique, unionHex } from "./lib/witness-set.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "test", "vectors", "js");
const check = process.argv.includes("--check");

const POINTS = four.readingFamilies.knowledge; // index = for + 2*against
const bitsOf = (name) => POINTS.indexOf(four.readingAs("knowledge", name));
const nameOfBits = (bits) => POINTS[bits];
const header = (schema) => ({ schema: `signstuff-evm/${schema}@1`, source: "js", generator: "scripts/emit-golden-vectors.mjs" });
const table1 = (f) => POINTS.map((a) => bitsOf(f(a)));
const table2 = (f) => POINTS.flatMap((a) => POINTS.map((b) => { const r = f(a, b); return typeof r === "boolean" ? r : bitsOf(r); }));

const files = {};

// — FOUR: every operation as a table indexed by bits (binary: a*4 + b) —
files["four.json"] = {
  ...header("four-vectors"),
  points: POINTS.map((name, bits) => ({
    bits, sides: [...four.sidesOfReading(name)],
    names: Object.fromEntries(Object.entries(four.readingFamilies).map(([family, names]) => [family, names[bits]])),
  })),
  unary: {
    negate: table1(four.negateReading),
    conflate: table1(four.conflateReading),
    linearNegate: table1(four.linearNegationReading),
    knowledgeHeight: POINTS.map(four.knowledgeHeight),
    truthHeight: POINTS.map(four.truthHeight),
    isConsistent: POINTS.map(four.isConsistentReading),
  },
  binary: {
    joinK: table2(four.knowledgeJoinReading),
    meetK: table2(four.knowledgeMeetReading),
    joinT: table2(four.truthJoinReading),
    meetT: table2(four.truthMeetReading),
    leqK: table2(four.knowledgeLeqReading),
    leqT: table2(four.truthLeqReading),
    impK: table2(four.knowledgeImplyReading),
    impT: table2(four.truthImplyReading),
    tensor: table2(four.fusionReading),
    residuum: table2(four.residuumReading),
    par: table2(four.parReading),
  },
  constants: { unit: bitsOf(four.linearUnit()), knowledgeBottom: bitsOf(four.knowledgeBottom()), knowledgeTop: bitsOf(four.knowledgeTop()), truthTop: bitsOf(four.truthTop()), truthBottom: bitsOf(four.truthBottom()) },
};

// — cell identity: terms, encoded bytes, ids, converse, reflexive, ni names —
const text = (value) => ({ kind: "text", value });
const termCases = [
  ["alice", "member-of", "tidepool"],
  ["tidepool", "has-quorum", "tidepool"],
  ["é", "naïve", "日本語"],
  ["", "empty-subject", "x"],
  ["a".repeat(23), "b".repeat(24), "c".repeat(300)],
  ["urn:561:pool:7", "contests", "ni:///sha-256;n7eWANzlnUvQV-02DR0DuU-CDwSlItGh2SYVSkZF320"],
  ["hive:emsenn", "told", "evm:0x00000000000000000000000000000000000000ab"],
];
files["cell-address.json"] = {
  ...header("cell-address-vectors"),
  cells: termCases.map(([s, p, o]) => ({
    subject: text(s), predicate: text(p), object: text(o),
    encoded: { subject: encodeTerm(s), predicate: encodeTerm(p), object: encodeTerm(o) },
    termIds: { subject: termIdHex(s), predicate: termIdHex(p), object: termIdHex(o) },
    cellId: cellIdHex(s, p, o),
    ni: address(cell(s, p, o)),
    converseCellId: cellIdHex(o, p, s),
    reflexiveCellId: cellIdHex(s, p, s),
  })),
  // terms that are not text: only the pre-encoded path applies on-chain
  encodedTerms: [
    { json: 42, encoded: encodeTerm(42) },
    { json: 1000000, encoded: encodeTerm(1000000) },
    { json: true, encoded: encodeTerm(true) },
    { json: null, encoded: encodeTerm(null) },
    { json: ["a", 1, [2]], encoded: encodeTerm(["a", 1, [2]]) },
    { json: { b: 1, a: "x" }, encoded: encodeTerm({ b: 1, a: "x" }) },
  ].map((c) => ({ ...c, json: JSON.stringify(c.json) })),
  bytesTerms: [{ hex: "00ff10", encoded: bytesToHex(semanticBytes(Uint8Array.from([0, 255, 16]))) }],
  uintTerms: [0, 23, 24, 255, 256, 65535, 65536, 4294967295, 4294967296].map((n) => ({ value: String(n), encoded: encodeTerm(n) })),
  // a cell with a non-text object: pre-encoded path
  mixed: [{ subject: "alice", predicate: "voted", object: 7 }].map(({ subject, predicate, object }) => ({
    subject: encodeTerm(subject), predicate: encodeTerm(predicate), object: encodeTerm(object), cellId: cellIdHex(subject, predicate, object),
  })),
};
for (const c of files["cell-address.json"].cells) if (hexOfNi(c.ni) !== c.cellId) throw new Error("ni name and digest disagree");
if (niOfHex(files["cell-address.json"].cells[0].cellId) !== files["cell-address.json"].cells[0].ni) throw new Error("ni spelling");

// — tellings: SignChain row id (JS-defined) and the chain-native telling id —
const tellingCases = [
  ["alice", "member-of", "tidepool", "for", "bob"],
  ["alice", "member-of", "tidepool", "against", "carol"],
  ["receipt-9", "paid", "receipt-9", "for", accountWitness("0xAbCdEf0000000000000000000000000000000001")],
  ["receipt-9", "paid", "receipt-9", "against", "hive:emsenn"],
];
files["telling.json"] = {
  ...header("telling-vectors"),
  rows: tellingCases.map(([s, p, o, side, w]) => ({
    encoded: { subject: encodeTerm(s), predicate: encodeTerm(p), object: encodeTerm(o), witness: encodeTerm(w) },
    side,
    rowId: tellingRowIdHex(s, p, o, w, side),
    cellId: cellIdHex(s, p, o),
    witnessId: witnessIdHex(w),
    tellingId: tellingIdHex(cellIdHex(s, p, o), side, witnessIdHex(w)),
  })),
};

// — account witnesses: the CBOR text Solidity must build from an address —
const addrs = ["0xAbCdEf0000000000000000000000000000000001", "0x0000000000000000000000000000000000000000", "0xffffFFFFffffFFFFffffffffFFFFFFFfffFFfFFF"];
files["account-witness.json"] = {
  ...header("account-witness-vectors"),
  chainAgnostic: addrs.map((a) => ({ address: a.toLowerCase(), encoded: encodeTerm(accountWitness(a)), witnessId: witnessIdHex(accountWitness(a)) })),
  chainScoped: [1, 8453, 42161, 10, 100].flatMap((chainId) => addrs.slice(0, 1).map((a) => ({
    chainId, address: a.toLowerCase(), encoded: encodeTerm(scopedAccountWitness(chainId, a)), witnessId: witnessIdHex(scopedAccountWitness(chainId, a)),
  }))),
};

// — witness-set commitments (sorted-pair Merkle) —
const wid = (n) => witnessIdHex(`w${n}`);
const setCases = [[], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4, 5], Array.from({ length: 8 }, (_, i) => i), Array.from({ length: 13 }, (_, i) => i + 40)];
files["witness-set.json"] = {
  ...header("witness-set-vectors"),
  sets: setCases.map((ns) => {
    const ids = sortedUnique(ns.map(wid));
    return { ids, root: rootHex(ids), proofs: ids.map((id) => ({ id, proof: proofHex(ids, id) })) };
  }),
  unions: [[[1, 2, 3], [3, 4]], [[], [5]], [[1, 2], [1, 2]], [[7, 8, 9, 10], [1, 2]]].map(([a, b]) => {
    const ia = sortedUnique(a.map(wid)), ib = sortedUnique(b.map(wid)), u = unionHex(ia, ib);
    return { a: ia, b: ib, union: u, unionRoot: rootHex(u) };
  }),
};

// — evidence: signchain bilattice on cells, witnesses by slot in a fixed universe —
const universe = ["w0", "w1", "w2", "w3", "w4", "w5"];
const slots = (witnesses) => witnesses.map((w) => universe.indexOf(w)).sort((x, y) => x - y);
const describe = (c) => ({ for: slots(c.for), against: slots(c.against), value: bitsOf(valueOf(c)) });
const sample = (forW, againstW, value) => cell("s", "p", "o", { for: forW, against: againstW, ...(value ? { value } : {}) });
const pairs = [
  [sample(["w0"], []), sample([], ["w1"])],
  [sample(["w0", "w2"], ["w1"]), sample(["w2"], ["w3", "w4"])],
  [sample([], []), sample(["w5"], ["w5"])],
  [sample(["w0"], ["w1"], "absurd"), sample(["w2"], [], "potential")],
  [sample(["w0", "w1"], ["w0"]), sample(["w0", "w1"], ["w0"])],
];
const ops = { joinK: bilattice.knowledgeJoin, meetK: bilattice.knowledgeMeet, joinT: bilattice.truthJoin, meetT: bilattice.truthMeet };
files["evidence.json"] = {
  ...header("evidence-vectors"),
  universe,
  binary: pairs.flatMap(([a, b]) => Object.entries(ops).map(([op, f]) => ({
    op, a: describe(a), b: describe(b), result: describe(f(a, b)), leqK: bilattice.knowledgeLeq(a, b), leqT: bilattice.truthLeq(a, b),
  }))),
  unary: pairs.flatMap(([a]) => Object.entries({ negate: bilattice.negate, conflate: bilattice.conflate, presumeFree: bilattice.presumeFree }).map(([op, f]) => ({
    op, a: describe(a), result: describe(f(a)),
  }))),
};
for (const row of files["evidence.json"].binary) if (row.op === "joinK" && row.a.value === undefined) throw new Error("unreachable");
void told;

// — settled section digest —
const sectionCells = [["x", "p", "y", 1], ["y", "p", "z", 3], ["z", "p", "x", 2], ["x", "q", "x", 0]].map(([s, p, o, value]) => ({ cell: cellIdHex(s, p, o), value }));
files["section-digest.json"] = {
  ...header("section-digest-vectors"),
  sections: [sectionCells, sectionCells.slice(0, 1), []].map((entries) => {
    const sorted = [...entries].sort((l, r) => (l.cell < r.cell ? -1 : 1));
    return { cells: sorted.map((e) => e.cell), values: sorted.map((e) => e.value), digest: sectionDigestHex(entries) };
  }),
};

// — graph cohomology of small cell sets —
const graphs = [
  [["a", "p", "b"]],
  [["a", "p", "b"], ["b", "p", "c"], ["c", "p", "a"]],
  [["a", "p", "b"], ["c", "p", "d"]],
  [["a", "p", "a"], ["a", "q", "a"], ["a", "p", "b"], ["b", "r", "a"]],
  [["a", "p", "b"], ["b", "p", "c"], ["c", "p", "d"], ["d", "p", "a"], ["a", "p", "c"], ["e", "p", "f"]],
];
files["cohomology.json"] = {
  ...header("cohomology-vectors"),
  graphs: graphs.map((g) => {
    const r = cohomologyOfCells(g.map(([s, p, o]) => ({ subject: s, predicate: p, object: o })));
    return {
      subjects: g.map(([s]) => termIdHex(s)), objects: g.map(([, , o]) => termIdHex(o)),
      entities: r.entities.length, cells: g.length, h0: r.zeroCohomology.rank, h1: r.firstCohomology.rank,
    };
  }),
};

// — CBOR well-formedness: JS-encoded items are single items; hand-made damage is not —
const good = [0, 1, 23, 24, 255, 65536, -1, "x", "é", true, false, null, [], [1, [2, [3]]], {}, { a: 1, b: [2] }, Uint8Array.from([1, 2, 3]), "z".repeat(500)];
files["cbor.json"] = {
  ...header("cbor-vectors"),
  wellFormed: good.map((v) => bytesToHex(semanticBytes(v))),
  malformed: ["", "18", "1900", "61", "6261", "82 01", "a1 01", "1f", "5f ff", "01 02", "7f 61 61 ff", "f818", "1c", "c1"].map((h) => h.replace(/ /g, "")),
};

// — write / check —
let drift = 0;
mkdirSync(outDir, { recursive: true });
for (const [name, body] of Object.entries(files)) {
  const path = join(outDir, name);
  const next = `${JSON.stringify(body, null, 2)}\n`;
  if (check) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== next) { console.error(`drift: ${name}`); drift += 1; }
  } else writeFileSync(path, next);
}
if (check && drift) process.exit(1);
console.log(check ? "vectors match" : `wrote ${Object.keys(files).length} vector files to ${outDir}`);
void nameOfBits;
