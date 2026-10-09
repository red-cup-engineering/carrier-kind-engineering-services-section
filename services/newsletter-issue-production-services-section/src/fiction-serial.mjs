import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" && value.trim() !== "";
}

/** Validate the repository-owned routing record for one fiction serial. */
export function validateSerialManifest(manifest) {
  if (!record(manifest)) throw new TypeError("validateSerialManifest requires an object");
  const findings = [];
  for (const field of ["canon", "serial", "cadence", "buttondownNewsletter", "language", "script"]) {
    if (!text(manifest[field])) findings.push({ severity: "error", rule: `${field}-required`, message: `serial.${field} must be a non-empty string` });
  }
  if (text(manifest.buttondownNewsletter) && !/^[a-z0-9][a-z0-9-]*$/u.test(manifest.buttondownNewsletter)) {
    findings.push({ severity: "error", rule: "buttondown-newsletter-name", message: "serial.buttondownNewsletter must be a stable lowercase name, never a credential" });
  }
  if (!Array.isArray(manifest.freeEpisodes) || manifest.freeEpisodes.some((number) => !Number.isInteger(number) || number < 1) || new Set(manifest.freeEpisodes).size !== manifest.freeEpisodes.length) {
    findings.push({ severity: "error", rule: "free-episodes", message: "serial.freeEpisodes must be an array of unique positive integers" });
  }
  return Object.freeze({
    kind: "red-cup-engineering.fiction-serial-manifest.validation-report",
    valid: findings.every((finding) => finding.severity !== "error"),
    findings: Object.freeze(findings),
  });
}

/**
 * Derive a short recap from the most recent outline summaries before an
 * episode. An editor's frontmatter override wins without mutating the bible.
 */
export function derivePreviously(storyBible, episode, override, { maximumSummaries = 2 } = {}) {
  if (override !== undefined) {
    if (typeof override !== "string") throw new TypeError("previously override must be a string");
    return override.trim();
  }
  if (!Number.isInteger(episode) || episode < 1) throw new TypeError("episode must be a positive integer");
  if (!Array.isArray(storyBible?.outline)) throw new TypeError("derivePreviously needs a story bible outline");
  const summaries = storyBible.outline
    .filter((entry) => Number(entry?.episode ?? entry?.chapter) < episode && text(entry?.summary))
    .sort((left, right) => Number(left.episode ?? left.chapter) - Number(right.episode ?? right.chapter))
    .slice(-maximumSummaries)
    .map((entry) => entry.summary.trim());
  return summaries.join(" ");
}

/** Project one lintable Markdown episode into the fiction issue shape. */
export function fictionIssueFromEpisode({ manifest, storyBible, episodeText }) {
  const report = validateSerialManifest(manifest);
  if (!report.valid) throw new TypeError(report.findings.map((finding) => finding.message).join("; "));
  if (typeof episodeText !== "string") throw new TypeError("fictionIssueFromEpisode needs episodeText");
  const { frontmatter, body } = readMarkdownFrontmatter(episodeText, { absentFrontmatter: "empty" });
  const normalizedBody = body.trimStart();
  const heading = normalizedBody.match(/^#\s+([^\n]+)\n*/u);
  if (!heading) throw new TypeError("a serial episode needs one leading level-one title heading");
  const episode = Number(frontmatter.episode);
  if (!Number.isInteger(episode) || episode < 1) throw new TypeError("a serial episode needs frontmatter episode: <positive integer>");
  if (!text(frontmatter.next)) throw new TypeError("a serial episode needs a one-line frontmatter next hook");
  return Object.freeze({
    canon: manifest.canon,
    serial: manifest.serial,
    episode,
    title: heading[1].trim(),
    previously: derivePreviously(storyBible, episode, frontmatter.previously),
    body: normalizedBody.slice(heading[0].length).trim(),
    next: frontmatter.next.trim(),
    access: manifest.freeEpisodes.includes(episode) ? "free" : "paid",
  });
}
