import path from "node:path";
import { fileURLToPath } from "node:url";

export function siteRootFromModule(metaUrl: string): string {
  return path.resolve(path.dirname(fileURLToPath(metaUrl)), "..");
}

export function repoRootFromModule(metaUrl: string): string {
  return path.resolve(siteRootFromModule(metaUrl), "../..");
}

export function isMainModule(metaUrl: string): boolean {
  return process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
}
