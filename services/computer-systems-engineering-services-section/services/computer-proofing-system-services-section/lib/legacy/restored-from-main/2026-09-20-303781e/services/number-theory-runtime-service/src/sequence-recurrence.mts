/**
 * analysis/sequence-recurrence - recurring verb chains over an actor's own
 * admitted step stream.
 *
 * An `AdmittedStep` is one verb invocation an actor (a caller, a session) ran,
 * reduced to what recurrence needs: the verb, a structure-only shape of its
 * arguments (key set, never raw values), and whether the step's own outcome
 * validated cleanly. This module finds bounded-length (`minLength`..
 * `maxLength`, default 2..6) contiguous verb chains that recur — the same
 * chain appearing at least twice, counting only occurrences where every step
 * in the window validated — and reports each as a `SequenceCandidate`
 * carrying its support (occurrence count), the distinct actors that ran it,
 * one representative argument shape per step, and an honest count of how
 * many occurrences of the same chain were excluded for carrying an
 * invalid step.
 *
 * A shorter chain is dropped in favor of a longer one that always carries it
 * (same support, contiguous containment) — the standard maximal-repeat
 * reading: report the longest recurring pattern, not every sub-window of it.
 *
 * This module answers ONE question — which verb chains recur with validated
 * outcomes — and nothing about whether a chain should become a skill. That
 * judgment, if it is ever made, belongs to a separate, operator-ruled step.
 */

/** One already-validated verb invocation, reduced to what recurrence needs. */
export interface AdmittedStep {
  /** The caller or session that ran this step (a stable string identity). */
  readonly actor: string;
  readonly verb: string;
  /** Structure only: the argument key set, never raw argument values. */
  readonly argShape: readonly string[];
  /** Whether this step's own recorded outcome validated cleanly. */
  readonly validated: boolean;
}

/** One recurring verb chain: a candidate for later, operator-ruled skill
 *  promotion — never a skill itself. */
export interface SequenceCandidate {
  readonly kind: "metroplat.sequenceRecurrence.candidate";
  readonly chain: readonly string[];
  /** How many validated-clean occurrences of this chain were found. */
  readonly support: number;
  /** The distinct actors whose validated-clean occurrences contributed, sorted. */
  readonly sessions: readonly string[];
  /** One representative argument-key-set per chain step, from its first validated occurrence. */
  readonly argShapes: readonly (readonly string[])[];
  /** Occurrences of the same chain dropped from evidence for carrying an invalid step. */
  readonly excludedInvalid: number;
}

export interface SequenceRecurrenceMeasurement {
  readonly kind: "metroplat.sequenceRecurrence.measurement";
  readonly minLength: number;
  readonly maxLength: number;
  readonly candidates: readonly SequenceCandidate[];
}

export interface SequenceRecurrenceOptions {
  readonly minLength?: number;
  readonly maxLength?: number;
}

export const DEFAULT_MIN_CHAIN_LENGTH = 2;
export const DEFAULT_MAX_CHAIN_LENGTH = 6;

const CHAIN_KEY_SEPARATOR = "→";

interface Occurrence {
  readonly actor: string;
  readonly validated: boolean;
  readonly argShapes: readonly (readonly string[])[];
}

interface RawCandidate {
  readonly chain: readonly string[];
  readonly support: number;
  readonly sessions: readonly string[];
  readonly argShapes: readonly (readonly string[])[];
  readonly excludedInvalid: number;
}

function streamsByActor(steps: readonly AdmittedStep[]): ReadonlyMap<string, readonly AdmittedStep[]> {
  const byActor = new Map<string, AdmittedStep[]>();
  for (const step of steps) {
    const list = byActor.get(step.actor);
    if (list === undefined) byActor.set(step.actor, [step]);
    else list.push(step);
  }
  return byActor;
}

