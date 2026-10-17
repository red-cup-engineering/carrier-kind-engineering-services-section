// schema.org JSON-LD, Open Graph and Twitter Card conformance. Every node the builders write is held to
// the published schema.org vocabulary (data/schema-vocabulary.json) by the validator, and every page
// head survives the round trip through a real HTML parser.
import assert from "node:assert/strict";
import test from "node:test";
import {
  ARTICLE_TYPES, article, articleFromFiniteAlgebra, articleFromSelectedCells, breadcrumbList, escapeAttr, escapeScriptJson, extractJsonLd, extractSocialMeta,
  foldMetaProps, foldSchemaProps, graph, headFromFiniteAlgebra, imageObject, ldScript, metaTagsString, openGraphTags, organization, person, schemaVocabulary, socialMetaTags,
  socialTagsFromFiniteAlgebra, socialTagsFromSelectedCells, twitterTags, validateSchemaNode, webPage, webSite, ancestorsOf,
} from "../src/index.mjs";

const full = {
  type: "BlogPosting", id: "https://example.org/post#article", headline: "Finding chanterelles", description: "Where they grow", url: "https://example.org/post",
  datePublished: "2026-06-05T12:00:00Z", dateModified: "2026-06-06", author: { name: "Ada", url: "https://example.org/ada", image: "https://example.org/ada.jpg", sameAs: ["https://mastodon.example/@ada"] },
  publisher: { name: "Acme", url: "https://example.org/", logo: { url: "https://example.org/logo.png", width: 60, height: 60 } },
  image: ["https://example.org/a.jpg", { url: "https://example.org/b.jpg", caption: "b" }], keywords: ["mushrooms", "field-notes"], language: "en",
};

test("builders carry @context and @type and every node validates against the schema.org vocabulary", () => {
  const nodes = [article(full), person({ name: "Ada", email: "ada@example.org" }), organization("Acme"), webSite({ name: "Acme", url: "https://example.org/", searchUrl: "https://example.org/?q={search_term_string}" }), webPage({ name: "P", url: "https://example.org/p", siteUrl: "https://example.org/" }), breadcrumbList([{ name: "Home", url: "https://example.org/" }, { name: "Post", url: "https://example.org/post" }]), imageObject({ url: "https://example.org/i.jpg", width: 10 })];
  for (const node of nodes) {
    const { valid, problems } = validateSchemaNode(node, { requireContext: node["@context"] !== undefined });
    assert.deepEqual(problems, [], JSON.stringify(node));
    assert.equal(valid, true);
  }
  assert.equal(article(full)["@context"], "https://schema.org");
  assert.equal(article(full)["@type"], "BlogPosting");
  for (const type of ARTICLE_TYPES) assert.ok(schemaVocabulary().types[type], `${type} is a schema.org type`);
  assert.deepEqual(validateSchemaNode(graph(article(full), webSite({ name: "Acme", url: "https://example.org/" }), breadcrumbList([{ name: "Home" }]))).problems, []);
});

test("an Article states what search engines read: dates, nested author and publisher, mainEntityOfPage, images, keywords", () => {
  const a = article(full);
  assert.deepEqual(a.mainEntityOfPage, { "@type": "WebPage", "@id": "https://example.org/post" });
  assert.deepEqual([a.author["@type"], a.author.name, a.publisher["@type"], a.publisher.logo["@type"]], ["Person", "Ada", "Organization", "ImageObject"]);
  assert.deepEqual(a.image, ["https://example.org/a.jpg", { "@type": "ImageObject", url: "https://example.org/b.jpg", caption: "b" }]);
  assert.deepEqual(a.keywords, ["mushrooms", "field-notes"]);
  assert.equal(article({ headline: "H", keywords: ["one"] }).keywords, "one");
  assert.deepEqual(Object.keys(article({ headline: "H", description: "", keywords: [], author: null })), ["@context", "@type", "headline"], "empty and null values are omitted");
});

test("values schema.org would not accept are errors: relative URLs, malformed dates, unknown article types", () => {
  assert.throws(() => article({ url: "/relative" }), /absolute URL/);
  assert.throws(() => article({ datePublished: "June 5th" }), /ISO 8601/);
  assert.throws(() => article({ datePublished: "2026-02-31" }), /ISO 8601/);
  assert.throws(() => article({ type: "Recipe" }), /unsupported article type/);
  assert.throws(() => webSite({ searchUrl: "https://example.org/?q=" }), /search_term_string/);
  assert.throws(() => person({ name: "A", url: "ada" }), /absolute URL/);
});

