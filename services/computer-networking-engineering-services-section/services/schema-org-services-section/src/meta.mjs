/**
 * meta -- the unfurl surfaces: Open Graph (https://ogp.me; `<meta property="og:*">`) and Twitter/X Cards
 * (`<meta name="twitter:*">`). The four required Open Graph properties are `og:title`, `og:type`,
 * `og:image` and `og:url`; an `article` adds the `article:*` properties. A card is `summary_large_image`
 * when there is an image, else `summary`.
 */
import { metaTag } from "./html.mjs";

export const OG_TYPES = Object.freeze(["website", "article", "profile", "book", "music.song", "music.album", "music.playlist", "music.radio_station", "video.movie", "video.episode", "video.tv_show", "video.other"]);
export const TWITTER_CARDS = Object.freeze(["summary", "summary_large_image", "app", "player"]);

const each = (out, keyAttribute, key, value) => {
  if (value === null || value === undefined) return;
  for (const v of Array.isArray(value) ? value : [value]) { const tag = metaTag(keyAttribute, key, v); if (tag) out.push(tag); }
};

/** Open Graph tags from `{ title, type?, image?, url, description?, siteName?, publishedTime?, modifiedTime?, author?, tags? }`. */
export function openGraphTags(props = {}) {
  const type = props.type ?? "website";
  if (!OG_TYPES.includes(type)) throw new TypeError(`unsupported og:type ${type}`);
  const out = [];
  each(out, "property", "og:title", props.title);
  each(out, "property", "og:type", type);
  each(out, "property", "og:image", props.image);
  each(out, "property", "og:url", props.url);
  each(out, "property", "og:description", props.description);
  each(out, "property", "og:site_name", props.siteName);
  each(out, "property", "og:locale", props.locale);
  if (type === "article") {
    each(out, "property", "article:published_time", props.publishedTime);
    each(out, "property", "article:modified_time", props.modifiedTime);
    each(out, "property", "article:author", props.author);
    each(out, "property", "article:tag", props.tags);
  }
  return out;
}

/** Twitter Card tags from `{ card?, title, description?, image?, site?, creator? }`. */
export function twitterTags(props = {}) {
  const firstImage = (Array.isArray(props.image) ? props.image : [props.image]).find((x) => x !== null && x !== undefined && x !== "");
  const card = props.card ?? (firstImage ? "summary_large_image" : "summary");
  if (!TWITTER_CARDS.includes(card)) throw new TypeError(`unsupported twitter:card ${card}`);
  const out = [];
  each(out, "name", "twitter:card", card);
  each(out, "name", "twitter:title", props.title);
  each(out, "name", "twitter:description", props.description);
  each(out, "name", "twitter:image", firstImage);
  each(out, "name", "twitter:site", props.site);
  each(out, "name", "twitter:creator", props.creator);
  return out;
}

/** Open Graph, then Twitter. */
export const socialMetaTags = (props = {}) => [...openGraphTags(props), ...twitterTags(props)];

/** Tags joined for a document head. */
export const metaTagsString = (tags) => (tags ?? []).join("\n");
