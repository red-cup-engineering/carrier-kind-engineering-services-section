import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  conformSemioticExchangeChainLaw,
  REQUIREMENT_IDS,
} from "../lib/law.mjs";
import {
  formatRml,
  parseRml,
} from "@red-cup-engineering/rmn-semantic-conformance-die";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARCHITECTURE = readFileSync(
  join(ROOT, "content/designs/semiotic-exchange-chain/software-architecture-specification.rml"),
  "utf8",
);
const REQUIREMENTS = readFileSync(
  join(ROOT, "content/designs/semiotic-exchange-chain/requirements-baseline.rml"),
  "utf8",
);

test("canonical SXC architecture allocates every baseline requirement exactly once", () => {
  const receipt = conformSemioticExchangeChainLaw({
    architectureRml: ARCHITECTURE,
    requirementsRml: REQUIREMENTS,
  });
  assert.match(receipt.architectureId, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.match(receipt.requirementsId, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.deepEqual(Object.keys(receipt.allocations), [...REQUIREMENT_IDS]);
  for (const owners of Object.values(receipt.allocations)) assert.equal(owners.length, 1);
});

test("an unallocated requirement is refused rather than silently becoming lore", () => {
  const architecture = parseRml(ARCHITECTURE);
  architecture.modules[0].requirements = architecture.modules[0].requirements.slice(1);
  assert.throws(
    () => conformSemioticExchangeChainLaw({
      architectureRml: formatRml(architecture),
      requirementsRml: REQUIREMENTS,
    }),
    /SXC-R001 must be allocated to exactly one module; found 0/u,
  );
});

test("an unknown allocation is refused at the module boundary", () => {
  const architecture = parseRml(ARCHITECTURE);
  architecture.modules[0].requirements.push("SXC-R999");
  assert.throws(
    () => conformSemioticExchangeChainLaw({
      architectureRml: formatRml(architecture),
      requirementsRml: REQUIREMENTS,
    }),
    /SXC-M1 allocates unknown requirement SXC-R999/u,
  );
});
