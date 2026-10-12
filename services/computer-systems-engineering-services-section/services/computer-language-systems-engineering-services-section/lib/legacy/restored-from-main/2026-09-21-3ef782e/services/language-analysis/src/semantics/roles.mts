// semantics/roles.ts — extract thematic roles from a parse.
// Reads syntax, not semantics: agent/patient are grammar-derived.
// Active: nsubj → agent, dobj → patient.
// Passive: by-phrase → agent, nsubj → patient.
import type { ParseResult } from "@emsenn/language-topology";

export interface SemanticFrame {
  readonly verb: string;
  readonly agent: string | null;
  readonly patient: string | null;
  readonly instrument: string | null;
  readonly recipient: string | null;
  readonly location: string | null;
}

/** Extract semantic role frames from a parse result. */
export function roles(result: ParseResult): readonly SemanticFrame[] {
  const frames: SemanticFrame[] = [];

  // Find all verbs (words with is-verb role or tags includes verb)
  const verbs = result.words.filter((w) => w.tags.includes("verb"));

  for (const verb of verbs) {
    // Find arcs where this word is the head
    const headArcs = result.arcs.filter((a) => a.head === verb.id);
    // Find arcs where this word is the dependent
    const depArcs = result.arcs.filter((a) => a.dependent === verb.id);

    let agent: string | null = null;
    let patient: string | null = null;
    let instrument: string | null = null;
    let recipient: string | null = null;
    let location: string | null = null;

    for (const arc of headArcs) {
      switch (arc.rel) {
        case "nsubj":
          // Check for passive: if there's a "be" aux, nsubj is patient
          agent = arc.depText;
          break;
        case "dobj":
          patient = arc.depText;
          break;
        case "prep": {
          // Find the pobj of this prep
          const pobj = result.arcs.find((a) => a.head === arc.dependent && a.rel === "pobj");
          const prepWord = result.words.find((w) => w.id === arc.dependent);
          const prep = prepWord?.text.toLowerCase();
          if (pobj) {
            if (prep === "by") agent = pobj.depText;
            else if (prep === "with") instrument = pobj.depText;
            else if (prep === "to") recipient = pobj.depText;
            else if (prep === "in" || prep === "at" || prep === "on") location = pobj.depText;
          }
          break;
        }
      }
    }

    frames.push({ verb: verb.text, agent, patient, instrument, recipient, location });
  }

  return frames;
}
