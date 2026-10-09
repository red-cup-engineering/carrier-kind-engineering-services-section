import { checkpoint, CHECKPOINT_KIND, LEGACY_CHECKPOINT_KIND, restoreCheckpoint } from './checkpoint.mjs';
import { admitEvent } from './admission.mjs';
import { operations } from './operations.mjs';

export const COMPARISON_KIND = 'holofoam.field-comparison/v2';
export const LEGACY_COMPARISON_KIND = 'holofoam.field-comparison/v1';

// Keep the inputs, not derived futures. The document names one history cut, one field-rule
// intervention and a continuation length; reopening forks the history into two continuations.
export function compareField(input) {
  const start = checkpoint(restoreCheckpoint(input?.checkpoint));
  if (input?.variationEvent?.kind !== 'rule') throw new TypeError('field comparison requires a field-rule intervention');
  const variationEvent = admitEvent(input.variationEvent, start.tick);
  const request = { checkpoint: start, count: input.count ?? 32, variationEvent };
  const result = operations.forkCompare.execute(request);
  return {
    document: { kind: COMPARISON_KIND, input: request },
    result,
  };
}

// A v1 document carries an explicit current-state checkpoint; it is imported as the origin of a history.
export function reopenComparison(value) {
  if (value?.kind === LEGACY_COMPARISON_KIND && value.input?.checkpoint?.kind === LEGACY_CHECKPOINT_KIND) return compareField(value.input);
  if (value?.kind !== COMPARISON_KIND || value.input?.checkpoint?.kind !== CHECKPOINT_KIND) throw new TypeError('field comparison format is not admitted');
  return compareField(value.input);
}
