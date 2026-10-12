declare module "@red-cup-engineering/gitmodules-file-codec-service" {
  export interface GitmoduleEntry {
    readonly name: string;
    readonly path: string;
    readonly url: string;
    readonly branch?: string;
  }
  export function encodeGitmodules(entries: readonly GitmoduleEntry[]): string;
}
