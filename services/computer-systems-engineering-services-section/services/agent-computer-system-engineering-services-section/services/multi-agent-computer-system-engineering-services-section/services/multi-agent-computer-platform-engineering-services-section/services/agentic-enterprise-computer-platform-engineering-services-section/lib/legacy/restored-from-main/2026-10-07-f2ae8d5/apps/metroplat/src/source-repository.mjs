/** A scoped source owner is a configured Git repository, never an arbitrary caller path. */
import path from "node:path";
import { existsSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";

const git = (root, args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const remote = root => git(root, ["remote", "get-url", "origin"]);

export function configuredSourceRepository(repositoryRoot, declaredOwner) {
  const root = realpathSync(repositoryRoot);
  const rootOwner = remote(root);
  if (declaredOwner === undefined || declaredOwner === rootOwner) return Object.freeze({ repository: root, sourceRepository: rootOwner });
  if (typeof declaredOwner !== "string" || declaredOwner.length === 0) throw new TypeError("source repository: an exact configured owner is required");
  const modules = path.join(root, ".gitmodules");
  if (!existsSync(modules)) throw new TypeError("source repository: owner is not configured on this host");
  let urls;
  try { urls = git(root, ["config", "--file", modules, "--get-regexp", "^submodule\\..*\\.url$"]); }
  catch { throw new TypeError("source repository: owner is not configured on this host"); }
  const owners = urls.split("\n").map(line => { const split = line.indexOf(" "); return { key: line.slice(0, split), url: line.slice(split + 1) }; }).filter(entry => entry.url === declaredOwner);
  if (owners.length !== 1) throw new TypeError("source repository: owner must identify one configured Git source");
  const relative = git(root, ["config", "--file", modules, "--get", owners[0].key.replace(/\.url$/, ".path")]);
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) throw new TypeError("source repository: configured source path escapes its owner");
  if (!git(root, ["ls-tree", "HEAD", "--", relative]).startsWith("160000 ")) throw new TypeError("source repository: configured source is not a Git-owned gitlink");
  const repository = realpathSync(path.join(root, relative));
  if (!repository.startsWith(root + path.sep)) throw new TypeError("source repository: configured source path escapes its owner");
  if (realpathSync(git(repository, ["rev-parse", "--show-toplevel"])) !== repository || remote(repository) !== declaredOwner) throw new TypeError("source repository: initialized source origin does not match its configured custody");
  return Object.freeze({ repository, sourceRepository: declaredOwner });
}
