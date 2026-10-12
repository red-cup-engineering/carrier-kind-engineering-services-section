import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { manifest, settle } from "../src/index.mjs";

const sketchUrl = new URL("../data/orthography-sketch.json", import.meta.url);
const sketch = JSON.parse(readFileSync(sketchUrl, "utf8"));

const chargeParticles = ["ta", "na", "sha", "mu"];
const roleParticles = ["ga", "do", "pa", "lo", "ke", "ve"];
const dialogueParticles = ["ku", "du", "se", "ha"];
const aspectSuffixes = ["ai", "en", "um", "o", "e"];

function exactWordFromPattern(pattern) {
  const match = /^\^([a-z]+)\$$/u.exec(pattern);
  return match?.[1] ?? null;
}

test("RelConLang orthography sketch keeps Latin as the built script", () => {
  assert.equal(sketch.kind, "x-rel.orthography-sketch");
  assert.equal(sketch.language, manifest.bundle.meta.code);
  assert.equal(sketch.maturity.latin, "Built+green");
  assert.equal(sketch.latin.script, manifest.bundle.meta.script);
  assert.equal(sketch.latin.direction, manifest.bundle.meta.direction);
  assert.equal(sketch.latin.allowedTokenPattern, "^[a-z]+(-[a-z]+)?$");
});

test("RelConLang agency-sign components cover manifest particles and suffixes", () => {
  for (const particle of chargeParticles) {
    assert.equal(sketch.agencySign.components.charge.values[particle], `charge:${{
      ta: "active",
      na: "potential",
      sha: "stable",
      mu: "absurd",
    }[particle]}`);
  }
  for (const particle of roleParticles) {
    assert.ok(sketch.agencySign.components.role.values[particle], `${particle} role component should exist`);
  }
  for (const particle of dialogueParticles) {
    assert.ok(sketch.agencySign.components.dialogue.values[particle], `${particle} dialogue component should exist`);
  }
  for (const suffix of aspectSuffixes) {
    assert.ok(sketch.agencySign.components.aspect.values[suffix], `${suffix} aspect component should exist`);
  }
});

test("RelConLang agency-sign roots cover every manifest root family", () => {
  const sketched = new Map(sketch.agencySign.roots.map((entry) => [entry.surface, entry]));
  for (const rule of manifest.bundle.morphology.rootPatternRules ?? []) {
    const surface = exactWordFromPattern(rule.pattern);
    if (surface === null) continue;
    const entry = sketched.get(surface);
    assert.ok(entry, `${surface} should have an agency-sign root sketch`);
    assert.equal(entry.root, rule.root);
    assert.equal(entry.semantic, rule.features?.find((feature) => feature.startsWith("semantic:"))?.slice("semantic:".length));
    assert.ok(entry.skeleton.length > 0, `${surface} should name a visual skeleton`);
  }
});

test("RelConLang orthography examples remain parseable Latin utterances", () => {
  const tokenPattern = new RegExp(sketch.latin.allowedTokenPattern, "u");
  for (const example of sketch.agencySign.examples) {
    const result = settle(example.latin);
    assert.ok(result.words.length > 0, `${example.latin} should parse into words`);
    assert.ok(example.visibleComponents.length > 0, `${example.latin} should name visible components`);
    for (const word of result.words) {
      assert.match(word.text.toLowerCase(), tokenPattern);
    }
  }
});
