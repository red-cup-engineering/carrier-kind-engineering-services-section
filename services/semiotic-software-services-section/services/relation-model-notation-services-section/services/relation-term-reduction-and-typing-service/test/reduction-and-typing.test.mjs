import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ty, tm, rename, subst, inst } from "@red-cup-engineering/relation-term-reduction-and-typing/notation";
import {
  step,
  dev,
  evaluate,
  evaluateRunTerm,
  tyEqual,
  inferTy,
  checkTy,
  hasTy,
  termSize,
  termUses,
  isClosed,
} from "@red-cup-engineering/relation-term-reduction-and-typing";
import { carrierToTerm, termToCarrier } from "@red-cup-engineering/relation-term-reduction-and-typing/projecting";
import { countTerm } from "@red-cup-engineering/relation-term-reduction-and-typing/counting";
import {
  intentOfExtentTerm,
  formalConceptTerm,
} from "@red-cup-engineering/relation-term-reduction-and-typing/connecting";
import { chuDualTerm, chuDualInvolutionTerm } from "@red-cup-engineering/relation-term-reduction-and-typing/pairing";
import { classifyRegimeTerm, cohomologyVanishesInRegimeTerm } from "@red-cup-engineering/relation-term-reduction-and-typing/measuring";

// ── notation: constructors and structural operations ───────────────────────

describe("notation grammar", () => {
  it("builds frozen tagged-array terms and types", () => {
    const t = tm.lam(tm.app(tm.var(0), tm.star()));
    assert.deepEqual(t, ["lam", ["app", ["var", 0], ["star"]]]);
    assert.ok(Object.isFrozen(t));
    const type = ty.arrow(ty.base(), ty.unit());
    assert.deepEqual(type, ["arrow", ["base"], ["unit"]]);
  });

  it("inst substitutes the bound variable with a closed value (beta redex material)", () => {
    // (\x. x) applied via inst directly, bypassing app/lam wiring
    const body = tm.var(0);
    const applied = inst(body, tm.star());
    assert.deepEqual(applied, tm.star());
  });

  it("rename shifts free variables under a binder", () => {
    const underLam = tm.lam(tm.var(1)); // free var referring outside the lambda
    const renamed = rename((index) => index + 1, underLam);
    assert.deepEqual(renamed, tm.lam(tm.var(2)));
  });

  it("subst composes with rename to avoid capture", () => {
    // (\x. \y. x) substituting var 0 (x) with (var 0 at the outer level, i.e. y-shadowed)
    const term = tm.lam(tm.lam(tm.var(1)));
    const substituted = subst((index) => (index === 0 ? tm.var(5) : tm.var(index)), term);
    assert.deepEqual(substituted, tm.lam(tm.lam(tm.var(1))));
  });
});

// ── reduction: step/dev/evaluate (RelMath.CHL.step / .dev) ─────────────────

describe("CHL reduction", () => {
  it("step produces the one-step beta reduct for an application of a literal lambda", () => {
    const redex = tm.app(tm.lam(tm.var(0)), tm.star());
    const reducts = step(redex);
    assert.equal(reducts.length, 1);
    assert.deepEqual(reducts[0], tm.star());
  });

  it("step returns no reducts for already-normal atomic terms", () => {
    assert.deepEqual(step(tm.star()), []);
    assert.deepEqual(step(tm.mark("x")), []);
  });

  it("dev performs a complete (Takahashi) development in one call", () => {
    const nested = tm.app(tm.lam(tm.app(tm.lam(tm.var(0)), tm.var(0))), tm.star());
    assert.deepEqual(dev(nested), tm.star());
  });

  it("evaluate iterates dev to a fixed point for nested identities", () => {
    const identity = tm.lam(tm.var(0));
    const term = tm.app(identity, tm.app(identity, tm.app(identity, tm.mark("payload"))));
    assert.deepEqual(evaluate(term), tm.mark("payload"));
  });

  it("evaluate on pair/fst/snd projects correctly", () => {
    const term = tm.fst(tm.pair(tm.mark("left"), tm.mark("right")));
    assert.deepEqual(evaluate(term), tm.mark("left"));
  });

  it("evaluate on cond dispatches on the reduced boolean", () => {
    const term = tm.cond(tm.bool(true), tm.mark("then-branch"), tm.mark("else-branch"));
    assert.deepEqual(evaluate(term), tm.mark("then-branch"));
  });

  it("evaluate on coincide compares two fully-reduced values structurally", () => {
    assert.deepEqual(evaluate(tm.coincide(tm.mark("a"), tm.mark("a"))), tm.bool(true));
    assert.deepEqual(evaluate(tm.coincide(tm.mark("a"), tm.mark("b"))), tm.bool(false));
  });
});

// ── type checker: inferTy/checkTy/hasTy (RelMath.CHL.HasTy) ────────────────

