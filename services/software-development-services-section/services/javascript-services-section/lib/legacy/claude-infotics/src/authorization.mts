/**
 * authorization — the capability grant the claude-infotics CLI runs under.
 *
 * MetroPlat operations are capability-secured: an invocation is authorized only
 * when the dispatch subject holds an admitted grant for `resource#verb`. The
 * reference `infograph` surface is granted to a named subject the same way (its
 * bin comment: "granted to MCP subject `claude` (infograph#*)").
 *
 * For the local CLI face, the caller invoking the binary IS the operator, so the
 * app self-grants that operator subject all of its own operations
 * (`claude-infotics#*`). A multi-caller HTTP/MCP deployment would instead admit
 * attenuated, per-subject grants to the data root via `admitCapabilityAssertions`
 * — this in-code grant covers only the trusted local-CLI case.
 */
import type { CapabilityAssertion } from "@red-cup-engineering/metroplat/core/capability";

/** Dispatch `program` (= invocation.resource) and subject the CLI runs as. */
export const CLAUDE_INFOTICS_PROGRAM = "claude-infotics";
export const CLAUDE_INFOTICS_SUBJECT = "claude-infotics-operator";

/** The single grant: the local operator subject holds every claude-infotics operation. */
export function claudeInfoticsGrants(at: string): readonly CapabilityAssertion[] {
  return Object.freeze([
    Object.freeze({
      kind: "capability.assertion" as const,
      assertion: "grant" as const,
      issuer: CLAUDE_INFOTICS_PROGRAM,
      holder: CLAUDE_INFOTICS_SUBJECT,
      grants: `${CLAUDE_INFOTICS_PROGRAM}#*`,
      at,
    }),
  ]);
}
