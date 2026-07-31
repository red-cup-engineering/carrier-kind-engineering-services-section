/**
 * gitmodules-file-codec-service - parse and encode `.gitmodules` files, and
 * read the two on-disk shapes that report submodule pin state
 * (`git submodule status` lines and raw `ls-tree`/index gitlink lines).
 *
 * Rescued from the legacy `git-mark.mts` copies at
 * `red-cup-engineering/src/content/assets/legacy/2026-06-27-agential-relationality/{organizing,services/organizing}/src/git-mark.mts`
 * (those two copies are byte-identical to each other). The `apps/computing`
 * and `computing` copies share the filename but implement a different,
 * unrelated module (git status/log/refs/remotes carriers over an
 * event/observation substrate) and contain none of `parseGitmodules`,
 * `encodeGitmodules`, or `GitSubmoduleStatusEntry` — they were not usable
 * source for this seat.
 *
 * The organizing copy's `gitSubmoduleCover` function (and its
 * `connectedComponents` helper) computed a Cech-nerve-style cover over
 * submodule entries using the organizing package's `coverCarrier`/`Cover`
 * types from `./host-neutral-carriers.mjs`. That is organizing's own
 * cover-model concern, not a `.gitmodules` codec concern, and it was
 * separable (only those two symbols touched it), so it was dropped here.
 * Everything else below is transcribed as plain JavaScript rather than
 * TypeScript (`.mts`): this section has no established `tsc`-based
 * compile/test path for `.mts` sources, so a `.mjs` transcription keeps
 * `node --check` and `node --test` sufficient without adding a build step.
 */

/**
 * @typedef {Readonly<{
 *   name: string,
 *   path: string,
 *   url: string,
 *   branch?: string,
 * }>} GitmoduleEntry
 */

/**
 * @typedef {Readonly<{
 *   path: string,
 *   commit: string,
 *   status: "pinned" | "uninitialized" | "modified" | "merged",
 *   raw: string,
 * }>} GitSubmoduleStatusEntry
 */

/**
 * Parse a `.gitmodules` file's text into its submodule entries, sorted by
 * path.
 *
 * @param {string} text
 * @returns {readonly GitmoduleEntry[]}
 */
export function parseGitmodules(text) {
  const entries = [];
  let current;
  const flush = () => {
    if (current?.path !== undefined && current.url !== undefined) {
      entries.push(Object.freeze({
        name: current.name,
        path: current.path,
        url: current.url,
        ...(current.branch === undefined ? {} : { branch: current.branch }),
      }));
    }
  };
  for (const raw of text.split(/\r?\n/u)) {
    const section = /^\s*\[submodule\s+"(.+)"\]\s*$/u.exec(raw);
    if (section?.[1] !== undefined) {
      flush();
      current = { name: section[1] };
      continue;
    }
    const field = /^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*?)\s*$/u.exec(raw);
    if (current === undefined || field?.[1] === undefined || field[2] === undefined) continue;
    if (field[1] === "path") current.path = normalizePath(field[2]);
    else if (field[1] === "url") current.url = field[2];
    else if (field[1] === "branch") current.branch = field[2];
  }
  flush();
  return Object.freeze(entries.sort((left, right) => left.path.localeCompare(right.path)));
}

/**
 * Encode submodule entries back into `.gitmodules` file text, sorted by
 * path.
 *
 * @param {readonly GitmoduleEntry[]} entries
 * @returns {string}
 */
export function encodeGitmodules(entries) {
  return entries
    .slice()
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((entry) => [
      `[submodule "${entry.name}"]`,
      `\tpath = ${entry.path}`,
      `\turl = ${entry.url}`,
      ...(entry.branch === undefined ? [] : [`\tbranch = ${entry.branch}`]),
    ].join("\n"))
    .join("\n") + (entries.length === 0 ? "" : "\n");
}

/**
 * Parse `git submodule status` output lines into status entries.
 *
 * @param {string} text
 * @returns {readonly GitSubmoduleStatusEntry[]}
 */
export function parseGitSubmoduleStatus(text) {
  return Object.freeze(text.split(/\r?\n/u).flatMap((line) => {
    if (line.trim().length === 0) return [];
    const marker = line[0] ?? " ";
    const parts = line.slice(1).trim().split(/\s+/u);
    const commit = parts[0] ?? "";
    const path = parts[1] ?? "";
    if (commit === "" || path === "") return [];
    return [Object.freeze({
      path: normalizePath(path),
      commit,
      status: marker === "-" ? "uninitialized" : marker === "+" ? "modified" : marker === "U" ? "merged" : "pinned",
      raw: line,
    })];
  }).sort((left, right) => left.path.localeCompare(right.path)));
}

/**
 * Parse raw gitlink lines (e.g. from `git ls-tree`: mode/hash/stage/path,
 * mode 160000) into status entries.
 *
 * @param {string} text
 * @returns {readonly GitSubmoduleStatusEntry[]}
 */
export function parseGitlinks(text) {
  return Object.freeze(text.split(/\r?\n/u).flatMap((line) => {
    const match = /^160000\s+([A-Fa-f0-9]{40,64})\s+\d+\s+(.+)$/u.exec(line.trim());
    if (match?.[1] === undefined || match[2] === undefined) return [];
    return [Object.freeze({
      path: normalizePath(match[2]),
      commit: match[1],
      status: "pinned",
      raw: line,
    })];
  }).sort((left, right) => left.path.localeCompare(right.path)));
}

function normalizePath(value) {
  return value.replace(/\\/gu, "/").replace(/^\.\//u, "");
}
