import { checkpoint, restoreCheckpoint } from './checkpoint.mjs';
import { admitEvent } from './simulation.mjs';
import { operations } from './operations.mjs';

export const COMPARISON_KIND = 'holofoam.field-comparison/v1';

// Keep the inputs, not a second copy of derived future worlds. Reopening the
// document exercises the same bounded operation, never a claimed seed history.
export function compareField(input) {
  const start = checkpoint(restoreCheckpoint(input?.checkpoint));
  if (input?.variationEvent?.kind !== 'rule') throw new TypeError('field comparison requires a field-rule intervention');
  const variationEvent = admitEvent(input.variationEvent, start.world.tick);
  const request = { checkpoint: start, count: input.count ?? 32, variationEvent };
  const result = operations.forkCompare.execute(request);
  return {
    document: { kind: COMPARISON_KIND, input: request },
    result,
  };
}

export function reopenComparison(value) {
  if (value?.kind !== COMPARISON_KIND) throw new TypeError('field comparison format is not admitted');
  return compareField(value.input);
}
