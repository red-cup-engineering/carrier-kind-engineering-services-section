/**
 * @packageDocumentation
 * addressing/legibility - path-only material classification law.
 *
 * A file's SUBSTANCE kind is read off structural facts about its path
 * alone: the artifact tier grammar this stratum already owns
 * (the former witness-tier `pathSegment`), the legacy `.identities` sidecar mark, a caller-supplied
 * codec-admissible extension reading, and a small fixed set of host-tooling
 * marks. No file content is read — this is a boundary parse over a path string
 * and an already-parsed extension, never a judgement about what a file means.
 *
 * @metroplatSubject addressing
 */
import { artifactTiers } from "@red-cup-engineering/eavt/statement";

/** The finite legibility vocabulary. `carried:${family}` is open on the
 *  family name a caller's codec-admissible reading supplies. */

const TIER_SEGMENT_PATTERNS = new Map(
  artifactTiers.map((tier) => [tier.name, new RegExp(`(^|/)${tier.pathSegment}/`, "u")]),
);

const HOST_TOOLING_DIRECTORY_SEGMENTS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".pnpm-store",
  ".claude",
  ".codex",
  ".claude.bk",
  ".codex.bk",
]);
const HOST_TOOLING_PROCEDURE_DIRECTORY_SEGMENTS = new Set([
  "deploy",
  "hooks",
  "scripts",
  "test",
  "tests",
]);
const HOST_TOOLING_BASENAMES = new Set([
  "package.json", "package-lock.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "yarn.lock",
  ".gitignore", ".gitmodules", ".gitattributes", ".npmrc",
  ".nvmrc", ".python-version", ".dockerignore", ".gitkeep",
  "Cargo.lock", "Dockerfile", "Makefile", "flake.lock", "flake.nix", "lean-toolchain", "tmux.conf", "uv.lock",
  ".dish.log", ".dish.pid",
]);
const LICENSE_BASENAMES = new Set(["LICENSE", "LICENSE.md", "LICENSE.txt"]);

function isLeanToolchainBasename(basename) {
  return /^lean-toolchain(?:_\d+)?$/u.test(basename);
}

/** `.ts`/`.mts`/`.cts`/`.tsx` are admitted through monitoring/source-code's
 *  own TypeScript AST read, not a src/codecs recognizer — so this family is
 *  fixed here rather than supplied by the caller's codec reading. */
const TYPESCRIPT_SOURCE_EXTENSIONS = new Set(["ts", "mts", "cts", "tsx"]);
/** `.js`/`.mjs`/`.cjs`/`.jsx` are source marks too; host procedure directories
 *  are classified before this, so scripts and hooks stay host tooling. */
const JAVASCRIPT_SOURCE_EXTENSIONS = new Set(["js", "mjs", "cjs", "jsx"]);
/** `.fnl` is Fennel source carried in archived corpus/source trees. */
const FENNEL_SOURCE_EXTENSIONS = new Set(["fnl"]);
/** `.rkt` is Racket source carried in archived corpus/source trees. */
const RACKET_SOURCE_EXTENSIONS = new Set(["rkt"]);
/** `.scrbl` is Scribble documentation source carried with Racket projects. */
const SCRIBBLE_SOURCE_EXTENSIONS = new Set(["scrbl"]);
/** `.org` is Org-mode document source carried in archive/source trees. */
const ORG_DOCUMENT_EXTENSIONS = new Set(["org"]);
/** `.ink` is Ink interactive-fiction source carried in text/game trees. */
const INK_SOURCE_EXTENSIONS = new Set(["ink"]);
/** `.pan` is Pandoc-style manuscript/document source in archived text trees. */
const PANDOC_DOCUMENT_EXTENSIONS = new Set(["pan"]);
/** `.inc` carries include/setup source in archived document trees. */
const INCLUDE_SOURCE_EXTENSIONS = new Set(["inc"]);
/** `.el` is Emacs Lisp source carried in archive/source trees. */
const EMACS_LISP_SOURCE_EXTENSIONS = new Set(["el"]);
/** `.py` is Python source carried in tools, archives, and corpus source trees. */
const PYTHON_SOURCE_EXTENSIONS = new Set(["py"]);
/** `.rs` is Rust source carried in archive/source trees. */
const RUST_SOURCE_EXTENSIONS = new Set(["rs"]);
/** `.sh` is shell source carried in scripts and archived projects. */
const SHELL_SOURCE_EXTENSIONS = new Set(["sh"]);
/** `.ps1` is PowerShell source carried in scripts and archived projects. */
const POWERSHELL_SOURCE_EXTENSIONS = new Set(["ps1"]);
/** `.dot` is Graphviz/DOT graph source. */
const DOT_SOURCE_EXTENSIONS = new Set(["dot"]);
/** `.lua` is Lua source carried in tooling and archived projects. */
const LUA_SOURCE_EXTENSIONS = new Set(["lua"]);
/** Structured data/document extensions that are carried material. */
const STRUCTURED_DATA_EXTENSIONS = new Set(["jsonld", "tsv"]);
/** Raster media extensions mark carried image assets; content bytes may be Git LFS pointers. */
const IMAGE_ASSET_EXTENSIONS = new Set(["png", "jpg", "jpeg"]);
/** `.xcf` marks a carried GIMP image project asset. */
const IMAGE_PROJECT_EXTENSIONS = new Set(["xcf"]);
/** `.dep` files are generated dependency metadata, commonly under compiled output. */
const DEPENDENCY_METADATA_EXTENSIONS = new Set(["dep"]);
/** Generated document/runtime byproducts that should not shroud authored material. */
const GENERATED_ARTIFACT_EXTENSIONS = new Set(["aux", "exitcode", "log", "metrics", "out", "paux", "toc", "zo"]);
/** Host configuration extensions outside plate tiers. */
const HOST_CONFIGURATION_EXTENSIONS = new Set(["cfg"]);

