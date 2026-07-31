import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readImports } from "./index.mjs";

describe("readImports", () => {
  it("reads named imports by their provider-side name (not the local alias)", () => {
    const b = readImports(`import { foo, bar as baz } from "@emsenn/x";`, "f.mts");
    const named = b.filter((x) => x.mode === "named");
    assert.deepEqual(named.map((x) => x.name).sort(), ["bar", "foo"]);
    assert.ok(named.every((x) => x.specifier === "@emsenn/x"));
  });

  it("marks namespace imports coarse — reaches the package, names no symbol", () => {
    const b = readImports(`import * as ns from "@emsenn/x";`, "f.mts");
    assert.equal(b.length, 1);
    assert.equal(b[0]?.mode, "namespace");
    assert.equal(b[0]?.name, undefined);
    assert.equal(b[0]?.specifier, "@emsenn/x");
  });

  it("reads a default import", () => {
    const b = readImports(`import Foo from "@emsenn/x";`, "f.mts");
    assert.equal(b[0]?.mode, "default");
    assert.equal(b[0]?.name, "default");
  });

  it("counts type-only imports as usage (a class is a type too)", () => {
    const whole = readImports(`import type { Foo } from "@emsenn/x";`, "f.mts");
    assert.equal(whole[0]?.typeOnly, true);
    assert.equal(whole[0]?.name, "Foo");
    const each = readImports(`import { type Foo, bar } from "@emsenn/x";`, "f.mts");
    assert.equal(each.find((x) => x.name === "Foo")?.typeOnly, true);
    assert.equal(each.find((x) => x.name === "bar")?.typeOnly, false);
  });

  it("reads named re-exports as demand, but star re-exports as coarse", () => {
    const named = readImports(`export { foo } from "@emsenn/x";`, "f.mts");
    assert.equal(named[0]?.mode, "named");
    assert.equal(named[0]?.name, "foo");
    const star = readImports(`export * from "@emsenn/x";`, "f.mts");
    assert.equal(star[0]?.mode, "star-reexport");
    assert.equal(star[0]?.name, undefined);
  });

  it("ignores local exports that carry no module specifier", () => {
    assert.deepEqual(readImports(`const x = 1; export { x };`, "f.mts"), []);
  });

  it("reads dynamic imports, recording the literal specifier when present", () => {
    const lit = readImports(`async function f(){ return import("@emsenn/x"); }`, "f.mts");
    assert.equal(lit.find((b) => b.mode === "dynamic")?.specifier, "@emsenn/x");
    const dyn = readImports("const m='@emsenn/x'; async function f(){ return import(m); }", "f.mts");
    assert.equal(dyn.find((b) => b.mode === "dynamic")?.specifier, undefined);
  });

  it("ignores side-effect imports (no bindings)", () => {
    assert.deepEqual(readImports(`import "@emsenn/x";`, "f.mts"), []);
  });
});
