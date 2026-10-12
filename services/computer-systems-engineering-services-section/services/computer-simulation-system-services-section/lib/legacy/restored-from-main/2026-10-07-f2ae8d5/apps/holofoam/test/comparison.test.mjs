import test from 'node:test';
import assert from 'node:assert/strict';
import { createExperiment, step, applyEvent } from '../src/simulation.mjs';
import { checkpoint } from '../src/checkpoint.mjs';
import { compareField, reopenComparison } from '../src/comparison.mjs';

test('a transferred comparison retains its exact starting conditions after the working world changes', () => {
  const world = createExperiment({ seed: 81, config: { population: 3 } });
  for (let tick = 0; tick < 10_001; tick++) step(world);
  applyEvent(world, { kind: 'mutate', lineage: 0, edge: 'flow' });
  const start = checkpoint(world);
  const first = compareField({ checkpoint: start, count: 32, variationEvent: { kind: 'rule', rule: 'east', value: .2 } });
  const transferred = JSON.parse(JSON.stringify(first.document));
  applyEvent(world, { kind: 'rule', rule: 'east', value: .99 });
  step(world, 7);
  const received = reopenComparison(transferred);
  assert.deepEqual(received.result, first.result);
  assert.equal(received.result.baseline.checkpoint.world.tick, 10_033);
  assert.equal(received.result.variation.checkpoint.world.tick, 10_033);
  assert.equal(received.result.baseline.checkpoint.world.rules.east, .75);
  assert.equal(received.result.variation.checkpoint.world.rules.east, .2);
  assert.deepEqual(received.result.baseline.checkpoint.world.genomes, start.world.genomes);
  assert.deepEqual(received.result.variation.checkpoint.world.genomes, start.world.genomes);
  assert.equal(received.result.baseline.provenance, 'unverified-current-state');
  assert.equal(received.result.variation.provenance, 'unverified-current-state');
  assert.equal(received.document.input.checkpoint.world.tick, 10_001);
  assert.equal(transferred.result, undefined);
});

test('comparison import rejects unsupported meanings and recomputes rather than trusting a supplied result', () => {
  const start = checkpoint(createExperiment({ config: { population: 1 } }));
  const first = compareField({ checkpoint: start, count: 2, variationEvent: { kind: 'rule', rule: 'whirl', value: .1 } });
  assert.throws(() => reopenComparison({ ...first.document, kind: 'holofoam.field-comparison/v2' }), /format/);
  assert.throws(() => compareField({ checkpoint: start, variationEvent: { kind: 'mutate', lineage: 0, edge: 'flow' } }), /field-rule/);
  assert.throws(() => compareField({ checkpoint: start, count: 999_999, variationEvent: { kind: 'rule', rule: 'east', value: .2 } }), /count/);
  assert.throws(() => compareField({ checkpoint: start, variationEvent: { kind: 'rule', rule: 'east', value: 2 } }), /value/);
  assert.deepEqual(reopenComparison({ ...first.document, result: { comparison: { changedActionCount: 999_999 } } }).result, first.result);
});
