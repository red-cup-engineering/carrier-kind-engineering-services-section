/**
 * integrations/web/core/static-website/generator/professional-blog - dated posts as a static blog.
 *
 * This genre is a bounded recipe over the static-website projection: it admits
 * non-draft Article posts, orders them chronologically, and keeps standalone
 * pages out of the post stream and feeds. Taxonomy term pages are delegated to
 * the shared static-website taxonomy primitive.
 */
import type { Article } from "../../article/index.mts";
import {
  buildStaticWebsite,
  type StaticWebsiteArticleContent,
  type StaticWebsiteAsset,
  type StaticWebsiteFileMap,
  type StaticWebsiteOptions,
  type StaticWebsitePageContent,
} from "./index.mts";
import { articlesToTermIndexPages } from "./taxonomy.mts";

export type ProfessionalBlogFileMap = StaticWebsiteFileMap;
export type ProfessionalBlogPostContent = StaticWebsiteArticleContent;
export type ProfessionalBlogPageContent = StaticWebsitePageContent;

export interface ProfessionalBlogContentInput {
  readonly posts: readonly ProfessionalBlogPostContent[];
  readonly pages?: readonly ProfessionalBlogPageContent[];
  readonly assets?: readonly StaticWebsiteAsset[];
}

export interface ProfessionalBlogOptions extends Omit<StaticWebsiteOptions, "indexOrder"> {
}

/** Build a professional-blog output tree from dated Article posts and standalone pages. */
export function buildProfessionalBlog(content: ProfessionalBlogContentInput, opts: ProfessionalBlogOptions): ProfessionalBlogFileMap {
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

function chronologicalPosts(posts: readonly ProfessionalBlogPostContent[]): readonly ProfessionalBlogPostContent[] {
  return Object.freeze(posts
    .filter((post) => !post.draft)
    .map((post) => Object.freeze({ ...post }))
    .sort((left, right) => newestFirst(left, right)));
}

function newestFirst(left: Article, right: Article): number {
  return publishedTime(right) - publishedTime(left)
    || left.slug.localeCompare(right.slug);
}

function publishedTime(article: Article): number {
  const time = Date.parse(article.date);
  if (Number.isNaN(time)) throw new TypeError(`buildProfessionalBlog: article ${article.slug} has an unparseable date ${article.date}`);
  return time;
}
