// Package normalization constructors. These create package skeletons from a
// layer/name pair; they are library operations, not a standalone CLI.

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { type ConformanceLayer } from "./layer.mjs";

export type PackageScaffoldResult = Readonly<{
  packageDir: string;
  written: readonly string[];
}>;

function manifestFor(layer: ConformanceLayer, name: string): string {
  const scripts: Record<string, string> = {
    clean: "rm -rf dist .tmp/test-dist",
    check: "tsc --noEmit",
    build: "tsc -p tsconfig.build.json",
    test: "pnpm run build && pnpm run test:built",
    "test:built": "tsc -p tsconfig.test.json && node --test --test-reporter=spec \".tmp/test-dist/**/*.test.mjs\"",
    verify: "pnpm run check && pnpm run build && pnpm run test:built",
    rebuild: "pnpm run clean && pnpm run build",
  };
  if (layer === "apps") scripts["build"] = "tsc -p tsconfig.build.json && chmod +x dist/cli.mjs";

  const base: Record<string, unknown> = {
    name: `@emsenn/${name}`,
    version: "0.0.1",
    private: true,
    type: "module",
    description: "TODO: one sentence - what this package is.",
    engines: { node: ">=22.18" },
    scripts,
    main: "./dist/index.mjs",
    types: "./dist/index.d.mts",
    files: ["dist", "package.json"],
    exports: {
      ".": {
        types: "./dist/index.d.mts",
        import: "./dist/index.mjs",
      },
      "./package.json": "./package.json",
    },
    devDependencies: { "@types/node": "^22.0.0", typescript: "^5.8.0" },
    sideEffects: false,
  };
  if (layer === "apps") base["bin"] = { [name]: "./dist/cli.mjs" };
  return `${JSON.stringify(base, null, 2)}\n`;
}

const TSCONFIG = `{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.mts"]
}
`;

const TSCONFIG_BUILD = `{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.mts"],
  "exclude": ["src/**/*.test.mts"]
}
`;

const TSCONFIG_TEST = `{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": false,
    "sourceMap": true,
    "rootDir": "src",
    "outDir": ".tmp/test-dist"
  },
  "include": ["src/**/*.mts"]
}
`;

function camel(name: string): string {
  return name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
}

function pascal(name: string): string {
  const c = camel(name);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function indexFor(name: string): string {
  const kind = name.replace(/[^a-z0-9-]/g, "");
  return `// @emsenn/${name}

export type ${pascal(name)}Carrier = Readonly<{
  kind: "${kind}";
}>;

export function ${camel(name)}(): ${pascal(name)}Carrier {
  return Object.freeze({ kind: "${kind}" });
}
`;
}

function testFor(name: string): string {
  return `import test from "node:test";
import assert from "node:assert/strict";

import { ${camel(name)} } from "./index.mjs";

test("${name} carrier is frozen and kind-conformant", () => {
  const carrier = ${camel(name)}();
  assert.equal(Object.isFrozen(carrier), true);
  assert.match(carrier.kind, /^[a-z0-9]+([.:-][a-z0-9]+)*$/);
});
`;
}

function cliFor(name: string): string {
  return `#!/usr/bin/env node
import { ${camel(name)} } from "./index.mjs";

console.log(JSON.stringify(${camel(name)}()));
`;
}

function readmeFor(name: string): string {
  return `# @emsenn/${name}

TODO: one sentence - what this package is.

Contract:
- Source lives under \`src/\`.
- Runtime and type boundaries are built into \`dist/\`.
- Package exports point at \`dist/*.mjs\` and \`dist/*.d.mts\`.
- Tests run from emitted ESM under \`.tmp/test-dist/\`.
- The package is private until its public contract is deliberately settled.
- Downstream packages should import the exported package surface, not source files.
- Replace this scaffold text when the package has a domain-specific contract.
`;
}

export async function scaffoldPackage(repoRoot: string, layer: ConformanceLayer, name: string): Promise<PackageScaffoldResult> {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new TypeError(`package name must be lower-kebab-case, got ${name}`);
  const dir = path.join(repoRoot, layer, name);
  if (existsSync(dir)) throw new TypeError(`${dir} already exists; scaffolding is append-only`);
  const files: Array<readonly [string, string]> = [
    ["package.json", manifestFor(layer, name)],
    ["README.md", readmeFor(name)],
    ["tsconfig.json", TSCONFIG],
    ["tsconfig.build.json", TSCONFIG_BUILD],
    ["tsconfig.test.json", TSCONFIG_TEST],
    ["src/index.mts", indexFor(name)],
    ["src/index.test.mts", testFor(name)],
  ];
  if (layer === "apps") files.push(["src/cli.mts", cliFor(name)]);
  const written: string[] = [];
  await mkdir(path.join(dir, "src"), { recursive: true });
  for (const [rel, content] of files) {
    const target = path.join(dir, rel);
    await writeFile(target, content, { flag: "wx" });
    written.push(target);
  }
  return Object.freeze({ packageDir: dir, written: Object.freeze(written) });
}

export const scaffold = scaffoldPackage;
