import type {
  ContractValue,
} from "../../lib/contracts/index.mts";
import type { DataArtifactDescriptor, DataArtifactEncoding } from "../../lib/addressing/index.mts";
import {
  dataArtifactDescriptor,
  dataDatePartition,
  dataTierDirectory,
} from "../../lib/addressing/index.mts";
import {
  staticWebsiteContentArtifactContract,
  staticWebsiteContentManifestContract,
  staticWebsiteContentManifestReadContract,
  staticWebsiteContentProjectionContract,
  type StaticWebsiteContentArtifact,
  type StaticWebsiteContentManifest,
  type StaticWebsiteContentManifestRead,
  type StaticWebsiteContentProjection,
} from "./schema.mts";
import { projectionSegmentKey } from "../../lib/codecs/javascript/segment-key.mts";

export type {
  StaticWebsiteContentArtifact,
  StaticWebsiteContentManifest,
  StaticWebsiteContentManifestRead,
  StaticWebsiteContentProjection,
} from "./schema.mts";

export type StaticWebsiteContentOperationKind = "project-static-website-content" | "read-static-website-content-manifest";

export interface StaticWebsiteContentAddress {
  readonly date: string;
  readonly rootName: string;
  readonly action: string;
  readonly subject: string;
  readonly directory: string;
  readonly manifestPath: string;
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function posixJoin(...parts: readonly string[]): string {
  const absolute = parts[0]?.startsWith("/") === true;
  const joined = parts.map(trimSlashes).filter(Boolean).join("/");
  return absolute ? `/${joined}` : joined;
}

function pathBasename(value: string): string {
  return value.replace(/\\/gu, "/").split("/").filter(Boolean).at(-1) ?? "";
}

function rootNameOf(root: string, explicit: string | undefined): string {
  if (explicit !== undefined && explicit.trim().length > 0) return projectionSegmentKey(explicit.replace(/^@/u, ""), "static-website");
  return projectionSegmentKey(pathBasename(root) || "root", "root");
}

/** Boundary coordinates for a static-website content address. */
export interface StaticWebsiteContentObservationOptions {
  readonly at?: ContractValue;
  readonly caller?: ContractValue;
  readonly rootName?: string;
  readonly action?: string;
  readonly subject?: string;
}

/** The stable `content` address for one static-website file-map materialization. */
export function staticWebsiteContentAddress(
  root: string,
  options: StaticWebsiteContentObservationOptions = {},
): StaticWebsiteContentAddress {
  if (options.at === undefined) {
    throw new TypeError("staticWebsiteContentAddress: options.at is required; host clocks belong to integrations/process");
  }
  const at = String(options.at);
  const partition = dataDatePartition(at);
  const action = projectionSegmentKey(options.action ?? "static-website", "static-website");
  const subject = projectionSegmentKey(options.subject ?? "website", "website");
  const rootName = rootNameOf(root, options.rootName);
  const directory = posixJoin(dataTierDirectory(root, "content", at), `${partition.date}-${rootName}-${action}-${subject}-content`);
  return Object.freeze({
    date: partition.date,
    rootName,
    action,
    subject,
    directory,
    manifestPath: posixJoin(directory, `${partition.date}-${rootName}-${action}-${subject}-manifest.json`),
  });
}

/** Normalize and constrain one static-website output path before it meets the filesystem. */
export function safeStaticWebsiteOutputPath(value: string): string {
  const normalized = value.replace(/\\/gu, "/").replace(/^\/+/u, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) throw new TypeError("safeStaticWebsiteOutputPath: output path must not be empty");
  if (parts.some((part) => part === "." || part === ".." || part.includes("\u0000"))) {
    throw new TypeError(`safeStaticWebsiteOutputPath: unsafe output path ${value}`);
  }
  return parts.join("/");
}

export function staticWebsiteOutputPath(directory: string, outputPath: string): string {
  return posixJoin(directory, safeStaticWebsiteOutputPath(outputPath));
}

export function staticWebsiteOutputEncoding(outputPath: string): DataArtifactEncoding {
  const basename = outputPath.split("/").at(-1) ?? "";
  const match = /\.([A-Za-z0-9._-]+)$/u.exec(basename);
  return match?.[1] ?? "bin";
}

export function staticWebsiteOutputArtifact(pathname: string, outputPath: string): DataArtifactDescriptor {
  return dataArtifactDescriptor("content", pathname, staticWebsiteOutputEncoding(outputPath));
}

export function staticWebsiteContentArtifact(value: StaticWebsiteContentArtifact): StaticWebsiteContentArtifact {
  return staticWebsiteContentArtifactContract.assert(
    Object.freeze({ ...value, artifact: Object.freeze(value.artifact) }),
    "static-website content artifact",
  ) as StaticWebsiteContentArtifact;
}

export function staticWebsiteContentManifest(value: StaticWebsiteContentManifest): StaticWebsiteContentManifest {
  return staticWebsiteContentManifestContract.assert(
    Object.freeze({ ...value, files: Object.freeze([...value.files]) }),
    "static-website content manifest",
  ) as StaticWebsiteContentManifest;
}

export function staticWebsiteContentProjection(value: StaticWebsiteContentProjection): StaticWebsiteContentProjection {
  return staticWebsiteContentProjectionContract.assert(
    Object.freeze({
      ...value,
      artifacts: Object.freeze([...value.artifacts]),
      paths: Object.freeze([...value.paths]),
    }),
    "static-website content projection",
  ) as StaticWebsiteContentProjection;
}

export function staticWebsiteContentManifestRead(value: StaticWebsiteContentManifestRead): StaticWebsiteContentManifestRead {
  return staticWebsiteContentManifestReadContract.assert(
    Object.freeze(value),
    "static-website content manifest read",
  ) as StaticWebsiteContentManifestRead;
}
