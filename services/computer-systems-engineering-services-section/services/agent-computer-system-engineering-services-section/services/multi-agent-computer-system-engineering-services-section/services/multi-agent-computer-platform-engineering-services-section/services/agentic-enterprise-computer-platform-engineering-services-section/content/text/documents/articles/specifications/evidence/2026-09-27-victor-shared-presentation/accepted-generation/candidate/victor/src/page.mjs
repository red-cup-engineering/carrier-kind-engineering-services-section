// The page projection: one cell -> one complete page with the full anatomy.
// Masthead (header), breadcrumb (nav), spine (main), reservoir (aside), colophon (footer).

import { html, raw } from './html.mjs';
import { renderBody, tocOf } from './dialect.mjs';
import { formatReferenceEntry, schemaOrgCitation } from './citations.mjs';
import { socialMetaTags } from '@red-cup-engineering/html-engineering-services-section/page-metadata';
import { schemaTypeOfNote } from '@red-cup-engineering/computer-triplet-serialized-content-engineering-services-section/schema-org';
import { renderTufteDocument } from '@red-cup-engineering/web-page-tiling-engine';

export function renderPage(cell, { site, cells, incoming, resolve, searchEnabled = true, tufteEnabled = true, discovery = {}, canonicalUrl = `${site.baseIri}${cell.name}/` }) {
  const backlinks = groupBy(incoming.get(cell.name) || [], (r) => r.type);
  // Tile ids and their title ids belong to the shell; a body heading never claims one.
  const tileIds = ['catalog-cell', 'contents', 'explore', 'tags', ...Object.keys(backlinks).map((type) => `backlinks-${type}`)];
  const reservedIds = tileIds.flatMap((id) => [id, `${id}-title`]);
  const bodyHtml = renderBody(cell.parsed, { resolve, reservedIds });
  const toc = tocOf(cell.parsed, { reservedIds });
  const jsonLd = pageJsonLd(cell, site, canonicalUrl);
  const social = socialMeta({
    title: cell.title, type: 'article', url: canonicalUrl,
    description: cell.summary, image: resolveSocialImage(cell.frontMatter?.image, site.baseIri),
  });

  const article = html`<article data-pagefind-body data-cell-type="${cell.type}" data-cell-status="${cell.status}">
  ${cell.status === 'absurd' ? html`<aside class="callout callout-caution"><p class="callout-label">Retracted</p><p>This cell is retracted. It remains published because nothing here is deleted.</p></aside>` : ''}
  ${raw(bodyHtml)}
  ${cell.parsed.citations.length ? renderReferenceList(cell.parsed.citations) : ''}
</article>`;
  const tiles = [
    { id: 'catalog-cell', title: site.cellLabel ?? 'Publication', role: 'now', span: 8, html: String(article) },
    ...(toc.length >= 3 ? [{ id: 'contents', title: 'Contents', role: 'aside', span: 4, html: String(html`<nav aria-label="Contents"><ol>${toc.map((heading) => html`<li><a href="#${heading.id}">${heading.text}</a></li>`)}</ol></nav>`) }] : []),
    ...(tufteEnabled || searchEnabled ? [{ id: 'explore', title: 'Explore', role: 'aside', span: 4, html: String(html`<nav aria-label="Explore"><ul>${tufteEnabled ? html`<li><a href="/${cell.name}/neighborhood/">Neighborhood</a></li><li><a href="/atlas/">Atlas</a></li>` : ''}${searchEnabled ? html`<li><a href="/search/">Search</a></li>` : ''}</ul></nav>`) }] : []),
    ...Object.entries(backlinks).map(([type, refs]) => ({ id: `backlinks-${type}`, title: backlinkLabel(type), role: 'aside', span: 4, html: String(html`<ul>${refs.map((reference) => html`<li><a href="${resolve(reference.from)?.href ?? `/${reference.from}/`}">${cells.get(reference.from).title}</a></li>`)}</ul>`) })),
    ...(cell.tags.length ? [{ id: 'tags', title: 'Tagged', role: 'aside', span: 4, html: String(html`<ul>${cell.tags.map((tag) => html`<li>${tag}</li>`)}</ul>`) }] : []),
  ];
  let currentMenuLink = false;
  const navigation = site.menu.map((link) => {
    let current = false;
    try {
      current = !currentMenuLink && new URL(link.href, site.baseIri).href === new URL(canonicalUrl, site.baseIri).href;
    } catch { /* malformed menu URLs are not current */ }
    if (current) currentMenuLink = true;
    return { ...link, current };
  });
  return renderTufteDocument({
    eyebrow: cell.eyebrow || cell.type,
    title: cell.title,
    subtitle: cell.summary,
    navigation: [...navigation, ...(searchEnabled ? [{ href: '/search/', label: 'Search' }] : [])],
    tiles,
    footerHtml: String(html`<p>${cell.dateCreated ? html`Created ${cell.dateCreated} · ` : ''}status ${cell.status} · ${cell.address} · ${site.license}</p>`),
  }, {
    documentTitle: `${cell.title} — ${site.name}`,
    language: site.language,
    styles: site.tufteStyles,
    headHtml: String(html`${cell.summary ? html`<meta name="description" content="${cell.summary}">` : ''}<link rel="canonical" href="${canonicalUrl}">${social}${discoveryLinks(discovery)}<script type="application/ld+json">${raw(JSON.stringify(jsonLd))}</script>`),
  });
}

