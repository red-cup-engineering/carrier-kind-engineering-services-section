/**
 * readme — generate README.md content from a package.json manifest.
 *
 * `generateReadme` is a pure function: it takes the subset of a package
 * manifest it needs and returns a markdown string. No I/O. The caller
 * decides whether to write the result to disk or print it.
 *
 * The generated skeleton follows the house style: an H1 of the package name,
 * the description paragraph, a Usage block for packages with a `bin`, a
 * Subpaths block listing named export subpaths, and a Dependencies block.
 * Services and sites that wire compute to transports get a note reminding
 * readers that I/O enters as values.
 */

export interface PackageManifest {
  readonly name: string;
  readonly description?: string;
  readonly exports?: Readonly<Record<string, unknown>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly bin?: Readonly<Record<string, string>> | string;
  readonly keywords?: readonly string[];
  readonly version?: string;
}

export function generateReadme(manifest: PackageManifest): string {
  const lines: string[] = [];

  lines.push(`# ${manifest.name}`, "");

  if (manifest.description) {
    lines.push(manifest.description, "");
  }

  // CLI packages: show binary name(s)
  const bins =
    typeof manifest.bin === "string"
      ? { [manifest.name]: manifest.bin }
      : (manifest.bin ?? {});

  const binNames = Object.keys(bins);
  if (binNames.length > 0) {
    lines.push("## Usage", "");
    lines.push("```sh");
    for (const cmd of binNames) {
      lines.push(`${cmd} --help`);
    }
    lines.push("```", "");
  }

  // Named export subpaths (excluding `.` and `./package.json`)
  const exportsObj = manifest.exports ?? {};
  const subpaths = Object.keys(exportsObj).filter(
    (k) => k !== "." && k !== "./package.json",
  );

  if (subpaths.length > 0) {
    lines.push("## Subpaths", "");
    for (const sp of subpaths) {
      lines.push(`- \`${manifest.name}${sp.slice(1)}\``);
    }
    lines.push("");
  }

  // Runtime dependencies
  const deps = Object.keys(manifest.dependencies ?? {});
  if (deps.length > 0) {
    lines.push("## Dependencies", "");
    for (const dep of deps) {
      lines.push(`- \`${dep}\``);
    }
    lines.push("");
  }

  return lines.join("\n");
}
