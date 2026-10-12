import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, clearDerived, createExperiment, step } from '../src/simulation.mjs';
import { checkpoint, readingOf, restoreCheckpoint } from '../src/checkpoint.mjs';
import { COMPARISON_KIND, compareField, reopenComparison } from '../src/comparison.mjs';

test('a transferred comparison forks its history: one cut, two continuations, one intervention differing', () => {
  const world = createExperiment({ seed: 81, config: { population: 3 } });
  for (let tick = 0; tick < 10_001; tick++) step(world);
  applyEvent(world, { kind: 'mutate', lineage: 0, edge: 'flow' });
  const start = checkpoint(world);
  const first = compareField({ checkpoint: start, count: 32, variationEvent: { kind: 'rule', rule: 'east', value: .2 } });
  const transferred = JSON.parse(JSON.stringify(first.document));
  applyEvent(world, { kind: 'rule', rule: 'east', value: .99 });
  step(world, 7);
  clearDerived();
  const received = reopenComparison(transferred);
  assert.deepEqual(received.result, first.result);
  assert.equal(first.document.kind, COMPARISON_KIND);
  assert.equal(received.result.baseline.checkpoint.reading.tick, 10_033);
  assert.equal(received.result.variation.checkpoint.reading.tick, 10_033);
  assert.equal(received.result.baseline.checkpoint.reading.rules.east, .75);
  assert.equal(received.result.variation.checkpoint.reading.rules.east, .2);
  assert.deepEqual(received.result.baseline.checkpoint.reading.genomes, readingOf(restoreCheckpoint(start)).genomes);
  assert.deepEqual(received.result.variation.checkpoint.reading.genomes, received.result.baseline.checkpoint.reading.genomes);
  assert.equal(received.result.baseline.provenance, 'history');
  assert.equal(received.document.input.checkpoint.tick, 10_001);
  assert.equal(transferred.result, undefined);
  const { fork } = received.result;
  assert.notEqual(fork.baseline, fork.variation);
  assert.notEqual(fork.from, fork.baseline);
  assert.equal(restoreCheckpoint(received.result.variation.checkpoint).rules.east, .2);
});

test('comparison import rejects unsupported meanings and recomputes rather than trusting a supplied result', () => {
  const start = checkpoint(createExperiment({ config: { population: 1 } }));
  const first = compareField({ checkpoint: start, count: 2, variationEvent: { kind: 'rule', rule: 'whirl', value: .1 } });
  assert.throws(() => reopenComparison({ ...first.document, kind: 'holofoam.field-comparison/v9' }), /format/);
  assert.throws(() => compareField({ checkpoint: start, variationEvent: { kind: 'mutate', lineage: 0, edge: 'flow' } }), /field-rule/);
  assert.throws(() => compareField({ checkpoint: start, count: 999_999, variationEvent: { kind: 'rule', rule: 'east', value: .2 } }), /count/);
  assert.throws(() => compareField({ checkpoint: start, variationEvent: { kind: 'rule', rule: 'east', value: 2 } }), /value/);
  assert.deepEqual(reopenComparison({ ...first.document, result: { comparison: { changedActionCount: 999_999 } } }).result, first.result);
});

test('a holofoam.field-comparison/v1 document is still readable and reopens as v2', () => {
  const world = createExperiment({ seed: 6, config: { population: 2 } }); step(world, 3);
  const v1checkpoint = { kind: 'holofoam.current-state/v1', provenance: 'unverified-current-state', world: {
    version: 1, modelVersion: 1, seed: world.seed, preset: world.preset, width: world.width, height: world.height, tick: world.tick, paused: false,
    config: structuredClone(world.config), rules: structuredClone(world.rules), events: [], selected: null, signals: Array.from(world.signals), barriers: [], genomes: structuredClone(world.genomes), organisms: structuredClone(world.organisms),
  } };
  const reopened = reopenComparison({ kind: 'holofoam.field-comparison/v1', input: { checkpoint: v1checkpoint, count: 4, variationEvent: { kind: 'rule', rule: 'east', value: .2 } } });
  assert.equal(reopened.document.kind, COMPARISON_KIND);
  assert.equal(reopened.result.baseline.checkpoint.reading.tick, 7);
  assert.equal(reopened.result.variation.checkpoint.reading.rules.east, .2);
  assert.deepEqual(reopened.result.baseline.checkpoint.reading.organisms.map(({ id }) => id), [0, 1]);
});
