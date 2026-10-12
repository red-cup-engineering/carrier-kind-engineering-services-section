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
export declare const DEFAULT_MIN_CHAIN_LENGTH = 2;
export declare const DEFAULT_MAX_CHAIN_LENGTH = 6;
/**
 * Find recurring verb chains, bounded `minLength`..`maxLength` (default
 * 2..6), over each actor's own ordered admitted-step stream. See this
 * module's own docstring for the maximality and witness-exclusion rules.
 */
export declare function recurringVerbSequences(steps: readonly AdmittedStep[], options?: SequenceRecurrenceOptions): SequenceRecurrenceMeasurement;
