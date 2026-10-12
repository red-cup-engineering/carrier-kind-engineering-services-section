// agents/program-surface/artifacts/content — the content tier: a per-entity cut of the bulk.
//
//   log → state → record → CONTENT
//
// The fourth projection of the same boundary. Where state/record project the
// whole bulk into one file, content projects a *cut*: each accepted entity of a
// view becomes its own term-addressed document, rendered by a content
// projection (default: markdown with YAML frontmatter, the inverse of the
// markdown codec's `markdownDataform`). The cut is an explicit acceptance
// judgment — a window over the entities of the view — not a hidden filter, in
// the sense of geometry/spatial/cut-and-project. Pure: ./store does the I/O.

import { createMarkdownDocument } from "@red-cup-engineering/markdown-engineering-services-section/create-markdown-document";

/**
 * One document in the content cut of a state view.
 *
 * `entity` is the canonical state-view key. The store maps it to a term-addressed
 * path and writes `content` with the given file `type`.
 */

/**
 * Description of how a state view becomes content.
 *
 * `accept` is the explicit cut over entities. `render` owns the document body
 * for accepted entities. The default projection emits markdown for every
 * entity; custom projections can expose only the slice a site, vault, or agent
 * actually needs.
 */

/**
 * Default content projection: markdown with YAML frontmatter for all entities.
 */
export const markdownContent = Object.freeze({
  type: "md",
  render: (_entity, view) => createMarkdownDocument(view),
});

