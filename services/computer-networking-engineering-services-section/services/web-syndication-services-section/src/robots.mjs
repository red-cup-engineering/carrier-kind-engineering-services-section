/**
 * robots -- robots.txt (RFC 9309): groups of `User-agent` lines followed by `Allow` / `Disallow` rules
 * (a rule path starts with `/` or is empty), `Sitemap:` lines (absolute URLs, outside groups), and the
 * widely supported but non-standard `Crawl-delay`. Lines end LF; groups are separated by a blank line.
 */
const path = (p) => (p === "" ? "" : typeof p === "string" && p[0] === "/" ? p : `/${p}`);

function clean(value, what) {
  if (/[\r\n]/u.test(String(value))) throw new TypeError(`robots: ${what} must not contain a line break`);
  return String(value);
}

/** Build a robots.txt: `{ groups: [{ userAgent, allow?, disallow?, crawlDelay? }], sitemap? }`. */
export function robots({ groups, sitemap } = {}) {
  const lines = [];
  (groups?.length ? groups : [{ userAgent: "*", allow: ["/"] }]).forEach((group, i) => {
    if (i > 0) lines.push("");
    for (const agent of Array.isArray(group.userAgent) ? group.userAgent : [group.userAgent ?? "*"]) lines.push(`User-agent: ${clean(agent, "user-agent")}`);
    for (const rule of group.disallow ?? []) lines.push(`Disallow: ${clean(path(rule), "rule")}`);
    for (const rule of group.allow ?? []) lines.push(`Allow: ${clean(path(rule), "rule")}`);
    if (!(group.allow?.length) && !(group.disallow?.length)) lines.push("Disallow:");
    if (group.crawlDelay !== undefined) lines.push(`Crawl-delay: ${Number(group.crawlDelay)}`);
  });
  const maps = sitemap === undefined ? [] : Array.isArray(sitemap) ? sitemap : [sitemap];
  if (maps.length > 0) lines.push("");
  for (const s of maps) {
    try { if (!/^https?:$/u.test(new URL(s).protocol)) throw new Error(); } catch { throw new TypeError(`robots: Sitemap must be an absolute URL: ${String(s)}`); }
    lines.push(`Sitemap: ${clean(s, "sitemap")}`);
  }
  return `${lines.join("\n")}\n`;
}
