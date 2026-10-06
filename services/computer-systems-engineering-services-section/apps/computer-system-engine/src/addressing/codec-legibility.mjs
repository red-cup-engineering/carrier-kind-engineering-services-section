/**
 * codecs/legibility - the extension-admissible reading of the mounted codec
 * families, for path-only material classification (monitoring/filesystem/legibility).
 *
 * Recognition in api/catalog.mts is content-sniffed: a projector opens a
 * resource to decide if it recognizes it. This reading is coarser and purely
 * structural — the file extension a mounted codec family is actually built
 * to admit — read off `src/codecs`' own directory structure, so a whole-
 * conurbation walk can classify material without opening every file. It is
 * deliberately a subset of the 71 codec directories: most of `text/json`'s
 * siblings (cloudevents, hook, feed, identity, provenance, schema-org,
 * capability, value-settlement, time-anchor,
 * consensus-log, accountable-transaction, json-ld, otlp, sen) are JSON-shaped
 * protocols recognized by content, not by a distinct extension, so they
 * collapse onto the one `json` family here; likewise every `text/xml/*`
 * dialect other than html/svg collapses onto `xml`. `csl` (the bibliographic
 * layer of markdown-vault frontmatter) and `pnpm-lockfile` (the
 * `importers:` subtree of a pnpm-lock.yaml) are content-shape refinements of
 * markdown/yaml with no extension of their own, so they are not separate
 * entries here.
 */

export const codecFamilyAdmissions = Object.freeze([
  Object.freeze({ family: "markdown", codecPath: "text/markdown", extensions: Object.freeze(["md", "markdown"]) }),
  Object.freeze({ family: "lean", codecPath: "text/lean", extensions: Object.freeze(["lean"]) }),
  Object.freeze({ family: "tex", codecPath: "text/tex", extensions: Object.freeze(["tex", "sty", "cls"]) }),
  Object.freeze({ family: "json", codecPath: "text/json", extensions: Object.freeze(["json", "jsonl", "ipynb"]) }),
  Object.freeze({ family: "css", codecPath: "text/css", extensions: Object.freeze(["css"]) }),
  Object.freeze({ family: "html", codecPath: "xml-svg/html", extensions: Object.freeze(["html", "htm"]) }),
  Object.freeze({ family: "svg", codecPath: "xml-svg/svg", extensions: Object.freeze(["svg"]) }),
  Object.freeze({ family: "xml", codecPath: "text/xml", extensions: Object.freeze(["xml", "rss", "atom"]) }),
  Object.freeze({ family: "english-prose", codecPath: "text/english", extensions: Object.freeze(["txt"]) }),
  Object.freeze({ family: "yaml", codecPath: "text/yaml.mts", extensions: Object.freeze(["yaml", "yml"]) }),
  Object.freeze({ family: "toml", codecPath: "text/toml.mts", extensions: Object.freeze(["toml"]) }),
  Object.freeze({ family: "turtle", codecPath: "text/turtle.mts", extensions: Object.freeze(["ttl"]) }),
]);

/** Extension (lowercase, no leading dot) -> codec family name. */
export const codecAdmissibleExtensions = new Map(
  codecFamilyAdmissions.flatMap((admission) => admission.extensions.map((extension) => [extension, admission.family])),
);
