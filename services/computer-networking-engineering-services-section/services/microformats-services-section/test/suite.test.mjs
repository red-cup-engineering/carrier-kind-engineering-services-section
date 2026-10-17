// The shared microformats test suite (https://github.com/microformats/tests, CC0): every .html fragment
// parsed must equal its .json. The v2 and v2-unit directories are held to full equality; the v1 and
// mixed directories exercise backward compatibility with classic microformats.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseMicroformats } from "../src/parse.mjs";

const SUITE = path.join(path.dirname(fileURLToPath(import.meta.url)), "suite");
const BASE = { "microformats-v2-unit": "http://example.test", default: "http://example.com/" };
const SKIP = new Map(JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "suite-skips.json"), "utf8")));

function* cases(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* cases(full);
    else if (entry.name.endsWith(".html") && fs.existsSync(full.replace(/\.html$/u, ".json"))) yield full;
  }
}

const strip = (value) => JSON.parse(JSON.stringify(value));

for (const set of fs.readdirSync(SUITE).filter((name) => fs.statSync(path.join(SUITE, name)).isDirectory())) {
  for (const file of cases(path.join(SUITE, set))) {
    const name = path.relative(SUITE, file).replace(/\.html$/u, "");
    const reason = SKIP.get(name);
    test(`${name}`, { skip: reason }, () => {
      const html = fs.readFileSync(file, "utf8");
      const expected = JSON.parse(fs.readFileSync(file.replace(/\.html$/u, ".json"), "utf8"));
      const actual = parseMicroformats(html, { baseUrl: BASE[set] ?? BASE.default });
      assert.deepEqual(strip(actual), expected);
    });
  }
}
