import tseslint from "typescript-eslint";

const scent = "warn";

export default tseslint.config({
  ignores: ["dist/**", ".tmp/**", "src/**/*.test.mts"],
}, {
  files: ["src/**/*.mts"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  plugins: {
    "@typescript-eslint": tseslint.plugin,
  },
  rules: {
    "no-restricted-imports": [scent, {
      paths: [{
        name: "./carrier-identity.mjs",
        message: "Ambient carrier identity is a mathematical smell. Compare, index, or reindex through the local morphisms of the carrier being worked in.",
      }],
    }],
    "no-restricted-syntax": [scent, {
      selector: "Program > VariableDeclaration > VariableDeclarator[id.name=/^[A-Z][A-Z0-9_]*$/]",
      message: "Module-scope ALL_CAPS constants are a mathematical smell. Prefer a carrier constructor, named morphism, or explicit reading boundary.",
    }, {
      selector: "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=/^[A-Z][A-Z0-9_]*$/]",
      message: "Exported ALL_CAPS constants are a mathematical smell. Prefer a carrier constructor, named morphism, or explicit reading boundary.",
    }, {
      selector: "BinaryExpression[operator='===']",
      message: "Raw identity is a mathematical smell. Use the local morphism, or isolate this as a runtime tag or serialization boundary.",
    }, {
      selector: "BinaryExpression[operator='!==']",
      message: "Raw non-identity is a mathematical smell. Use the local morphism, or isolate this as a runtime tag or serialization boundary.",
    }, {
      selector: "CallExpression[callee.object.name='Object'][callee.property.name='is']",
      message: "Object.is is ambient host identity. Use the equality morphism of the carrier being worked in.",
    }, {
      selector: "NewExpression[callee.name='Map'], NewExpression[callee.name='Set']",
      message: "Host Map/Set indexing is a mathematical smell. Use a finite carrier and its indexing, comparison, or reindexing morphism.",
    }, {
      selector: "TSStringKeyword",
      message: "Raw string is a mathematical smell. Use a Mark-derived carrier, or isolate this at a serialization boundary.",
    }, {
      selector: "TSBooleanKeyword",
      message: "Raw boolean is a mathematical smell. Use a paraconsistent carrier, or isolate this as runtime control flow.",
    }, {
      selector: "TSPropertySignature[key.name=/^(ok|holds|vanishes|selfDual|trivial|singular|degenerate|pisot|matches|agree|everySymmetric|negationFixed|zeroCohomologyRankMatchesKernel|firstCohomologyRankMatchesCokernel|shadowMatchesAbRank)$/][typeAnnotation.typeAnnotation.type='TSBooleanKeyword']",
      message: "A mathematical judgment field should not collapse to a host boolean. Carry the judgment as charge, obstruction, witness, or another typed carrier.",
    }, {
      selector: "TSNumberKeyword",
      message: "Raw number is a mathematical smell. Use Natural, Integer, Rational, Matrix, or isolate the value as a runtime boundary read.",
    }],
  },
});
