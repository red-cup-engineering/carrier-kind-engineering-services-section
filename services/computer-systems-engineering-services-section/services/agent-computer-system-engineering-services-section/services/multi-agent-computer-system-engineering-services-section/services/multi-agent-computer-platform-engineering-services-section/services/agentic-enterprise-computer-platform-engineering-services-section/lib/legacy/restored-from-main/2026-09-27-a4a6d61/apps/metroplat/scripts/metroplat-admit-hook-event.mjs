#!/usr/bin/env node
/**
 * metroplat-admit-hook-event - admits one harness hook-event JSON from
 * stdin into metroplat's causal journal via `appendHookEventAtRoot`.
 *
 *   cat hook-event.json | metroplat-admit-hook-event
 *   metroplat-admit-hook-event --data-root /path/to/data-root < hook-event.json
 *   metroplat-admit-hook-event --session my-session --actor operator-1 < hook-event.json
 *   metroplat-admit-hook-event --harness claude < hook-event.json
 *
 * With --harness, the event is also a step of the session's entry into the metroplex (LAGOON's
 * participation layer): at SessionStart the session wears a mask over the character whose
 * record names that harness and this host, the carrier's model and the verbs this MetroPlat
 * serves are admitted as that character's provider facts, and the character's open duties are
 * returned as the session's opening context beside the always-loaded fiber of what the founder has
 * told (knowing learning-fiber); at SessionEnd the mask is withdrawn.
 */
import { hostname } from "node:os";
import { parse as parseJson } from "@red-cup-engineering/json-services-section";
import { appendHookEventAtRoot } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/hooks/service";
import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { processDataRootConfig } from "@red-cup-engineering/node-process-services-section/config";
import { isDirectEntrypoint, processArguments, processEntrypointArgument, processPackageRoot } from "@red-cup-engineering/node-process-services-section/entrypoint";
import { runProcessMain } from "@red-cup-engineering/node-process-services-section/main-runner";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { readAgentWorkDispatchReadout } from "@red-cup-engineering/feltos/work/service";
import { fiber } from "@red-cup-engineering/knowing/learning/fiber";
import { consolidateAt, readArticulations } from "@red-cup-engineering/knowing/learning";
import { assembleDefaultService } from "../src/catalog.mjs";
import { admitCharacterMasks, admitHarnessCarriers, agencyAt, agencyRootOf, harnessCharacter } from "../src/offices.mjs";
import { readProcessStdinText, writeProcessStdout } from "@red-cup-engineering/node-process-services-section/stdio";

function flagValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function cliOptions(args) {
  const session = flagValue(args, "--session");
  const actor = flagValue(args, "--actor");
  const harness = flagValue(args, "--harness");
  return Object.freeze({
    ...(session === undefined ? {} : { session }),
    ...(actor === undefined ? {} : { actor }),
    ...(harness === undefined ? {} : { harness }),
  });
}

const ISSUER = "metroplat:hospitality";

/** The opening context a session reads first: who it is here, what it owes, and what it has been told. */
function openingContext(character, session, dispatch, told) {
  const items = [...(dispatch?.frontier ?? []), ...(dispatch?.queue ?? [])].filter((item) => item.agent === character.id);
  const seen = new Set();
  const duties = items.filter((item) => !seen.has(item.scope) && seen.add(item.scope));
  return [
    `This session wears a mask over the character ${character.name} (${character.id}) in the 561 Group's MetroPlat; its acts and witnesses accrue to that character. MetroPlat's metroplat MCP server acts as the character.`,
    duties.length === 0
      ? "No office service is allocated to the character: agent-work-dispatch holds no duty for it."
      : `Its allocated duties (agent-work-dispatch):\n${duties.map((item) => `- ${item.scope}${item.skill ? ` (skill ${item.skill})` : ""}${item.receiverCondition ? `, received when: ${item.receiverCondition}` : ""}`).join("\n")}`,
    told,
    `Session ${session}.`,
  ].join("\n");
}

