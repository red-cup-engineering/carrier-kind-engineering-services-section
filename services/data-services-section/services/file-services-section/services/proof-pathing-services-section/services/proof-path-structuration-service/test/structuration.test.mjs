import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  astOfRoute,
  catalogProofPaths,
  chartProofPathCatalog,
  checkProofPathAst,
  envelopeProofCoordinate,
  parseProofPath,
  proofPathOfCoordinate,
  renderProofPathAst,
  routeOf,
  sanitizeSegment,
  settleProofCoordinate,
  structureSemioticAtom,
  termKey,
  witnessesOfCells,
} from "../src/index.mts";

test("PPA-C001: one evidence carrier structures an atom and every result preserves it", () => {
  const atom = { id: "room", polarity: "proponent", parentIds: ["foundation"] };
  const context = [{ subject: atom, predicate: "is-a", object: "semiotic-atom" }];
  const success = structureSemioticAtom({ atom, root: "semiotic-atom", context });
  assert.equal(success.ok, true);
  assert.strictEqual(success.atom, atom);

  for (const result of [
    structureSemioticAtom({ atom, root: "semiotic-atom" }),
    structureSemioticAtom({ atom, root: "semiotic-atom", context, witnesses: [] }),
  ]) {
    assert.equal(result.ok, false);
    assert.equal(result.reason, "ambiguous-evidence");
    assert.strictEqual(result.atom, atom);
  }
});

test("PPA-C002: structural keys are canonical and only finite JSON terms address", () => {
  assert.equal(termKey({ b: 2, a: 1 }), termKey({ a: 1, b: 2 }));
  assert.notEqual(termKey('{"a":1}'), termKey({ a: 1 }));

  const cyclic = {};
  cyclic.self = cyclic;
  for (const atom of [undefined, Number.POSITIVE_INFINITY, cyclic, new Date(0), [, "hole"]]) {
    const result = structureSemioticAtom({ atom, root: "root", witnesses: [] });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "unaddressable-term");
  }
});

test("PPA-C003: specialization context yields the exact relative POSIX filepath AST", () => {
  const result = structureSemioticAtom({
    atom: "room",
    root: "category",
    context: [
      { subject: "room", predicate: "is-a", object: "paracosm" },
      { subject: "paracosm", predicate: "is-a", object: "category" },
    ],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.ast, {
    type: "posix-filepath",
    absolute: false,
    root: { type: "term-segment", role: "root", key: "s:category", segment: "s~3acategory" },
    steps: [
      {
        type: "proof-step",
        generator: "specialization",
        namespace: "library",
        node: { type: "term-segment", role: "codomain", key: "s:paracosm", segment: "s~3aparacosm" },
      },
      {
        type: "proof-step",
        generator: "specialization",
        namespace: "library",
        node: { type: "term-segment", role: "codomain", key: "s:room", segment: "s~3aroom" },
      },
    ],
  });
  assert.equal(renderProofPathAst(result.ast), "s~3acategory/specialization/library/s~3aparacosm/specialization/library/s~3aroom");
});

test("PPA-C004: each generator is checkable and changing one makes the path unearned", () => {
  const witnesses = [
    { domain: "root", generator: "specialization", codomain: "a" },
    { domain: "a", generator: "converse", codomain: "b" },
    { domain: "b", generator: "subject-projection", codomain: "c" },
    { domain: "c", generator: "object-projection", codomain: "target" },
  ];
  const route = routeOf(witnesses, "root", "target");
  assert.ok(route);
  const ast = astOfRoute(route);
  assert.equal(checkProofPathAst(ast, witnesses), true);
  const altered = structuredClone(ast);
  altered.steps[1].generator = "specialization";
  assert.equal(checkProofPathAst(altered, witnesses), false);
});

test("PPA-C005: evidence order cannot change the canonical shortest route", () => {
  const witnesses = [
    { domain: "root", generator: "specialization", codomain: "b" },
    { domain: "b", generator: "specialization", codomain: "target" },
    { domain: "root", generator: "specialization", codomain: "a" },
    { domain: "a", generator: "specialization", codomain: "target" },
  ];
  const forward = structureSemioticAtom({ atom: "target", root: "root", witnesses });
  const reverse = structureSemioticAtom({ atom: "target", root: "root", witnesses: [...witnesses].reverse() });
  assert.equal(forward.ok, true);
  assert.equal(reverse.ok, true);
  assert.equal(renderProofPathAst(forward.ast), renderProofPathAst(reverse.ast));
  assert.match(renderProofPathAst(forward.ast), /s~3aa/u);
});

test("PPA-C006: canonical paths round-trip and hostile forms refuse", () => {
  const atom = "../../etc/passwd";
  const result = structureSemioticAtom({
    atom,
    root: "root",
    witnesses: [{ domain: "root", generator: "specialization", codomain: atom }],
  });
  assert.equal(result.ok, true);
  const path = renderProofPathAst(result.ast);
  assert.ok(!path.includes("/../"));
  const parsed = parseProofPath(path);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.ast, result.ast);

  for (const hostile of [
    `/${path}`,
    `${path}/`,
    "s~3aroot/specialization/library/../escape",
    "s~3aroot/specialization/library/s~3Atarget",
    "~73~3aroot/specialization/library/s~3atarget",
    "s~3aroot/not-a-generator/library/s~3atarget",
  ]) assert.equal(parseProofPath(hostile).ok, false, hostile);

  assert.equal(sanitizeSegment("."), "~2e");
  assert.equal(sanitizeSegment(".."), "~2e~2e");
});

