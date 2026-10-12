import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { ACTIVITYSTREAMS_CONTEXT, ACTIVITYSTREAMS_PUBLIC } from "@red-cup-engineering/activitypub-services-section/activitystreams";
import { cloudEventFromUtterance } from "../src/index.mjs";
import { cloudEventFromUtterance as fromContract } from "../src/messaging/cloudevents.mjs";

const sourceRoot = new URL("../src/", import.meta.url);
function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    return entry.isDirectory() ? sources(url) : entry.name.endsWith(".mjs") ? [readFileSync(url, "utf8")] : [];
  });
}

test("carrier consumers stay on the declared Relating contract surface", () => {
  const text = sources(sourceRoot);
  const carrierNames = new Set(["memeCarrier", "utteranceCarrier"]);
  const rootImports = /import\s*\{([^}]+)\}\s*from\s*["']@red-cup-engineering\/relating["']/gu;
  const carrierOnly = text.flatMap((source) => [...source.matchAll(rootImports)])
    .map((match) => match[1].split(",").map((binding) => binding.trim().split(/\s+as\s+/u)[0]).filter(Boolean))
    .filter((bindings) => bindings.length > 0 && bindings.every((name) => carrierNames.has(name)));
  assert.equal(carrierOnly.length, 0, "carrier-only consumers must use the declared carrier contract");
  assert.ok(text.some((source) => source.includes("@red-cup-engineering/relating/carriers")));
});

test("protocol translation consumes vocabulary without loading a legacy transport", () => {
  const source = readFileSync(new URL("../src/messaging/protocol-translate.mjs", import.meta.url), "utf8");
  assert.ok(source.includes("@red-cup-engineering/activitypub-services-section/activitystreams"));
  assert.equal(source.includes("@red-cup-engineering/activitypub-services-section/rmn-activity"), false);
  assert.equal(ACTIVITYSTREAMS_CONTEXT, "https://www.w3.org/ns/activitystreams");
  assert.equal(ACTIVITYSTREAMS_PUBLIC, "https://www.w3.org/ns/activitystreams#Public");
});

test("the complete public surface preserves the CloudEvents function binding", () => {
  assert.equal(cloudEventFromUtterance, fromContract);
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.dependencies["@red-cup-engineering/computer-content-address-engineering-services-section"], "workspace:*");
  assert.equal(manifest.dependencies["@red-cup-engineering/computer-content-engineering-services-section"], "workspace:*");
});
