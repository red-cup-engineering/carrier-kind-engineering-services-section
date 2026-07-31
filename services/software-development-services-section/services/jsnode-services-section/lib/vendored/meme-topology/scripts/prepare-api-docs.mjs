import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const docsRoot = path.resolve("docs/api");

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(entryPath);
  }

  return files;
}

function inferTitle(filePath, content) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.replaceAll("`", "");

  const stem = path.basename(filePath, ".md");
  if (stem.toLowerCase() === "readme" || stem.toLowerCase() === "index") return "API Reference";
  return stem.replaceAll("-", " ");
}

function stripLeadingTitle(content) {
  return content.replace(/^#\s+.+\n+/, "");
}

function stripExistingFrontmatter(content) {
  return content.replace(/^---\n[\s\S]*?\n---\n+/, "");
}

function rewriteReadmeLinks(content) {
  return content.replaceAll("README.md", "index.md");
}

function withFrontmatter(title, description, body) {
  return `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n${body}`;
}

async function normalizeReadme(filePath) {
  if (path.basename(filePath).toLowerCase() !== "readme.md") return filePath;

  const indexPath = path.join(path.dirname(filePath), "index.md");
  try {
    await stat(indexPath);
    return indexPath;
  } catch {
    await rename(filePath, indexPath);
    return indexPath;
  }
}

const markdownFiles = await collectMarkdownFiles(docsRoot);

for (const originalPath of markdownFiles) {
  const filePath = await normalizeReadme(originalPath);
  const source = await readFile(filePath, "utf8");
  const content = stripExistingFrontmatter(source);
  const title = inferTitle(filePath, content);
  const description =
    title === "API Reference"
      ? "Generated API reference for the meme-topology package."
      : `Generated API reference for ${title}.`;
  const body = rewriteReadmeLinks(stripLeadingTitle(content)).trimStart();
  await writeFile(filePath, withFrontmatter(title, description, body));
}
