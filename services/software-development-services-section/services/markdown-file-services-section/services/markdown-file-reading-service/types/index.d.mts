export interface MarkdownFileAddress { readonly root: string; readonly path: string; readonly relativePath: string; }
export interface MarkdownFileRead extends MarkdownFileAddress { readonly text: string; readonly bytes: number; readonly modifiedAt: string; }
export declare function resolveMarkdownFilePath(input: { root: string; path: string }): MarkdownFileAddress;
export declare function readMarkdownFile(input: { root: string; path: string }): Promise<MarkdownFileRead>;