describe("bidirectional type checker", () => {
  it("infers the unit type for star", () => {
    assert.deepEqual(inferTy([], tm.star()), ty.unit());
  });

  it("infers a variable's type from context", () => {
    assert.deepEqual(inferTy([ty.base()], tm.var(0)), ty.base());
  });

  it("checkTy accepts a lambda against a matching arrow type", () => {
    const identity = tm.lam(tm.var(0));
    assert.equal(checkTy([], identity, ty.arrow(ty.base(), ty.base())), true);
  });

  it("checkTy rejects a lambda against a non-arrow type", () => {
    const identity = tm.lam(tm.var(0));
    assert.equal(checkTy([], identity, ty.base()), false);
  });

  it("hasTy delegates to checkTy (decidable HasTy)", () => {
    const pair = tm.pair(tm.star(), tm.star());
    const type = ty.prod(ty.unit(), ty.unit());
    assert.equal(hasTy([], pair, type), true);
  });

  it("tyEqual is structural equality of types", () => {
    assert.equal(tyEqual(ty.arrow(ty.base(), ty.unit()), ty.arrow(ty.base(), ty.unit())), true);
    assert.equal(tyEqual(ty.base(), ty.unit()), false);
  });
});

// ── structural analysis helpers ─────────────────────────────────────────────

describe("structural analysis", () => {
  it("termSize counts total nodes", () => {
    assert.equal(termSize(tm.star()), 1);
    assert.equal(termSize(tm.pair(tm.star(), tm.star())), 3);
  });

  it("termUses collects the sorted set of opcode tags", () => {
    const term = tm.app(tm.lam(tm.var(0)), tm.star());
    assert.deepEqual(termUses(term), ["app", "lam", "star", "var"]);
  });

  it("isClosed is false for a term with a free variable, true once bound", () => {
    assert.equal(isClosed(tm.var(0)), false);
    assert.equal(isClosed(tm.lam(tm.var(0))), true);
  });
});

// ── carrier bridge + evaluateRunTerm (action-body entry point) ─────────────

describe("carrier bridge", () => {
  it("round-trips a JSON value through carrierToTerm/termToCarrier", () => {
    const value = { b: [1, "two", true, null], a: "solo" };
    const roundTripped = termToCarrier(carrierToTerm(value));
    assert.deepEqual(roundTripped, value);
  });

  it("evaluateRunTerm applies a run-term to an admitted carrier and decodes the result", () => {
    // countTerm builds the von Neumann natural whose value is the input list's length.
    const result = evaluateRunTerm(countTerm, ["a", "b", "c"]);
    assert.equal(result.kind, "exactNumber.natural");
    assert.equal(result.members.length, 3);
    // Von Neumann: each successor's own members array is one shorter than its parent's.
    assert.equal(result.members[2].members.length, 2);
    assert.equal(result.members[0].members.length, 0);
  });
});

// ── term catalog: a representative sample of each subpath ──────────────────

describe("term catalog (connecting/pairing/measuring)", () => {
  it("connecting: intentOfExtentTerm computes the FCA intent of an extent", () => {
    const cells = [
      { subject: "alpha", predicate: "warm" },
      { subject: "alpha", predicate: "bright" },
      { subject: "beta", predicate: "warm" },
    ];
    const intent = evaluateRunTerm(intentOfExtentTerm, { cells, extent: ["alpha", "beta"] });
    assert.deepEqual(intent, ["warm"]);
  });

  it("connecting: formalConceptTerm builds the concept pair", () => {
    const cells = [
      { subject: "alpha", predicate: "warm" },
      { subject: "beta", predicate: "warm" },
    ];
    const concept = evaluateRunTerm(formalConceptTerm, { cells, extent: ["alpha", "beta"] });
    assert.equal(concept.kind, "predication.fca.concept");
    assert.deepEqual(concept.extent, ["alpha", "beta"]);
    assert.deepEqual(concept.intent, ["warm"]);
  });

  it("pairing: chuDualTerm and chuDualInvolutionTerm hold for a one-point space", () => {
    // FOUR's charge vocabulary here is bilattice-charge's own (active/potential/…),
    // per this term's own JSDoc example — not the canonical grammar's plain-English names.
    const space = { pts: ["a"], sts: ["x"], r: [{ pt: "a", st: "x", charge: "active" }] };
    const dual = evaluateRunTerm(chuDualTerm, space);
    assert.deepEqual(dual.pts, ["x"]);
    assert.deepEqual(dual.sts, ["a"]);
    assert.equal(dual.r[0].charge, "potential");
    assert.equal(evaluateRunTerm(chuDualInvolutionTerm, space), true);
  });

  it("measuring: classifyRegimeTerm and cohomologyVanishesInRegimeTerm agree on the finite regime", () => {
    const regime = evaluateRunTerm(classifyRegimeTerm, {
      kind: "settling.closureRegimeData",
      finiteBase: true,
      scottContinuous: true,
      countableCofinality: true,
    });
    assert.equal(regime.kind, "ordinal.closure.regime.finite");
    assert.equal(evaluateRunTerm(cohomologyVanishesInRegimeTerm, regime), true);
  });
});
