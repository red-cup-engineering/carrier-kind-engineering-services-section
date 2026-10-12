import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  buildJoinQuery,
  buildTheoremFacts,
  digestCarrier,
  nameOfEntity,
} from "../src/census-admission.mjs";

const encoder = new TextEncoder();

function carrier(text, date, path, extraJson) {
  const bytes = encoder.encode(text);
  const built = { text, bytes, date, path };
  if (extraJson) built.json = extraJson;
  return built;
}

// A 5-theorem fixture: thmA/thmB axiom-profile contains Quot.sound and are
// regime-mode "hypothesized" in a module (KineticTheory) with a positive
// module-upward-import-count -- the join's expected 2 matches. thmC's
// axiom-profile is "propext" alone (no Quot.sound); thmD carries no regime
// row at all; thmE's module (Site) has zero upward imports.
function fixtureCarriers() {
  const axiom = carrier(
    [
      "Obsmetrologia.KineticTheory.thmA\tQuot.sound",
      "Obsmetrologia.KineticTheory.thmB\tpropext,Quot.sound",
      "Obsmetrologia.KineticTheory.thmC\tpropext",
      "Obsmetrologia.Closure.thmD\tQuot.sound",
      "Obsmetrologia.Site.thmE\tQuot.sound",
      "",
    ].join("\n"),
    "2026-09-03",
    "2026-09-03-theorem-axiom-census-rows.tsv",
  );
  const site = carrier(
    [
      "#sites\t2",
      "#site\tObsmetrologia.Foo.bar",
      "#site\tObsmetrologia.Foo.baz",
      "Obsmetrologia.KineticTheory.thmA\t1\tObsmetrologia.Foo.bar",
      "Obsmetrologia.KineticTheory.thmB\t0\t",
      "Obsmetrologia.KineticTheory.thmC\t0\t",
      "Obsmetrologia.Closure.thmD\t2\tObsmetrologia.Foo.bar,Obsmetrologia.Foo.baz",
      "Obsmetrologia.Site.thmE\t0\t",
      "",
    ].join("\n"),
    "2026-09-03",
    "2026-09-03-identification-site-census-rows.tsv",
  );
  const regime = carrier(
    [
      "#datum\tObsmetrologia.SomeDatum\ttrue",
      "Obsmetrologia.KineticTheory.thmA\t1\t\t\t\tObsmetrologia.ClosureRegime\t0",
      "Obsmetrologia.KineticTheory.thmB\t1\t\t\t\tObsmetrologia.ClosureRegime\t0",
      "Obsmetrologia.KineticTheory.thmC\t1\t\t\t\tObsmetrologia.ClosureRegime\t0",
      "Obsmetrologia.Site.thmE\t1\t\t\t\tObsmetrologia.ClosureRegime\t0",
      "",
    ].join("\n"),
    "2026-09-04",
    "2026-09-04-regime-instantiation-census-rows.tsv",
  );
  const strataJson = {
    modules: {
      KineticTheory: { stratum: "dynamics" },
      Closure: { stratum: "geometry" },
      Site: { stratum: "geometry" },
    },
    upward: {
      byModule: {
        KineticTheory: [{ file: "x.lean", line: 1, target: "Site" }],
      },
    },
  };
  const strata = carrier(JSON.stringify(strataJson), "2026-09-04", "2026-09-04-module-strata-census.json", strataJson);
  return { axiom, site, regime, strata };
}

test("buildTheoremFacts: entity address is stable for the same theorem name (constituting utterance)", () => {
  const carriers = fixtureCarriers();
  const first = buildTheoremFacts(carriers);
  const second = buildTheoremFacts(carriers);
  deepStrictEqual(first.addressOf, second.addressOf);
  ok(first.addressOf["Obsmetrologia.KineticTheory.thmA"].startsWith("obsmetrologia-theorem:"));
});

