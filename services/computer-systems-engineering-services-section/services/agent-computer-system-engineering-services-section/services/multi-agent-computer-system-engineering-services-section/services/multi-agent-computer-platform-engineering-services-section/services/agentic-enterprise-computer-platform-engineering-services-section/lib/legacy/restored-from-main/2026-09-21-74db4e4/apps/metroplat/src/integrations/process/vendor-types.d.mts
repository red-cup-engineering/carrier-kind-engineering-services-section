/**
 * @packageDocumentation
 * Ambient types for the exact-pinned house command-execution primitive that
 * ships none of its own (execute-javascript-node-command-service 0.2.1;
 * verified: no `types` field, no `.d.mts`). Every metroplat command-running
 * integration (git push/confirm, TeX/Blueprint/Verso/Lake tools, systemd
 * readiness notification) calls this primitive directly rather than
 * reinventing `node:child_process` (561-group ruling 2026-09-11).
 */
declare module "@red-cup-engineering/execute-javascript-node-command-service" {
  export interface JavascriptNodeCommandExecutionRequest {
    readonly type: "JavascriptNodeCommandExecutionRequest";
    readonly version: 1;
    readonly command: string;
    readonly arguments: readonly string[];
    readonly directory: string;
    readonly environment: Readonly<Record<string, string>> | null;
    readonly input: string | null;
  }

  export interface JavascriptNodeCommandExecutionResult {
    readonly type: "JavascriptNodeCommandExecutionResult";
    readonly version: 1;
    readonly status: number | null;
    readonly signal: string | null;
    readonly stdout: string;
    readonly stderr: string;
    readonly error: string;
  }

  export interface JavascriptNodeCommandExecutionReceipt {
    readonly type: "JavascriptNodeCommandExecutionReceipt";
    readonly version: 1;
    readonly request: JavascriptNodeCommandExecutionRequest;
    readonly result: JavascriptNodeCommandExecutionResult;
  }

  export function executeJavascriptNodeCommand(
    request: JavascriptNodeCommandExecutionRequest,
  ): JavascriptNodeCommandExecutionReceipt;
}
