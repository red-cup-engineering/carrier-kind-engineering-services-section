import assert from "node:assert/strict";
import test from "node:test";
import {
  phaseEvidence, phaseEvidenceRegime, phaseEvidenced,
  aperiodicOrderPhase, transfiniteClosurePhase, strictFinitePhase, scottStreamPhase,
} from "@red-cup-engineering/signchain/contracts/phase";
import { aheadCertificate, closeByCertificate } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/certificate";

const declaration = "Obsmetrologia.residue_germ_ahead";
// Raw records exercise the public readers, which also receive decoded evidence.
// The canonical builder's independent Nat guard must not hide a provider fault.
const rawEvidence = (residue, extra = {}) => ({
  kind: "metroplat.phase-evidence", id: "fixture.germ-evidence",
  phase: aperiodicOrderPhase.id, stages: ["fixture.observed-stage"],
  certificate: { declaration, residue }, ...extra,
});

for (const residue of [
  { pos: -1, neg: 0 }, { pos: 0, neg: -1 }, { pos: -1, neg: 1 },
  { pos: 1, neg: -1 }, { pos: -1, neg: -1 },
]) {
  test(`raw phase evidence with negative residue (${residue.pos}, ${residue.neg}) witnesses no regime`, () => {
    const evidence = rawEvidence(residue);
    assert.deepEqual({ regime: phaseEvidenceRegime(aperiodicOrderPhase, evidence),
      evidenced: phaseEvidenced(aperiodicOrderPhase, [evidence]) }, { regime: null, evidenced: false });
  });
}

test("the canonical phase evidence constructor already rejects either negative tally", () => {
  for (const residue of [{ pos: -1, neg: 0 }, { pos: 0, neg: -1 }]) {
    assert.throws(() => phaseEvidence(rawEvidence(residue)), /a tally is a natural number/);
  }
});

for (const residue of [{ pos: 0, neg: 1 }, { pos: 1, neg: 0 }, { pos: 1, neg: 1 }, { pos: 2, neg: 1 }, { pos: 1, neg: 2 }]) {
  test(`nonnegative residue (${residue.pos}, ${residue.neg}) retains its catalog regime`, () => {
    const raw = rawEvidence(residue), canonical = phaseEvidence(raw);
    for (const evidence of [raw, canonical]) {
      assert.equal(phaseEvidenceRegime(aperiodicOrderPhase, evidence), "aperiodic");
      assert.equal(phaseEvidenced(aperiodicOrderPhase, [evidence]), true);
    }
    assert.ok(Object.isFrozen(canonical.certificate.residue));
  });
}

test("the canonical constructor snapshots the caller's mutable residue", () => {
  const residue = { pos: 1, neg: 1 }, evidence = phaseEvidence(rawEvidence(residue));
  residue.pos = -1;
  assert.deepEqual(evidence.certificate.residue, { pos: 1, neg: 1 });
  assert.equal(phaseEvidenced(aperiodicOrderPhase, [evidence]), true);
});

test("zero, missing, malformed and unsafe residue evidence stays obstructed", () => {
  for (const residue of [undefined, null, {}, { pos: 0, neg: 0 },
    { pos: 0.5, neg: 1 }, { pos: 1, neg: NaN }, { pos: Infinity, neg: 1 },
    { pos: Number.MAX_SAFE_INTEGER + 1, neg: 1 }, { pos: 1, neg: Number.MAX_SAFE_INTEGER + 1 }]) {
    assert.equal(phaseEvidenceRegime(aperiodicOrderPhase, rawEvidence(residue)), null);
    assert.equal(phaseEvidenced(aperiodicOrderPhase, [rawEvidence(residue)]), false);
  }
  const unknown = rawEvidence({ pos: 1, neg: 1 }, { certificate: { declaration: "unknown" } });
  assert.equal(phaseEvidenceRegime(aperiodicOrderPhase, unknown), null);
  assert.equal(phaseEvidenced(aperiodicOrderPhase, [unknown]), false);
});

test("phase evidence still requires matching phase, nonempty stages and matching catalog regime", () => {
  const evidence = rawEvidence({ pos: 1, neg: 1 });
  assert.equal(phaseEvidenced(aperiodicOrderPhase, [{ ...evidence, phase: "other-phase" }]), false);
  assert.equal(phaseEvidenced(aperiodicOrderPhase, [{ ...evidence, stages: [] }]), false);
  assert.equal(phaseEvidenced(transfiniteClosurePhase, [{ ...evidence, phase: transfiniteClosurePhase.id }]), false);
  assert.equal(phaseEvidenced(aperiodicOrderPhase, []), false);
});

test("the ahead declaration retains its transfinite catalog regime", () => {
  const evidence = phaseEvidence({ id: "fixture.ahead-evidence", phase: transfiniteClosurePhase.id,
    stages: ["fixture.observed-stage"], certificate: { declaration: "Obsmetrologia.omega_ahead" } });
  assert.equal(phaseEvidenceRegime(transfiniteClosurePhase, evidence), "transfinite-bounded");
  assert.equal(phaseEvidenced(transfiniteClosurePhase, [evidence]), true);
});

test("ordinary phase observations retain their lower-rung behavior", () => {
  const observed = phase => ({ id: "fixture.observed", phase: phase.id, stages: ["fixture.stage"] });
  assert.equal(phaseEvidenced(strictFinitePhase, [phaseEvidence({ ...observed(strictFinitePhase), settledAt: 1 })]), true);
  assert.equal(phaseEvidenced(scottStreamPhase, [phaseEvidence(observed(scottStreamPhase))]), true);
  assert.equal(phaseEvidenced(transfiniteClosurePhase, [phaseEvidence(observed(transfiniteClosurePhase))]), false);
  assert.equal(phaseEvidenced(aperiodicOrderPhase, [phaseEvidence(observed(aperiodicOrderPhase))]), false);
});

test("finite process agreement remains insufficient for universal certificate correspondence", () => {
  const certificate = aheadCertificate("Obsmetrologia.omega_ahead");
  const process = { lattice: { eq: certificate.eq }, endomorphism: point =>
    point.pos === null ? certificate.orbit(0) : point.pos >= 16 ? point : certificate.step(point) };
  assert.equal(closeByCertificate(certificate, { process, stages: 16 }).kind, "ordinal.closure.carrier");
  const later = closeByCertificate(certificate, { process, stages: 17 });
  assert.equal(later.reason, "process-disagrees-with-certificate");
  assert.equal(later.stage, 16);
  assert.notDeepEqual(process.endomorphism(certificate.limit), certificate.limit);
  // Neither the sampled pass nor SignChain's catalog regime proves this process.
});