export function renderIndexPage(cellsSorted, { site, searchEnabled = true, discovery = {}, chaptersByPaper = new Map() }) {
  const social = socialMeta({ title: site.name, type: 'website', url: site.baseIri });
  const doc = html`<!doctype html>
<html lang="${site.language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${site.name}</title>
<link rel="canonical" href="${site.baseIri}" />
<link rel="stylesheet" href="/styles.css" />
${social}
${discoveryLinks(discovery)}
</head>
<body>
<a class="skip-link" href="#content">Skip to content</a>
<div class="page">
<header class="masthead">
  <a class="site-name" href="/">${site.name}</a>
  <nav aria-label="Site">${site.menu.map((m) => html`<a href="${m.href}">${m.label}</a>`)}${searchNavigation(searchEnabled)}</nav>
</header>
<main id="content" data-pagefind-body>
  <h1>${site.name}</h1>
  <p class="listing-order">Ordered by date created, newest first.</p>
  <ul class="listing">
    ${cellsSorted.map((c) => html`<li><a href="/${c.name}/">${c.title}</a> <span class="listing-order">${c.dateCreated ? html`${c.dateCreated} · ` : ''}${c.type}</span>${c.summary ? html`<br />${c.summary}` : ''}${renderChapterLinks(chaptersByPaper.get(c.name))}</li>`)}
  </ul>
</main>
<footer class="colophon"><p>${site.name} · generated by VICTOR · ${site.license}</p></footer>
</div>
</body>
</html>
`;
  return String(doc);
}

export function renderPublicationArchiveRoute(route, { site, searchEnabled = true, discovery = {}, chaptersByPaper = new Map(), homeName }) {
  if (route.kind === 'taxonomy-index') return renderTaxonomyIndex(route, site, searchEnabled, discovery);
  const complete = route.kind === 'complete-archive';
  const items = complete ? route.items : route.page.items;
  const collection = route.collection;
  const title = collection.dimension === 'all'
    ? (complete ? 'Complete archive' : site.name)
    : `${collection.label} ${collection.dimension}`;
  const suffix = !complete && route.page.totalPages > 1 ? ` — page ${route.page.page}` : '';
  const links = complete ? null : route.links;
  const previousLink = archivePageLink(links?.previous, homeName);
  const nextLink = archivePageLink(links?.next, homeName);
  const social = socialMeta({ title: `${title}${suffix}`, type: 'website', url: route.url });
  return String(html`<!doctype html>
<html lang="${site.language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}${suffix}${collection.dimension === 'all' && !complete ? '' : ` — ${site.name}`}</title>
<link rel="canonical" href="${route.url}" />
${previousLink ? html`<link rel="prev" href="${previousLink}" />` : ''}
${nextLink ? html`<link rel="next" href="${nextLink}" />` : ''}
<link rel="stylesheet" href="/styles.css" />
${social}
${discoveryLinks(discovery)}
</head>
<body>
<a class="skip-link" href="#content">Skip to content</a>
<div class="page">
<header class="masthead"><a class="site-name" href="/">${site.name}</a><nav aria-label="Site">${site.menu.map((m) => html`<a href="${m.href}">${m.label}</a>`)}${searchNavigation(searchEnabled)}</nav></header>
<main id="content" data-pagefind-body>
  <p class="eyebrow">${complete ? 'complete archive' : collection.dimension === 'all' ? 'publication index' : `${collection.dimension} archive`}</p>
  <h1>${title}</h1>
  <p class="listing-order">Ordered by date created, newest first. ${complete ? `All ${items.length} publications are shown on this page.` : `Page ${route.page.page} of ${route.page.totalPages}; ${route.page.totalItems} publications total.`}</p>
  <ul class="listing">${items.map((item) => html`<li><a href="${item.id === homeName ? '/' : `/${item.id}/`}">${item.title}</a> <span class="listing-order">${item.published ?? ''}${item.type ? ` · ${item.type}` : ''}</span>${item.summary ? html`<br />${item.summary}` : ''}${renderChapterLinks(chaptersByPaper.get(item.id), homeName)}</li>`)}</ul>
  ${complete && !(homeName && route.collection.dimension === 'all') ? html`<p><a href="${route.collection.dimension === 'all' ? '/' : `/${archiveCollectionBase(route.collection)}/`}">Return to the paged index</a>.</p>` : complete ? '' : renderPagination(route, homeName)}
</main>
<footer class="colophon"><p>${site.name} · generated by VICTOR · ${site.license}</p></footer>
</div>
</body>
</html>
`);
}

