import { renderTufteDocument } from '@red-cup-engineering/web-page-tiling-engine/rendering';
import { escapeHtml, admitTufteUrl } from '@red-cup-engineering/web-page-tiling-engine/browser';

export const WORKSPACE_LINKS = Object.freeze([
  { href: '/work', label: 'Work' }, { href: '/agents', label: 'Agents and offices' }, { href: '/conversations', label: 'Conversations' },
  { href: '/code', label: 'Code' }, { href: '/knowledge', label: 'Knowledge' },
  { href: '/resources', label: 'Resources' }, { href: '/books/view', label: 'Accounts' },
  { href: '/people', label: 'People' }, { href: '/network', label: 'Systems' },
  { href: '/play', label: 'City' },
]);

const STYLES = `
:root{--tufte-bg:#edf3f1;--tufte-surface:#fcfefd;--tufte-ink:#172d2a;--tufte-muted:#465e59;--tufte-accent:#17645b;--tufte-line:#b8ccc7;--tufte-radius:.5rem;--tufte-gap:1rem;font-size:16px}
.tufte-shell{max-width:1440px;padding:clamp(.75rem,3vw,2rem)}
.tufte-masthead{padding:1rem 0 1.5rem}.tufte-masthead h1{font-size:clamp(1.8rem,4vw,2.8rem)}
.tufte-tile{padding:1.25rem}.tufte-tile h2{font-size:.85rem;letter-spacing:.04em;color:var(--tufte-ink)}
input,select,button{min-height:44px}textarea{width:100%;min-height:9rem}input:not([type=checkbox]){max-width:100%;width:100%}
a,summary{overflow-wrap:anywhere}summary{cursor:pointer;padding:.65rem 0}pre{overflow:auto;max-height:65vh;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:2}
[data-tufte-navigation] a{display:inline-flex;align-items:center;min-height:44px;padding:.5rem .75rem;border:1px solid var(--tufte-line);border-radius:.4rem;text-decoration:none}
.workspace-content{white-space:pre-wrap;overflow-wrap:anywhere;max-width:85ch}.workspace-code{white-space:pre;overflow-wrap:normal;max-height:none}.workspace-code a{display:inline-block;min-width:4em;color:var(--tufte-muted);user-select:none}
.workspace-evidence{font-size:.875rem;color:var(--tufte-muted)}
@media(prefers-color-scheme:dark){:root{--tufte-bg:#0c1d1b;--tufte-surface:#142b27;--tufte-ink:#e3f2ed;--tufte-muted:#b2c9c2;--tufte-accent:#8cd7c1;--tufte-line:#43665d}}
@media(forced-colors:active){[data-tufte-navigation] a{border:1px solid LinkText}}
`;

export function workspaceDocument({ title, tiles, navigation = WORKSPACE_LINKS, navigationTitle = 'MetroPlat', subtitle }) {
  return renderTufteDocument({ title, subtitle, tiles: [
    { title: navigationTitle, span: 12, html: `<nav aria-label="Enterprise workspace" data-tufte-navigation>${navigation.map(link => `<a href="${escapeHtml(admitTufteUrl(link.href))}">${escapeHtml(link.label)}</a>`).join('')}</nav>` },
    ...tiles,
  ] }, { styles: STYLES });
}

export const evidenceTile = (title, value) => ({ title, span: 12,
  html: `<details><summary>${escapeHtml(title)}</summary><pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre></details>` });

export function contentTile(title, content, { code = false, id = 'source', span = 12 } = {}) {
  const html = code
    ? `<pre class="workspace-code" aria-label="Source with line numbers"><code>${String(content).split('\n').map((line, i) => `<span id="${escapeHtml(id)}-L${i + 1}"><a href="#${escapeHtml(id)}-L${i + 1}" aria-label="Line ${i + 1}">${i + 1}</a>${escapeHtml(line)}</span>`).join('\n')}</code></pre>`
    : `<div class="workspace-content">${escapeHtml(content)}</div>`;
  return { title, span, html };
}
