/**
 * The agency registry held by a long-running process.
 *
 * Reading the registry whole walks every directory under its root to find where the pools sit
 * (some twenty thousand in the house tree, seconds of synchronous reads), though the pools move
 * rarely and their records only when someone authors one. A held registry walks once, then
 * watches each directory it walked: a directory created or removed there is walked or forgotten,
 * a change inside a pool marks the records moved, and so does a change to the acts log. A read
 * re-reads the records (a fraction of a second) only when something moved, and keeps the held
 * registry, identity and all, when the re-read revision is unchanged.
 *
 * Where directories cannot be watched (the platform refuses, or the watch limit is reached) the
 * holder reads the registry whole at most once a minute, as an unwatched reader must.
 */
import { lstatSync, readdirSync, statSync, watch } from "node:fs";
import path from "node:path";
import { agencyActsLog, readAgencyActs } from "./acts.mjs";
import { agencyPoolAt, agencyPools, agencyWalksInto, readAgency } from "./index.mjs";

const UNWATCHED_REFRESH_MS = 60_000;
const holders = new Map();

const holderOf = (root) => {
  const key = path.resolve(root);
  if (!holders.has(key)) holders.set(key, holdAgency(key));
  return holders.get(key);
};

/** The registry under `root`, current with every change the watches have reported. */
export function agencyAt(root, { log = agencyActsLog() } = {}) {
  return holderOf(root).read(log);
}

/** Where the pools under `root` sit, current with the watches: for a reader that must re-read
 *  the records themselves (an act checking its precondition) without walking the tree. */
export function agencyPoolsAt(root) {
  return holderOf(root).pools();
}

/** Tell the holder this process just wrote `file` (or something, when omitted) under `root`, so
 *  the next read sees it without waiting for the watch to report it. */
export function agencyMoved(root, file) {
  holders.get(path.resolve(root))?.moved(file === undefined ? undefined : path.resolve(root, file));
}

/** Stop holding `root`: close its watches. */
export function releaseAgency(root) {
  const key = path.resolve(root);
  holders.get(key)?.close();
  holders.delete(key);
}

/** What identifies the acts log's content without reading it. */
function stampOf(log) {
  if (log === undefined) return "none";
  try { const stat = statSync(log); return `${log}\0${stat.ino}\0${stat.size}\0${stat.mtimeMs}`; } catch { return `${log}\0absent`; }
}

const within = (dir, file) => file === dir || file.startsWith(`${dir}${path.sep}`);

