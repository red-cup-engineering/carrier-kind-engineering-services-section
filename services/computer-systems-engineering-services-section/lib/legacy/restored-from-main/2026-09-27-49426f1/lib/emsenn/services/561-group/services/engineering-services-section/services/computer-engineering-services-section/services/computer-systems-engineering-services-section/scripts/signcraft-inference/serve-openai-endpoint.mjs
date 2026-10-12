#!/usr/bin/env node
import { createHttpServer } from "@red-cup-engineering/http-services-section/node-server";
// Loopback OpenAI-compatible face for the kernel: POST /v1/chat/completions
// whose last user message is a JSON demand {rules, facts, denials?, query,
// conductances?}. The assistant message content is the full raw-inference
// result (verdict, witness chain, refusal, questions) as JSON, so any
// OpenAI-dialect customer — the free-first dispatcher, the direct-endpoint
// lane — can buy witnessed derivations. Loopback only; auth mode none.


import { makeInference, infer } from "../../src/signcraft/inference/infer.mjs";

const MODEL = "predicated-inference-kernel/0.1.0";

export function answerChatPacket(packet) {
  const messages = Array.isArray(packet?.messages) ? packet.messages : [];
  const last = [...messages].reverse().find((m) => m?.role === "user");
  if (!last || typeof last.content !== "string") {
    return { error: { type: "invalid_request_error", message: "no user message with string content" } };
  }
  let demand;
  try { demand = JSON.parse(last.content); } catch (error) {
    return { error: { type: "invalid_request_error", message: `demand must be JSON {rules, facts, denials?, query}: ${error.message}` } };
  }
  if (!Array.isArray(demand?.rules) || typeof demand?.query !== "string") {
    return { error: { type: "invalid_request_error", message: "demand lacks rules[] or query" } };
  }
  const attributes = new Set(demand.attributes ?? []);
  for (const r of demand.rules) for (const a of [...(r.if ?? []), ...(r.then ?? [])]) attributes.add(a);
  for (const f of demand.facts ?? []) attributes.add(f);
  for (const f of demand.denials ?? []) attributes.add(f);
  attributes.add(demand.query);
  const engine = makeInference({ attributes: [...attributes], rules: demand.rules });
  const result = infer(engine, {
    facts: demand.facts ?? [],
    denials: demand.denials ?? [],
    query: demand.query,
    conductances: demand.conductances ?? [],
  });
  const content = JSON.stringify(result);
  const promptBytes = Buffer.byteLength(last.content, "utf8");
  const completionBytes = Buffer.byteLength(content, "utf8");
  return {
    id: `pik-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: MODEL,
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    // Byte-derived accounting: this substrate has no subword tokens; the
    // honest unit is bytes/4 as the dialect-compatible estimate.
    usage: {
      prompt_tokens: Math.ceil(promptBytes / 4),
      completion_tokens: Math.ceil(completionBytes / 4),
      total_tokens: Math.ceil((promptBytes + completionBytes) / 4),
    },
    x_witness: { verdict: result.verdict, chainLength: result.witness?.length ?? 0, refusal: result.refusal, questions: result.questions },
  };
}

export function startServer({ port = 8813, host = "127.0.0.1" } = {}) {
  const server = createHttpServer({ handle: (req, res) => {
    if (req.method !== "POST" || !req.url?.includes("/chat/completions")) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { type: "not_found", message: "POST /v1/chat/completions only" } }));
      return;
    }
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch (error) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { type: "invalid_request_error", message: error.message } }));
        return;
      }
      const answer = answerChatPacket(body);
      res.writeHead(answer.error ? 400 : 200, { "content-type": "application/json" });
      res.end(JSON.stringify(answer));
    });
  } });
  return new Promise((resolve) => {
    server.listen(port, host, () => resolve({ server, port: server.address().port, host }));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? "8813");
  startServer({ port }).then(({ host, port: bound }) => {
    process.stdout.write(`http://${host}:${bound}/v1/chat/completions\n`);
  });
}
