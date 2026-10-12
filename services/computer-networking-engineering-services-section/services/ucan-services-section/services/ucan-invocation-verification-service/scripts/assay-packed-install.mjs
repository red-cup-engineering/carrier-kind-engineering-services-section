import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assayRoot = mkdtempSync(join(tmpdir(), "ucan-invocation-verification-packed-install-"));
const packRoot = join(assayRoot, "pack");
const consumerRoot = join(assayRoot, "consumer");
const npm = (args, options = {}) => execFileSync(process.execPath, [process.env.npm_execpath, ...args], options);

try {
  mkdirSync(packRoot);
  mkdirSync(consumerRoot);
  const [packed] = JSON.parse(npm(["pack", "--json", "--ignore-scripts", "--pack-destination", packRoot], { cwd: root, encoding: "utf8" }));
  writeFileSync(join(consumerRoot, "package.json"), JSON.stringify({ name: "ucan-provider-packed-install-assay", private: true, type: "module" }));
  npm(["install", "--ignore-scripts", "--registry", "http://127.0.0.1:4873", join(packRoot, packed.filename)], { cwd: consumerRoot, stdio: "inherit" });
  writeFileSync(join(consumerRoot, "assay.mjs"), `import { verifyUcanInvocation } from "@red-cup-engineering/ucan-invocation-verification-service"; if (typeof verifyUcanInvocation !== "function") throw new TypeError("provider export missing");`);
  execFileSync(process.execPath, [join(consumerRoot, "assay.mjs")], { cwd: consumerRoot, stdio: "inherit" });
  process.stdout.write(`${JSON.stringify({ kind: "PackedInstallAssayReceipt", package: "@red-cup-engineering/ucan-invocation-verification-service", status: "passed" })}\n`);
} finally {
  rmSync(assayRoot, { recursive: true, force: true });
}
