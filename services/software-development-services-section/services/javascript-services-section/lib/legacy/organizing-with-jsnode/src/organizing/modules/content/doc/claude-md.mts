/**
 * claude-md — generate CLAUDE.md content for a package.
 *
 * CLAUDE.md is Claude Code-specific: it supplements the root CLAUDE.md with
 * per-package build/test commands, key invariants, and local context a
 * Claude session needs when working inside this package's directory.
 * `generateClaudeMd` is a pure function over the package manifest.
 */

export interface ClaudeManifest {
  readonly name: string;
  readonly description?: string;
  readonly scripts?: Readonly<Record<string, string>>;
  readonly exports?: Readonly<Record<string, unknown>>;
  readonly dependencies?: Readonly<Record<string, string>>;
}

export function generateClaudeMd(manifest: ClaudeManifest): string {
  const lines: string[] = [];

  lines.push(`# CLAUDE.md — ${manifest.name}`, "");
  lines.push(
    "This file supplements the root CLAUDE.md with package-specific context.",
    "",
  );

  if (manifest.description) {
    lines.push("## Package purpose", "");
    lines.push(manifest.description, "");
  }

  const scripts = manifest.scripts ?? {};
  const keyScripts = ["check", "build", "test", "verify"].filter(
    (s) => s in scripts,
  );
  if (keyScripts.length > 0) {
    lines.push("## Commands", "");
    lines.push(
      "Always scope pnpm to this package: `pnpm --filter <name> run <cmd>`",
      "",
    );
    for (const s of keyScripts) {
      lines.push(`- \`pnpm run ${s}\` — ${scripts[s] ?? ""}`);
    }
    lines.push("");
  }

  lines.push("## Invariants", "");
  lines.push(
    "- Tests are theorem-shaped: the test name is a falsifiable claim.",
    "- `sideEffects: false` — no module-level side effects.",
    "- All I/O (fetch, clock, fs) enters as values, never as ambient globals.",
    "",
  );

  return lines.join("\n");
}
