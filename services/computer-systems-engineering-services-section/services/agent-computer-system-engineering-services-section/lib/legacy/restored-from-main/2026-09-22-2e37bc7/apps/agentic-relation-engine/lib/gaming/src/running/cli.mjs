/**
 * cli — the operational `game` computer over the running-game core.
 *
 * The four-plus capabilities the game family exposes, surfaced as a script and
 * persisted through `store.mjs` into a data directory (one JSON snapshot + one
 * JSONL log per game):
 *
 *   game create  --id <id> --demo <name> [--data <dir>]   mint a game on a demo arena
 *   game list    [--data <dir>]                            list persisted games
 *   game show    --id <id> [--data <dir>]                  print a game's snapshot
 *   game design  --id <id> --design-id <d> --design <json> enroll a design
 *   game play    --id <id> --move <event>                  play one legal move
 *   game interact --id <id> --a <da> --b <db>              run an interaction
 *   game settle  --id <id>                                 settle to a verdict
 *   game analyze --id <id>                                 ludic/game-theory read
 *
 * No game logic lives here — every transition runs through the pure
 * `GameComputer`; this module only parses argv, loads/saves via the store, and
 * renders the verdict. Returns `{ code, output }` so it is unit-testable.
 */
import { asJson } from "@red-cup-engineering/playing/encoding/json";
import { decodeArena } from "../encoding/arena.mjs";
import { decodeDesign } from "@red-cup-engineering/playing/encoding/design";
import { decodeLine, encodeLine } from "@red-cup-engineering/playing/encoding/jsonl";
import { snapshot } from "./snapshot.mjs";
import { loadComputer, writeSnapshot, appendLog, readLog } from "./store.mjs";
import { demoArena, demoNames } from "./demo.mjs";
import { analyzeGame } from "./analysis.mjs";

const DEFAULT_DATA = ".data/gaming";

const USAGE = `game — concurrent-game-system computer

usage:
  game create   --id <id> --demo <name> [--data <dir>]
  game create   --id <id> --arena <json> [--data <dir>]
  game list     [--data <dir>]
  game show     --id <id> [--data <dir>]
  game design   --id <id> --design-id <d> --design <json> [--data <dir>]
  game play     --id <id> --move <event> [--data <dir>]
  game interact --id <id> --a <designId> --b <designId> [--data <dir>]
  game settle   --id <id> [--data <dir>]
  game analyze  --id <id> [--data <dir>]

demo arenas: ${demoNames().join(", ")}
`;

function parse(args) {
  const options = {};
  const bools = new Set();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "json") { bools.add(key); continue; }
    const next = args[i + 1];
    if (next === undefined) throw new Error(`flag --${key} needs a value`);
    options[key] = next; i++;
  }
  return { options, bools };
}
const need = (flags, key) => {
  const value = flags.options[key];
  if (value === undefined) throw new Error(`missing required --${key}`);
  return value;
};
const dataOf = (flags) => flags.options["data"] ?? DEFAULT_DATA;
const parseJson = (value, what) => {
  try { return decodeLine(value); } catch { throw new Error(`--${what} must be JSON`); }
};
const renderJson = (value, what) => encodeLine(asJson(value, what));

const lastVerdict = (g) => {
  const last = g.history[g.history.length - 1];
  return last !== undefined && (last.kind === "game.computer.interaction" || last.kind === "game.computer.settle")
    ? last
    : undefined;
};

const summarize = (g) =>
  `${g.id}  events=${g.arena.structure.events.length} designs=${g.designs.length} history=${g.history.length}`;

function cmdCreate(flags) {
  const dataDir = dataOf(flags);
  const id = need(flags, "id");
  const computer = loadComputer(dataDir);
  if (computer.get(id) !== undefined) throw new Error(`game ${id} already exists`);
  let arena;
  if (flags.options["demo"] !== undefined) {
    const demo = demoArena(flags.options["demo"]);
    if (demo === undefined) throw new Error(`unknown demo arena: ${flags.options["demo"]} (have: ${demoNames().join(", ")})`);
    arena = demo.arena;
  } else if (flags.options["arena"] !== undefined) {
    arena = decodeArena(parseJson(flags.options["arena"], "arena"));
  } else {
    throw new Error("provide --demo <name> or --arena <json>");
  }
  const result = computer.create(id, arena);
  writeSnapshot(dataDir, result.game);
  return `created ${summarize(result.game)}`;
}

