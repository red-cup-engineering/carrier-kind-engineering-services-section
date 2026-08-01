import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { posix as posixPath, join, relative, resolve, sep } from "node:path";

// A markdown vault graph is the firm's second chart, alongside the npm
// registry graph, and keeps the same law: tiers are independent dimensions
// that must not collapse into one edge set. A note's own prose links
// (relative links, wikilinks, transclusions) are one tier; the references a
// note declares about itself in frontmatter are a second, disjoint tier;
// anything pointing off the vault entirely is a third. A node's address
// keeps two legs — the vault-relative surface path and the content-digest —
// as separate coordinates, never merged.
const GRAPH_TYPE = "MarkdownVaultGraph";
const FRONTMATTER_REFERENCE_KEYS = [
  "depends-on",
  "see-also",
  "realizes",
  "instantiates",
  "component-of",
  "explores",
];

function toPosixPath(path) {
  return path.split(sep).join("/");
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function listMarkdownFiles(root) {
  const results = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        results.push(toPosixPath(relative(root, full)));
      }
    }
  }
  await walk(root);
  results.sort();
  return results;
}

// One full pass over the vault: list every Markdown file, read it, and
// content-digest it. The derivation calls this twice and compares the two
// manifests — the corpus showed listing nondeterminism, so a graph is only
// trusted when both passes agree on exactly the same file set and bytes.
async function scanVault(root) {
  const surfacePaths = await listMarkdownFiles(root);
  const files = [];
  for (const surfacePath of surfacePaths) {
    const bytes = await readFile(join(root, ...surfacePath.split("/")));
    const contentDigest = `sha256:${sha256Hex(bytes)}`;
    files.push({ surfacePath, bytes, contentDigest });
  }
  const manifestLines = files.map((file) => `${file.surfacePath} ${file.contentDigest}`);
  manifestLines.sort();
  return { files, manifestLines };
}

// Exposed so a test can exercise the comparison directly rather than trying
// to race a real file mutation between two filesystem scans.
export function manifestLinesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function splitFrontmatter(text) {
  const lines = text.split(/\r?\n/u);
  if ((lines[0] ?? "").trim() !== "---") return { frontmatterText: null, body: text };
  let end = -1;
  for (let index = 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed === "---" || trimmed === "...") {
      end = index;
      break;
    }
  }
  if (end === -1) return { frontmatterText: null, body: text };
  return { frontmatterText: lines.slice(1, end).join("\n"), body: lines.slice(end + 1).join("\n") };
}

function unquote(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

// Minimal YAML subset only: "key: value" and "key:\n  - item" lists. No
// nested maps, no flow collections, no multiline scalars — a real YAML
// parser would happily read `date-parts: [[2016]]` as a nested list and
// invite exactly the confusion this graph must avoid: frontmatter is never
// scanned for wikilinks, so a CSL date-parts value can never masquerade as
// one, no matter how it is spelled.
function parseFrontmatter(frontmatterText) {
  const result = {};
  let currentKey = null;
  let currentList = null;
  for (const rawLine of frontmatterText.split(/\r?\n/u)) {
    if (rawLine.trim() === "") continue;
    const listItemMatch = /^\s*-\s+(.*)$/u.exec(rawLine);
    if (listItemMatch && currentKey !== null) {
      if (currentList === null) {
        currentList = [];
        result[currentKey] = currentList;
      }
      currentList.push(unquote(listItemMatch[1].trim()));
      continue;
    }
    const keyValueMatch = /^([A-Za-z0-9_-]+):\s*(.*)$/u.exec(rawLine);
    if (keyValueMatch) {
      const [, key, rest] = keyValueMatch;
      currentKey = key;
      currentList = null;
      result[key] = rest === "" ? null : unquote(rest.trim());
    }
  }
  return result;
}

function firstHeading(body) {
  const match = /^#[ \t]+(.+)$/mu.exec(body);
  return match ? match[1].trim() : null;
}

function* iterMarkdownLinks(body) {
  const pattern = /(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    yield { text: match[1], target: match[2] };
  }
}

function* iterWikiTargets(body) {
  const pattern = /(!)?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/gu;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    yield { isTransclusion: Boolean(match[1]), target: match[2].trim() };
  }
}

