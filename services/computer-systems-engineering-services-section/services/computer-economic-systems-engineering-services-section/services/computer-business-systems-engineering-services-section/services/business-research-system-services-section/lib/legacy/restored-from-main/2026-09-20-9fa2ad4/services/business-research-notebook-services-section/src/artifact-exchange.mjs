#!/usr/bin/env node
import { createHash, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { NODE_ROOT } from "./notebook.mjs";
import { digest, rows } from "./operations.mjs";
import { CATEGORY } from "./a2a-backend.mjs";
function eq(a, b) {
  return timingSafeEqual(
    createHash("sha256").update(String(a)).digest(),
    createHash("sha256").update(String(b)).digest(),
  );
}
export async function serve(o = {}) {
  const root = resolve(o.dataRoot ?? join(NODE_ROOT, "data")),
    exchange = resolve(o.exchangeRoot ?? join(root, "artifact-exchange")),
    server = createServer(async (req, res) => {
      try {
        if (req.method !== "GET") {
          res.writeHead(405).end();
          return;
        }
        const m = new URL(req.url, `http://${req.headers.host}`).pathname.match(
          /^\/artifacts\/([a-f0-9]{64})\.mp4$/u,
        );
        if (!m) {
          res.writeHead(404).end();
          return;
        }
        const row = rows(root, CATEGORY).find(
          (r) =>
            r.status === "delivered" &&
            r.result?.artifact?.sha256 === `sha256:${m[1]}` &&
            eq(
              req.headers.authorization,
              `Bearer ${r.result.artifact.authorization.token}`,
            ),
        );
        if (!row) {
          res.writeHead(401).end();
          return;
        }
        const bytes = readFileSync(join(exchange, `${m[1]}.mp4`));
        if (
          bytes.length !== row.result.artifact.byteLength ||
          digest(bytes) !== row.result.artifact.sha256
        ) {
          res.writeHead(409).end();
          return;
        }
        res.writeHead(200, {
          "content-type": "video/mp4",
          "content-length": bytes.length,
          "cache-control": "private, no-store",
        });
        res.end(bytes);
      } catch {
        res.writeHead(500).end();
      }
    });
  await new Promise((ok, no) => {
    server.once("error", no);
    server.listen(o.port ?? 18452, o.host ?? "127.0.0.1", ok);
  });
  return server;
}
if (process.argv[1] === new URL(import.meta.url).pathname)
  serve({
    port: Number(process.env.MODERN_BUSINESS_NOTEBOOK_ARTIFACT_PORT ?? 18452),
    host: process.env.MODERN_BUSINESS_NOTEBOOK_ARTIFACT_HOST ?? "127.0.0.1",
    dataRoot: process.env.MODERN_BUSINESS_NOTEBOOK_DATA_ROOT,
    exchangeRoot: process.env.MODERN_BUSINESS_NOTEBOOK_EXCHANGE_ROOT,
  }).then((s) => process.stdout.write(`${JSON.stringify(s.address())}\n`));
