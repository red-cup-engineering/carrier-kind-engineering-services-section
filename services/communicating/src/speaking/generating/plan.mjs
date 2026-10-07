// plan.ts — text planning: produce a TextPlan from a sequence of role frames.
// Planning decides: ordering, discourse connectives, and reference form
// (pronoun vs. full NP for repeated entities).

/** Plan a sequence of clauses from a sequence of role frames.
 * Introduces pronouns for repeated agents after the first mention. */
export function plan(
  frames,
  opts,
) {
  const tense = opts?.tense ?? "present";
  const seen = new Set();
  const clauses = [];

  for (const frame of frames) {
    const agent = frame.agent ?? "someone";
    // Use pronoun for repeated agent
    const subject = seen.has(agent.toLowerCase()) ? pronominalize(agent) : agent;
    seen.add(agent.toLowerCase());

    const obliques = [];
    if (frame.instrument) obliques.push({ prep: "with", object: frame.instrument });
    if (frame.recipient) obliques.push({ prep: "to", object: frame.recipient });
    if (frame.location) obliques.push({ prep: "in", object: frame.location });

    clauses.push({
      subject,
      verb: frame.verb,
      ...(frame.patient !== undefined ? { object: frame.patient } : {}),
      tense,
      ...(obliques.length > 0 ? { obliques } : {}),
    });
  }

  // Simple connectives: "and" between adjacent clauses with same subject
  const connectives = {};
  for (let i = 1; i < clauses.length; i++) {
    const prev = clauses[i - 1];
    const curr = clauses[i];
    if (prev && curr && prev.subject.toLowerCase() === curr.subject.toLowerCase()) {
      connectives[i] = "and";
    }
  }

  return { clauses, connectives };
}

/** Pronominalize an agent name to the appropriate 3rd person pronoun.
 * Defaults to "they" (gender-neutral singular they). */
function pronominalize(_name) {
  return "they";
}

/** Realize a TextPlan as a prose string. */
export function planToText(plan, realize) {
  const sentences = [];
  let i = 0;
  while (i < plan.clauses.length) {
    const parts = [];
    parts.push(realize(plan.clauses[i]));
    // Collect chained clauses connected with "and" (same subject)
    while (plan.connectives?.[i + 1] === "and" && i + 1 < plan.clauses.length) {
      i++;
      const nextClause = plan.clauses[i];
      // For chained clauses with same subject, drop the subject
      const chainedSpec = { ...nextClause, subject: "" };
      const chainedText = realize(chainedSpec).trim();
      parts.push(`and ${chainedText}`);
    }
    sentences.push(capitalize(parts.join(", ")) + ".");
    i++;
  }
  return sentences.join(" ");
}

function capitalize(s) {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
