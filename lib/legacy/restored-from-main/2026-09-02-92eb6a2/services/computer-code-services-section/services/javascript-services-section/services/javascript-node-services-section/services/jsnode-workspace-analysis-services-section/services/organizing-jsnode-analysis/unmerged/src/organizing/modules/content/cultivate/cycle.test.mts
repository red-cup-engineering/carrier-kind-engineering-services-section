import assert from "node:assert/strict";
import test from "node:test";

import { documentSymbol } from "./cycle.mjs";
import type { PackageSurface } from "./surface.mjs";

const surface: PackageSurface = Object.freeze({
  name: "@example/pkg",
  description: "Example package.",
  dir: ".",
  symbols: Object.freeze([
    Object.freeze({
      name: "Target",
      kind: "type-alias" as const,
      signature: "export type Target = Readonly<{ value: string }>",
      doc: "",
      file: "src/index.mts",
      rank: 0,
    }),
    Object.freeze({
      name: "Adjacent",
      kind: "interface" as const,
      signature: "export interface Adjacent { readonly value: string }",
      doc: "",
      file: "src/index.mts",
      rank: 0,
    }),
    Object.freeze({
      name: "Distant",
      kind: "function" as const,
      signature: "export function Distant(value: MissingDistantType): void",
      doc: "",
      file: "src/other.mts",
      rank: 0,
    }),
  ]),
});

test("documentSymbol can limit sibling context for small model assignments", async () => {
  let prompt = "";
  const result = await documentSymbol(surface, "Target", {
    siblingNames: ["Adjacent"],
    maxRevisions: 0,
    ask(input) {
      prompt = input;
      return [
        "SUMMARY: Type annotation target for an example value.",
        "DETAILS: Target names the readonly value shape used at this boundary when a caller needs to keep that value explicit.",
        "EXAMPLE:",
        "const value: Target = { value: \"ok\" };",
      ].join("\n");
    },
  });

  assert.equal(result.shipped, true);
  assert.match(prompt, /Adjacent/);
  assert.doesNotMatch(prompt, /Distant/);
});
