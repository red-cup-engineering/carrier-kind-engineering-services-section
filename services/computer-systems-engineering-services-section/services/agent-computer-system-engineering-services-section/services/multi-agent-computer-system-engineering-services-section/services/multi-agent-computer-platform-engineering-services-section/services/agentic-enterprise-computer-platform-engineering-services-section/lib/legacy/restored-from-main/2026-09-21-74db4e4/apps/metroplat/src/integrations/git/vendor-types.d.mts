/**
 * @packageDocumentation
 * Ambient types for exact-pinned git-services-section deps that ship none of
 * their own (observing-git-repository-service 0.1.0, committing-git-paths-
 * service 0.5.1; verified: no `types` field, no `.d.mts`).
 */
declare module "@red-cup-engineering/observing-git-repository-service" {
  export interface ObservedGitRepository {
    readonly root: string;
    readonly branch: string | null;
    readonly head: string | null;
    readonly clean: boolean;
    readonly status: string;
    readonly diffStat?: readonly string[];
    readonly nameStatus?: readonly string[];
  }

  export function observeGitRepository(request?: Readonly<{
    repository?: string;
    gitBin?: string;
    diff?: boolean;
  }>): ObservedGitRepository;
}

declare module "@red-cup-engineering/committing-git-paths-service" {
  export interface CommitGitExactFilesResult {
    readonly repository: string;
    readonly paths: readonly string[];
    readonly message: string;
    readonly committed: boolean;
    readonly head?: string;
    readonly parent: string;
    readonly committedPaths?: readonly string[];
    readonly reason?: "nothing-staged" | "dry-run" | "selected-worktree-changed" | "head-advanced";
    readonly candidate?: string;
    readonly witnessRef?: string;
    readonly indexReconciled?: boolean;
    readonly postCommit?: { readonly ran: boolean; readonly success: boolean; readonly output: string };
  }

  export function commitGitExactFiles(options: Readonly<{
    repository?: string;
    paths: readonly string[];
    message: string;
    gitBin?: string;
    dryRun?: boolean;
  }>): CommitGitExactFilesResult;
}