test("buildTheoremFacts: attributes are plain strings/ints, never an object format", () => {
  const { rows, addressOf } = buildTheoremFacts(fixtureCarriers());
  const thmA = addressOf["Obsmetrologia.KineticTheory.thmA"];
  const axiomProfileRow = rows.find((row) => row.e === thmA && row.a === "axiom-profile");
  const siteCountRow = rows.find((row) => row.e === thmA && row.a === "identification-site-count");
  const moduleRow = rows.find((row) => row.e === thmA && row.a === "module");
  strictEqual(typeof axiomProfileRow.v, "string");
  strictEqual(axiomProfileRow.v, "Quot.sound");
  strictEqual(typeof siteCountRow.v, "number");
  strictEqual(siteCountRow.v, 1);
  strictEqual(typeof moduleRow.v, "string");
  strictEqual(moduleRow.v, "KineticTheory");
});

test("buildTheoremFacts: multi-valued identification-site yields one row per site", () => {
  const { rows, addressOf } = buildTheoremFacts(fixtureCarriers());
  const thmD = addressOf["Obsmetrologia.Closure.thmD"];
  const siteRows = rows.filter((row) => row.e === thmD && row.a === "identification-site");
  deepStrictEqual(
    siteRows.map((row) => row.v).sort(),
    ["Obsmetrologia.Foo.bar", "Obsmetrologia.Foo.baz"],
  );
});

test("buildTheoremFacts: regime-mode/concludes-aperiodic present only for theorems in the regime census", () => {
  const { rows, addressOf } = buildTheoremFacts(fixtureCarriers());
  const thmD = addressOf["Obsmetrologia.Closure.thmD"]; // absent from the regime fixture
  const thmA = addressOf["Obsmetrologia.KineticTheory.thmA"];
  strictEqual(rows.some((row) => row.e === thmD && row.a === "regime-mode"), false);
  strictEqual(rows.some((row) => row.e === thmD && row.a === "concludes-aperiodic"), false);
  const regimeModeRow = rows.find((row) => row.e === thmA && row.a === "regime-mode");
  strictEqual(regimeModeRow.v, "hypothesized");
});

test("buildTheoremFacts: every row's provenance -- a 'cites' row per contributing carrier, resolving with no missing/cycles", () => {
  const { rows, addressOf } = buildTheoremFacts(fixtureCarriers());
  const thmA = addressOf["Obsmetrologia.KineticTheory.thmA"];
  const citesRows = rows.filter((row) => row.e === thmA && row.a === "cites");
  strictEqual(citesRows.length, 4); // axiom, site, strata, regime (thmA is in the regime fixture)

  const axiomLeaf = rows.find((row) => row.a === "census-record" && row.v === "2026-09-03-theorem-axiom-census-rows.tsv");
  ok(citesRows.some((row) => row.v === axiomLeaf.e));

  for (const citation of citesRows) {
    const leaves = rows.filter(row => row.e === citation.v && row.a === "census-record");
    strictEqual(leaves.length, 1);
    strictEqual(rows.some(row => row.e === citation.v && row.a === "cites"), false);
  }
});

test("digestCarrier: a plain sha-256 ni: URI over the exact bytes given", () => {
  const uri = digestCarrier(encoder.encode("hello"));
  ok(uri.startsWith("ni:///sha-256;"));
  strictEqual(digestCarrier(encoder.encode("hello")), uri);
  ok(digestCarrier(encoder.encode("world")) !== uri);
});

test("buildJoinQuery: regime-mode=hypothesized AND axiom-profile~Quot.sound AND module-upward-import-count>0 over the 5-theorem fixture returns exactly 2", () => {
  const { rows, addressOf } = buildTheoremFacts(fixtureCarriers());
  const matches = buildJoinQuery(rows);
  strictEqual(matches.length, 2);
  const names = matches.map((address) => nameOfEntity(rows, address)).sort();
  deepStrictEqual(names, ["Obsmetrologia.KineticTheory.thmA", "Obsmetrologia.KineticTheory.thmB"]);
});
