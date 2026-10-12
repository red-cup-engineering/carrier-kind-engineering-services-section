declare module "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter" {
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

declare module "@red-cup-engineering/markdown-engineering-services-section/split-markdown-frontmatter-fence" {
  export function splitMarkdownFrontmatterFence(text: string): { readonly format: "yaml" | "toml"; readonly raw: string; readonly body: string } | null;
}
