#!/usr/bin/env node
// swarm-web — start the SWARM web face. By default it injects an OFFLINE echo message() so the
// server runs without a provider key: a posted prompt comes back as a calm echo, and the demo
// surfaces a held ⊤ in the audit field so the calm-by-default + audit-on-demand law is visible.
//
//   PORT      — listen port (default 8787)
//   SWARM_WEB_LIVE=1 — route /say through the real message() orchestration (needs a provider key).

import { createSwarmServer } from "../src/web.mjs";

const port = Number(process.env.PORT ?? 8787);

// echoMessage — an offline stand-in for the real orchestration. It NEVER hits a provider. It echoes
// the prompt as a calm reply and hands back a standing in which one cell is contested (⊤ held, never
// collapsed) so the web face can demonstrate the audit surface offline.
function echoMessage(agentName, prompt) {
  return {
    reply: `echo[${agentName}]: ${prompt}`,
    agent: { name: agentName, office: "echo" },
    office: { name: "echo" },
    standing: {
      heard: { pos: 1, neg: 0 },        // t — believed true
      contested: { pos: 1, neg: 1 },    // ⊤ — held, recoverable in the audit field
      pending: { pos: 0, neg: 0 },      // ⊥ — a named gap, never invented
    },
  };
}

async function main() {
  let message = echoMessage;
  if (process.env.SWARM_WEB_LIVE === "1") {
    const mod = await import("../src/index.mjs");
    message = mod.message;
  }
  const server = createSwarmServer({ message, agent: process.env.SWARM_AGENT ?? "groq" });
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`swarm-web listening on http://localhost:${port}  (offline echo: ${process.env.SWARM_WEB_LIVE === "1" ? "off" : "on"})`);
  });
}

main();
