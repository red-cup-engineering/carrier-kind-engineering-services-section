/**
 * agents — generate AGENTS.md content for a package.
 *
 * AGENTS.md is the tool-agnostic agent instruction file: it describes what
 * the package does, key symbols an agent should know before touching its
 * source, common operations, and the boundary the package must never cross.
 * `generateAgentsMd` is a pure function over the package manifest.
 */

export interface AgentsManifest {
  readonly name: string;
  readonly description?: string;
  readonly exports?: Readonly<Record<string, unknown>>;
  readonly dependencies?: Readonly<Record<string, string>>;
}

export function generateAgentsMd(manifest: AgentsManifest): string {
  const lines: string[] = [];

  lines.push(`# AGENTS — ${manifest.name}`, "");

  if (manifest.description) {
    lines.push(manifest.description, "");
  }

  lines.push("## Before touching this package", "");
  lines.push(
    "- Read `package.json` — the `description`, `exports`, and `dependencies` are the contract.",
    "- Run `pnpm run check` before any edit; `pnpm run verify` before committing.",
    "- Tests are theorem-shaped: the test name is a claim the test proves.",
    "",
  );

  const deps = Object.keys(manifest.dependencies ?? {});
  if (deps.length > 0) {
    lines.push("## Key dependencies", "");
    for (const dep of deps) {
      lines.push(`- \`${dep}\``);
    }
    lines.push("");
  }

  const exportsObj = manifest.exports ?? {};
  const subpaths = Object.keys(exportsObj).filter(
    (k) => k !== "./package.json",
  );
  if (subpaths.length > 0) {
    lines.push("## Public surface", "");
    for (const sp of subpaths) {
      const label = sp === "." ? manifest.name : `${manifest.name}${sp.slice(1)}`;
      lines.push(`- \`${label}\``);
    }
    lines.push("");
  }

  lines.push("## Invariants to preserve", "");
  lines.push(
    "- This package performs no I/O it was not handed (fetch, clock, fs all enter as values).",
    "- No runtime dependency may be added without a corresponding new export or documented rationale.",
    "- `sideEffects: false` — no module-level side effects.",
    "",
  );

  return lines.join("\n");
}
