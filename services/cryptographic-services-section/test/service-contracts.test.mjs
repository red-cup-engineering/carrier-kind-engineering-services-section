// Binds this section's advertised operation catalog to its canonical RMN law
// and locks the honesty invariants the contract promises — so the package can't
// advertise an operation whose contract is missing or has quietly dropped a
// no-secret / no-broadcast guarantee. House convention set by LISS's
// test/service-contracts.test.mjs.
import assert from "node:assert/strict";
import test from "node:test";
import { ACTOR, CONTRACT, run } from "../src/cryptographic-services.mjs";
import { CRYPTOGRAPHIC_SERVICES_LAW } from "../src/law.mjs";

test("every advertised operation resolves to the seated contract", () => {
  assert.equal(CONTRACT, "ni:///sha-256;9Rosqk_puV3ino26o7QdYipnrC9P5rPMnBQLR7FvI5U");
  assert.equal(CONTRACT, CRYPTOGRAPHIC_SERVICES_LAW.id);
  assert.ok(CRYPTOGRAPHIC_SERVICES_LAW.bytes instanceof Uint8Array);
});

test("the contract keeps its no-secret, no-broadcast, deterministic promises", () => {
  const c = CRYPTOGRAPHIC_SERVICES_LAW.value;
  assert.match(c.precondition, /private key remains under caller custody/u);
  assert.match(c.operation, /pure local operation/u);
  assert.match(c.postcondition, /no network access, broadcast, value movement, secret retention/u);
  assert.match(c.refusal, /retain secret material/u);
});

test("the ActivityStreams face offers and executes one capability-bound pure derivation", () => {
  const solicitation = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: "urn:test:crypto-solicitation",
    type: "Offer",
    actor: "urn:ame:test-consumer",
    target: ACTOR,
    object: { type: "ServiceSolicitation", contract: CONTRACT, operation: "keccak256" },
  };
  const offer = run(solicitation, "solicit-service");
  assert.equal(offer.type, "Offer");
  assert.equal(offer.object.operation, "keccak256");
  assert.deepEqual(offer.object.consideration, { amount: 1, unit: "cryptographic-operation-credit" });
  assert.equal(JSON.stringify(offer).includes("forbidden-secret-material"), false);
  const invocation = {
    "@context": solicitation["@context"],
    id: "urn:test:crypto-invocation",
    type: "Accept",
    actor: solicitation.actor,
    target: ACTOR,
    object: {
      type: "ServiceContract",
      contract: CONTRACT,
      offer,
      capability: { type: "Capability", holder: ACTOR, invocationTarget: ACTOR, parentOffer: offer.id, capTP: { target: ACTOR, method: "invoke-service" }, allowedActions: ["invoke-service"] },
      request: { operation: "keccak256", message: "hello" },
    },
  };
  const result = run(invocation, "invoke-service");
  assert.equal(result.type, "Accept");
  assert.equal(result.object.result.digest, "0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8");
});

test("solicitation refuses operation inputs so private keys cannot enter an offer", () => {
  const result = run({
    "@context": "https://www.w3.org/ns/activitystreams",
    id: "urn:test:bad-crypto-solicitation",
    type: "Offer",
    actor: "urn:ame:test-consumer",
    target: ACTOR,
    object: { type: "ServiceSolicitation", contract: CONTRACT, operation: "derive-address", privateKey: "forbidden" },
  }, "solicit-service");
  assert.equal(result.type, "Reject");
  assert.equal(result.object.reason, "operation-inputs-are-forbidden-in-solicitation");
});