function cmdList(flags) {
  const games = loadComputer(dataOf(flags)).list();
  if (flags.bools.has("json")) return renderJson(games.map((g) => snapshot(g)), "game list");
  if (games.length === 0) return "no games yet — game create --id <id> --demo <name>";
  return games.map(summarize).join("\n");
}

function getGame(flags) {
  const dataDir = dataOf(flags);
  const id = need(flags, "id");
  const computer = loadComputer(dataDir);
  const game = computer.get(id);
  if (game === undefined) throw new Error(`unknown game: ${id}`);
  return { dataDir, id, game, computer };
}

function cmdShow(flags) {
  const { game } = getGame(flags);
  return renderJson(snapshot(game), "game snapshot");
}

function applyOp(flags, op, log) {
  const { dataDir, id, computer } = getGame(flags);
  const result = computer.apply(id, op);
  if (result.kind === "game.computer.apply-obstruction") {
    throw new Error(`obstruction: ${renderJson(result.obstruction, "operation obstruction")}`);
  }
  writeSnapshot(dataDir, result.game);
  log();
  const verdict = lastVerdict(result.game);
  const tail = verdict ? `  converged=${verdict.converged} daimonLoci=${verdict.report.daimonLoci.length}` : "";
  return `${summarize(result.game)}${tail}`;
}

function cmdDesign(flags) {
  const designId = need(flags, "design-id");
  const design = decodeDesign(parseJson(need(flags, "design"), "design"));
  const dataDir = dataOf(flags);
  const id = need(flags, "id");
  return applyOp(flags, { kind: "addDesign", designId, design }, () =>
    appendLog(dataDir, id, { kind: "design", at: new Date().toISOString(), payload: { designId } }));
}

function cmdPlay(flags) {
  const move = need(flags, "move");
  const dataDir = dataOf(flags);
  const id = need(flags, "id");
  return applyOp(flags, { kind: "playMove", move }, () =>
    appendLog(dataDir, id, { kind: "move", at: new Date().toISOString(), payload: { move } }));
}

function cmdInteract(flags) {
  const a = need(flags, "a");
  const b = need(flags, "b");
  const dataDir = dataOf(flags);
  const id = need(flags, "id");
  return applyOp(flags, { kind: "runInteraction", designIdA: a, designIdB: b }, () =>
    appendLog(dataDir, id, { kind: "interaction", at: new Date().toISOString(), payload: { a, b } }));
}

function cmdSettle(flags) {
  const dataDir = dataOf(flags);
  const id = need(flags, "id");
  return applyOp(flags, { kind: "settle" }, () =>
    appendLog(dataDir, id, { kind: "settle", at: new Date().toISOString(), payload: {} }));
}

function cmdAnalyze(flags) {
  const { game } = getGame(flags);
  return renderJson(analyzeGame(game), "game analysis");
}

function cmdLog(flags) {
  const { dataDir, id } = getGame(flags);
  return renderJson(readLog(dataDir, id), "game log");
}

/** Run the game computer over an argv vector and return code + output. */
export function runGameCli(argv) {
  const [command, ...rest] = argv;
  if (command === undefined || command === "help" || command === "--help" || command === "-h") {
    return { code: command === undefined ? 1 : 0, output: USAGE };
  }
  try {
    const flags = parse(rest);
    switch (command) {
      case "create": return { code: 0, output: cmdCreate(flags) };
      case "list": return { code: 0, output: cmdList(flags) };
      case "show": return { code: 0, output: cmdShow(flags) };
      case "design": return { code: 0, output: cmdDesign(flags) };
      case "play": return { code: 0, output: cmdPlay(flags) };
      case "interact": return { code: 0, output: cmdInteract(flags) };
      case "settle": return { code: 0, output: cmdSettle(flags) };
      case "analyze": return { code: 0, output: cmdAnalyze(flags) };
      case "log": return { code: 0, output: cmdLog(flags) };
      default: return { code: 1, output: `unknown command: ${command}\n\n${USAGE}` };
    }
  } catch (error) {
    return { code: 1, output: `error: ${(error).message}` };
  }
}
