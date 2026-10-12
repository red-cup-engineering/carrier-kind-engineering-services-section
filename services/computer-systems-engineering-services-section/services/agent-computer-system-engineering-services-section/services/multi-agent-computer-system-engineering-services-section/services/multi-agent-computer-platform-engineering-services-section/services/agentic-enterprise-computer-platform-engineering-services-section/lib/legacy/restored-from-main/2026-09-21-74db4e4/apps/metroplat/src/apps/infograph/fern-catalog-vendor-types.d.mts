/**
 * @packageDocumentation
 * Ambient types for exact-pinned fern-catalog.mts deps that ship none of
 * their own (read-jsnode-operation-arguments-service 0.2.0;
 * verified: no `types` field, no `.d.mts` in either published tarball).
 */
declare module "@red-cup-engineering/read-jsnode-operation-arguments-service" {
  export interface JsnodeOperationArgumentsParam {
    readonly name: string;
    readonly type?: string;
    readonly description?: string;
  }

  export interface JsnodeOperationArgumentsImport {
    readonly source: string;
    readonly names: readonly string[];
  }

  export interface JsnodeOperationArgumentsThrow {
    readonly type: string;
    readonly description?: string;
  }

  export type JsonSchemaLiteral = Readonly<Record<string, unknown>>;

  export interface JsnodeOperationArguments {
    readonly type: "JsnodeOperationArguments";
    readonly version: number;
    readonly path: string;
    readonly exportName: string;
    readonly exportCount: number;
    readonly isAsync: boolean;
    readonly description: string | null;
    readonly params: readonly JsnodeOperationArgumentsParam[];
    readonly returns: { readonly type?: string; readonly description?: string } | null;
    readonly inputSchema: JsonSchemaLiteral | null;
    readonly outputSchema: JsonSchemaLiteral | null;
    readonly throws: readonly JsnodeOperationArgumentsThrow[];
    readonly imports: readonly JsnodeOperationArgumentsImport[];
    readonly hasMainGuard: boolean;
    readonly readsStdin: boolean;
    readonly writesStdout: boolean;
    readonly bodyText: string;
    readonly shebang: boolean;
    readonly residue: readonly unknown[];
  }

  export function readJsnodeOperationArguments(
    request: Readonly<{ text: string; path: string }>,
  ): JsnodeOperationArguments;
}
