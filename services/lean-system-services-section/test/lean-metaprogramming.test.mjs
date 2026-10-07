import assert from "node:assert/strict";
import test from "node:test";

import { renderLeanMetaprogrammingModule } from "../src/metaprogramming.mjs";

test("Lean metaprogramming renders typed declarations and reads the result through the module codec", () => {
  const rendered = renderLeanMetaprogrammingModule({
    kind: "metroplat.lean.metaprogramming-module-request",
    module: "Example.Generated",
    imports: ["Mathlib", "Mathlib"],
    namespace: "Example",
    declarations: [{
      kind: "theorem",
      name: "generatedTruth",
      signature: " : True",
      body: "by\n  trivial",
      attributes: ["simp"],
    }],
  });

  assert.equal(rendered.kind, "metroplat.lean.metaprogramming-module");
  assert.equal(rendered.path, "Example/Generated.lean");
  assert.match(rendered.text, /^import Mathlib\n\nnamespace Example/u);
  assert.match(rendered.text, /@\[simp\]\ntheorem generatedTruth : True := by\n  trivial/u);
  assert.match(rendered.text, /\nend Example\n$/u);
  assert.deepEqual(rendered.declarations, ["Example.generatedTruth"]);
  assert.equal(rendered.decodedModule.id, "Example.Generated");
});

test("Lean metaprogramming rejects names that are not Lean qualified names", () => {
  assert.throws(() => renderLeanMetaprogrammingModule({
    kind: "metroplat.lean.metaprogramming-module-request",
    module: "not/a/module",
    declarations: [],
  }), /expected a Lean qualified name/u);
});
