/**
 * @packageDocumentation
 *
 * projections/site-directory-grammar — the directory-position grammar named
 * in `README.md`'s "directory grammar" section: `dev/` is a site's working
 * area; `dev/content/notes/YYYY/MM/DD/` are its dated working notes. This
 * reads that idiom generically over any path: any directory anywhere may
 * have its own `dev/`, `content/`, and/or `notes/`, and which of the three
 * appear — and in what order — between a directory and its nearest
 * non-grammar ancestor (its site) changes what the directory IS. `notes/`
 * directly under a site is that site's own notes; `dev/content/notes/` under
 * the same site are the dated notes that are the content of that site's
 * working area — same tokens, different position, different reading.
 *
 * Pure: no filesystem access, built only on the lexical path helpers in
 * `./path.mjs`. `content/` (the already-published-tier boundary owned by
 * `src/presentation/boundaries/content-store`) is explicitly excluded, the
 * same law `services/filesystem`'s `enclosingClaimDataRoot` states for
 * settlement roots: a directory named `data` is never itself a site.
 */

/** The three recognized directory-grammar tokens, ranked by how far a
 *  directory sits from its site: `dev` outermost, `notes` innermost. */

const TOKEN_RANK = Object.freeze({
  dev: 0,
  content: 1,
  notes: 2,
});

function grammarToken(name) {
  return name === "dev" || name === "content" || name === "notes" ? name : undefined;
}

/** One directory (or a resource beneath it) read by its position in the
 *  `dev`/`content`/`notes` grammar. */

  

  

/** Whether a value is a site-directory-grammar position. */
export function isSiteDirectoryGrammarPosition(value) {
  return value !== null && typeof value === "object"
    && (value)["kind"] === "metroplat.site.directory-grammar-position";
}

const LABEL = Object.freeze({
  dev: "dev",
  content: "content",
  notes: "notes",
});

/** Fold an outermost-first chain into "the X of the Y of the Z of <site>". */
function renderPosition(chain, site) {
  const innermostFirst = [...chain].reverse().map((token) => LABEL[token]);
  return `the ${innermostFirst.join(" of the ")} of ${site}`;
}

/**
 * Read a path's position in the `dev`/`content`/`notes` directory grammar.
 *
 * Walks up from `path` to the nearest ancestor (inclusive) named `dev`,
 * `content`, or `notes` — everything below that ancestor is `descent`, held
 * material rather than grammar. From there it keeps walking up while each
 * next ancestor is the next-outer grammar token (`content` before `dev`,
 * `notes` before `content`), collecting `chain`. It stops at the first
 * ancestor that is not the next token in that order; that ancestor's name is
 * `site` — unless it is literally `data`, in which case the whole path is
 * not recognized (this is the `content/` published-tier exclusion).
 *
 * Returns `null` when no ancestor of `path` is a grammar token at all.
 */
export function siteDirectoryGrammarOf(path) {
  const descent = [];
  let cursor = path;
  let anchor = grammarToken(pathBasename(cursor));
  while (anchor === undefined) {
    descent.unshift(pathBasename(cursor));
    const parent = pathParent(cursor);
    if (parent === null) return null;
    cursor = parent;
    anchor = grammarToken(pathBasename(cursor));
  }

  const chain = [anchor];
  let rank = TOKEN_RANK[anchor];
  for (;;) {
    const parent = pathParent(cursor);
    if (parent === null) return null;
    const parentName = pathBasename(parent);
    const parentToken = grammarToken(parentName);
    if (parentToken === undefined || TOKEN_RANK[parentToken] >= rank) {
      if (parentName === "data") return null;
      const orderedChain = Object.freeze([...chain].reverse());
      return Object.freeze({
        kind: "metroplat.site.directory-grammar-position",
        path,
        site: parentName,
        chain: orderedChain,
        role: orderedChain[orderedChain.length - 1],
        descent: Object.freeze(descent),
        renderedPosition: renderPosition(orderedChain, parentName),
      });
    }
    chain.push(parentToken);
    rank = TOKEN_RANK[parentToken];
    cursor = parent;
  }
}import { pathBasename, pathParent } from "@red-cup-engineering/computer-filepath-engineering-services-section/posix";

