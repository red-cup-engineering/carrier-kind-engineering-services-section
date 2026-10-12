#!/usr/bin/env node
import { gardenGame } from "../examples/garden.mjs";
import { closeMudHttpServer, createMudHttpServer, listenMudHttpServer } from "../src/http.mjs";
import { createMudServer } from "../src/mud-server.mjs";

const port = Number(process.env.PORT ?? 3000);
const mud = createMudServer(gardenGame);
const { origin, server } = await listenMudHttpServer(createMudHttpServer(mud), { host: process.env.HOST ?? "127.0.0.1", port });
process.stdout.write(`FizzOS listening at ${origin}\n`);
const interval = setInterval(() => mud.tick(), Number(process.env.FIZZOS_TICK_MS ?? 1000));
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  clearInterval(interval);
  await closeMudHttpServer(server);
}
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
  close().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
});
