import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { verifyArtifact } from "@red-cup-engineering/computer-system-engine/identity";
import { tm, ty } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";
import { admitTerm, inspectNamedTermImplementations } from "@red-cup-engineering/communicating/language";
import { journal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import {
  admitTermName,
  readWitnessedTermCatalog,
} from "../src/apps/infograph/operations/term-catalog.mjs";

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-term-catalog-"));
  return {
    root,
    binding: Object.freeze({ dataRoot: root, now: () => "2026-07-12T12:00:00.000Z" }),
  };
}

test("term admission returns exact typing and normalization evidence", () => {
  const admitted = admitTerm(tm.mark("alpha"));
  assert.equal(admitted.kind, "metroplat.language.term-admission:witness");
  assert.deepEqual(admitted.type, ty.base());
  assert.ok(admitted.sources.length >= 2);
  for (const source of admitted.sources) {
    assert.equal(verifyArtifact(source.ref, source.canonicalText).ref, source.ref);
  }

  assert.equal(admitTerm(["not-an-op"]).kind, "metroplat.language.term-admission:obstruction");
  assert.equal(admitTerm(tm.lam(tm.var(0))).kind, "metroplat.language.term-admission:obstruction");
  assert.equal(
    admitTerm(tm.lam(tm.var(0)), ty.arrow(ty.base(), ty.base())).kind,
    "metroplat.language.term-admission:witness",
  );
});

test("named RMN implementation inspection exposes identity placeholders and duplicate bodies", () => {
  const identity = tm.lam(tm.var(0));
  const readout = inspectNamedTermImplementations({
    benincasaDowkerTerm: identity,
    einsteinHilbertTerm: identity,
    actualConstantTerm: tm.lam(tm.mark("implemented")),
    ignoredNonTerm: "not RMN",
  });
  assert.deepEqual(readout.implementations.map(({ name, closed, inferable, identityFunction }) => ({
    name, closed, inferable, identityFunction,
  })), [
    { name: "actualConstantTerm", closed: true, inferable: false, identityFunction: false },
    { name: "benincasaDowkerTerm", closed: true, inferable: false, identityFunction: true },
    { name: "einsteinHilbertTerm", closed: true, inferable: false, identityFunction: true },
  ]);
  assert.deepEqual(readout.collisions.map((collision) => collision.names), [[
    "benincasaDowkerTerm",
    "einsteinHilbertTerm",
  ]]);
});


test("catalog derives only verified witnessed proposals and exposes name conflict", () => {
  const { root, binding } = fixture();
  try {
    const first = admitTermName(binding, { name: "identity", term: tm.mark("alpha") });
    assert.equal(first.kind, "metroplat.language.term-admission:witness");
    assert.ok(journal.readArtifact(root, first.term));

    let catalog = readWitnessedTermCatalog(binding);
    assert.deepEqual(catalog.obstructions, []);
    assert.equal(catalog.designations.length, 1);
    assert.equal(catalog.designations[0].name, "identity");
    assert.equal(catalog.designations[0].charge, "held");
    assert.deepEqual(catalog.designations[0].terms, [first.term]);

    const second = admitTermName(binding, { name: "identity", term: tm.mark("beta") });
    assert.equal(second.kind, "metroplat.language.term-admission:witness");
    catalog = readWitnessedTermCatalog(binding);
    assert.equal(catalog.designations[0].charge, "contested");
    assert.deepEqual(new Set(catalog.designations[0].terms), new Set([first.term, second.term]));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("invalid or untyped proposals are explicit obstructions and are not journaled", () => {
  const { root, binding } = fixture();
  try {
    assert.equal(admitTermName(binding, { name: "", term: tm.mark("x") }).code, "invalid-name");
    assert.equal(admitTermName(binding, { name: "open", term: tm.var(0) }).code, "untyped-term");
    assert.deepEqual(readWitnessedTermCatalog(binding), {
      kind: "metroplat.language.term-catalog",
      designations: [],
      obstructions: [],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
