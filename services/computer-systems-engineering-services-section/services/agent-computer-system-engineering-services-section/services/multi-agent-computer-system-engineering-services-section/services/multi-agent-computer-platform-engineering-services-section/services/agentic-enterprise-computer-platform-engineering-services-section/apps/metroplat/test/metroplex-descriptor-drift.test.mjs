import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { operationFamilyDescriptors } from "../src/generated/operation-family-descriptors.mjs";

const root = resolve(import.meta.dirname, "..");

test("generated lazy descriptors carry the current metroplex connect and command contract", async () => {
  const source = await readFile(resolve(root, "src/metroplex.mjs"), "utf8");
  const generated = operationFamilyDescriptors["@red-cup-engineering/metroplat/metroplex"];
  assert.ok(Array.isArray(generated));

  const connect = generated.find((operation) => operation.verb === "metroplex-connect");
  const command = generated.find((operation) => operation.verb === "metroplex-command");
  assert.ok(connect);
  assert.ok(command);

  for (const descriptor of [connect, command]) {
    const packages = descriptor.codomain?.schema?.properties?.packages;
    assert.deepEqual(packages, {
      type: "array",
      items: {
        type: "object",
        required: ["name", "data"],
        properties: { name: { type: "string" }, data: {} },
      },
      description: "What the turn showed, as data under a GMCP-style package name: Work.Quests, Work.Quest, Work.Journal (what awaits the character's move; on its first turn too), Work.Tellings (what was told around the character since its last turn).",
    });
  }

  assert.match(command.summary, /quests, quest <handle>, journal, tellings/u);
  assert.match(command.description, /The work board is the city's work/u);
  assert.match(command.description, /and `packages`, the same as data\.$/u);

  // These authored strings are part of the executable declaration. This source-level
  // witness catches the exact failure mode where discovery is regenerated/staged
  // independently while the executable family later changes.
  assert.ok(source.includes(`summary: ${JSON.stringify(command.summary)}`));
  assert.ok(source.includes(`description: ${JSON.stringify(command.description)}`));
  assert.match(source, /const turnContract = schemaFrom\([\s\S]*packages: \{ type: "array"/u);
});
