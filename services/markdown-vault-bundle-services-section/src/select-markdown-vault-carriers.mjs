import { isMarkdownPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { walkPosixPaths } from "@red-cup-engineering/computer-filepath-engineering-services-section/walk-posix-paths";

/** Content roles a Markdown vault bundle may select independently. */
export const MARKDOWN_VAULT_BUNDLE_ROLES = Object.freeze([
  "glossary-terms",
  "glossary-topics",
  "glossary-concepts",
  "articles",
]);

const ROLE_MARKERS = Object.freeze({
  "glossary-terms": "/content/text/glossary/terms/",
  "glossary-topics": "/content/text/glossary/topics/",
  "glossary-concepts": "/content/text/glossary/concepts/",
  articles: "/content/text/documents/articles/",
});

/** Walker-level directory excludes; caller-overridable, purely a scan-efficiency and hygiene default. */
export const DEFAULT_MARKDOWN_VAULT_BUNDLE_EXCLUDES = Object.freeze([".git", "node_modules", "legacy", "triage"]);

const ARCHIVE_CARRIER = /--archive-[^/]*\.md$/iu;
const LEGACY_SEGMENT = /(^|\/)lib\/legacy(\/|$)/u;
const TRIAGE_SEGMENT = /(^|\/)content\/text\/triage(\/|$)/u;

/** The content role an admitted-shaped path belongs to, or null when it matches none. */
export function roleOfMarkdownVaultCarrier(path) {
  const normalized = `/${path}`;
  for (const role of MARKDOWN_VAULT_BUNDLE_ROLES) {
    if (normalized.includes(ROLE_MARKERS[role])) return role;
  }
  return null;
}

/**
 * Superseded-revision and staging conventions this tree always excludes from
 * bundling, independent of the caller's walker-level `excludes`.
 */
export function isMarkdownVaultBundleStaging(path) {
  return ARCHIVE_CARRIER.test(path) || LEGACY_SEGMENT.test(path) || TRIAGE_SEGMENT.test(path);
}

function isAdmitted(path, roles) {
  const role = roleOfMarkdownVaultCarrier(path);
  if (role === null || !roles.includes(role)) return false;
  return !isMarkdownVaultBundleStaging(path);
}

/**
 * Select the Markdown carriers a vault subtree admits for bundling.
 * @param {{root: string, roles?: readonly string[], excludes?: readonly string[], maxScan?: number}} options
 * @returns {Promise<{root: string, roles: readonly string[], carriers: readonly {path: string}[], scanned: number, excluded: number}>}
 * @throws {TypeError} when root is missing or roles names an unknown role.
 * @throws {Error} when the scan is truncated by maxScan.
 */
export async function selectMarkdownVaultCarriers({
  root,
  roles = MARKDOWN_VAULT_BUNDLE_ROLES,
  excludes = DEFAULT_MARKDOWN_VAULT_BUNDLE_EXCLUDES,
  maxScan = 200_000,
} = {}) {
  if (typeof root !== "string" || root === "") throw new TypeError("root is required");
  if (!Array.isArray(roles) || roles.length === 0 || roles.some((role) => !MARKDOWN_VAULT_BUNDLE_ROLES.includes(role))) {
    throw new TypeError(`roles must be a nonempty subset of ${MARKDOWN_VAULT_BUNDLE_ROLES.join(", ")}`);
  }
  const walk = await walkPosixPaths({
    root,
    excludes,
    extensions: [".md", ".markdown"],
    includeFile: (file) => isMarkdownPath(file.path) && isAdmitted(file.path, roles),
    maxEntries: maxScan,
  });
  if (walk.truncated) throw new Error(`markdown vault bundle: scan truncated at maxScan=${maxScan}; raise maxScan`);
  const carriers = walk.files
    .map((file) => file.path)
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((path) => Object.freeze({ path }));
  return Object.freeze({
    root,
    roles: Object.freeze([...roles]),
    carriers: Object.freeze(carriers),
    scanned: walk.scanned,
    excluded: walk.excluded,
  });
}
