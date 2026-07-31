import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { introspectDirectory, introspectDeclarationsByFile } from "./index.mjs";

const FIXTURE = `
export interface Animal {
  legs: number;
}
export declare class Dog implements Animal {
  legs: number;
  bark(): string;
}
export type Sound = string;
export declare function feed(animal: Animal, amount: number): void;
export declare const adopt: () => Dog;
declare class Hidden {}
`;

let dir: string;

before(() => {
  dir = mkdtempSync(path.join(tmpdir(), "jscomputer-"));
  writeFileSync(path.join(dir, "surface.d.ts"), FIXTURE, "utf8");
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("introspectDirectory", () => {
  it("reads exported classes, interfaces, and type aliases as typed objects", () => {
    const cat = introspectDirectory(dir);
    const byName = new Map(cat.types.map((t) => [t.name, t.kind]));
    assert.equal(byName.get("Animal"), "interface");
    assert.equal(byName.get("Dog"), "class");
    assert.equal(byName.get("Sound"), "type-alias");
    assert.ok(!byName.has("Hidden")); // not exported
  });

  it("reads heritage clauses as subtype edges", () => {
    const cat = introspectDirectory(dir);
    assert.ok(cat.subtypes.some(([sub, sup]) => sub === "Dog" && sup === "Animal"));
  });

  it("reads exported functions as morphisms with domain and codomain", () => {
    const cat = introspectDirectory(dir);
    const feed = cat.functions.find((f) => f.name === "feed");
    assert.ok(feed);
    assert.deepEqual(feed.domain, ["Animal", "number"]);
    assert.equal(feed.codomain, "void");
  });

  it("reads an exported arrow const as a morphism", () => {
    const cat = introspectDirectory(dir);
    const adopt = cat.functions.find((f) => f.name === "adopt");
    assert.ok(adopt);
    assert.deepEqual(adopt.domain, []);
    assert.equal(adopt.codomain, "Dog");
  });
});

describe("introspectDeclarationsByFile", () => {
  it("returns a catalog per entry file, keyed by source path, for attribution", () => {
    const a = path.join(dir, "a.d.ts");
    const b = path.join(dir, "b.d.ts");
    writeFileSync(a, "export interface Apple { core: number; }\n", "utf8");
    writeFileSync(b, "export declare function pick(a: Apple): Apple;\n", "utf8");
    const byFile = introspectDeclarationsByFile([a, b]);
    const fileA = byFile.find((f) => f.file.endsWith("a.d.ts"));
    const fileB = byFile.find((f) => f.file.endsWith("b.d.ts"));
    assert.ok(fileA && fileB);
    assert.deepEqual(fileA.catalog.types.map((t) => t.name), ["Apple"]);
    assert.deepEqual(fileB.catalog.functions.map((f) => f.name), ["pick"]);
    assert.equal(fileA.catalog.functions.length, 0); // Apple's file declares no functions
  });
});
