import path from "node:path";

export function claudeSessionRelativePath(root: string, full: string): string {
  return path.relative(path.resolve(root), full).split(path.sep).join("/");
}

export function claudeSessionConfinedPath(root: string, relative: string): string {
  const rootAbs = path.resolve(root);
  const full = path.resolve(rootAbs, relative);
  if (full !== rootAbs && !full.startsWith(rootAbs + path.sep)) throw new Error("claudeSessionConfinedPath: path escapes the session root");
  return full;
}
