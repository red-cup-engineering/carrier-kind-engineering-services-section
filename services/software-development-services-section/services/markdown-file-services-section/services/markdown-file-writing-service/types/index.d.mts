export type MarkdownWriteMode = "create" | "replace" | "upsert";
export interface MarkdownFileWrite { readonly root: string; readonly path: string; readonly relativePath: string; readonly text: string; readonly bytes: number; readonly changed: boolean; readonly created: boolean; }
export declare function prepareMarkdownFileText(text: string): string;
export declare function writeMarkdownFile(input: { root: string; path: string; text: string; mode?: MarkdownWriteMode }): Promise<MarkdownFileWrite>;
