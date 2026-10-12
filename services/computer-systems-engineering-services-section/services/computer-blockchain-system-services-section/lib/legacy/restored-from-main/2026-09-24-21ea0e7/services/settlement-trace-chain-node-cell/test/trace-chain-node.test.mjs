import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { decodeStatusRequest, encodeStatusRequest } from "../lib/protocol.mjs";

test("status request is canonical and chain-pinned", () => {
  const request = encodeStatusRequest();
  assert.equal(decodeStatusRequest(decodeSemantic(semanticBytes(request.term))).chain, "eip155:5615610");
});

test("Anvil runner is historical and not a public chain launcher", () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const metadata = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const legacyRunner = resolve(root, "legacy/anvil/scripts/run-chain.mjs");

  assert.equal(metadata.bin["serve-settlement-trace-chain"], undefined);
  assert.equal(existsSync(legacyRunner), true);
  assert.match(readFileSync(legacyRunner, "utf8"), /ANVIL_BIN/u);
});
