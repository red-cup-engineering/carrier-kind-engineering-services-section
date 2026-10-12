#!/usr/bin/env node
import { createHiveExitTightnessHttpServer } from "../src/hive/exit-tightness-http-service.mjs";

const port = Number(process.env.HIVE_EXIT_TIGHTNESS_PORT ?? "8788");
const host = process.env.HIVE_EXIT_TIGHTNESS_HOST ?? "127.0.0.1";
const journalRoot = process.env.HIVE_EXIT_TIGHTNESS_JOURNAL_ROOT;
if (!journalRoot) throw new Error("HIVE_EXIT_TIGHTNESS_JOURNAL_ROOT is required: a paid report service cannot discard its sale and delivery evidence");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("HIVE_EXIT_TIGHTNESS_PORT must be a valid TCP port");

const server = createHiveExitTightnessHttpServer({
  journalRoot,
  sellerAccount: process.env.HIVE_EXIT_TIGHTNESS_SELLER_ACCOUNT ?? "emsenn0",
  memoPrefix: process.env.HIVE_EXIT_TIGHTNESS_MEMO_PREFIX ?? "exit-tightness",
  expirySeconds: Number(process.env.HIVE_EXIT_TIGHTNESS_EXPIRY_SECONDS ?? "900"),
});
server.listen(port, host, () => process.stdout.write(`Hive exit-tightness paid service listening on http://${host}:${port}/v1/hive/exit-tightness\n`));
