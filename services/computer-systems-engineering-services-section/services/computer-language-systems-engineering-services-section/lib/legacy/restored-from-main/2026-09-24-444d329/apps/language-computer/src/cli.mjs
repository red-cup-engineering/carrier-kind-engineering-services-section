#!/usr/bin/env node
// cli.ts — the language-computer command line: one entry per layer reading.
import { read, settle, similarity, check } from "./index.mjs";

function usage() {
  process.stdout.write(
    [
      "language-computer — the app form over the language-* layers",
      "",
      "usage:",
      "  language-computer read     <text>     full layered reading (parse, roles, grammar, H¹)",
      "  language-computer parse    <text>     settled words and dependency arcs",
      "  language-computer roles    <text>     semantic role frames",
      "  language-computer grammar  <text>     grammaticality verdict",
      "  language-computer cohomology <text>   gluing obstruction (H⁰/H¹)",
      "  language-computer similar  <a> <b>    ontology similarity in [0,1] or void",
      "  language-computer lint     <text>     prose conformance verdict",
      "",
    ].join("\n"),
  );
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const text = rest.join(" ");
  switch (cmd) {
    case "read": {
      const r = read(text);
      process.stdout.write(JSON.stringify({
        text: r.text,
        words: r.parse.words.map((w) => ({ text: w.text, tags: w.tags, roles: w.roles })),
        arcs: r.parse.arcs.map((a) => ({ rel: a.rel, head: a.headText, dep: a.depText })),
        roles: r.roles,
        grammaticality: r.grammaticality,
        cohomology: { glued: r.cohomology.glued, h0: r.cohomology.h0, h1: r.cohomology.h1 },
      }, null, 2) + "\n");
      return 0;
    }
    case "parse": {
      const p = settle(text);
      process.stdout.write(JSON.stringify({
        words: p.words.map((w) => ({ text: w.text, tags: w.tags, feats: w.feats })),
        arcs: p.arcs.map((a) => ({ rel: a.rel, head: a.headText, dep: a.depText })),
      }, null, 2) + "\n");
      return 0;
    }
    case "roles":
      process.stdout.write(JSON.stringify(read(text).roles, null, 2) + "\n");
      return 0;
    case "grammar":
      process.stdout.write(JSON.stringify(read(text).grammaticality, null, 2) + "\n");
      return 0;
    case "cohomology": {
      const c = read(text).cohomology;
      process.stdout.write(JSON.stringify({ glued: c.glued, h0: c.h0, h1: c.h1, obstructions: c.obstructions }, null, 2) + "\n");
      return 0;
    }
    case "similar": {
      const [a, b] = rest;
      if (a === undefined || b === undefined) { usage(); return 2; }
      process.stdout.write(JSON.stringify({ a, b, similarity: similarity(a, b) }, null, 2) + "\n");
      return 0;
    }
    case "lint": {
      const v = check(text);
      process.stdout.write(JSON.stringify({ pass: v.pass, diagnostics: v.diagnostics }, null, 2) + "\n");
      return v.pass ? 0 : 1;
    }
    default:
      usage();
      return cmd === undefined ? 0 : 2;
  }
}

process.exit(main(process.argv.slice(2)));
