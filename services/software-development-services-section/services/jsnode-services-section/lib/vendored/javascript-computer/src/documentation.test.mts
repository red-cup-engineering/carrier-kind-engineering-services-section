import { test } from "node:test";
import assert from "node:assert/strict";

import { extractDocSurface } from "./documentation.mjs";

const FIXTURE = `
/**
 * Adds two numbers together.
 * @param a the first addend
 */
export function add(a: number, b: number): number { return a + b; }

/** Doubles a value. */
export const double = (x: number): number => x * 2;

const internal = 1;

export interface Point extends Base { readonly x: number; }

export type Vec = readonly number[];

/**
 * A frozen counter.
 */
export class Counter extends Base implements Tick { count = 0; }

export const TABLE = { a: 1 } as const;
`;

test("extractDocSurface captures the JSDoc of an export function", () => {
  const surface = extractDocSurface("fixture.mts", FIXTURE);
  const add = surface.find((s) => s.name === "add");
  assert.equal(add?.kind, "function");
  assert.equal(add?.doc, "Adds two numbers together.");
  assert.equal(add?.signature, "export function add(a: number, b: number): number");
});

test("extractDocSurface reads JSDoc off the statement for an arrow const", () => {
  const surface = extractDocSurface("fixture.mts", FIXTURE);
  const double = surface.find((s) => s.name === "double");
  assert.equal(double?.kind, "const");
  assert.equal(double?.doc, "Doubles a value.");
  assert.match(double?.signature ?? "", /^export const double = \(x: number\): number =>/);
});

test("extractDocSurface skips non-exported declarations", () => {
  const surface = extractDocSurface("fixture.mts", FIXTURE);
  assert.equal(surface.find((s) => s.name === "internal"), undefined);
});

test("extractDocSurface keeps heritage on a class head and elides the body", () => {
  const surface = extractDocSurface("fixture.mts", FIXTURE);
  const counter = surface.find((s) => s.name === "Counter");
  assert.equal(counter?.kind, "class");
  assert.equal(counter?.doc, "A frozen counter.");
  assert.equal(counter?.signature, "export class Counter extends Base implements Tick");
  assert.match(surface.find((s) => s.name === "Point")?.signature ?? "", /interface Point extends Base/);
});

test("extractDocSurface classifies a plain value export as a variable, not a const arrow", () => {
  const surface = extractDocSurface("fixture.mts", FIXTURE);
  const table = surface.find((s) => s.name === "TABLE");
  assert.equal(table?.kind, "variable");
});

test("extractDocSurface records an empty doc for an undocumented export", () => {
  const surface = extractDocSurface("fixture.mts", FIXTURE);
  assert.equal(surface.find((s) => s.name === "Vec")?.doc, "");
});