function holdAgency(root) {
  const tree = new Map();   // every directory the walk entered -> its watch
  const pools = new Map();  // every pool directory -> its descriptor
  const poolWatches = new Map(); // a pool directory and its record directories -> their watches
  const entries = new Set(); // entries created or removed in walked directories since the last read
  let recordsMoved = true, unwatched = false, discovered = false, agency, stamp, readAt = 0;

  const unwatch = () => {
    unwatched = true;
    for (const watcher of [...tree.values(), ...poolWatches.values()]) watcher?.close();
  };
  const watchOn = (dir, listener) => {
    if (unwatched) return null;
    try {
      const watcher = watch(dir, { persistent: false }, listener);
      // A watch that fails is a directory to look at again; the root's failing leaves nothing watched.
      watcher.on("error", () => { recordsMoved = true; if (dir === root) unwatch(); else entries.add(dir); });
      return watcher;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      unwatch();
      return null;
    }
  };

  const enter = (dir) => {
    if (tree.has(dir)) return;
    tree.set(dir, watchOn(dir, (type, name) => {
      if (name === null || name === undefined) entries.add(dir);
      else if (type === "rename" && agencyWalksInto(path.basename(name))) entries.add(path.join(dir, name));
    }));
  };
  const keepPool = (pool) => {
    pools.set(pool.dir, pool);
    recordsMoved = true;
    syncPool(pool.dir);
  };
  // A pool's records live in it and one directory down (<id>/<id>.md, <id>/SKILL.md, ...).
  function syncPool(dir) {
    const onRecords = (type, name) => { recordsMoved = true; if (type === "rename") entries.add(dir); };
    if (!poolWatches.has(dir)) poolWatches.set(dir, watchOn(dir, onRecords));
    let present = [];
    try { present = readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => path.join(dir, entry.name)); } catch { /* removed */ }
    for (const sub of present) if (!poolWatches.has(sub)) poolWatches.set(sub, watchOn(sub, () => { recordsMoved = true; }));
    for (const [watched, watcher] of poolWatches) {
      if (watched !== dir && path.dirname(watched) === dir && !present.includes(watched)) { watcher?.close(); poolWatches.delete(watched); }
    }
  }
  const walk = (from) => { for (const pool of agencyPools(root, { from, enter })) keepPool(pool); };
  // Drop everything held at or under `entry`: it was removed, or replaced and walked again.
  function forget(entry) {
    for (const [dir, watcher] of tree) if (within(entry, dir)) { watcher?.close(); tree.delete(dir); }
    for (const [dir, watcher] of poolWatches) if (within(entry, dir)) { watcher?.close(); poolWatches.delete(dir); }
    for (const dir of pools.keys()) if (within(entry, dir)) { pools.delete(dir); recordsMoved = true; }
  }
  const isDirectory = (entry) => { try { return lstatSync(entry).isDirectory(); } catch { return false; } };
  // The held pool at or above `entry`, if any.
  function poolHolding(entry) {
    for (let dir = entry; within(root, dir) && dir !== root; dir = path.dirname(dir)) if (pools.has(dir)) return dir;
    return undefined;
  }
  function settle() {
    if (!discovered) { walk(root); discovered = true; entries.clear(); return; }
    const moved = [...entries];
    entries.clear();
    for (const entry of moved) {
      const holding = poolHolding(entry);
      if (holding !== undefined) { recordsMoved = true; if (isDirectory(holding)) syncPool(holding); else forget(holding); continue; }
      const directory = isDirectory(entry);
      if (tree.has(entry) && directory) { walkAgain(entry); continue; }
      if (tree.has(entry)) forget(entry);
      if (!directory || entry === root || !within(root, entry)) continue;
      const parent = path.dirname(entry);
      if (!tree.has(parent)) continue; // its parent was never walked into: nothing there is ours
      const pool = agencyPoolAt(root, parent, path.basename(entry));
      if (pool) keepPool(pool); else walk(entry);
    }
  }
  // A walked directory whose watch could not name what changed in it: read its entries again.
  function walkAgain(dir) {
    let present;
    try { present = readdirSync(dir, { withFileTypes: true }); } catch { forget(dir); return; }
    const names = new Set(present.filter((entry) => entry.isDirectory() && !entry.isSymbolicLink() && agencyWalksInto(entry.name)).map((entry) => entry.name));
    for (const held of [...tree.keys(), ...pools.keys()]) if (path.dirname(held) === dir && !names.has(path.basename(held))) forget(held);
    for (const name of names) {
      const entry = path.join(dir, name);
      if (tree.has(entry) || pools.has(entry)) continue;
      const pool = agencyPoolAt(root, dir, name);
      if (pool) keepPool(pool); else walk(entry);
    }
  }

  return Object.freeze({
    read(log) {
      if (unwatched) {
        if (agency === undefined || Date.now() - readAt >= UNWATCHED_REFRESH_MS) {
          const read = readAgency(root, { acts: readAgencyActs(log) });
          agency = agency?.revision === read.revision ? agency : read;
          readAt = Date.now();
        }
        return agency;
      }
      settle();
      if (unwatched) return this.read(log);
      const current = stampOf(log);
      if (current !== stamp) { stamp = current; recordsMoved = true; }
      if (recordsMoved) {
        recordsMoved = false;
        const read = readAgency(root, { acts: readAgencyActs(log), pools: [...pools.values()] });
        agency = agency?.revision === read.revision ? agency : read;
        readAt = Date.now();
      }
      return agency;
    },
    pools() {
      if (unwatched) return [...agencyPools(root)];
      settle();
      return [...pools.values()];
    },
    moved(file) {
      recordsMoved = true;
      if (file === undefined || !within(root, file)) return;
      // The highest directory on the way to `file` that no watch covers yet, or the file's own.
      let entry = path.dirname(file);
      while (path.dirname(entry) !== entry && within(root, path.dirname(entry)) && !tree.has(path.dirname(entry)) && !pools.has(path.dirname(entry))) entry = path.dirname(entry);
      entries.add(entry);
    },
    close: unwatch,
  });
}
