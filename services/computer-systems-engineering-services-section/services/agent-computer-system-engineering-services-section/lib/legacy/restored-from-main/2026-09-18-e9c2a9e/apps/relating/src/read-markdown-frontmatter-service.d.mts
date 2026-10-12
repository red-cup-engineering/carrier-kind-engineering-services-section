declare module "@red-cup-engineering/read-markdown-frontmatter-service" {
  type FrontmatterJson = null | boolean | number | string | readonly FrontmatterJson[] | Readonly<Record<string, FrontmatterJson>>;
  export function readMarkdownFrontmatter(text: string, options?: Readonly<{
    frontmatterFormats?: readonly ("yaml" | "toml")[];
    absentFrontmatter?: "null" | "empty" | "throw";
    yamlProjection?: "json" | "flat-string-lists";
    yamlSourceLocations?: boolean;
  }>): Readonly<{
    format: "yaml" | "toml" | null;
    frontmatter: Readonly<Record<string, FrontmatterJson>> | null;
    body: string;
  }>;
}
