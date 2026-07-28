#!/usr/bin/env node
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { semanticLinefeedNormalization } from "../src/normalize-semantic-linefeeds.mjs";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);

const actor = Object.freeze({
  "@context": "https://www.w3.org/ns/activitystreams",
  id: "urn:ame:semantic-linefeed-normalization-service",
  type: "Service",
  name: "Semantic Linefeed Normalization Service",
  preferredUsername: "semantic-linefeed-normalization-service",
});

const agentCard = Object.freeze({
  name: "Semantic Linefeed Normalization Service",
  description: "Normalizes Markdown prose to semantic linefeeds.",
  url: "/invoke",
  version: "0.1.0",
  capabilities: { streaming: false, pushNotifications: false },
  skills: [{ id: "normalize-semantic-linefeeds", name: "Normalize semantic linefeeds", tags: ["markdown", "prose"] }],
});

function json(response, status = 200) {
  return { status, body: JSON.stringify(response), headers: { "content-type": "application/json; charset=utf-8" } };
}

export function createSemanticLinefeedServer() {
  return createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (request.method === "GET" && url.pathname === "/health") return send(response, json({ ok: true }));
    if (request.method === "GET" && url.pathname === "/actor") return send(response, json(actor));
    if (request.method === "GET" && url.pathname === "/.well-known/agent-card.json") return send(response, json(agentCard));
    if (request.method !== "POST" || url.pathname !== "/invoke") return send(response, json({ error: "not-found" }, 404));

    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      try {
        const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (typeof input?.text !== "string") return send(response, json({ error: "text-must-be-a-string" }, 400));
        return send(response, json(semanticLinefeedNormalization(input.text)));
      } catch (error) {
        return send(response, json({ error: "invalid-json", message: error.message }, 400));
      }
    });
  });
}

function send(response, result) {
  response.writeHead(result.status, result.headers);
  response.end(result.body);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createSemanticLinefeedServer();
  server.listen(port, () => process.stderr.write(`semantic-linefeed-normalization-service listening on ${port}\n`));
}
