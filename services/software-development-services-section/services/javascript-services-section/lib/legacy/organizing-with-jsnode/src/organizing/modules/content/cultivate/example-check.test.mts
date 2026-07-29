import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { exampleTypeScriptGates } from "./example-check.mjs";
import type { PackageSurface } from "./surface.mjs";

const wsSurface: PackageSurface = Object.freeze({
  name: "@emsenn/relating",
  description: "test surface",
  dir: "<memory>",
  symbols: Object.freeze([
    Object.freeze({
      name: "WsFrame",
      kind: "type-alias",
      signature: "export type WsFrame = { fin: boolean; opcode: number; payload: Buffer; masked: boolean; tooLarge?: boolean; }",
      doc: "",
      file: "src/writing/http/ws/frame.mts",
      rank: 0,
    }),
    Object.freeze({
      name: "encodeFrame",
      kind: "function",
      signature: "export function encodeFrame(opcode: number, data: Buffer = Buffer.alloc(0), fin = true): Buffer",
      doc: "",
      file: "src/writing/http/ws/frame.mts",
      rank: 0,
    }),
  ]),
});

function charge(example: string): "pass" | "fail" {
  return exampleTypeScriptGates(wsSurface, example)[0]?.charge ?? "fail";
}

function evidence(example: string): string {
  return exampleTypeScriptGates(wsSurface, example)[0]?.evidence ?? "";
}

describe("exampleTypeScriptGates", () => {
  it("rejects a generated example that treats a type alias as a factory", () => {
    const example = [
      'import { WsFrame, encodeFrame } from "@emsenn/relating";',
      "const frame = WsFrame.create({ fin: true, opcode: 1, payload: Buffer.alloc(0), masked: false });",
      "const encoded = encodeFrame(frame);",
    ].join("\n");

    assert.equal(charge(example), "fail");
    assert.match(evidence(example), /only refers to a type/);
  });

  it("rejects a real function called with the wrong argument shape", () => {
    const example = [
      'import type { WsFrame } from "@emsenn/relating/writing/http/ws";',
      'import { encodeFrame } from "@emsenn/relating/writing/http/ws";',
      "const frame: WsFrame = { fin: true, opcode: 1, payload: Buffer.alloc(0), masked: false };",
      "const encoded = encodeFrame(frame);",
    ].join("\n");

    assert.equal(charge(example), "fail");
    assert.match(evidence(example), /not assignable to parameter of type 'number'/);
  });

  it("accepts the same example when the call matches the documented signature", () => {
    const example = [
      'import type { WsFrame } from "@emsenn/relating/writing/http/ws";',
      'import { encodeFrame } from "@emsenn/relating/writing/http/ws";',
      "const frame: WsFrame = { fin: true, opcode: 1, payload: Buffer.alloc(0), masked: false };",
      "const encoded = encodeFrame(frame.opcode, frame.payload, frame.fin);",
    ].join("\n");

    assert.equal(charge(example), "pass");
  });

  it("accepts package surfaces whose interface signatures are stubs", () => {
    const surface: PackageSurface = Object.freeze({
      name: "@emsenn/relating",
      description: "test surface",
      dir: "<memory>",
      symbols: Object.freeze([
        Object.freeze({
          name: "Action",
          kind: "interface",
          signature: "export interface Action",
          doc: "",
          file: "src/running/category.mts",
          rank: 0,
        }),
        Object.freeze({
          name: "isAction",
          kind: "function",
          signature: "export function isAction(value: unknown): value is Action",
          doc: "",
          file: "src/running/category.mts",
          rank: 0,
        }),
      ]),
    });

    const example = [
      'import { isAction } from "@emsenn/relating";',
      "const candidate: unknown = {};",
      "const ok = isAction(candidate);",
    ].join("\n");

    assert.equal(exampleTypeScriptGates(surface, example)[0]?.charge, "pass");
  });
});