function renderPagination(route, homeName) {
  const base = archiveCollectionBase(route.collection);
  const archiveHref = base ? `/${base}/archive/` : '/archive/';
  const previousLink = archivePageLink(route.links.previous, homeName);
  const nextLink = archivePageLink(route.links.next, homeName);
  return html`<nav class="pagination" aria-label="Archive pages">
    ${previousLink ? html`<a rel="prev" href="${new URL(previousLink).pathname}">Previous</a>` : ''}
    <span>Page ${route.page.page} of ${route.page.totalPages}</span>
    ${nextLink ? html`<a rel="next" href="${new URL(nextLink).pathname}">Next</a>` : ''}
    <a href="${archiveHref}">Complete archive</a>
  </nav>`;
}

function archivePageLink(href, homeName) {
  if (!href || (homeName && new URL(href).pathname === '/')) return null;
  return href;
}

function archiveCollectionBase(collection) {
  if (collection.dimension === 'all') return '';
  if (collection.dimension === 'section') return collection.key;
  return `${{ tag: 'tags', type: 'types', status: 'statuses' }[collection.dimension]}/${collection.key}`;
}

function renderTaxonomyIndex(route, site, searchEnabled, discovery) {
  const title = `${route.index.dimension[0].toUpperCase()}${route.index.dimension.slice(1)} archives`;
  const social = socialMeta({ title, type: 'website', url: route.url });
  return String(html`<!doctype html>
<html lang="${site.language}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title} — ${site.name}</title><link rel="canonical" href="${route.url}" /><link rel="stylesheet" href="/styles.css" />${social}${discoveryLinks(discovery)}</head>
<body><a class="skip-link" href="#content">Skip to content</a><div class="page">
<header class="masthead"><a class="site-name" href="/">${site.name}</a><nav aria-label="Site">${site.menu.map((m) => html`<a href="${m.href}">${m.label}</a>`)}${searchNavigation(searchEnabled)}</nav></header>
<main id="content"><p class="eyebrow">taxonomy</p><h1>${title}</h1><p class="listing-order">Ordered by publication count, then term.</p>
<ul class="listing">${route.index.terms.map((term) => html`<li><a href="/${term.route}/">${term.label}</a> <span class="listing-order">${term.count}</span></li>`)}</ul></main>
<footer class="colophon"><p>${site.name} · generated by VICTOR · ${site.license}</p></footer>
</div></body></html>`);
}

export function renderSearchPage({ site, runtimeHref = '/search/search.mjs', discovery = {} }) {
  const moduleSpecifier = JSON.stringify(runtimeHref).replace(/</gu, '\\u003c');
  const script = raw(`<script type="module">
import { createSearchClient } from ${moduleSpecifier};
const form = document.querySelector('[data-search-form]');
const input = document.querySelector('[data-search-input]');
const status = document.querySelector('[data-search-status]');
const results = document.querySelector('[data-search-results]');
const search = createSearchClient();
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = input.value.trim();
  results.replaceChildren();
  if (!query) { status.textContent = 'Enter a search term.'; return; }
  status.textContent = 'Searching…';
  try {
    const matches = await search(query);
    status.textContent = matches.length === 1 ? '1 result' : matches.length + ' results';
    for (const match of matches) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = match.url;
      link.textContent = match.title;
      item.append(link);
      if (match.excerpt) { const summary = document.createElement('p'); summary.textContent = match.excerpt; item.append(summary); }
      results.append(item);
    }
  } catch { status.textContent = 'Search is temporarily unavailable.'; }
});
</script>`);
  const social = socialMeta({ title: `Search — ${site.name}`, type: 'website', url: new URL('search/', site.baseIri).href });
  return String(html`<!doctype html>
<html lang="${site.language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Search — ${site.name}</title>
<link rel="canonical" href="${new URL('search/', site.baseIri).href}" />
<link rel="stylesheet" href="/styles.css" />
${social}
${discoveryLinks(discovery)}
</head>
<body><a class="skip-link" href="#content">Skip to content</a><div class="page">
<header class="masthead"><a class="site-name" href="/">${site.name}</a><nav aria-label="Site">${site.menu.map((m) => html`<a href="${m.href}">${m.label}</a>`)}<a href="/search/">Search</a></nav></header>
<main id="content"><p class="eyebrow">site search</p><h1>Search</h1>
<form data-search-form role="search"><label for="site-search">Search this site</label><input id="site-search" data-search-input name="q" type="search" autocomplete="off" /><button type="submit">Search</button></form>
<p data-search-status aria-live="polite">Enter a search term.</p><ol class="listing" data-search-results></ol>
</main><footer class="colophon"><p>${site.name} · generated by VICTOR · ${site.license}</p></footer>
</div>${script}</body></html>`);
}

