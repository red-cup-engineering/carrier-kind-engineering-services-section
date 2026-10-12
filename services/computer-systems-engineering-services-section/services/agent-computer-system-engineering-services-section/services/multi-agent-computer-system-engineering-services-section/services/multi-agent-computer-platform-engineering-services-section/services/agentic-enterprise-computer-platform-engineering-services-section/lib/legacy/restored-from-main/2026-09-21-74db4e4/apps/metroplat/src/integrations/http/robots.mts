
/**
 * projections/robots - deterministic robots.txt text bodies.
 */

export interface RobotsTxtOptions {
  readonly sitemapUrl: string;
  readonly sitemapUrls?: readonly string[];
  readonly userAgent?: string;
  readonly allow?: readonly string[];
  readonly disallow?: readonly string[];
}

export function robotsTxt(options: RobotsTxtOptions): string {
  const allow = options.allow ?? ["/"];
  const disallow = options.disallow ?? [];
  const sitemapUrls = options.sitemapUrls ?? [options.sitemapUrl];
  const lines = [
    `User-agent: ${options.userAgent ?? "*"}`,
    ...allow.map((path) => `Allow: ${path}`),
    ...disallow.map((path) => `Disallow: ${path}`),
    ...sitemapUrls.map((url) => `Sitemap: ${url}`),
  ];
  return `${lines.join("\n")}\n`;
}
