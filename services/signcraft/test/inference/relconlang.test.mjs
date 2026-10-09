import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseLine, parseCorpus, tokenize, cellsFromRows } from "../../src/inference/relconlang.mjs";

const LEGACY_CORPUS =
  "/home/emsenn/info/lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-language-systems-engineering-services-section/apps/relation-language-corpus/corpus";

test("tokenize strips trailing punctuation and splits on space", () => {
  assert.deepEqual(tokenize("ku tu ga kan do kano?"), ["ku", "tu", "ga", "kan", "do", "kano"]);
});

test("parses a plain SVO clause with explicit role particles", () => {
  const result = parseLine({ id: "t1", text: "mi ga ran do kelu." });
  assert.equal(result.ok, true);
  const byA = Object.fromEntries(result.rows.map((r) => [r.a, r.v]));
  assert.equal(byA.nsubj, "mi");
  assert.equal(byA.verb, "ran");
  assert.equal(byA.dobj, "kelu");
});

test("parses SVO by position when ga/do are absent", () => {
  const result = parseLine({ id: "t2", text: "mi ran kelu." });
  assert.equal(result.ok, true);
  const byA = Object.fromEntries(result.rows.map((r) => [r.a, r.v]));
  assert.equal(byA.nsubj, "mi");
  assert.equal(byA.dobj, "kelu");
});

test("charge particle sets the FOUR value; ta and default are both potential per stance-system.json", () => {
  const ta = parseLine({ id: "t3", text: "ta mi ga ran do sava." });
  assert.equal(ta.rows[0].reading, "potential"); // ta -> potential (corrected: was mismapped to "active")
  const noCharge = parseLine({ id: "t4", text: "mi ga ran do sava." });
  assert.equal(noCharge.rows[0].reading, "potential"); // default potential
  const stable = parseLine({ id: "t5", text: "sha ni ga ren do kelu." });
  assert.equal(stable.rows[0].reading, "stable");
  const absurd = parseLine({ id: "t5b", text: "mu ni ga ren do kelu." });
  assert.equal(absurd.rows[0].reading, "absurd");
});

test("fronted provenance oblique (NOMINAL pa) and trailing lo/ke chain", () => {
  const result = parseLine({ id: "t6", text: "sava pa mi ga mor do tilo lo hena ke vara." });
  assert.equal(result.ok, true);
  const byA = Object.fromEntries(result.rows.map((r) => [r.a, r.v]));
  assert.equal(byA["obl:provenance"], "sava");
  assert.equal(byA.nsubj, "mi");
  assert.equal(byA.dobj, "tilo");
  assert.equal(byA["obl:locus"], "hena");
  assert.equal(byA["obl:kind"], "vara");
});

test("discourse-force particle and dialogue force reading", () => {
  const q = parseLine({ id: "t7", text: "ku tu ga kan do kano?" });
  assert.equal(q.ok, true);
  assert.equal(q.rows.find((r) => r.a === "discourse").v, "question");
});

test("information-structure particles: topic, focus, contrast, repair", () => {
  const topic = parseLine({ id: "t8", text: "mi ma ran kelu." });
  assert.equal(topic.rows.find((r) => r.a === "info:topic").v, "mi");
  const focus = parseLine({ id: "t9", text: "mi ran fi sava." });
  assert.equal(focus.rows.find((r) => r.a === "info:focus").v, "sava");
  const contrast = parseLine({ id: "t10", text: "ko tu kan kano?" });
  assert.equal(contrast.rows.find((r) => r.a === "info:contrast").v, "tu");
  const repair = parseLine({ id: "t11", text: "mi ran ri hena." });
  assert.equal(repair.rows.find((r) => r.a === "info:repair").v, "hena");
});

test("embedded ccomp clause (do ve / ve) links matrix and embedded events", () => {
  const result = parseLine({ id: "t12", text: "mi ga vom do ve tu ga ran do sava." });
  assert.equal(result.ok, true);
  const matrix = result.rows.filter((r) => r.e === "t12#c0");
  const embedded = result.rows.filter((r) => r.e === "t12#c1");
  assert.equal(matrix.find((r) => r.a === "verb").v, "vom");
  assert.equal(matrix.find((r) => r.a === "ccomp").v, "t12#c1");
  assert.equal(embedded.find((r) => r.a === "nsubj").v, "tu");
  assert.equal(embedded.find((r) => r.a === "dobj").v, "sava");
});

test("verbal aspect suffix becomes a verbFeature row", () => {
  const result = parseLine({ id: "t13", text: "sa ga var-ai do vara." });
  assert.equal(result.rows.find((r) => r.a === "verbFeature").v, "aspect:inchoative");
});

test("refuses an unparseable line with a reason, not a throw", () => {
  const result = parseLine({ id: "t14", text: "xyz abc." });
  assert.equal(result.ok, false);
  assert.match(result.reason, /expected a nominal/);
});

test("row witness order (t) is monotonic within and across units", () => {
  const { rows } = parseCorpus([{ id: "a", text: "mi ga ran do kelu." }, { id: "b", text: "tu ga kan do kano." }]);
  const ts = rows.map((r) => r.t);
  assert.deepEqual(ts, [...ts].sort((a, b) => a - b));
  assert.equal(new Set(ts).size, ts.length);
});

test("cellsFromRows: verb root is the predicate identity, aspect rides as a cell feature", () => {
  const { rows } = parseCorpus([{ id: "c1", text: "sa ga var-ai do vara." }]);
  const cells = cellsFromRows(rows);
  assert.equal(cells.length, 1);
  assert.deepEqual(cells[0], { s: "sa", P: "var", o: "vara", reading: "potential", aspect: "aspect:inchoative", event: "c1#c0" });
});

test("cellsFromRows: a ccomp-headed clause carries no object", () => {
  const { rows } = parseCorpus([{ id: "c2", text: "mi ga vom do ve tu ga ran do sava." }]);
  const cells = cellsFromRows(rows);
  const matrix = cells.find((c) => c.event === "c2#c0");
  const embedded = cells.find((c) => c.event === "c2#c1");
  assert.equal(matrix.o, null);
  assert.equal(matrix.P, "vom");
  assert.deepEqual({ s: embedded.s, P: embedded.P, o: embedded.o }, { s: "tu", P: "ran", o: "sava" });
});

test("gate (a): parses at least 80% of agency-samples.jsonl, reporting refusals", () => {
  const lines = readFileSync(`${LEGACY_CORPUS}/agency-samples.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const { accepted, refused } = parseCorpus(lines);
  const fraction = accepted.length / lines.length;
  if (refused.length > 0) console.error("refused lines:", JSON.stringify(refused, null, 1));
  assert.ok(fraction >= 0.8, `accepted fraction ${fraction} below 0.8`);
});

test("parses dialogue-samples.jsonl turns and register-samples.jsonl lines into rows", () => {
  const dialogue = readFileSync(`${LEGACY_CORPUS}/dialogue-samples.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const register = readFileSync(`${LEGACY_CORPUS}/register-samples.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const { rows, refused } = parseCorpus([...dialogue, ...register]);
  assert.deepEqual(refused, []);
  assert.ok(rows.length > 0);
});
