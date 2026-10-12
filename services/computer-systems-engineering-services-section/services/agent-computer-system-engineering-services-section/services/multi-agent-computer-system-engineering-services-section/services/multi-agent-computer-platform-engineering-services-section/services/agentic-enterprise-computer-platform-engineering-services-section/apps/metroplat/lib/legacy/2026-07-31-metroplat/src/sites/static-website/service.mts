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
import { canonicalBytes } from "../../lib/identity/index.mts";
import {
  buildStaticWebsite,
  type StaticWebsiteContentInput,
  type StaticWebsiteFileMap,
  type StaticWebsiteOptions,
} from "./generator/index.mts";
import { readFileUtf8, writeFileAtomic } from "../../lib/filesystem/index.mts";
import { processIsoNow } from "../../integrations/process/services/index.mts";
import { jsonResource, parse, type JsonRecord } from "../../lib/codecs/json/index.mts";
import {
  safeStaticWebsiteOutputPath,
  staticWebsiteContentArtifact,
  staticWebsiteContentAddress,
  staticWebsiteContentManifest,
  staticWebsiteContentManifestRead,
  staticWebsiteContentProjection,
  staticWebsiteOutputArtifact,
  staticWebsiteOutputPath,
  type StaticWebsiteContentArtifact,
  type StaticWebsiteContentManifest,
  type StaticWebsiteContentManifestRead,
  type StaticWebsiteContentObservationOptions,
  type StaticWebsiteContentProjection,
} from "./content.mts";
import type {
  ContractValue,
} from "../../lib/contracts/index.mts";

export type {
  StaticWebsiteContentAddress,
  StaticWebsiteContentArtifact,
  StaticWebsiteContentManifest,
  StaticWebsiteContentManifestRead,
  StaticWebsiteContentObservationOptions,
  StaticWebsiteContentOperationKind,
  StaticWebsiteContentProjection,
} from "./content.mts";

function staticWebsiteContentOptions(options: StaticWebsiteContentObservationOptions): StaticWebsiteContentObservationOptions {
  return options.at === undefined ? { ...options, at: processIsoNow() } : options;
}

/** Write a pure static-website file map as durable `content/` artifacts. */
export function projectStaticWebsiteFileMapContent(
  root: string,
  files: StaticWebsiteFileMap,
  options: StaticWebsiteContentObservationOptions = {},
): StaticWebsiteContentProjection {
  const addressOptions = staticWebsiteContentOptions(options);
  const address = staticWebsiteContentAddress(root, addressOptions);
  const artifacts: StaticWebsiteContentArtifact[] = [];
  let bytes = 0;
  for (const [outputPathRaw, contents] of files) {
    const outputPath = safeStaticWebsiteOutputPath(outputPathRaw);
    const target = staticWebsiteOutputPath(address.directory, outputPath);
    writeFileAtomic(target, contents);
    const byteLength = Buffer.byteLength(contents, "utf8");
    bytes += byteLength;
    artifacts.push(staticWebsiteContentArtifact({
      kind: "metroplat.static-website-content-artifact" as const,
      outputPath,
      path: target,
      bytes: byteLength,
      artifact: staticWebsiteOutputArtifact(target, outputPath),
    }));
  }
  artifacts.sort((left, right) => left.outputPath.localeCompare(right.outputPath));
  const manifest: StaticWebsiteContentManifest = staticWebsiteContentManifest({
    kind: "metroplat.static-website-content-manifest" as const,
    root,
    date: address.date,
    action: address.action,
    subject: address.subject,
    directory: address.directory,
    files: Object.freeze(artifacts),
  });
  const manifestJson = canonicalBytes(jsonResource(manifest, "static-website content manifest"));
  writeFileAtomic(address.manifestPath, `${manifestJson}\n`);
  const manifestArtifact = staticWebsiteOutputArtifact(address.manifestPath, address.manifestPath);
  return staticWebsiteContentProjection({
    kind: "metroplat.static-website-content-observation" as const,
    operation: "project-static-website-content" as const,
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
  root: string,
  content: StaticWebsiteContentInput,
  websiteOptions: StaticWebsiteOptions,
  options: StaticWebsiteContentObservationOptions = {},
): StaticWebsiteContentProjection {
  return projectStaticWebsiteFileMapContent(root, buildStaticWebsite(content, websiteOptions), options);
}

/** Explicit hot readback for a static-website content manifest path. */
export function readStaticWebsiteContentManifestPath(
  manifestPath: string,
  options: StaticWebsiteContentObservationOptions = {},
): StaticWebsiteContentManifestRead {
  const parsed = parse(readFileUtf8(manifestPath));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TypeError("readStaticWebsiteContentManifestPath: manifest must be a JSON object");
  }
  const manifest = staticWebsiteContentManifest(parsed as JsonRecord as unknown as StaticWebsiteContentManifest);
  const artifact = staticWebsiteOutputArtifact(manifestPath, manifestPath);
  return staticWebsiteContentManifestRead({
    kind: "metroplat.static-website-content-observation" as const,
    operation: "read-static-website-content-manifest" as const,
    root: manifest.root,
    path: manifestPath,
    artifact,
    manifest,
  });
}
