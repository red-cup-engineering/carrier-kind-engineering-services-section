/**
 * .well-known resource formation: an HTTP capability (RFC 8615) — forming the
 * exact-path and prefix resources a `.well-known` directory serves — owned
 * by the networking substrate itself, not by any one server or faculty
 * above it.
 */

const WELL_KNOWN_TOKEN = /^[A-Za-z0-9._~-]+$/;

function assertWellKnownName(name) {
  if (!WELL_KNOWN_TOKEN.test(name) || name === "." || name === "..") {
    throw new TypeError(`invalid well-known name: ${name}`);
  }
}

function wellKnownBase(basePath) {
  if (!basePath) return "/.well-known";
  const trimmed = basePath.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function wellKnownExactPath(basePath, name) {
  return `${basePath}/${name}`;
}

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wellKnownPrefixRegex(path) {
  return new RegExp(`^${escapeRegex(path)}(?:/(?<remainder>.*))?$`);
}

function wellKnownEntryHandler(entry) {
  if (entry.handler) return entry.handler;
  if (!entry.repr) throw new TypeError(`well-known entry ${entry.name} needs a handler or repr`);
  const representation = entry.repr;
  return async (ctx) => {
    const remainder = ctx.params.remainder ?? "";
    return typeof representation === "function" ? await representation(remainder, ctx) : representation;
  };
}

export function wellKnown(entries, opts = {}) {
  const basePath = wellKnownBase(opts.basePath);
  const resources = entries.map((entry) => {
    assertWellKnownName(entry.name);
    const path = wellKnownExactPath(basePath, entry.name);
    const resource = {
      match: entry.prefix ? wellKnownPrefixRegex(path) : path,
      methods: entry.methods ?? ["GET", "HEAD"],
      handler: wellKnownEntryHandler(entry),
    };
    if (entry.produces) resource.produces = entry.produces;
    return resource;
  });

  return { resources };
}

// — security.txt (RFC 9116) —

const each = (value) => value === undefined ? [] : typeof value === "string" ? [value] : [...value];

function singleLine(value, field) {
  if (!value || /[\r\n]/.test(value)) throw new TypeError(`${field} must be a single non-empty line`);
}

function absoluteUri(value, field) {
  singleLine(value, field);
  try { new URL(value); } catch { throw new TypeError(`${field} must be an absolute URI`); }
}

function instant(value, field) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.valueOf())) throw new TypeError(`${field} must be an RFC-3339 instant`);
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * The `/.well-known/security.txt` body (RFC 9116) from `{ contacts, expires, encryption, acknowledgments, policy,
 * hiring, preferredLanguages, canonical, csaf, comments }`: at least one contact URI and an expiry are required.
 */
export function securityTxt(security) {
  if (!security?.contacts?.length) throw new TypeError("security.contacts must contain at least one URI");
  security.contacts.forEach((contact, index) => absoluteUri(contact, `security.contacts[${index}]`));
  const expires = instant(security.expires, "security.expires");
  const fields = [["Encryption", "encryption"], ["Acknowledgments", "acknowledgments"], ["Policy", "policy"], ["Hiring", "hiring"]];
  for (const [, key] of [...fields, ["Canonical", "canonical"], ["CSAF", "csaf"]]) each(security[key]).forEach((value, index) => absoluteUri(value, `security.${key}[${index}]`));
  (security.preferredLanguages ?? []).forEach((lang, index) => singleLine(lang, `security.preferredLanguages[${index}]`));
  (security.comments ?? []).forEach((comment, index) => { if (/[\r\n]/.test(comment)) throw new TypeError(`security.comments[${index}] must be a single line`); });
  const lines = (security.comments ?? []).map((comment) => `# ${comment}`);
  if (lines.length) lines.push("");
  lines.push(...security.contacts.map((contact) => `Contact: ${contact}`), `Expires: ${expires}`);
  for (const [label, key] of fields) lines.push(...each(security[key]).map((value) => `${label}: ${value}`));
  if (security.preferredLanguages?.length) lines.push(`Preferred-Languages: ${security.preferredLanguages.join(", ")}`);
  lines.push(...each(security.canonical).map((value) => `Canonical: ${value}`), ...each(security.csaf).map((value) => `CSAF: ${value}`));
  return `${lines.join("\n")}\n`;
}