/** Every length-`length` contiguous window across every actor's own stream, grouped by chain. */
function occurrencesByChain(
  byActor: ReadonlyMap<string, readonly AdmittedStep[]>,
  length: number,
): ReadonlyMap<string, { readonly chain: readonly string[]; readonly occurrences: Occurrence[] }> {
  const byChain = new Map<string, { chain: readonly string[]; occurrences: Occurrence[] }>();
  for (const [actor, list] of byActor) {
    for (let start = 0; start + length <= list.length; start += 1) {
      const window = list.slice(start, start + length);
      const chain = Object.freeze(window.map((step) => step.verb));
      const key = chain.join(CHAIN_KEY_SEPARATOR);
      const occurrence: Occurrence = Object.freeze({
        actor,
        validated: window.every((step) => step.validated),
        argShapes: Object.freeze(window.map((step) => step.argShape)),
      });
      const entry = byChain.get(key);
      if (entry === undefined) byChain.set(key, { chain, occurrences: [occurrence] });
      else entry.occurrences.push(occurrence);
    }
  }
  return byChain;
}

/** Raw (pre-maximality-pruning) candidates at one fixed chain length: every
 *  chain with at least two validated-clean occurrences, carrying its own
 *  honest exclusion count. */
function rawCandidatesAtLength(
  byActor: ReadonlyMap<string, readonly AdmittedStep[]>,
  length: number,
): readonly RawCandidate[] {
  const out: RawCandidate[] = [];
  for (const { chain, occurrences } of occurrencesByChain(byActor, length).values()) {
    const clean = occurrences.filter((occurrence) => occurrence.validated);
    if (clean.length < 2) continue;
    const sessions = Object.freeze([...new Set(clean.map((occurrence) => occurrence.actor))].sort());
    out.push(Object.freeze({
      chain,
      support: clean.length,
      sessions,
      argShapes: clean[0]!.argShapes,
      excludedInvalid: occurrences.length - clean.length,
    }));
  }
  return out;
}

/** Whether `shorter` occurs as a contiguous sub-chain of `longer`. */
function isContiguousSubchain(shorter: readonly string[], longer: readonly string[]): boolean {
  if (shorter.length >= longer.length) return false;
  for (let offset = 0; offset + shorter.length <= longer.length; offset += 1) {
    if (shorter.every((verb, index) => longer[offset + index] === verb)) return true;
  }
  return false;
}

/**
 * Find recurring verb chains, bounded `minLength`..`maxLength` (default
 * 2..6), over each actor's own ordered admitted-step stream. See this
 * module's own docstring for the maximality and witness-exclusion rules.
 */
export function recurringVerbSequences(
  steps: readonly AdmittedStep[],
  options: SequenceRecurrenceOptions = {},
): SequenceRecurrenceMeasurement {
  const minLength = options.minLength ?? DEFAULT_MIN_CHAIN_LENGTH;
  const maxLength = options.maxLength ?? DEFAULT_MAX_CHAIN_LENGTH;
  if (!Number.isSafeInteger(minLength) || minLength < 1) {
    throw new RangeError("recurringVerbSequences: minLength must be a safe integer >= 1");
  }
  if (!Number.isSafeInteger(maxLength) || maxLength < minLength) {
    throw new RangeError("recurringVerbSequences: maxLength must be a safe integer >= minLength");
  }

  const byActor = streamsByActor(steps);
  const byLength = new Map<number, readonly RawCandidate[]>();
  for (let length = minLength; length <= maxLength; length += 1) {
    byLength.set(length, rawCandidatesAtLength(byActor, length));
  }

  const maximal: RawCandidate[] = [];
  for (let length = minLength; length <= maxLength; length += 1) {
    const longer = byLength.get(length + 1) ?? [];
    for (const candidate of byLength.get(length) ?? []) {
      const subsumed = longer.some((other) => other.support === candidate.support && isContiguousSubchain(candidate.chain, other.chain));
      if (!subsumed) maximal.push(candidate);
    }
  }
  maximal.sort((left, right) =>
    right.support - left.support
    || right.chain.length - left.chain.length
    || left.chain.join(CHAIN_KEY_SEPARATOR).localeCompare(right.chain.join(CHAIN_KEY_SEPARATOR)));

  return Object.freeze({
    kind: "metroplat.sequenceRecurrence.measurement" as const,
    minLength,
    maxLength,
    candidates: Object.freeze(maximal.map((candidate) => Object.freeze({
      kind: "metroplat.sequenceRecurrence.candidate" as const,
      chain: candidate.chain,
      support: candidate.support,
      sessions: candidate.sessions,
      argShapes: candidate.argShapes,
      excludedInvalid: candidate.excludedInvalid,
    }))),
  });
}
