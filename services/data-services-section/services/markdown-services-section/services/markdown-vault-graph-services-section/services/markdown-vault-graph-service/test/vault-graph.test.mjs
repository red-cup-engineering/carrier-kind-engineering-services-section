import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { deriveMarkdownVaultGraph, manifestLinesEqual, renderMarkdownVaultGraphDot } from "../src/vault-graph.mjs";

async function writeFixtureVault(root) {
  await mkdir(join(root, "folder-a"), { recursive: true });
  await mkdir(join(root, "folder-b"), { recursive: true });

  await writeFile(
    join(root, "index.md"),
    [
      "# Index",
      "",
      "See [the intro](intro.md) for context, and a [dead end](nowhere.md).",
      "Also [[Second-Note|aliased]] and a transclusion ![[second-note]].",
      "External: [firm site](https://example.test/firm).",
      "",
    ].join("\n"),
  );

  await writeFile(
    join(root, "intro.md"),
    ["# Intro", "", "Nothing but prose here.", ""].join("\n"),
  );

  await writeFile(
    join(root, "second-note.md"),
    ["# Second Note", "", "Referenced by index via wikilink and transclusion.", ""].join("\n"),
  );

  await writeFile(
    join(root, "with-frontmatter.md"),
    [
      "---",
      'title: "Has Deps"',
      "depends-on:",
      "  - second-note",
      "  - missing-dep",
      "kind: engineering-note",
      "---",
      "# Has Deps",
      "",
      "Body text, no links.",
      "",
    ].join("\n"),
  );

  await writeFile(
    join(root, "csl-note.md"),
    [
      "---",
      'title: "CSL Citation"',
      "date-parts: [[2016]]",
      "---",
      "# CSL Citation",
      "",
      "Just prose, no links here.",
      "",
    ].join("\n"),
  );

  await writeFile(join(root, "folder-a", "dup.md"), ["# Dup A", "", "First duplicate slug.", ""].join("\n"));
  await writeFile(join(root, "folder-b", "dup.md"), ["# Dup B", "", "Second duplicate slug.", ""].join("\n"));
}