test("the SearchAction and BreadcrumbList have the shapes consumers read", () => {
  const site = webSite({ name: "Acme", url: "https://example.org/", searchUrl: "https://example.org/?q={search_term_string}" });
  assert.deepEqual(site.potentialAction, { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: "https://example.org/?q={search_term_string}" }, "query-input": "required name=search_term_string" });
  const crumbs = breadcrumbList([{ name: "Home", url: "https://example.org/" }, { url: "https://skipped.example/" }, { name: "Post" }]);
  assert.deepEqual(crumbs.itemListElement.map((c) => [c["@type"], c.position, c.name, c.item]), [["ListItem", 1, "Home", "https://example.org/"], ["ListItem", 2, "Post", undefined]]);
});

test("the validator reports typos, wrong domains, wrong nested types, bad literals and a missing context", () => {
  const problems = (node, options) => validateSchemaNode(node, options).problems.map((p) => p.message);
  assert.deepEqual(problems({ "@context": "https://schema.org", "@type": "Article", headlin: "typo" }), ["headlin is not a schema.org property"]);
  assert.deepEqual(problems({ "@context": "https://schema.org", "@type": "Person", headline: "wrong type" }), ["headline does not apply to Person"]);
  assert.deepEqual(problems({ "@context": "https://schema.org", "@type": "Article", author: { "@type": "WebSite", name: "x" } }), ["WebSite is not a valid value of author"]);
  assert.deepEqual(problems({ "@context": "https://schema.org", "@type": "Article", datePublished: "yesterday" }), ["datePublished should be an ISO 8601 date or date-time"]);
  assert.deepEqual(problems({ "@context": "https://schema.org", "@type": "Nonsense" }), ["unknown type Nonsense"]);
  assert.deepEqual(problems({ "@type": "Article" }), ["no schema.org @context"]);
  assert.deepEqual(problems({ "@type": "Article" }, { requireContext: false }), []);
  assert.deepEqual(problems({ "@context": "https://schema.org", name: "no type" }), ["a node needs an @type"]);
  assert.deepEqual(problems({ "@context": { "@vocab": "https://schema.org/" }, "@type": "Article", headline: "ok" }), []);
  assert.deepEqual(problems({ "@context": "http://schema.org", "@type": ["Article", "Thing"], headline: "ok" }), []);
  assert.deepEqual(problems({ "@context": "https://schema.org", "@type": "Person", name: "Ada", worksFor: { "@type": "Organization", name: "Acme" } }), []);
  assert.deepEqual(problems({ "@context": "https://schema.org", "@type": "Event", startDate: "soon", maximumAttendeeCapacity: "many" }), ["startDate should be an ISO 8601 date or date-time", "maximumAttendeeCapacity should be an integer"]);
  assert.ok(ancestorsOf("BlogPosting").has("CreativeWork"));
  assert.ok(ancestorsOf("BlogPosting").has("Thing"));
});

test("a JSON-LD block cannot close its own script element, and still parses to the same JSON", () => {
  const hostile = article({ headline: '</script><script>alert("x")</script> & <!-- \u2028\u2029', url: "https://example.org/p" });
  const html = `<!doctype html><head>${ldScript(hostile)}</head><body>after</body>`;
  assert.equal((html.match(/<script/gu) ?? []).length, 1);
  assert.equal(escapeScriptJson('{"a":"</script>"}'), '{"a":"\\u003c/script\\u003e"}');
  const { nodes, errors } = extractJsonLd(html);
  assert.deepEqual(errors, []);
  assert.deepEqual(nodes, [JSON.parse(JSON.stringify(hostile))]);
  assert.equal(extractJsonLd(`<script type="application/ld+json">{not json</script>`).errors.length, 1);
  assert.equal(ldScript(undefined), "");
});

test("Open Graph: the four required properties, the article properties, and tags that survive a parser", () => {
  const tags = openGraphTags({ title: 'A "quoted" <title>', type: "article", image: ["https://example.org/a.jpg", "https://example.org/b.jpg"], url: "https://example.org/p", description: "d & e", siteName: "Acme", publishedTime: "2026-06-05T12:00:00Z", modifiedTime: "2026-06-06T00:00:00Z", author: "https://example.org/ada", tags: ["x", "y"] });
  const meta = extractSocialMeta(`<head>${metaTagsString(tags)}</head>`);
  assert.deepEqual(meta["og:title"], ['A "quoted" <title>']);
  assert.deepEqual([meta["og:type"], meta["og:url"], meta["og:description"], meta["og:site_name"]], [["article"], ["https://example.org/p"], ["d & e"], ["Acme"]]);
  assert.deepEqual(meta["og:image"], ["https://example.org/a.jpg", "https://example.org/b.jpg"]);
  assert.deepEqual([meta["article:published_time"], meta["article:modified_time"], meta["article:author"], meta["article:tag"]], [["2026-06-05T12:00:00Z"], ["2026-06-06T00:00:00Z"], ["https://example.org/ada"], ["x", "y"]]);
  assert.equal(extractSocialMeta(`<head>${metaTagsString(openGraphTags({ title: "T", url: "https://example.org/" }))}</head>`)["og:type"][0], "website", "website is the default og:type");
  assert.equal(extractSocialMeta(metaTagsString(openGraphTags({ title: "T", type: "website", publishedTime: "x" })))["article:published_time"], undefined, "article:* only for articles");
  assert.throws(() => openGraphTags({ type: "blog" }), /og:type/);
  assert.equal(escapeAttr(`"'<&>`), "&quot;&#39;&lt;&amp;&gt;");
});