function isEnvironmentBasename(basename) {
  return basename === ".env" || basename.startsWith(".env.");
}

function isEditorBackupBasename(basename) {
  return basename.endsWith("~") || /~.*\.tmp$/iu.test(basename);
}

function isHostToolingProcedurePath(segments) {
  if (HOST_TOOLING_PROCEDURE_DIRECTORY_SEGMENTS.has(segments[0] ?? "")) return true;
  if (segments[0] === "dev" && segments[1] === "scripts") return true;
  if (segments.includes("deploy")) return true;
  return segments.some((segment, index) =>
    segment === "skills" && (segments[index + 1] === "scripts" || segments[index + 2] === "scripts"));
}

function isHostToolingPath(segments, basename) {
  return segments.some((segment) => HOST_TOOLING_DIRECTORY_SEGMENTS.has(segment))
    || isHostToolingProcedurePath(segments)
    || HOST_TOOLING_BASENAMES.has(basename)
    || isEnvironmentBasename(basename)
    || isEditorBackupBasename(basename);
}

/** Classify one conurbation-relative POSIX path (with its already-parsed,
 *  lowercase extension) into the legibility vocabulary. `codecAdmissibleExtensions`
 *  is the caller's reading of which extensions src/codecs currently admits
 *  (extension -> codec family name); this law owns only the tier grammar,
 *  the sidecar mark, and the host-tooling/typescript-source fixed points. */
export function classifyLegibility(
  relativePath,
  extension,
  codecAdmissibleExtensions,
) {
  if (extension === "identities") return "plate:sidecar";

  for (const tier of artifactTiers) {
    if (TIER_SEGMENT_PATTERNS.get(tier.name).test(relativePath)) return `plate:${tier.name}`;
  }

  const segments = relativePath.split("/");
  const basename = segments.at(-1) ?? relativePath;
  if (isHostToolingPath(segments, basename)) return "host:tooling";
  if (isLeanToolchainBasename(basename)) return "host:tooling";
  if (HOST_CONFIGURATION_EXTENSIONS.has(extension)) return "host:tooling";
  if (DEPENDENCY_METADATA_EXTENSIONS.has(extension)) return "host:tooling";
  if (GENERATED_ARTIFACT_EXTENSIONS.has(extension)) return "host:tooling";
  if (LICENSE_BASENAMES.has(basename)) return "carried:license";
  if (basename === "lean_decls") return "carried:lean-declarations";

  if (TYPESCRIPT_SOURCE_EXTENSIONS.has(extension)) return "carried:typescript-source";
  if (JAVASCRIPT_SOURCE_EXTENSIONS.has(extension)) return "carried:javascript-source";
  if (FENNEL_SOURCE_EXTENSIONS.has(extension)) return "carried:fennel-source";
  if (RACKET_SOURCE_EXTENSIONS.has(extension)) return "carried:racket-source";
  if (SCRIBBLE_SOURCE_EXTENSIONS.has(extension)) return "carried:scribble-source";
  if (ORG_DOCUMENT_EXTENSIONS.has(extension)) return "carried:org-document";
  if (INK_SOURCE_EXTENSIONS.has(extension)) return "carried:ink-source";
  if (PANDOC_DOCUMENT_EXTENSIONS.has(extension)) return "carried:pandoc-document";
  if (INCLUDE_SOURCE_EXTENSIONS.has(extension)) return "carried:include-source";
  if (EMACS_LISP_SOURCE_EXTENSIONS.has(extension)) return "carried:emacs-lisp-source";
  if (PYTHON_SOURCE_EXTENSIONS.has(extension)) return "carried:python-source";
  if (RUST_SOURCE_EXTENSIONS.has(extension)) return "carried:rust-source";
  if (SHELL_SOURCE_EXTENSIONS.has(extension)) return "carried:shell-source";
  if (POWERSHELL_SOURCE_EXTENSIONS.has(extension)) return "carried:powershell-source";
  if (DOT_SOURCE_EXTENSIONS.has(extension)) return "carried:dot-source";
  if (LUA_SOURCE_EXTENSIONS.has(extension)) return "carried:lua-source";
  if (STRUCTURED_DATA_EXTENSIONS.has(extension)) return `carried:${extension}-data`;
  if (IMAGE_ASSET_EXTENSIONS.has(extension)) return "carried:image-asset";
  if (IMAGE_PROJECT_EXTENSIONS.has(extension)) return "carried:image-project";
  const family = codecAdmissibleExtensions.get(extension);
  if (family !== undefined) return `carried:${family}`;

  return "dark";
}
