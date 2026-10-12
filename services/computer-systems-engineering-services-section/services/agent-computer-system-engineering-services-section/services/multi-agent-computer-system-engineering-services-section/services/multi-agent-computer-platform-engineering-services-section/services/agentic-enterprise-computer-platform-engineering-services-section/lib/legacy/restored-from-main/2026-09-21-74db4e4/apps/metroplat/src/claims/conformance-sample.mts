/**
 * @packageDocumentation
 *
 * coordination/claim-sessions/conformance-sample — the one bounded
 * discover→read→collect fold every provider's claim-session sampling needs,
 * written once instead of once per provider. Each provider (anthropic,
 * openai/codex) supplies its own `discover`/`read` functions as plain
 * closures; this module never imports a provider module, so adding a third
 * provider is a one-line caller here, not a third copy of this loop.
 */
import type { ClaimSessionObservationBundle } from "./session.mts";
import type { SchemaConformanceSample } from "../lib/schema/conformance.mts";

export interface SessionTranscriptMatch {
  readonly relative: string;
  readonly sessionId: string;
}

export interface SessionTranscriptDiscovery {
  readonly matches: readonly SessionTranscriptMatch[];
}

export interface ClaimSessionObservationSampleOptions {
  readonly sessionLimit?: number;
  readonly observationLimit?: number;
}

export interface ClaimSessionObservationSample {
  readonly samples: readonly SchemaConformanceSample[];
  readonly of: number;
}

/**
 * Discover up to `sessionLimit` session transcripts under `root`, read each
 * one's work claims, and collect up to `observationLimit` observations total
 * as provenanced conformance samples (`${provenancePrefix}:${sessionId}#${index}`).
 * A transcript that fails to read is skipped, not fatal — one bad transcript
 * must not blank the whole sample.
 */
export async function sampleClaimSessionObservations(
  root: string,
  provenancePrefix: string,
  discover: (root: string, options: { readonly limit: number }) => SessionTranscriptDiscovery | Promise<SessionTranscriptDiscovery>,
  read: (root: string, relative: string) => ClaimSessionObservationBundle | Promise<ClaimSessionObservationBundle>,
  options: ClaimSessionObservationSampleOptions = {},
): Promise<ClaimSessionObservationSample> {
  const sessionLimit = options.sessionLimit ?? 3;
  const observationLimit = options.observationLimit ?? 15;
  const discovery = await discover(root, { limit: sessionLimit });
  const samples: SchemaConformanceSample[] = [];
  let of = 0;
  for (const match of discovery.matches) {
    let bundle: ClaimSessionObservationBundle;
    try {
      bundle = await read(root, match.relative);
    } catch {
      continue;
    }
    of += bundle.observations.length;
    for (const [index, observation] of bundle.observations.entries()) {
      if (samples.length >= observationLimit) break;
      samples.push({ value: observation, provenance: `${provenancePrefix}:${match.sessionId}#${index}` });
    }
  }
  return Object.freeze({ samples: Object.freeze(samples), of });
}
