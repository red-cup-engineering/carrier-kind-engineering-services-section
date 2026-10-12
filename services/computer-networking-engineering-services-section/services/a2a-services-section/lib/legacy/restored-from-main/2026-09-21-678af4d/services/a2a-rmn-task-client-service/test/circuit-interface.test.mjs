import assert from "node:assert/strict";
import test from "node:test";

import {
  circuitInterfaceFromAgentCard,
  SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION,
} from "../src/send-rmn-task.mjs";

const account = "eip155:31337:0x39b06799d1b27733b7a4e4751ffe92c61a498484";

function card(extensions) {
  return {
    provider: {
      organization: "A2A Services Section",
      url: "https://example.invalid/",
    },
    capabilities: { extensions },
  };
}

test("sovereign circuit identity comes from the negotiated extension", () => {
  assert.deepEqual(circuitInterfaceFromAgentCard(card([{
    uri: SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION,
    required: true,
    params: { account },
  }])), { account });
});

test("provider URL and unrelated extensions cannot stand in for the circuit account", () => {
  assert.throws(() => circuitInterfaceFromAgentCard({
    provider: { account, url: account },
    capabilities: { extensions: [] },
  }), /exactly one circuit-interface extension/u);
  assert.throws(() => circuitInterfaceFromAgentCard(card([{
    uri: "urn:example:other-extension",
    params: { account },
  }])), /exactly one circuit-interface extension/u);
});

test("the circuit extension refuses absent, duplicate, and malformed accounts", () => {
  const extension = {
    uri: SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION,
    required: true,
    params: { account },
  };
  assert.throws(() => circuitInterfaceFromAgentCard(card([
    extension,
    structuredClone(extension),
  ])), /exactly one circuit-interface extension/u);
  assert.throws(() => circuitInterfaceFromAgentCard(card([{
    ...extension,
    params: { account: "https://example.invalid/account" },
  }])), /CAIP-10 account/u);
});
