// transfer — the predication-monad unit (eta): reopen the object-gap, active -> potential. Non-injective:
// distinct cells collapse to the same reopened gap (the KZ unit's non-invertibility).
export default function transfer(cell) {
  const [carrier, [, claimSlot]] = cell;
  return [carrier, [[], claimSlot]];
}
