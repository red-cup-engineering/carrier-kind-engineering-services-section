// language-engine/cohomology.mjs — read parse obstruction classes from settled
// question statuses. Mechanically ported (types stripped) from the recovered
// @lenticule-science/language-topology/src/cohomology.mts. Logic is unchanged.
// Not directly invoked by the original latin package's own parity test, but
// it is a pure downstream reader of ParseResult with no further dependencies
// — included because it is cheap, real, and gives the die's customer an
// honest H⁰/H¹ obstruction reading (glued vs. conflicting vs. missing) of
// its own parse, rather than requiring them to interpret conflicts/voids by hand.

export function cohomology(result) {
  const overdetermined = result.conflicts.map((answer) => obstruction("conflict", answer));
  const underdetermined = result.voids.map((answer) => obstruction("void", answer));
  const obstructions = [...overdetermined, ...underdetermined];
  const glued = overdetermined.length === 0;
  return {
    glued,
    h0: glued ? 1 : 0,
    h1: obstructions.length,
    obstructions,
    overdetermined,
    underdetermined,
  };
}

function obstruction(kind, answer) {
  return {
    kind,
    label: answer.question,
    on: answer.on,
    value: answer.value,
  };
}
