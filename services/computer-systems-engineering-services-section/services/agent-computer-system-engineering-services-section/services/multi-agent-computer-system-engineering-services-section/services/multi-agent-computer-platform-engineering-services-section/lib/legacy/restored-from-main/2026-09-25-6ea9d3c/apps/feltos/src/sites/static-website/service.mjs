/**
 * @packageDocumentation
 *
 * integrations/web/services/static-website - filesystem content-artifact
 * realization for static-website projections.
 *
 * Pure static-website projections return a file map as material law. This service
 * owns the host effect that writes that codomain under `content/` and
 * returns artifact content so later moves can consume paths rather than a hot
 * in-process map.
 */
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import {
  buildStaticWebsite,

} from "./generator/index.mjs";
import { writeFileAtomic } from "@red-cup-engineering/computer-system-engine/filesystem";
import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { parseJsonValue as parse } from "@red-cup-engineering/json-services-section/parse-json-value";
import {
  safeStaticWebsiteOutputPath,
  staticWebsiteContentArtifact,
  staticWebsiteContentAddress,
  staticWebsiteContentManifest,
  staticWebsiteContentManifestRead,
  staticWebsiteContentProjection,
  staticWebsiteOutputArtifact,
  staticWebsiteOutputPath,

} from "@red-cup-engineering/static-site-publisher/sites/static-website/content";
import { jsonResource } from "@red-cup-engineering/json-services-section";

function staticWebsiteContentOptions(options) {
  return options.at === undefined ? { ...options, at: processIsoNow() } : options;
}

/** Write a pure static-website file map as durable `content/` artifacts. */
export function projectStaticWebsiteFileMapContent(
  root,
  files,
  options = {},
) {
  const addressOptions = staticWebsiteContentOptions(options);
  const address = staticWebsiteContentAddress(root, addressOptions);
  const artifacts = [];
  let bytes = 0;
  for (const [outputPathRaw, contents] of files) {
    const outputPath = safeStaticWebsiteOutputPath(outputPathRaw);
    const target = staticWebsiteOutputPath(address.directory, outputPath);
    writeFileAtomic(target, contents);
    const byteLength = Buffer.byteLength(contents, "utf8");
    bytes += byteLength;
    artifacts.push(staticWebsiteContentArtifact({
      kind: "metroplat.static-website-content-artifact",
      outputPath,
      path: target,
      bytes: byteLength,
      artifact: staticWebsiteOutputArtifact(target, outputPath),
    }));
  }
  artifacts.sort((left, right) => left.outputPath.localeCompare(right.outputPath));
  const manifest = staticWebsiteContentManifest({
    kind: "metroplat.static-website-content-manifest",
    root,
    date: address.date,
    action: address.action,
    subject: address.subject,
    directory: address.directory,
    files: Object.freeze(artifacts),
  });
  const manifestJson = canonicalJson(jsonResource(manifest, "static-website content manifest"));
  writeFileAtomic(address.manifestPath, `${manifestJson}\n`);
  const manifestArtifact = staticWebsiteOutputArtifact(address.manifestPath, address.manifestPath);
  return staticWebsiteContentProjection({
    kind: "metroplat.static-website-content-observation",
    operation: "project-static-website-content",
    root,
    path: address.manifestPath,
    artifact: manifestArtifact,
    manifest: manifestArtifact,
    artifacts: Object.freeze(artifacts.map((entry) => entry.artifact)),
    paths: Object.freeze(artifacts.map((entry) => entry.path)),
    files: artifacts.length,
    bytes,
  });
}

/** Build a static-website projection and write its codomain into `content/`. */
export function projectStaticWebsiteContentAtRoot(
  root,
  content,
  websiteOptions,
  options = {},
) {
  return projectStaticWebsiteFileMapContent(root, buildStaticWebsite(content, websiteOptions), options);
}

/** Explicit hot readback for a static-website content manifest path. */
export function readStaticWebsiteContentManifestPath(
  manifestPath,
  options,
) {
  const parsed = parse(options.readFileUtf8(manifestPath));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TypeError("readStaticWebsiteContentManifestPath: manifest must be a JSON object");
  }
  const manifest = staticWebsiteContentManifest(parsed);
  const artifact = staticWebsiteOutputArtifact(manifestPath, manifestPath);
  return staticWebsiteContentManifestRead({
    kind: "metroplat.static-website-content-observation",
    operation: "read-static-website-content-manifest",
    root: manifest.root,
    path: manifestPath,
    artifact,
    manifest,
  });
}
