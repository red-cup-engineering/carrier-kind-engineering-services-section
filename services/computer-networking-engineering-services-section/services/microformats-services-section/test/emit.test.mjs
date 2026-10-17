// Emission is held to the parser: what hEntry/hCard/hFeed write, parseMicroformats reads back, and
// each property type lands where the parsing specification reads it.
import assert from "node:assert/strict";
import test from "node:test";
import { classes, dt, e, el, entryFromFiniteAlgebra, escapeHtml, hCard, hCite, hEntry, hFeed, p, parseMicroformats, propsFromPairs, u } from "../src/index.mjs";

const BASE = "https://example.org/";
const parse = (html) => parseMicroformats(html, { baseUrl: BASE });

test("each property type lands in the element and attribute the parser reads", () => {
  assert.equal(p("name", "A & B"), '<span class="p-name">A &amp; B</span>');
  assert.equal(u("url", "https://x.example/a?b=1&c=2"), '<a class="u-url" href="https://x.example/a?b=1&amp;c=2">https://x.example/a?b=1&amp;c=2</a>');
  assert.equal(u("photo", "https://x.example/p.jpg", { tag: "img", alt: "me" }), '<img class="u-photo" src="https://x.example/p.jpg" alt="me">');
  assert.equal(dt("published", "2026-06-05T12:00:00Z"), '<time class="dt-published" datetime="2026-06-05T12:00:00Z">2026-06-05T12:00:00Z</time>');
  assert.equal(e("content", "<p>x <em>y</em></p>"), '<div class="e-content"><p>x <em>y</em></p></div>');
  assert.equal(classes("h-entry", "h-entry extra", "", null), "h-entry extra");
  assert.equal(escapeHtml(`<"'&>`), "&lt;&quot;&#39;&amp;&gt;");
  assert.equal(el("br"), "<br>");
});

const entry = {
  name: "Finding chanterelles", author: { name: "Ada", url: "https://example.org/ada" },
  published: "2026-06-05T12:00:00Z", url: "https://example.org/notes/1", content: "<p>They grow under <em>oaks</em>.</p>",
  category: ["mushrooms", "field-notes"], inReplyTo: { name: "Their post", url: "https://other.example/p" },
  syndication: ["https://mastodon.example/2"],
};

test("round trip: an h-entry parses back to the properties it named", () => {
  const { items } = parse(hEntry(entry));
  assert.equal(items.length, 1);
  const [item] = items;
  assert.deepEqual(item.type, ["h-entry"]);
  assert.deepEqual(item.properties.name, ["Finding chanterelles"]);
  assert.deepEqual(item.properties.published, ["2026-06-05T12:00:00Z"]);
  assert.deepEqual(item.properties.url, ["https://example.org/notes/1"]);
  assert.deepEqual(item.properties.category, ["mushrooms", "field-notes"]);
  assert.deepEqual(item.properties.syndication, ["https://mastodon.example/2"]);
  assert.equal(item.properties.content[0].html, "<p>They grow under <em>oaks</em>.</p>");
  assert.equal(item.properties.content[0].value, "They grow under oaks.");
  const author = item.properties.author[0];
  assert.deepEqual([author.type, author.properties.name, author.properties.url, author.value], [["h-card"], ["Ada"], ["https://example.org/ada"], "Ada"]);
  const reply = item.properties["in-reply-to"][0];
  assert.deepEqual([reply.type, reply.properties.name, reply.properties.url, reply.value], [["h-cite"], ["Their post"], ["https://other.example/p"], "https://other.example/p"]);
});

test("responses by URL are u-properties; likes, reposts and bookmarks carry their URL", () => {
  const { items } = parse(hEntry({ likeOf: "https://other.example/a", repostOf: ["https://other.example/b"], bookmarkOf: "https://other.example/c", inReplyTo: "https://other.example/d", rsvp: "yes" }));
  const props = items[0].properties;
  assert.deepEqual([props["like-of"], props["repost-of"], props["bookmark-of"], props["in-reply-to"], props.rsvp], [["https://other.example/a"], ["https://other.example/b"], ["https://other.example/c"], ["https://other.example/d"], ["yes"]]);
});

test("an h-card round trips its contact properties; a photo is a u-photo with alt", () => {
  const { items } = parse(hCard({ name: "Ada", url: "https://example.org/ada", photo: "https://example.org/ada.jpg", photoAlt: "Ada", email: "ada@example.org", tel: "+1-555-0100", org: "Analytical", note: "Hi" }));
  const props = items[0].properties;
  assert.deepEqual(props.name, ["Ada"]);
  assert.deepEqual(props.photo, [{ value: "https://example.org/ada.jpg", alt: "Ada" }]);
  assert.deepEqual([props.email, props.tel, props.org, props.note], [["mailto:ada@example.org"], ["+1-555-0100"], ["Analytical"], ["Hi"]]);
  assert.deepEqual(parse(hCite({ name: "N", url: "https://other.example/p", author: "Bo", published: "2026-01-01", content: "<b>c</b>" })).items[0].properties.author, ["Bo"]);
});

test("an h-feed nests its entries as children", () => {
  const { items } = parse(hFeed([{ name: "One", url: "https://example.org/1" }, { name: "Two", url: "https://example.org/2" }], { name: "Blog", url: "https://example.org/" }));
  assert.deepEqual(items[0].type, ["h-feed"]);
  assert.deepEqual(items[0].children.map((c) => c.properties.name[0]), ["One", "Two"]);
  assert.deepEqual(items[0].properties.name, ["Blog"]);
});

test("values are escaped exactly once; only e-content is verbatim", () => {
  const { items } = parse(hEntry({ name: '<script>alert("x")</script>', content: "<p>ok</p>" }));
  assert.equal(items[0].properties.name[0], '<script>alert("x")</script>');
  assert.ok(!hEntry({ name: "<b>" }).includes("<b>"));
});

test("emission is deterministic, and settled cells lift only when affirmed", () => {
  assert.equal(hEntry(entry), hEntry(entry));
  const html = entryFromFiniteAlgebra({ affirmed: [{ predicate: "title", object: "T" }, { predicate: "tag", object: "a" }, { predicate: "tag", object: "b" }, { predicate: "unknown", object: "?" }], denied: [{ predicate: "summary", object: "no" }] });
  const props = parse(html).items[0].properties;
  assert.deepEqual([props.name, props.category, props.summary], [["T"], ["a", "b"], undefined]);
  assert.deepEqual(propsFromPairs([{ predicate: "x", object: 1 }]), {});
});
