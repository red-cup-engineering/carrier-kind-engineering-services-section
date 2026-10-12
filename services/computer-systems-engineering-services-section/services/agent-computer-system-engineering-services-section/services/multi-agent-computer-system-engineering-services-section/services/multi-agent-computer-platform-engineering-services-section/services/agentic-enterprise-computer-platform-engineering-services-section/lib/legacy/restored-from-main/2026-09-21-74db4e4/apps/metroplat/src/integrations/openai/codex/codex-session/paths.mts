import path from "node:path";

export function codexSessionRelativePath(root: string, full: string): string {
  return path.relative(path.resolve(root), full).split(path.sep).join("/");
}

export function codexSessionConfinedPath(root: string, relative: string): string {
  const rootAbs = path.resolve(root);
  const full = path.resolve(rootAbs, relative);
  if (full !== rootAbs && !full.startsWith(rootAbs + path.sep)) throw new Error("codexSessionConfinedPath: path escapes the session root");
  return full;
}

export function codexSessionDateRelativeRoot(date: string): string {
  const [year, month, day] = date.split("-");
  if (year === undefined || month === undefined || day === undefined || year.length !== 4 || month.length !== 2 || day.length !== 2) {
    throw new TypeError(`Codex session discovery: invalid date ${JSON.stringify(date)}`);
  }
  return `${year}/${month}/${day}`;
}
