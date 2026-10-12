/**
 * @packageDocumentation
 *
 * knowledge-vault/services/publish - filesystem publish boundary for
 * vault-backed static websites.
 *
 * This service owns the one effectful descent a vault-backed website needs: walk
 * an Obsidian vault directory into an in-memory file map, admit it through the
 * pure `vaultToContent` ingestion (`knowledge-vault/src/wikilinks.mts`), project
 * it through the pure `buildStaticWebsite` projection, and write the resulting
 * file map to a stable output directory (a deploy root, not the
 * dated `content/` archive that `integrations/web/services/static-website`
 * owns). Callers dispatch this as one action rather than scripting the
 * descent themselves.
 *
 * `readVaultTree` also backs `knowledge-vault/services/notes.mts`'s whole-vault
 * reads and queries — one vault-directory walk, shared within this domain
 * folder rather than reached across a package-level service boundary.
 */
import path from "node:path";

import { vaultToContent } from "../wikilinks.mjs";
import { buildStaticWebsite } from "@red-cup-engineering/feltos/sites/static-website/generator";
import {
  vaultWebsitePublishReceiptContract,
  vaultWebsitePublishRequestContract,

} from "@red-cup-engineering/markdown-engineering-services-section/vault/website-publish";
import { writeFileAtomic } from "@red-cup-engineering/computer-system-engine/filesystem";

const TEXT_ASSET_EXTENSIONS = new Set([
  ".css", ".csv", ".html", ".ics", ".js", ".json", ".map", ".md", ".mjs", ".svg", ".txt", ".webmanifest", ".xml",
]);

function extensionOf(filePath) {
  const name = filePath.split("/").at(-1) ?? filePath;
  const index = name.lastIndexOf(".");
  return index < 0 ? "" : name.slice(index).toLowerCase();
}

/** Recursively read one vault directory's text assets into an in-memory vault file map. */
export function readVaultTree(root, options) {
  const files = {};
  function walk(dir) {
    for (const entry of options.readDirectoryEntries(dir)) {
      if (entry.name === ".obsidian") continue;
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      const stat = options.statPathOrNull(entryPath);
      if (stat === null || !stat.isFile()) continue;
      const key = path.relative(root, entryPath).replace(/\\/gu, "/");
      if (!TEXT_ASSET_EXTENSIONS.has(extensionOf(key))) continue;
      files[key] = options.readFileUtf8(entryPath);
    }
  }
  walk(root);
  return Object.freeze(files);
}

/**
 * Alias a page routed to `home/index.html` (a page with slug `home`) as the
 * website root, overriding the generated post/page index there.
 */
function withHomeAlias(files) {
  const home = files.get("home/index.html");
  if (home === undefined) return files;
  const aliased = new Map(files);
  aliased.set("index.html", home);
  return aliased;
}

function writeFileMapAtDirectory(directory, files, options) {
  options.removeDirectory(directory);
  const paths = [];
  for (const [outputPath, contents] of files) {
    writeFileAtomic(path.join(directory, outputPath), contents);
    paths.push(outputPath);
  }
  paths.sort((left, right) => left.localeCompare(right));
  return Object.freeze(paths);
}

/** Walk a vault, build its static website, and write it to a stable output directory. */
export function publishVaultWebsite(request, options) {
  const vaultFiles = readVaultTree(request.vaultRoot, options);
  const ingestion = vaultToContent(vaultFiles, {
    ...(request.basePath === undefined ? {} : { basePath: request.basePath }),
    ...(request.postsPath === undefined ? {} : { postsPath: request.postsPath }),
    ...(request.author === undefined ? {} : { postsAuthor: request.author }),
  });
  const files = withHomeAlias(buildStaticWebsite({
    articles: ingestion.articles,
    pages: ingestion.pages,
  }, {
    websiteUrl: request.websiteUrl,
    title: request.title,
    ...(request.description === undefined ? {} : { description: request.description }),
    ...(request.language === undefined ? {} : { language: request.language }),
    ...(request.author === undefined ? {} : { author: request.author }),
    ...(request.websiteName === undefined ? {} : { websiteName: request.websiteName }),
    ...(request.basePath === undefined ? {} : { basePath: request.basePath }),
    ...(request.postsPath === undefined ? {} : { postsPath: request.postsPath }),
    ...(request.includeDrafts === undefined ? {} : { includeDrafts: request.includeDrafts }),
    ...(request.theme === undefined ? {} : { theme: request.theme }),
  }));
  const paths = writeFileMapAtDirectory(request.outputRoot, files, options);
  return vaultWebsitePublishReceiptContract.assert({
    kind: "metroplat.vault-website-publish.publish-receipt",
    vaultRoot: request.vaultRoot,
    outputRoot: request.outputRoot,
    contentFiles: Object.keys(vaultFiles).length,
    articles: ingestion.articles.length,
    pages: ingestion.pages.length,
    outputFiles: files.size,
    paths,
  }, "vault website publish receipt");
}

// No service verb lives here: publication is the filesystem `write` of a
// directory-manifest claim (the website file map) at the output root; this
// path-shaped descent remains for in-package callers.
