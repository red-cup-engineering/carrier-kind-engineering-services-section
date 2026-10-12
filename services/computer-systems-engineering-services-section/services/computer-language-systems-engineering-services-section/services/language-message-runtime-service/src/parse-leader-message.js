#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  admitCommunication,
  discourseStateOfForest,
  load,
  parseCommunicationForest,
} from "@red-cup-engineering/communicating";
import { rawBundle } from "@lenticule-science/english-language-algebra";
import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";

const DEFAULT_ENGLISH_FIBER = "@lenticule-science/english-language-algebra@0.1.7";

export function semanticJsonId(value, objectKind) {
  return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
}

function repairObligations(forest, discourse) {
  return Object.freeze([
    ...forest.obstructions.map((obstruction) => Object.freeze({ source: "parse-forest", ...obstruction })),
    ...discourse.repairs.map((repair) => Object.freeze({ source: "discourse", ...repair })),
  ]);
}

/**
 * Produce a source-preserving candidate reading.  This is deliberately a
 * parser, not a customer-record writer or an authority on what a speaker
 * meant: ambiguity and repair remain in the returned carrier.
 */
export function parseLeaderMessage(text, { bundle = rawBundle, languageFiber = DEFAULT_ENGLISH_FIBER } = {}) {
  if (typeof text !== "string" || text.trim().length === 0) throw new TypeError("leader message must be a nonempty string");
  if (!bundle || typeof bundle !== "object") throw new TypeError("language bundle must be an object");
  if (typeof languageFiber !== "string" || languageFiber.length === 0) throw new TypeError("language fiber identifier is required");

  const forest = parseCommunicationForest(admitCommunication(text), load(bundle));
  const discourse = discourseStateOfForest(forest);
  const languageBundleToken = semanticJsonId(bundle, "lenticule.english-language-fiber.bundle/v1");
  const body = {
    kind: "lenticule-science.leader-message-parse/v2",
    candidateReading: true,
    source: Object.freeze({
      token: semanticJsonId(text, "lenticule.leader-message.source-text/v2"),
      length: text.length,
      text,
    }),
    language: Object.freeze({
      fiber: languageFiber,
      contentToken: languageBundleToken,
      code: bundle.meta?.code ?? null,
    }),
    forest,
    discourse,
    ambiguity: Object.freeze({ count: forest.ambiguity, obstructions: forest.obstructions }),
    repairObligations: repairObligations(forest, discourse),
    limitations: Object.freeze([
      "candidate linguistic reading only; no speaker intent, customer record, or settlement authority is inferred",
      "ambiguity and repair obligations remain explicit rather than being silently resolved",
      "this parser neither applies interpretive frame maps nor writes customer territory",
    ]),
  };
  // The source text has one canonical content identity.  A candidate reading
  // is evidence derived from that source, not a second entity minted from a
  // potentially large parse forest.  Storage owns any later chunking and
  // content-addressing of the evidence it admits.
  return Object.freeze(body);
}

function argumentsOf(argv) {
  if (argv.length !== 0) throw new TypeError(`unknown argument: ${argv.join(" ")}`);
  return {};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(parseLeaderMessage(readFileSync(0, "utf8"), argumentsOf(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`parse-leader-message: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
