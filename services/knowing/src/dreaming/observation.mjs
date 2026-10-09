/**
 * observation — an observer's evidenced claim about a task.
 *
 * The shared currency of knowing's dreaming: the knower dreams new observations by
 * recombining held ones (the three inward regimes) or by reaching outside the
 * settled fibers for genuinely new generators (the aperiodic regime). It carries a
 * its `evidence` (a SignChain evidence pair: witnesses for and against the task's cell).
 */

/** An observer's evidenced claim about a task, with optional provenance. */

/** Build a frozen `Observation`, dropping absent optional fields. */
export function observation(input

) {
  return Object.freeze({
    observer: input.observer,
    task: input.task,
    evidence: input.evidence,
    ...(input.at === undefined ? {} : { at: input.at }),
    ...(input.note === undefined ? {} : { note: input.note }),
  });
}
