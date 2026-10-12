// conversation-context.mjs — the ONE governed context-assembler for a conversation turn.
//
// A turn's LLM context was glued ad hoc inside message() (cognition.context + a repo-context block). This is
// the single place that composes ALL memory sources through one governed decision — "decide what context to
// give the LLM" — so a conversation is grounded the same way everywhere:
//   1. cognition       — the agent's own recall / dream / plan (buildCognition.context).
//   2. session         — the conversation so far (recent turns, compacted at the session budget), when a
//                        sessionId is supplied.
//   3. repo-as-memory  — the fact-manifold: SEMANTIC recall when an embedder is supplied, else LEXICAL, else
//                        skipped (no embedder + empty repo memory == a no-op, the pre-refactor behavior).
// Held-⊤ is surfaced (carried out in `contested`, never collapsed), ⊥ is never faked, and EVERY source is
// DEFENSIVE: a missing or unreadable source is skipped, never breaking the turn. Opt out of repo grounding
// with groundInRepo === false; opt out of semantic recall by passing no `embed`.

import { selectRepoContext } from "./repo-context.mjs";
import { selectRepoContextSemantic } from "./semantic-recall.mjs";
import { sessionContext } from "./session.mjs";

/**
 * Assemble a turn's grounded LLM context from every memory source, governed and held-⊤-preserving.
 * @param {string} root @param {object} agent @param {string} prompt
 * @param {{ context?: string }} cognition  the buildCognition result (its `.context` is the agent's own memory)
 * @param {{ sessionId?: string, session?: object, embed?: Function, repoContext?: object, groundInRepo?: boolean }} [options]
 * @returns {Promise<{ context: string, contested: any[] }>}
 */
export async function assembleContext(root, agent, prompt, cognition, options = {}) {
  const parts = [];
  const contested = [];

  // 1. the agent's own memory (recall / dream / plan).
  if (cognition?.context) parts.push(cognition.context);

  // 2. the conversation so far — this session's recent turns, compacted at its budget.
  if (options.sessionId) {
    try {
      const s = await sessionContext(root, options.sessionId, options.session);
      if (s?.context) parts.push(s.context);
      if (Array.isArray(s?.contested)) contested.push(...s.contested);
    } catch { /* no session / unreadable — skip, never break the turn */ }
  }

  // 3. the repo-as-memory fact-manifold — semantic when an embedder is supplied, else lexical.
  if (options.groundInRepo !== false) {
    try {
      const repo = options.embed
        ? await selectRepoContextSemantic(root, prompt, { ...options.repoContext, embed: options.embed })
        : selectRepoContext(root, prompt, options.repoContext);
      if (repo?.context) parts.push(repo.context);
      if (Array.isArray(repo?.contested)) contested.push(...repo.contested);
    } catch { /* repo memory absent/unreadable — fall back, never break the turn */ }
  }

  return { context: parts.filter(Boolean).join("\n\n"), contested };
}