/** The session's entry into, or withdrawal from, the metroplex; undefined for other events. */
function participate(dataRoot, payload, harness, at) {
  const event = payload?.hook_event_name;
  if (harness === undefined || (event !== "SessionStart" && event !== "SessionEnd")) return undefined;
  const session = payload.session_id;
  if (typeof session !== "string" || session.length === 0) return undefined;
  const character = harnessCharacter(agencyAt(agencyRootOf({})), { harness, host: hostname() });
  if (character === undefined) return undefined;
  const date = at.slice(0, 10);
  const mask = (reading) => ({ kind: "metroplat.character-mask", account: `session:${session}`, character: character.id, reading, issuer: ISSUER, at });
  if (event === "SessionEnd") {
    admitCharacterMasks({ dataRoot, date, masks: [mask("denied")] });
    return undefined;
  }
  const binding = defaultFilesystemBinding(dataRoot, { now: () => at });
  const verbs = [...new Set(assembleDefaultService(binding, "@red-cup-engineering/metroplat").operations.map((operation) => operation.verb))].sort();
  const model = typeof payload.model === "string" && payload.model.length > 0 ? payload.model : `${harness}-harness`;
  admitHarnessCarriers({ dataRoot, date, carriers: [{ kind: "metroplat.harness-carrier", character: character.id, model, session, capabilities: verbs, reading: "held", issuer: ISSUER, at }] });
  admitCharacterMasks({ dataRoot, date, masks: [mask("held")] });
  const dispatch = readAgentWorkDispatchReadout(binding, date, character.id);
  let told = "No articulation is recorded yet: knowing learning-pending lists the founder's utterances to articulate.";
  try { const articulations = readArticulations(dataRoot); if (articulations.length > 0) told = fiber(consolidateAt(dataRoot)); } catch (error) { told = `The founder's settled relations could not be read: ${error.message}`; }
  return Object.freeze({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: openingContext(character, session, dispatch, told) } });
}

/** Merge a CLI-supplied session id into a hook payload that names none of
 *  its own, so a hand-invoked or session-less hook can still be attributed. */
function withSessionFallback(input, session) {
  if (session === undefined || input === null || typeof input !== "object" || Array.isArray(input)) return input;
  const record = input;
  if (typeof record["session_id"] === "string" || typeof record["sessionId"] === "string") return input;
  return Object.freeze({ ...record, session_id: session });
}

function callerDescriptor(options) {
  if (options.actor === undefined && options.session === undefined) return undefined;
  return Object.freeze({
    transport: "agent-hook-cli",
    ...(options.actor === undefined ? {} : { actor: options.actor }),
    ...(options.session === undefined ? {} : { session: options.session }),
  });
}

async function main() {
  const args = processArguments();
  const options = cliOptions(args);
  const dataRoot = processDataRootConfig({
    defaultRoot: processPackageRoot(import.meta.url),
    args,
    envName: "METROPLAT_DATA_ROOT", configFileName: "metroplat.config.json",
    configEnvName: "METROPLAT_CONFIG",
    legacyEnvNames: Object.freeze(["METROPLAT_DATA"]),
  }).dataRoot;

  const stdinText = (await readProcessStdinText()).trim();
  if (stdinText === "") {
    throw new Error("metroplat-admit-hook-event: expected one hook-event JSON object on stdin");
  }
  const payload = withSessionFallback(parseJson(stdinText), options.session);
  const caller = callerDescriptor(options);

  const at = processIsoNow();
  const receipt = appendHookEventAtRoot(dataRoot, payload, {
    at,
    rootName: "@red-cup-engineering/metroplat",
    ...(caller === undefined ? {} : { caller }),
  });

  const entry = participate(dataRoot, payload, options.harness, at);
  // A harness reads a hook's stdout: the entry's opening context is what the session receives.
  writeProcessStdout(`${JSON.stringify(entry ?? (options.harness === undefined ? receipt : {}))}\n`);
  return 0;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "metroplat-admit-hook-event" });
}
