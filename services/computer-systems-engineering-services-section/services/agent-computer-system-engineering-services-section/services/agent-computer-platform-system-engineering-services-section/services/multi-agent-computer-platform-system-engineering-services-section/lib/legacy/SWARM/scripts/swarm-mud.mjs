#!/usr/bin/env node
// swarm-mud — a runnable demo that wires a real swarmWorld carrier to a tiny REPL so you can "talk
// to the agents" without a MUD client. It is THIN: it builds a swarmWorld, subscribes to its
// onLine / onGMCP just like wheatstone's TUI would, and feeds stdin lines into world.send().
//
// OFFLINE-SAFE: if no live key is configured (SWARM_LIVE_TESTS / a provider key), it injects a
// stub message() that ECHOES — and, on the magic word "contradict", surfaces a HELD ⊤ in the gmcp
// audit payload while keeping the line calm. This lets the demo run with no network and no key,
// and shows the carrier's calm-line / audit-gmcp split. With a live key, pass --live to inject the
// real swarm message() (imported lazily, only here at the edge — the carrier itself never imports
// the barrel).
//
// Usage:
//   node scripts/swarm-mud.mjs [--agent NAME] [--live]
//   then type lines; type "contradict" to see a ⊤ ride the audit channel; Ctrl-D to quit.

import readline from "node:readline";

import { swarmWorld } from "../src/mud.mjs";
import { TOP, TRUE } from "@561-group/tab/value";

function parseArgs(argv) {
  const out = { agent: "swarm", live: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--agent") out.agent = argv[++i];
    else if (a === "--live") out.live = true;
  }
  return out;
}

// stubMessage — an offline echo orchestration with the SAME RETURN SHAPE as the swarm's message():
// { reply, agent, trace, fiber }. "contradict" plants a held ⊤ cell in the fiber so the carrier has
// a real contradiction to route to the audit channel — calm line, ⊤ in gmcp.
async function stubMessage(agentName, prompt) {
  const said = String(prompt ?? "");
  const fiber = [
    { predicate: "heard", object: said, value: TRUE, evidence: [["player.line"], []] },
  ];
  if (/contradict/i.test(said)) {
    // A HELD contradiction: believed-true AND believed-false over a lossless evidence carrier. The
    // converse witness is a CONVERSE row in the negative carrier — never a destructive re-roll.
    fiber.push({
      predicate: "office.open",
      object: "field-office",
      value: TOP,
      evidence: [["dispatch.opened@t1"], ["dispatch.closed@t2"]],
    });
  }
  return {
    reply: `you said: ${said}`, // CALM — no ⊤ glyph ever leaks into the prose
    agent: { name: agentName, office: "field-office" },
    trace: { articulated: true, predicated: true, settled: true, witnessed: true },
    fiber,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let message = stubMessage;
  if (args.live) {
    // Lazy edge import ONLY here (not in the carrier) so the demo can opt into the live swarm.
    const mod = await import("../src/index.mjs");
    message = mod.message;
  }

  const world = swarmWorld({ message, agent: args.agent });

  world.onLine((l) => process.stdout.write(`${l}\n`));
  world.onGMCP((pkg, data) => {
    // The AUDIT channel. In a real client this paints a side pane; here we print it plainly so the
    // held ⊤ (data.contested) is visible on demand without ever cluttering the calm line above.
    process.stdout.write(`  [gmcp ${pkg}] ${JSON.stringify(data)}\n`);
  });
  world.onStatus(({ state }) => process.stdout.write(`  [status ${state}]\n`));

  await world.connect();
  process.stdout.write(
    `swarm-mud: ${args.live ? "live" : "offline echo"} carrier, agent=${args.agent}. ` +
      `Type a line (try "contradict"); Ctrl-D to quit.\n`,
  );

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  for await (const line of rl) {
    world.send(line);
  }
  world.close();
}

await main();
