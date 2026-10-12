const VALUE_FIELDS = ["sourcePaths", "ids", "accounts", "urls", "repositories", "kinds"];
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const nonempty = value => typeof value === "string" && value.trim().length > 0;

/**
 * Derive a paged business-source view. Source custody is identified by package
 * path; neither a declaration nor a shared account proves enterprise identity,
 * live operation, or revenue. All filtering happens after evidence is grouped.
 */
export function deriveBusinessCatalog({
  records, offset = 0, limit = 50, accountPrefix, kind, query,
} = {}) {
  if (!Array.isArray(records)) throw new TypeError("records must be an array");
  if (!Number.isSafeInteger(offset) || offset < 0
    || !Number.isSafeInteger(limit) || limit < 1) {
    throw new TypeError("offset must be nonnegative and limit positive safe integers");
  }
  for (const [field, value] of Object.entries({ accountPrefix, kind, query })) {
    if (value !== undefined && typeof value !== "string") {
      throw new TypeError(`${field} must be a string when supplied`);
    }
  }

  const findings = [];
  const groups = new Map();
  records.forEach((record, index) => {
    if (!record || !nonempty(record.sourcePath) || !nonempty(record.kind)
      || !nonempty(record.package?.path)) {
      findings.push({ index, reason: "malformed-record" });
      return;
    }
    const path = record.package.path;
    let group = groups.get(path);
    if (!group) {
      group = {
        path,
        identities: new Map(),
        values: Object.fromEntries(VALUE_FIELDS.map(field => [field, new Set()])),
      };
      groups.set(path, group);
    }
    const identity = {
      name: typeof record.package.name === "string" ? record.package.name : "",
      path,
      version: typeof record.package.version === "string" ? record.package.version : "",
    };
    group.identities.set(JSON.stringify(identity), identity);
    group.values.sourcePaths.add(record.sourcePath);
    group.values.kinds.add(record.kind);
    for (const field of VALUE_FIELDS.filter(field => !["sourcePaths", "kinds"].includes(field))) {
      const values = record[field] ?? [];
      if (!Array.isArray(values) || values.some(value => !nonempty(value))) {
        findings.push({ index, path: record.sourcePath, reason: `malformed-${field}` });
        continue;
      }
      for (const value of values) group.values[field].add(value);
    }
  });

  const all = [...groups.values()].sort((a, b) => compare(a.path, b.path)).map(group => {
    const identities = [...group.identities.values()]
      .sort((a, b) => compare(a.name, b.name) || compare(a.version, b.version));
    if (identities.length > 1) {
      findings.push({ path: group.path, reason: "conflicting-package-identity" });
    }
    return {
      package: identities.length === 1 ? identities[0] : { path: group.path, name: null, version: null },
      packageIdentities: identities,
      ...Object.fromEntries(VALUE_FIELDS.map(field => [
        field, [...group.values[field]].sort(compare),
      ])),
      live: "unobserved",
      revenue: "unobserved",
    };
  });
  const namePaths = new Map();
  for (const group of all) {
    for (const identity of group.packageIdentities) {
      if (!identity.name) continue;
      if (!namePaths.has(identity.name)) namePaths.set(identity.name, new Set());
      namePaths.get(identity.name).add(group.package.path);
    }
  }
  for (const group of all) {
    group.ambiguousName = group.packageIdentities.some(identity =>
      (namePaths.get(identity.name)?.size ?? 0) > 1);
  }
  const needle = query?.toLowerCase();
  const matched = all.filter(group =>
    (accountPrefix === undefined || group.accounts.some(account => account.startsWith(accountPrefix)))
    && (kind === undefined || group.kinds.includes(kind))
    && (!needle || [
      ...group.ids, ...group.packageIdentities.map(identity => identity.name),
    ].join(" ").toLowerCase().includes(needle)));
  const items = matched.slice(offset, offset + limit);
  return {
    denominator: records.length,
    total: all.length,
    matched: matched.length,
    items,
    nextOffset: offset + items.length < matched.length ? offset + items.length : null,
    findings,
  };
}