test("PPA-C007: unreachable atoms return a typed refusal and no invented path", () => {
  const result = structureSemioticAtom({
    atom: "target",
    root: "root",
    witnesses: [{ domain: "elsewhere", generator: "specialization", codomain: "target" }],
  });
  assert.deepEqual(result, {
    ok: false,
    atom: "target",
    reason: "unearned-path",
    diagnostics: { witnessCount: 1, stepCount: 0 },
  });
  assert.equal("ast" in result, false);
});

test("PPA-C008: the leaf has no runtime dependency or effectful source import", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const source = readFileSync(join(root, "src/index.mts"), "utf8");
  assert.equal(manifest.dependencies, undefined);
  assert.doesNotMatch(source, /from\s+["'](?:node:fs|node:child_process|typescript|npm|pacote)/u);
  assert.doesNotMatch(source, /readFile|writeFile|readdir|fetch\s*\(/u);
});

test("relational cells recover converse and projection evidence without changing atom admission authority", () => {
  const relation = { subject: "socrates", predicate: "teaches", object: "plato" };
  const witnesses = witnessesOfCells([relation]);
  assert.deepEqual(witnesses.map(({ generator }) => generator).sort(), [
    "converse",
    "object-projection",
    "subject-projection",
  ]);
  const result = structureSemioticAtom({ atom: "plato", root: relation, context: [relation] });
  assert.equal(result.ok, true);
  assert.equal(result.ast.steps[0].generator, "object-projection");
});

test("catalogs and charts are deterministic projections of earned proof paths", () => {
  const requests = [
    { atom: "target", root: "root", witnesses: [{ domain: "root", generator: "specialization", codomain: "target" }] },
    { atom: "orphan", root: "root", witnesses: [] },
    { atom: "second", root: "root", witnesses: [{ domain: "root", generator: "converse", codomain: "second" }] },
  ];
  const catalog = catalogProofPaths([...requests].reverse());
  assert.deepEqual(catalog.entries.map(({ address }) => address), [
    "s~3aroot/converse/library/s~3asecond",
    "s~3aroot/specialization/library/s~3atarget",
  ]);
  assert.equal(catalog.refusals.length, 1);
  assert.equal(catalog.refusals[0].reason, "unearned-path");

  const chart = chartProofPathCatalog(catalog);
  assert.deepEqual(chart.nodes.map(({ key }) => key), ["s:second", "s:target", "s:root"]);
  assert.deepEqual(chart.edges.map(({ generator }) => generator), ["converse", "specialization"]);
  assert.equal(chart.edges.every(({ from, to }) => chart.nodes.includes(from) && chart.nodes.includes(to)), true);
});

test("RMN-C001: settled proof coordinates are canonical semantic material, with POSIX only a projection", () => {
  const witnesses = [
    { domain: "root", generator: "specialization", codomain: "middle" },
    { domain: "middle", generator: "object-projection", codomain: "target" },
  ];
  const settled = settleProofCoordinate({ resourceType: "semiotic-atom", root: "root", target: "target", witnesses });
  assert.equal(settled.ok, true);
  const reordered = settleProofCoordinate({ resourceType: "semiotic-atom", root: "root", target: "target", witnesses: [...witnesses].reverse() });
  assert.equal(reordered.ok, true);
  assert.deepEqual(settled.coordinate, reordered.coordinate);
  assert.equal(renderProofPathAst(proofPathOfCoordinate(settled.coordinate)).includes("specialization/library"), true);
});

test("RMN-C002: malformed, incomplete, and unearned coordinates refuse without a path", () => {
  assert.deepEqual(
    settleProofCoordinate({ resourceType: "semiotic-atom", root: "root", target: "target", witnesses: [] }),
    { ok: false, reason: "unearned-coordinate" },
  );
  assert.deepEqual(
    settleProofCoordinate({ resourceType: "", root: "root", target: "target", witnesses: [] }),
    { ok: false, reason: "invalid-resource-type" },
  );
});

test("RMN-C003: cryptographic witnesses are ordered carriers, never coordinate substitutes", () => {
  const settled = settleProofCoordinate({
    resourceType: "semiotic-atom",
    root: "root",
    target: "target",
    witnesses: [{ domain: "root", generator: "specialization", codomain: "target" }],
  });
  assert.equal(settled.ok, true);
  const envelope = envelopeProofCoordinate(settled.coordinate, [
    { type: "signature", algorithm: "ed25519", value: "sig" },
    { type: "commitment", algorithm: "sha-256", value: "digest" },
  ]);
  assert.strictEqual(envelope.coordinate, settled.coordinate);
  assert.deepEqual(envelope.witnesses.map(({ type }) => type), ["signature", "commitment"]);
  assert.throws(() => envelopeProofCoordinate(settled.coordinate, [{ type: "commitment", algorithm: "", value: "digest" }]));
});
