export type FlatfileOperationOrigin = Readonly<{
  address: string;
  packageName: string;
  packageVersion: string;
}>;

export type BoundFlatfileOperation = Readonly<{
  identity: string;
  origin: FlatfileOperationOrigin;
  path: string;
  exportName: string;
  description: string | null;
  inputSchema: Readonly<Record<string, unknown>> | null;
  outputSchema: Readonly<Record<string, unknown>> | null;
  run: (input: unknown) => unknown | Promise<unknown>;
}>;

/**
 * Reads only FERN-admitted operations whose installed package identity and
 * declared contract still match the flatfile. Package loading is delayed until
 * those checks have passed.
 */
export function readBoundFlatfileOperations(input: Readonly<{
  fernPath: string;
  operationsRoot: string;
}>): Promise<readonly BoundFlatfileOperation[]>;
