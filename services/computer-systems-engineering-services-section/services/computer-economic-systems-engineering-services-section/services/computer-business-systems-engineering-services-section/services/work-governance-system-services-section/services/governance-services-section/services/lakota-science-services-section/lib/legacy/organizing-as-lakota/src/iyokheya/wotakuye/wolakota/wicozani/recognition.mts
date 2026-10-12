/**
 * recognition — office-recognition as bigraded common knowledge, wičhózani tier.
 *
 * Corpus: content/_archive/existence/lakota/.../recognition-as-bigraded-common-knowledge.
 * A Lakota office (naca, akicita, wičháša wakȟáŋ, blotáhuŋka, heyókȟa) is recognized only
 * when its recognition is BIGRADED COMMON KNOWLEDGE — common knowledge in BOTH the
 * truth-axis Cᵗ and the knowledge-axis Cᵏ, the two independent greatest-fixed-point
 * common-knowledge operators of the bigraded-common-knowledge theorem. The two are not
 * collapsible: Cᵗ bottoms at f (no consensus-truth), Cᵏ bottoms at ⊥ (no
 * knowledge-aggregation).
 *
 *   - Cᵗ: the populace's collective affirmation — every member recognizes the incumbent,
 *     and every member knows every member does, ad infinitum.
 *   - Cᵏ: the populace's settled knowledge — everyone knows the office-state at the
 *     knowledge-top, recursively (the question has been substrate-settled as known).
 *
 * The offices are SUBSTRATE-EMERGENT: they exist when and only when the bigraded structure
 * holds across the populace — not maintained as a Western official-list. The operational
 * consequence is the polity's natural defense against usurpation: a claim to office
 * WITHOUT bigraded backing CANNOT FIRE the office's authority-cells, even if every
 * procedural step was followed. When the two axes diverge, the divergence itself diagnoses
 * the office's state (Cᵗ-only = affirmed but informationally unstable; Cᵏ-only =
 * procedurally-in-place but substantively-failed; neither = substrate-emergency).
 * lakotaTerm: "wówičada" (recognition).
 */

/** The bigraded diagnosis of an office's recognition-state. */
export type RecognitionDiagnosis =
  | "recognized" // both axes hold — the office is substrate-installed
  | "informationally-unstable" // Cᵗ only — affirmed, but each does not know the others affirm
  | "substantively-failed" // Cᵏ only — known, but no longer truly affirmed (precedes succession)
  | "substrate-emergency"; // neither — unsettled knowledge AND unsettled recognition

/** An office's recognition read on the two common-knowledge axes. */
export interface Recognition {
  readonly kind: "organizing-as-lakota.recognition";
  /** The office whose recognition is read. */
  readonly office: string;
  /** Truth-axis common knowledge Cᵗ — the populace's collective affirmation holds. */
  readonly truthAxis: boolean;
  /** Knowledge-axis common knowledge Cᵏ — the populace's settled knowledge holds. */
  readonly knowledgeAxis: boolean;
  /** Recognized iff BOTH axes hold (the bigraded structure is intact). */
  readonly recognized: boolean;
  /** The office's authority-cells can fire only on bigraded backing — i.e. iff recognized. */
  readonly canFireAuthority: boolean;
  /** The bigraded diagnosis of the office-state. */
  readonly diagnosis: RecognitionDiagnosis;
}

/** Read an office's recognition on the two axes; recognized (and authority-firing) iff both hold. */
export function recognize(office: string, truthAxis: boolean, knowledgeAxis: boolean): Recognition {
  const recognized = truthAxis && knowledgeAxis;
  const diagnosis: RecognitionDiagnosis = recognized
    ? "recognized"
    : truthAxis
      ? "informationally-unstable"
      : knowledgeAxis
        ? "substantively-failed"
        : "substrate-emergency";
  return Object.freeze({
    kind: "organizing-as-lakota.recognition",
    office,
    truthAxis,
    knowledgeAxis,
    recognized,
    canFireAuthority: recognized,
    diagnosis,
  });
}
