#!/usr/bin/env node
import { rawBundle } from "@lenticule-science/english-language-algebra";
import { load, settle } from "@red-cup-engineering/agentic-communication-engine";
import { readBcp14Requirements } from "@red-cup-engineering/read-bcp-14-requirements-service";
import { assayFounderUtteranceInterpretation, formFounderUtteranceInterpretationDemand, readFounderUtterance } from "../src/founder-utterance-reading.mjs";

const english = load(rawBundle);

export async function readOneFounderUtterance(utterance, { dispatch = null } = {}) {
  const reading = readFounderUtterance({ utterance, readBcp14Requirements, settleLanguage: (text) => settle(text, english) });
  if (dispatch === null || !reading.needsProvisionalInterpretation) return reading;
  return Object.freeze({ ...reading, proposal: assayFounderUtteranceInterpretation({ reading, result: await dispatch(formFounderUtteranceInterpretationDemand(reading)) }) });
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("read-founder-utterances — reads FounderUtterance JSON Lines. Explicit BCP 14 requirements are admitted deterministically; an inference runtime may call the exported request/assay functions separately.\n");
  } else {
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    for (const line of input.split("\n")) if (line.trim() !== "") process.stdout.write(`${JSON.stringify(await readOneFounderUtterance(JSON.parse(line)))}\n`);
  }
}