test("derives link-tier edges for a resolved relative link, a wikilink with an alias, and a transclusion", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-graph-"));
  try {
    await writeFixtureVault(root);
    const graph = await deriveMarkdownVaultGraph({ vault: root });

    assert.equal(graph.type, "MarkdownVaultGraph");
    assert.match(graph.vaultManifestSha256, /^sha256:[0-9a-f]{64}$/u);

    const linkEdgesFromIndex = graph.tiers.link.edges.filter((edge) => edge.from === "index.md");
    assert.deepEqual(linkEdgesFromIndex, [
      { from: "index.md", to: "intro.md", relation: "markdown-link" },
      { from: "index.md", to: "second-note.md", relation: "wikilink" },
      { from: "index.md", to: "second-note.md", relation: "transclusion" },
    ]);

    const node = graph.nodes.find((entry) => entry.address.surfacePath === "second-note.md");
    assert.equal(node.title, "Second Note");
    assert.equal(node.slug, "second-note");
    assert.match(node.address.contentDigest, /^sha256:[0-9a-f]{64}$/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("renders an external edge for an http(s) link and never a defect for it", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-graph-"));
  try {
    await writeFixtureVault(root);
    const graph = await deriveMarkdownVaultGraph({ vault: root });
    assert.deepEqual(graph.tiers.external.edges, [{ from: "index.md", to: "https://example.test/firm", relation: "url" }]);
    assert.equal(graph.defects.some((defect) => defect.to === "https://example.test/firm"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("resolves a frontmatter depends-on list entry by slug and reports the other entry as unresolved", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-graph-"));
  try {
    await writeFixtureVault(root);
    const graph = await deriveMarkdownVaultGraph({ vault: root });

    assert.deepEqual(
      graph.tiers.frontmatter.edges.filter((edge) => edge.from === "with-frontmatter.md"),
      [{ from: "with-frontmatter.md", to: "second-note.md", relation: "depends-on" }],
    );
    assert.deepEqual(
      graph.defects.find((defect) => defect.kind === "unresolved-frontmatter-reference" && defect.from === "with-frontmatter.md"),
      { kind: "unresolved-frontmatter-reference", from: "with-frontmatter.md", to: "missing-dep", relation: "depends-on" },
    );

    const withFrontmatterNode = graph.nodes.find((entry) => entry.address.surfacePath === "with-frontmatter.md");
    assert.equal(withFrontmatterNode.frontmatterType, "engineering-note");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a CSL date-parts frontmatter value never produces a wikilink edge or a defect", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-graph-"));
  try {
    await writeFixtureVault(root);
    const graph = await deriveMarkdownVaultGraph({ vault: root });

    assert.equal(graph.tiers.link.edges.some((edge) => edge.from === "csl-note.md"), false);
    assert.equal(graph.defects.some((defect) => defect.from === "csl-note.md"), false);
    assert.equal(graph.defects.some((defect) => defect.to === "2016" || defect.to === "[[2016]]"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an unresolved link is reported as a defect, driving exit-1 behavior on the graph result", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-graph-"));
  try {
    await writeFixtureVault(root);
    const graph = await deriveMarkdownVaultGraph({ vault: root });

    assert.deepEqual(
      graph.defects.find((defect) => defect.kind === "unresolved-link" && defect.from === "index.md"),
      { kind: "unresolved-link", from: "index.md", to: "nowhere.md", relation: "markdown-link" },
    );
    // The bin sets process.exitCode = 1 exactly when defects.length > 0.
    assert.ok(graph.defects.length > 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a slug shared by two files is reported once as a slug-collision defect listing both paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-graph-"));
  try {
    await writeFixtureVault(root);
    const graph = await deriveMarkdownVaultGraph({ vault: root });

    assert.deepEqual(
      graph.defects.find((defect) => defect.kind === "slug-collision"),
      { kind: "slug-collision", slug: "dup", paths: ["folder-a/dup.md", "folder-b/dup.md"] },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("deriving the same vault twice yields deeply equal graphs", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-graph-"));
  try {
    await writeFixtureVault(root);
    const first = await deriveMarkdownVaultGraph({ vault: root });
    const second = await deriveMarkdownVaultGraph({ vault: root });
    assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(second)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("manifestLinesEqual is the exposed comparison the double scan relies on", () => {
  const a = ["a.md sha256:1111", "b.md sha256:2222"];
  const bSame = ["a.md sha256:1111", "b.md sha256:2222"];
  const bChanged = ["a.md sha256:1111", "b.md sha256:9999"];
  const bShorter = ["a.md sha256:1111"];
  assert.equal(manifestLinesEqual(a, bSame), true);
  assert.equal(manifestLinesEqual(a, bChanged), false);
  assert.equal(manifestLinesEqual(a, bShorter), false);
});

test("renders link and external tiers as Graphviz DOT, with external edges dashed", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-graph-"));
  try {
    await writeFixtureVault(root);
    const graph = await deriveMarkdownVaultGraph({ vault: root });

    const linkDot = renderMarkdownVaultGraphDot(graph, { tier: "link" });
    assert.match(linkDot, /"index\.md" -> "intro\.md" \[label="markdown-link"\];/u);

    const externalDot = renderMarkdownVaultGraphDot(graph, { tier: "external" });
    assert.match(externalDot, /"https:\/\/example\.test\/firm" \[shape=box, style=dashed\];/u);
    assert.match(
      externalDot,
      /"index\.md" -> "https:\/\/example\.test\/firm" \[style=dashed, label="url"\];/u,
    );

    assert.throws(() => renderMarkdownVaultGraphDot(graph, { tier: "settlement" }), /unknown markdown vault graph tier/u);
    assert.throws(() => renderMarkdownVaultGraphDot({ type: "Other" }), /one MarkdownVaultGraph is required/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
