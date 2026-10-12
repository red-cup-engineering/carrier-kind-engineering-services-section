import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { normalizePackageForm } from "../src/integrations/filesystem/services/package-form/service.mts";

function write(root, relative, content) {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

test("package-form plans all references before atomically moving a carrier region", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-package-form-"));
  const from = "src/modules/tool";
  const to = "src/integrations/filesystem/tool";
  const immutable = JSON.stringify({ literal: from });
  try {
    write(root, "src/shared.mts", "export const shared = true;\n");
    write(root, `${from}/index.mts`, "export { nested } from './nested.mjs';\nexport { shared } from '../../shared.mjs';\n");
    write(root, `${from}/nested.mts`, "export { shared as nested } from '../../../shared.mjs';\n");
    write(root, "src/apps/consumer.mts", "import { nested } from '../modules/tool/index.mjs';\nvoid nested;\n");
    write(root, "package.json", `${JSON.stringify({ exports: { "./modules/tool": "./dist/src/modules/tool/index.mjs" } }, null, 2)}\n`);
    write(root, "data/journals/source.json", immutable);

    const planned = await normalizePackageForm({
      kind: "metroplat.jsnode.package-form.normalization-request",
      root,
      from,
      to,
      apply: false,
    });
    assert.equal(planned.carrierMove.status, "planned");
    assert.equal(existsSync(path.join(root, from)), true);
    assert.equal(existsSync(path.join(root, to)), false);
    assert.equal(planned.rewrites.some((rewrite) => rewrite.path === `${to}/index.mts`), true);
    assert.equal(readFileSync(path.join(root, `${from}/index.mts`), "utf8").includes("../../shared.mjs"), true);

    const applied = await normalizePackageForm({
      kind: "metroplat.jsnode.package-form.normalization-request",
      root,
      from,
      to,
      apply: true,
    });
    assert.equal(applied.carrierMove.status, "applied");
    assert.equal(existsSync(path.join(root, from)), false);
    assert.equal(existsSync(path.join(root, to)), true);
    assert.match(readFileSync(path.join(root, `${to}/index.mts`), "utf8"), /from '\.\.\/\.\.\/\.\.\/shared\.mjs'/u);
    assert.match(readFileSync(path.join(root, `${to}/nested.mts`), "utf8"), /from '\.\.\/\.\.\/\.\.\/\.\.\/shared\.mjs'/u);
    assert.match(readFileSync(path.join(root, "src/apps/consumer.mts"), "utf8"), /from '\.\.\/integrations\/filesystem\/tool\/index\.mjs'/u);
    assert.deepEqual(JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")), {
      exports: { "./integrations/filesystem/tool": "./dist/src/integrations/filesystem/tool/index.mjs" },
    });
    assert.equal(readFileSync(path.join(root, "data/journals/source.json"), "utf8"), immutable);

    const repeated = await normalizePackageForm({
      kind: "metroplat.jsnode.package-form.normalization-request",
      root,
      from,
      to,
      apply: true,
    });
    assert.equal(repeated.carrierMove.status, "already-moved");
    assert.equal(repeated.rewrites.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("package-form obstructs competing source and target carriers", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-package-form-conflict-"));
  try {
    write(root, "src/old/index.mts", "export {};\n");
    write(root, "src/new/index.mts", "export {};\n");
    await assert.rejects(
      normalizePackageForm({
        kind: "metroplat.jsnode.package-form.normalization-request",
        root,
        from: "src/old",
        to: "src/new",
        apply: true,
      }),
      /competing source and target carriers/u,
    );
    assert.equal(existsSync(path.join(root, "src/old/index.mts")), true);
    assert.equal(existsSync(path.join(root, "src/new/index.mts")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("package-form can preserve a public package face while relocating its carrier", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-package-form-public-face-"));
  const from = "src/lsp";
  const to = "src/integrations/lsp";
  try {
    write(root, `${from}/index.mts`, "export const source = '@emsenn/metroplat/lsp';\n");
    write(root, "src/consumer.mts", "import { source } from './lsp/index.mjs';\nvoid source;\n");
    write(root, "package.json", `${JSON.stringify({
      exports: { "./lsp": { import: "./dist/src/lsp/index.mjs" } },
    }, null, 2)}\n`);

    const applied = await normalizePackageForm({
      kind: "metroplat.jsnode.package-form.normalization-request",
      root,
      from,
      to,
      preservePublicSpecifier: true,
      apply: true,
    });

    assert.equal(applied.carrierMove.status, "applied");
    assert.match(readFileSync(path.join(root, `${to}/index.mts`), "utf8"), /@emsenn\/metroplat\/lsp/u);
    assert.match(readFileSync(path.join(root, "src/consumer.mts"), "utf8"), /\.\/integrations\/lsp\/index\.mjs/u);
    assert.deepEqual(JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")), {
      exports: { "./lsp": { import: "./dist/src/integrations/lsp/index.mjs" } },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