test("Twitter Cards: summary_large_image with an image, summary without; the first image only", () => {
  const withImage = extractSocialMeta(metaTagsString(twitterTags({ title: "T", image: ["https://example.org/a.jpg", "https://example.org/b.jpg"], site: "@acme", creator: "@ada" })));
  assert.deepEqual([withImage["twitter:card"], withImage["twitter:image"], withImage["twitter:site"], withImage["twitter:creator"]], [["summary_large_image"], ["https://example.org/a.jpg"], ["@acme"], ["@ada"]]);
  assert.deepEqual(extractSocialMeta(metaTagsString(twitterTags({ title: "T" })))["twitter:card"], ["summary"]);
  assert.deepEqual(extractSocialMeta(metaTagsString(twitterTags({ card: "player" })))["twitter:card"], ["player"]);
  assert.throws(() => twitterTags({ card: "poster" }), /twitter:card/);
  const both = socialMetaTags({ title: "T", url: "https://example.org/", image: "https://example.org/i.jpg" });
  assert.ok(both.findIndex((t) => t.includes("og:title")) < both.findIndex((t) => t.includes("twitter:card")), "Open Graph first");
});

const algebra = {
  affirmed: [{ predicate: "title", object: "Hello" }, { predicate: "published", object: "2026-06-05T12:00:00Z" }, { predicate: "tag", object: "a" }, { predicate: "tag", object: "b" }, { predicate: "photo", object: "https://example.org/p.jpg" }, { predicate: "url", object: "https://example.org/hello" }, { predicate: "unknown", object: "?" }],
  denied: [{ predicate: "summary", object: "retracted" }],
  contradicted: [{ predicate: "author", affirmedBy: ["a1"], deniedBy: ["d1"] }],
};
const selected = algebra.affirmed.map((cell) => ({ cell }));

test("settled knowledge becomes structured data: affirmed cells only, unknown predicates skipped, never guessed", () => {
  const a = articleFromFiniteAlgebra(algebra);
  assert.deepEqual([a.headline, a.datePublished, a.keywords, a.image, a.url, a.description, a.author], ["Hello", "2026-06-05T12:00:00Z", ["a", "b"], "https://example.org/p.jpg", "https://example.org/hello", undefined, undefined]);
  assert.deepEqual(foldSchemaProps([{ predicate: "nope", object: 1 }, { predicate: "title", object: "" }]), {});
  assert.deepEqual(foldMetaProps([{ predicate: "tag", object: "x" }, { predicate: "tag", object: "y" }, { predicate: "title", object: "T" }]), { tags: ["x", "y"], title: "T" });
  assert.deepEqual(validateSchemaNode(a).problems, []);
});

test("no drift: a settled algebra and chosen cells give byte-identical JSON-LD and meta tags", () => {
  assert.equal(JSON.stringify(articleFromFiniteAlgebra(algebra)), JSON.stringify(articleFromSelectedCells(selected)));
  assert.deepEqual(socialTagsFromFiniteAlgebra(algebra, { siteName: "Acme" }), socialTagsFromSelectedCells(selected, { siteName: "Acme" }));
  const head = headFromFiniteAlgebra(algebra, { article: { type: "BlogPosting" }, meta: { siteName: "Acme" }, site: { name: "Acme", url: "https://example.org/" }, breadcrumbs: [{ name: "Home", url: "https://example.org/" }] });
  assert.equal(head.jsonLd["@graph"].length, 3);
  assert.deepEqual(validateSchemaNode(head.jsonLd).problems, []);
  assert.deepEqual(extractJsonLd(`<head>${head.jsonLdScript}</head>`).nodes, [head.jsonLd]);
  assert.equal(JSON.stringify(headFromFiniteAlgebra(algebra)), JSON.stringify(headFromFiniteAlgebra(algebra)), "deterministic");
});
