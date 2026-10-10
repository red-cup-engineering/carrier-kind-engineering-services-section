import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { encode } from "@red-cup-engineering/eavt-services-section";
import { readJsnodeOperationArguments } from "@red-cup-engineering/javascript-node-services-section/syntax";

// A real installed package and admitted contracts, built locally without a registry,
// mocked importer, or a product-specific package executor.
export function installedFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "shared-jsnode-execution-"));
  const operationsRoot = path.join(root, "installed");
  const packageName = "@fixture/shared-execution";
  const packageRoot = path.join(operationsRoot, "node_modules", packageName);
  mkdirSync(path.join(packageRoot, "scripts"), { recursive: true });
  writeFileSync(path.join(operationsRoot, "package.json"), JSON.stringify({ private: true, type: "module" }));
  writeFileSync(path.join(packageRoot, "package.json"), JSON.stringify({
    name: packageName, version: "1.0.0", type: "module", exports: "./scripts/double-value.mjs",
  }));
  const effectsPath = path.join(root, "effects.log");
  writeFileSync(effectsPath, "");
  const rows = [{ e: "package:fixture", a: "constituted", v: { name: packageName, version: "1.0.0" }, t: 0 }];
  for (const [name, isAsync, result] of [
    ["double-value", false, "value * 2"],
    ["async-double", true, "await Promise.resolve(value * 2)"],
    ["bad-result", false, '\"invalid-number\"'],
  ]) {
    const script = `scripts/${name}.mjs`;
    const source = `import { appendFileSync } from "node:fs";
/**
 * Execute the admitted numeric operation.
 * @param {number} value A number.
 * @returns {number} The computed number.
 */
export ${isAsync ? "async " : ""}function compute(value) {
  appendFileSync(${JSON.stringify(effectsPath)}, ${JSON.stringify(name + "\n")});
  return ${result};
}
`;
    writeFileSync(path.join(packageRoot, script), source);
    const contract = readJsnodeOperationArguments({ text: source, path: script });
    const fields = ["path", "exportName", "isAsync", "description", "params", "returns", "inputSchema", "outputSchema", "throws"];
    rows.push({ e: "package:fixture", a: "has-operation", v: Object.fromEntries(fields.map(field => [field, contract[field]])), t: rows.length });
  }
  const fernPath = path.join(root, "world.eavt");
  writeFileSync(fernPath, rows.map(encode).join("\n") + "\n");
  return { root, operationsRoot, fernPath, effects: () => readFileSync(effectsPath, "utf8").trim().split("\n").filter(Boolean) };
}
