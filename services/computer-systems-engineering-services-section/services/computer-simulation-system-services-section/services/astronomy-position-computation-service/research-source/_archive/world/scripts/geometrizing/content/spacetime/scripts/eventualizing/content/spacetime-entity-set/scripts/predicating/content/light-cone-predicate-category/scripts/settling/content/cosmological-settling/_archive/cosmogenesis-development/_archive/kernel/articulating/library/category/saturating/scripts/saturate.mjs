// saturate — the predication-monad multiplication (mu): provide the object, potential -> active. The
// concept-gap is never a target (filling it is the concept-horse collapse), so saturate cannot complete.
export default function saturate(cell) {
  const [carrier, [tokenSlot, claimSlot]] = cell;
  const [token] = carrier;
  return tokenSlot.length > 0 ? cell : [carrier, [[token], claimSlot]];
}
