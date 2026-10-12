import test from 'node:test';
import assert from 'node:assert/strict';
import { monotonicityCertificateOfFederatedCover } from '../../src/signcraft/monotonicity-certificate.mjs';
import { toCount } from "@red-cup-engineering/computer-data-engineering-services-section/number/exact-number";

test('monotonicityCertificateOfFederatedCover skips singleton covers (no cycle) and still finds cycles in multi-source covers', () => {
  const statements = [
    { source: 'carol', cell: 'single1', stance: 'maybe' },
    { source: 'dave', cell: 'single2', stance: 'sure' },
    { source: 'alice', cell: 'topic', stance: 'yes' },
    { source: 'alice', cell: 'topic', stance: 'no' },
    { source: 'bob', cell: 'topic', stance: 'yes' },
    { source: 'bob', cell: 'topic', stance: 'no' },
  ];
  const certificate = monotonicityCertificateOfFederatedCover(statements);
  assert.deepEqual(certificate.cells, ['topic']);
  assert.equal(certificate.obstructions.length, 1);
  assert.equal(certificate.obstructions[0].cell, 'topic');
  assert.equal(toCount(certificate.obstructions[0].rank), 1);
  assert.equal(toCount(certificate.rank), 1);
  assert.equal(certificate.vanishing.kind, 'predication.cohomology.rankVanishing-obstruction');
});

test('monotonicityCertificateOfFederatedCover reports full vanishing when every cell is a singleton cover', () => {
  const statements = [
    { source: 'carol', cell: 'single1', stance: 'maybe' },
    { source: 'dave', cell: 'single2', stance: 'sure' },
    { source: 'erin', cell: 'single3', stance: 'no' },
  ];
  const certificate = monotonicityCertificateOfFederatedCover(statements);
  assert.deepEqual(certificate.cells, []);
  assert.deepEqual(certificate.obstructions, []);
  assert.equal(toCount(certificate.rank), 0);
  assert.equal(certificate.vanishing.kind, 'predication.cohomology.rankVanishing:witness');
});
