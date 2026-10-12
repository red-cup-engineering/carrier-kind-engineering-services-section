import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { readClaim, ClaimNotFoundError } from "../src/claim-store.mjs";
import { loadFiber, UnknownFiberError, FIBER_NAMES } from "../src/fiber-registry.mjs";
import { buildReceipt } from "../src/render-claim-in-language.mjs";
import { parseArgs } from "../scripts/render-claim-in-language.mjs";

const execFileAsync = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "fixtures", "sample-claim-store.json");
const CLI = join(HERE, "..", "scripts", "render-claim-in-language.mjs");

test("readClaim reads the addressed claim by id", async () => {
  const { subject, claim } = await readClaim(FIXTURE, "title");
  assert.equal(subject, "fixture-subject");
  assert.equal(claim.proposition.object, "Emergent Alignment");
});

test("readClaim rejects an unknown claim id", async () => {
  await assert.rejects(readClaim(FIXTURE, "no-such-claim"), ClaimNotFoundError);
});

test("loadFiber rejects an unknown fiber name", async () => {
  await assert.rejects(loadFiber("klingon"), UnknownFiberError);
});

test("FIBER_NAMES names exactly the five pinned fibers", () => {
  assert.deepEqual([...FIBER_NAMES].sort(), ["english", "lakota", "latin", "mandarin", "tokipona"]);
});

test("obstruction receipt: no candidate rendering supplied", async () => {
  const { subject, claim } = await readClaim(FIXTURE, "title");
  const fiber = await loadFiber("tokipona");
  const receipt = buildReceipt({ subject, claimId: "title", claim, fiber });

  assert.equal(receipt.source.subject, "fixture-subject");
  assert.equal(receipt.source.claimId, "title");
  assert.equal(receipt.source.citation, "https://example.org/fixture");
  assert.equal(receipt.target.fiber, "tokipona");
  assert.equal(receipt.target.version, "0.1.4");
  assert.equal(receipt.rendering.text, null);
  assert.equal(receipt.rendering.producedBy, "obstruction");
  assert.equal(receipt.judgment.parsedByFiber, false);
  assert.equal(receipt.judgment.grammaticality, null);
  assert.ok(Array.isArray(receipt.judgment.lossProfile) && receipt.judgment.lossProfile.length > 0);
  assert.equal(receipt.obstruction.kind, "no-renderer");
});

test("obstruction receipt: caller-supplied obstruction (e.g. a dispatch refusal) is preserved verbatim", async () => {
  const { subject, claim } = await readClaim(FIXTURE, "title");
  const fiber = await loadFiber("mandarin");
  const receipt = buildReceipt({
    subject,
    claimId: "title",
    claim,
    fiber,
    obstruction: { kind: "dispatch-unavailable", detail: "no-admissible-provider-offer" },
  });
  assert.deepEqual(receipt.obstruction, { kind: "dispatch-unavailable", detail: "no-admissible-provider-offer" });
});

test("fiber round-trip: a grammatical fixture sentence settles with no obstruction", async () => {
  const { subject, claim } = await readClaim(FIXTURE, "title");
  const fiber = await loadFiber("english");
  const receipt = buildReceipt({
    subject,
    claimId: "title",
    claim,
    fiber,
    text: "The cat sleeps.",
    producedBy: "fiber",
  });

  assert.equal(receipt.rendering.producedBy, "fiber");
  assert.equal(receipt.judgment.parsedByFiber, true);
  assert.equal(receipt.judgment.grammaticality.status, "grammatical");
  assert.deepEqual(receipt.judgment.grammaticality.violations, []);
  assert.equal(receipt.obstruction, null);
  assert.ok(!receipt.judgment.lossProfile.includes("proposition.object"));
  assert.ok(receipt.judgment.lossProfile.includes("proposition.predicate"));
});

test("fiber round-trip: an ungrammatical fixture sentence is an obstruction, not a success", async () => {
  const { subject, claim } = await readClaim(FIXTURE, "title");
  const fiber = await loadFiber("tokipona");
  const receipt = buildReceipt({
    subject,
    claimId: "title",
    claim,
    fiber,
    text: "sona li kama",
    producedBy: "inference-dispatch:test-provider",
  });

  assert.equal(receipt.judgment.parsedByFiber, true);
  assert.equal(receipt.judgment.grammaticality.status, "ungrammatical");
  assert.equal(receipt.obstruction.kind, "ungrammatical-rendering");
  assert.equal(receipt.rendering.text, "sona li kama");
});

test("fiber round-trip: a rendering the fiber cannot tokenize into any word is an obstruction", async () => {
  const { subject, claim } = await readClaim(FIXTURE, "title");
  const fiber = await loadFiber("tokipona");
  const receipt = buildReceipt({
    subject,
    claimId: "title",
    claim,
    fiber,
    text: "!!!",
    producedBy: "fiber",
  });

  assert.equal(receipt.judgment.parsedByFiber, false);
  assert.equal(receipt.obstruction.kind, "unparseable-rendering");
});

test("parseArgs splits positional claim/id/fiber from --flag value pairs", () => {
  const { positional, flags } = parseArgs(["a.json", "title", "tokipona", "--text", "mi moku", "--produced-by", "fiber"]);
  assert.deepEqual(positional, ["a.json", "title", "tokipona"]);
  assert.deepEqual(flags, { text: "mi moku", "produced-by": "fiber" });
});

test("CLI end-to-end: obstruction path prints a valid receipt to stdout", async () => {
  const { stdout } = await execFileAsync("node", [
    CLI,
    FIXTURE,
    "title",
    "tokipona",
    "--obstruction-kind",
    "dispatch-unavailable",
    "--obstruction-detail",
    "no-admissible-provider-offer",
  ]);
  const receipt = JSON.parse(stdout);
  assert.equal(receipt.rendering.producedBy, "obstruction");
  assert.equal(receipt.obstruction.kind, "dispatch-unavailable");
});

test("CLI end-to-end: --text path re-reads through the fiber and prints a grammatical receipt", async () => {
  const { stdout } = await execFileAsync("node", [
    CLI,
    FIXTURE,
    "title",
    "english",
    "--text",
    "The cat sleeps.",
    "--produced-by",
    "fiber",
  ]);
  const receipt = JSON.parse(stdout);
  assert.equal(receipt.judgment.grammaticality.status, "grammatical");
  assert.equal(receipt.obstruction, null);
});

test("CLI end-to-end: --text without --produced-by/--provider is a usage error", async () => {
  await assert.rejects(execFileAsync("node", [CLI, FIXTURE, "title", "english", "--text", "hi"]));
});