function discoveryLinks(discovery) {
  return html`<link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.rss.xml" />
<link rel="alternate" type="application/atom+xml" title="Atom" href="/feed.atom.xml" />
<link rel="alternate" type="application/feed+json" title="JSON Feed" href="/feed.json" />
${discovery.webmention ? html`<link rel="webmention" href="${discovery.webmention}" />` : ''}
${discovery.micropub ? html`<link rel="micropub" href="${discovery.micropub}" />` : ''}
${discovery.indieauthMetadata ? html`<link rel="indieauth-metadata" href="${discovery.indieauthMetadata}" />` : ''}
${(discovery.me ?? []).map((href) => html`<link rel="me" href="${href}" />`)}`;
}

function searchNavigation(enabled) {
  return enabled ? html`<a href="/search/">Search</a>` : '';
}

export function renderNotFoundPage({ site }) {
  return renderTufteDocument({
    metadata: { robots: 'noindex' },
    eyebrow: '404',
    title: 'Page not found',
    navigation: site.menu.map(({ href, label }) => ({ href, label })),
    mastheadHtml: String(html`<a href="/">${site.name}</a>`),
    tiles: [{
      id: 'not-found', title: 'Not found', role: 'now', span: 12,
      html: String(html`<p>The requested page does not exist. Return to the <a href="/">site index</a>.</p>`),
    }],
    footerHtml: String(html`<p>${site.name} · ${site.license}</p>`),
  }, {
    documentTitle: `Page not found — ${site.name}`,
    language: site.language,
    styles: site.tufteStyles,
    theme: site.tufteTheme,
  });
}

export function renderRedirectPage(from, to, { site }) {
  const target = new URL(to ? `${to}/` : '/', site.baseIri).href;
  return String(html`<!doctype html>
<html lang="${site.language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<meta http-equiv="refresh" content="0; url=${target}" />
<title>Moved — ${site.name}</title>
<link rel="canonical" href="${target}" />
</head>
<body>
<main><h1>This page moved</h1><p><a href="${target}">${from}</a> now lives at ${to || 'the home page'}.</p></main>
</body>
</html>
`);
}


// The reference list a page's citations resolve to, in citation order.
function renderReferenceList(citations) {
  return html`<section class="reference-list" aria-label="References">
  <h2>References</h2>
  <ul>${citations.map((c) => html`<li id="ref-${c.key}">${raw(formatReferenceEntry(c.reference))}</li>`)}</ul>
</section>`;
}

// A paper listing entry's ordered chapter links, when it has any.
function renderChapterLinks(chapters, homeName) {
  if (!chapters || !chapters.length) return '';
  return html`<p class="listing-order">Chapters, in order.</p><ol class="chapter-list">${chapters.map((c) => html`<li><a href="${c.name === homeName ? '/' : `/${c.name}/`}">${c.title}</a></li>`)}</ol>`;
}

function pageJsonLd(cell, site, pageUrl = `${site.baseIri}${cell.name}/`) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@id': site.baseIri, '@type': 'WebSite', name: site.name },
      {
        '@id': pageUrl,
        '@type': schemaTypeOfNote(cell.type),
        headline: cell.title,
        datePublished: cell.dateCreated || undefined,
        keywords: cell.tags.join(', ') || undefined,
        description: cell.summary || undefined,
        ...(pageUrl === site.baseIri ? {} : { isPartOf: { '@id': site.baseIri } }),
        identifier: cell.address,
        alternateName: cell.aliases?.length ? [...cell.aliases] : undefined,
        citation: cell.parsed?.citations?.length ? cell.parsed.citations.map((c) => schemaOrgCitation(c.reference)) : undefined,
      },
    ],
  };
}

// OpenGraph + Twitter-card meta, derived from the same title/summary/image
// data every projection already reads off the cell or the site config.
function socialMeta({ title, type, url, description, image }) {
  return raw(socialMetaTags({ title, type, url, description, image }));
}

function resolveSocialImage(image, baseIri) {
  if (!image || typeof image !== 'string') return undefined;
  try {
    return new URL(image, baseIri).href;
  } catch {
    return undefined;
  }
}

function backlinkLabel(type) {
  return { links: 'Linked from', cites: 'Cited by', transcludes: 'Transcluded by', 'part-of': 'Chapters' }[type] || `Related by ${type}`;
}

function groupBy(items, keyOf) {
  const out = {};
  for (const item of items) (out[keyOf(item)] ??= []).push(item);
  return out;
}
