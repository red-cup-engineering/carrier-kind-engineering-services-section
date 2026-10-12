#!/usr/bin/env node
/**
 * infograph-admit-arrival - admits CloudEvent JSON from stdin (one object,
 * or a JSON array of objects) into metroplat's arrival journal.
 *
 *   cat cloudevent.json | infograph-admit-arrival
 *   cat cloudevents.json | infograph-admit-arrival --root /path/to/data-root
 */
import { parse as parseJson, type JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { cloudEventContract, type CloudEvent } from "../lib/codecs/cloudevents/index.mts";
import { appendArrivalAtRoot } from "../integrations/filesystem/services/arrival.mts";
import { arrivalReceiptHandle, type ArrivalReceiptHandle } from "../rpc/index.mts";
import {
  isDirectEntrypoint,
  processArguments,
  processDataRootConfig,
  processEntrypointArgument,
  processPackageRoot,
  readProcessStdinText,
  runProcessMain,
  writeProcessStdout,
} from "@red-cup-engineering/node-process-services-section";

/** One printed result line per stdin CloudEvent: the admitted arrival's
 *  receipt handle, or the CloudEvents codec's rejection reasons for an
 *  event this script never admitted. */
export interface ArrivalAdmissionLine {
  readonly index: number;
  readonly ok: boolean;
  readonly arrivalReceiptHandle?: ArrivalReceiptHandle;
  readonly obstructions?: readonly string[];
}

/**
 * Read stdin material as a list of CloudEvent-shaped candidates.
 *
 * @param text Raw stdin text.
 * @returns One JSON value per candidate CloudEvent, in input order.
 * @throws {Error} when stdin is empty.
 */
function stdinArrivalCandidates(text: string): readonly JsonValue[] {
  const trimmed = text.trim();
  if (trimmed === "") {
    throw new Error("infograph-admit-arrival: expected one CloudEvent JSON object, or a JSON array of them, on stdin");
  }
  const parsed = parseJson(trimmed);
  return Array.isArray(parsed) ? parsed : Object.freeze([parsed]);
}

/**
 * Admit one candidate CloudEvent JSON value under `root`.
 * @param root Data root to admit into.
 * @param candidate One parsed JSON value from stdin.
 * @param index Its position in the stdin batch, echoed onto the result line.
 * @returns The result line for this one input event.
 */
function admitArrivalCandidate(root: string, candidate: JsonValue, index: number): ArrivalAdmissionLine {
  let event: CloudEvent;
  try {
    // Validate-then-report, never throw: one bad event must not sink the batch.
    event = cloudEventContract.assert(candidate, "infograph-admit-arrival input") as CloudEvent;
  } catch (error) {
    return Object.freeze({
      index,
      ok: false,
      obstructions: Object.freeze([error instanceof Error ? error.message : String(error)]),
    });
  }
  // appendArrivalAtRoot writes content-addressed rows, so re-admitting the
  // same CloudEvent is already idempotent: no separate dedup check here.
  const receipt = appendArrivalAtRoot(root, event, {
    rootName: "@red-cup-engineering/metroplat",
  });
  return Object.freeze({
    index,
    ok: receipt.ok,
    arrivalReceiptHandle: arrivalReceiptHandle(receipt),
  });
}

async function main(): Promise<number> {
  const args = processArguments();
  const dataRoot = processDataRootConfig({
    defaultRoot: processPackageRoot(import.meta.url),
    args,
    envName: "METROPLAT_DATA_ROOT", configFileName: "metroplat.config.json",
    configEnvName: "METROPLAT_CONFIG",
    legacyEnvNames: Object.freeze(["METROPLAT_DATA"]),
    dataRootFlag: "--root",
  }).dataRoot;

  const stdinText = await readProcessStdinText();
  const candidates = stdinArrivalCandidates(stdinText);
  for (let index = 0; index < candidates.length; index += 1) {
    const line = admitArrivalCandidate(dataRoot, candidates[index]!, index);
    writeProcessStdout(`${JSON.stringify(line)}\n`);
  }
  return 0;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "infograph-admit-arrival" });
}
