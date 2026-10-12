import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { applyLspTextEdits } from "@red-cup-engineering/computer-networking-engineering-services-section/lsp/text.domain";
import { LSP_METHODS } from "@red-cup-engineering/computer-networking-engineering-services-section/lsp/codec";
import { projectLsp } from "@red-cup-engineering/metroplat/lsp/bind";

const packageRoot = path.resolve(import.meta.dirname, "..");

test("the LSP public face composes Markdown language behavior and text algebra", () => {
  const uri = "file:///notes/example.md";
  const text = "# Example\n\nSee [MetroPlat](https://example.test/metroplat).\n";
  const lsp = projectLsp({ markdownDocuments: [{ uri, text }] });

  assert.deepEqual(lsp.documentSymbol({ textDocument: { uri } }).map((symbol) => symbol.name), ["Example"]);
  assert.deepEqual(lsp.documentLink({ textDocument: { uri } }).map((link) => link.target), [
    "https://example.test/metroplat",
  ]);

  const response = lsp.handle({
    jsonrpc: "2.0",
    id: 1,
    method: LSP_METHODS.documentSymbol,
    params: { textDocument: { uri } },
  });
  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, 1);
  assert.deepEqual(response.result.map((symbol) => symbol.name), ["Example"]);

  assert.deepEqual(applyLspTextEdits("alpha\nbeta\n", [{
    range: {
      start: { line: 1, character: 0 },
      end: { line: 1, character: 4 },
    },
    newText: "B",
  }]), {
    kind: "metroplat.lsp.text-edit-application",
    edits: 1,
    changed: true,
    beforeBytes: 11,
    afterBytes: 8,
    text: "alpha\nB\n",
  });
});

