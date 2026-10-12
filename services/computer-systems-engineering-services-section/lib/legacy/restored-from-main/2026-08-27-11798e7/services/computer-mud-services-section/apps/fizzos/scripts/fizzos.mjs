#!/usr/bin/env node
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { gardenGame } from "../examples/garden.mjs";
import { createEngine, join, step, submit } from "../src/engine.mjs";

const actor = process.env.FIZZOS_ACTOR?.trim() || "gardener";
let engine = join(createEngine(gardenGame), actor);

function run(command) {
  engine = submit(engine, { actor, command });
  const result = step(engine);
  engine = result.engine;
  for (const message of result.receipt.events.filter(({ to }) => to === actor)) stdout.write(`${message.text}\n`);
}

stdout.write(`FizzOS 0.1 — ${gardenGame.name}\n`);
run("look");

const terminal = createInterface({ input: stdin, output: stdout, prompt: "> " });
terminal.prompt();
terminal.on("line", (line) => {
  const command = line.trim();
  if (command === "quit" || command === "exit") return terminal.close();
  if (command.length > 0) run(command);
  terminal.prompt();
});
