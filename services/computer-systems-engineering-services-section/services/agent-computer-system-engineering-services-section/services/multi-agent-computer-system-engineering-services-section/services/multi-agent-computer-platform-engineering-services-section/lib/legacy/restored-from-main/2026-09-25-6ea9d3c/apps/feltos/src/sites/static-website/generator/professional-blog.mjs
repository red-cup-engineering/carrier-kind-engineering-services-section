/**
 * integrations/web/core/static-website/generator/professional-blog - dated posts as a static blog.
 *
 * This genre is a bounded recipe over the static-website projection: it admits
 * non-draft Article posts, orders them chronologically, and keeps standalone
 * pages out of the post stream and feeds. Taxonomy term pages are delegated to
 * the shared static-website taxonomy primitive.
 */

import {
  buildStaticWebsite,

} from "./index.mjs";
import { articlesToTermIndexPages } from "@red-cup-engineering/static-site-publisher/sites/static-website/generator/taxonomy";

/** Build a professional-blog output tree from dated Article posts and standalone pages. */
export function buildProfessionalBlog(content, opts) {
  const posts = chronologicalPosts(content.posts);
  const basePath = opts.basePath ?? new URL(opts.websiteUrl).pathname;
  const termAssets = Object.freeze([
    ...articlesToTermIndexPages(posts, { dimension: "tags", basePath, pathPrefix: "tags", includeRoot: true }),
    ...articlesToTermIndexPages(posts, { dimension: "categories", basePath, pathPrefix: "categories", includeRoot: true }),
  ]);
  return buildStaticWebsite({
    articles: posts,
    pages: content.pages ?? [],
    assets: Object.freeze([...(content.assets ?? []), ...termAssets]),
  }, {
    ...opts,
    includeDrafts: false,
    indexOrder: "input",
  });
}

function chronologicalPosts(posts) {
  return Object.freeze(posts
    .filter((post) => !post.draft)
    .map((post) => Object.freeze({ ...post }))
    .sort((left, right) => newestFirst(left, right)));
}

function newestFirst(left, right) {
  return publishedTime(right) - publishedTime(left)
    || left.slug.localeCompare(right.slug);
}

function publishedTime(article) {
  const time = Date.parse(article.date);
  if (Number.isNaN(time)) throw new TypeError(`buildProfessionalBlog: article ${article.slug} has an unparseable date ${article.date}`);
  return time;
}
