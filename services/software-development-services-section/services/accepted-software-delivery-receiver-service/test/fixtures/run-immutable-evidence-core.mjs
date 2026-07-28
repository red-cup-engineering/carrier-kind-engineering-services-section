#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { readImmutableInductionEvidence } from "../../src/immutable-induction-evidence.mjs";

const input = JSON.parse(readFileSync(0, "utf8"));
const outcome = await readImmutableInductionEvidence({
  requestBytes: Buffer.from(input.requestBytes, "base64"),
  grant: input.grant,
  grantJws: input.grantJws,
  inputJws: input.inputJws,
  dataRoot: input.dataRoot,
  routesFile: input.routesFile,
  privateKeyPem: input.privateKeyPem,
  signingKid: input.signingKid,
  signingJwks: input.signingJwks,
  receiverCard: input.receiverCard,
  receiverJwks: input.receiverJwks,
  receiverAgentUrl: input.receiverAgentUrl,
  now: new Date(input.now),
  discover: async () => input.providerCard,
  discoverReceiver: async () => input.receiverSignedCard,
  fetch: async () => ({ ok: true, json: async () => input.providerJwks }),
  crash(point) {
    if (point === input.crashPoint) process.exit(91);
  },
});
process.stdout.write(`${JSON.stringify({
  bytes: Buffer.from(outcome.bytes).toString("base64"),
  jws: outcome.jws,
  result: outcome.result,
})}\n`);