function resolveRelativeLink(rawTarget, containingSurfacePath, surfacePathSet) {
  let target = rawTarget;
  const hashIndex = target.indexOf("#");
  if (hashIndex >= 0) target = target.slice(0, hashIndex);
  if (target === "") return null; // pure same-document anchor: not a file reference at all
  let decoded = target;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    // malformed escape: fall back to the raw target
  }
  const resolved = posixPath.normalize(posixPath.join(posixPath.dirname(containingSurfacePath), decoded));
  return surfacePathSet.has(resolved) ? resolved : undefined;
}

function resolveVaultRelative(rawTarget, surfacePathSet, slugIndex) {
  const target = rawTarget.trim();
  const candidates = target.toLowerCase().endsWith(".md") ? [target] : [target, `${target}.md`];
  for (const candidate of candidates) {
    if (surfacePathSet.has(candidate)) return candidate;
  }
  const lastSegment = target.split("/").pop().replace(/\.md$/iu, "");
  const matches = slugIndex.get(lastSegment.toLowerCase());
  return matches && matches.length === 1 ? matches[0] : undefined;
}

export async function deriveMarkdownVaultGraph({ vault } = {}) {
  if (vault === undefined) throw new TypeError("vault is required");
  const root = resolve(vault);

  const first = await scanVault(root);
  const second = await scanVault(root);
  if (!manifestLinesEqual(first.manifestLines, second.manifestLines)) {
    throw new Error("vault changed during scan");
  }
  const vaultManifestSha256 = `sha256:${sha256Hex(Buffer.from(first.manifestLines.join("\n"), "utf8"))}`;

  const internalNodes = first.files.map((file) => {
    const text = file.bytes.toString("utf8");
    const { frontmatterText, body } = splitFrontmatter(text);
    const frontmatter = frontmatterText === null ? {} : parseFrontmatter(frontmatterText);
    const slug = posixPath.basename(file.surfacePath).replace(/\.md$/iu, "");
    const title = firstHeading(body) ?? (typeof frontmatter.title === "string" ? frontmatter.title : null);
    const frontmatterType =
      (typeof frontmatter.type === "string" ? frontmatter.type : null) ??
      (typeof frontmatter.kind === "string" ? frontmatter.kind : null);
    return { surfacePath: file.surfacePath, contentDigest: file.contentDigest, slug, title, frontmatterType, body, frontmatter };
  });

  const surfacePathSet = new Set(internalNodes.map((node) => node.surfacePath));
  const slugIndex = new Map();
  for (const node of internalNodes) {
    const key = node.slug.toLowerCase();
    if (!slugIndex.has(key)) slugIndex.set(key, []);
    slugIndex.get(key).push(node.surfacePath);
  }

  const linkEdges = [];
  const frontmatterEdges = [];
  const externalEdges = [];
  const defects = [];

  for (const node of internalNodes) {
    for (const { target } of iterMarkdownLinks(node.body)) {
      if (/^mailto:/iu.test(target)) continue;
      if (/^https?:\/\//iu.test(target)) {
        externalEdges.push(Object.freeze({ from: node.surfacePath, to: target, relation: "url" }));
        continue;
      }
      if (target.startsWith("#")) continue; // same-document anchor
      const resolved = resolveRelativeLink(target, node.surfacePath, surfacePathSet);
      if (resolved) {
        linkEdges.push(Object.freeze({ from: node.surfacePath, to: resolved, relation: "markdown-link" }));
      } else if (resolved === undefined) {
        defects.push(Object.freeze({ kind: "unresolved-link", from: node.surfacePath, to: target, relation: "markdown-link" }));
      }
    }
    for (const { isTransclusion, target } of iterWikiTargets(node.body)) {
      const relation = isTransclusion ? "transclusion" : "wikilink";
      const resolved = resolveVaultRelative(target, surfacePathSet, slugIndex);
      if (resolved) {
        linkEdges.push(Object.freeze({ from: node.surfacePath, to: resolved, relation }));
      } else {
        defects.push(Object.freeze({ kind: "unresolved-link", from: node.surfacePath, to: target, relation }));
      }
    }
    for (const key of FRONTMATTER_REFERENCE_KEYS) {
      const value = node.frontmatter[key];
      if (value === undefined) continue;
      const values = Array.isArray(value) ? value : [value];
      for (const rawValue of values) {
        if (typeof rawValue !== "string") continue;
        const resolved = resolveVaultRelative(rawValue, surfacePathSet, slugIndex);
        if (resolved) {
          frontmatterEdges.push(Object.freeze({ from: node.surfacePath, to: resolved, relation: key }));
        } else {
          defects.push(Object.freeze({ kind: "unresolved-frontmatter-reference", from: node.surfacePath, to: rawValue, relation: key }));
        }
      }
    }
  }

  for (const [slug, paths] of [...slugIndex.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (paths.length >= 2) {
      defects.push(Object.freeze({ kind: "slug-collision", slug, paths: Object.freeze([...paths].sort()) }));
    }
  }

  const nodes = internalNodes
    .map((node) => Object.freeze({
      address: Object.freeze({ surfacePath: node.surfacePath, contentDigest: node.contentDigest }),
      slug: node.slug,
      title: node.title,
      frontmatterType: node.frontmatterType,
    }))
    .sort((a, b) => a.address.surfacePath.localeCompare(b.address.surfacePath));

  return Object.freeze({
    type: GRAPH_TYPE,
    vault: root,
    vaultManifestSha256,
    nodes: Object.freeze(nodes),
    tiers: Object.freeze({
      link: Object.freeze({ edges: Object.freeze(linkEdges) }),
      frontmatter: Object.freeze({ edges: Object.freeze(frontmatterEdges) }),
      external: Object.freeze({ edges: Object.freeze(externalEdges) }),
    }),
    defects: Object.freeze(defects),
  });
}

function dotIdentifier(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export function renderMarkdownVaultGraphDot(graph, { tier = "link" } = {}) {
  if (graph?.type !== GRAPH_TYPE) throw new TypeError(`one ${GRAPH_TYPE} is required`);
  const lines = [`digraph ${JSON.stringify(`markdown-vault-${tier}`)} {`, "  rankdir=LR;"];
  if (tier === "link" || tier === "frontmatter") {
    for (const node of graph.nodes) lines.push(`  ${dotIdentifier(node.address.surfacePath)} [shape=box];`);
    for (const edge of graph.tiers[tier].edges) {
      lines.push(`  ${dotIdentifier(edge.from)} -> ${dotIdentifier(edge.to)} [label=${dotIdentifier(edge.relation)}];`);
    }
  } else if (tier === "external") {
    for (const node of graph.nodes) lines.push(`  ${dotIdentifier(node.address.surfacePath)} [shape=box];`);
    const externals = new Set();
    for (const edge of graph.tiers.external.edges) {
      if (!externals.has(edge.to)) {
        externals.add(edge.to);
        lines.push(`  ${dotIdentifier(edge.to)} [shape=box, style=dashed];`);
      }
      lines.push(`  ${dotIdentifier(edge.from)} -> ${dotIdentifier(edge.to)} [style=dashed, label=${dotIdentifier(edge.relation)}];`);
    }
  } else {
    throw new TypeError(`unknown markdown vault graph tier: ${tier}`);
  }
  lines.push("}");
  return `${lines.join("\n")}\n`;
}
