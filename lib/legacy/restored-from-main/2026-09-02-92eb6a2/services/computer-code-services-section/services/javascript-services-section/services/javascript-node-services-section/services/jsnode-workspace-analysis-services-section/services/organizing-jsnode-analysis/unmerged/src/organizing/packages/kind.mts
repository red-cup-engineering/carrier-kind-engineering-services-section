import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export type PackageKind = "jsnode" | "content-records" | "emacs-app" | "site-scaffold";

type Manifest = Readonly<Record<string, unknown>>;

function packageHasTopLevelMarkdown(dir: string): boolean {
  return readdirSync(dir, { withFileTypes: true }).some((entry) =>
    entry.isFile() && entry.name.endsWith(".md"),
  );
}

function packageReadmeText(dir: string): string {
  const p = path.join(dir, "README.md");
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf8");
}

export function detectPackageKind(dir: string, manifest: Manifest): PackageKind {
  const srcDir = path.join(dir, "src");
  const scripts = (manifest["scripts"] ?? {}) as Readonly<Record<string, unknown>>;
  const description = typeof manifest["description"] === "string" ? manifest["description"] : "";
  const readmeText = packageReadmeText(dir);
  const hasImplementedJsBoundary =
    existsSync(srcDir) ||
    typeof manifest["exports"] === "object" ||
    typeof manifest["main"] === "string" ||
    typeof manifest["types"] === "string" ||
    typeof manifest["bin"] === "object";

  if (!hasImplementedJsBoundary && /\b(scaffolded|planned|not yet wired|not wired|placeholder)\b/i.test(`${description}\n${readmeText}`)) {
    return "site-scaffold";
  }

  const hasEmacsBoundary =
    existsSync(path.join(dir, "lisp")) ||
    existsSync(path.join(dir, "init.el")) ||
    existsSync(path.join(dir, "early-init.el")) ||
    Object.values(scripts).some((script) => typeof script === "string" && /\bemacs\b/.test(script));

  if (hasEmacsBoundary) return "emacs-app";

  const hasJsBoundary =
    hasImplementedJsBoundary ||
    ["check", "test", "verify"].some((script) => typeof scripts[script] === "string");

  if (hasJsBoundary) return "jsnode";

  const hasContentEvidence =
    packageHasTopLevelMarkdown(dir) ||
    existsSync(path.join(dir, "docs")) ||
    existsSync(path.join(dir, "working")) ||
    existsSync(path.join(dir, "chartering")) ||
    /\b(content|markdown|frontmatter|prose|records?)\b/i.test(description);

  return hasContentEvidence ? "content-records" : "jsnode";
}
